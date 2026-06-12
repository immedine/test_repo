'use strict';

/**
 * This module handles all functionality of Admin Menu
 * @module Modules/Menu
 */
module.exports = function (app) {
  const mongoose = require('mongoose');


  /**
   * menu Model
   * @type {Mongoose.Model}
   */
  const Menu = app.models.Menu;
  const Order = app.models.Order;
  const Category = app.models.Category;
  const ImageByAI = app.models.ImageByAI;

  /**
   * Creates a Menu
   * @param  {Object} config  The config object
   * @return {Promise}        The promise
   */
  const createMenu = function (config, userRef) {
    config.restaurantRef = userRef.restaurantRef;
    config.createdBy = userRef._id;
    return Menu.createMenu(config);
  };

  /**
   * Fetches a menu by Id
   * @param  {String} menuId  The menu id
   * @return {Promise}        The promise
   */
  const findMenuById = function (menuId, userRef) {
    return Menu.findById(menuId)
      .populate({
        path: 'ingredients.inventoryRef',
        select: 'name quantity unit'
      })
      .then(menuDetails => {
        if (!menuDetails || (menuDetails && userRef &&
          menuDetails.restaurantRef.toString() !== userRef.restaurantRef.toString())) {
          return Promise.reject({
            'errCode': 'MENU_NOT_FOUND'
          });
        } else {
          return Promise.resolve(menuDetails);
        }
      });
  };

  /**
   * Edits a menu
   * @param  {Object} editedMenu The edited menu document
   * @return {Promise}           The promise
   */
  const editMenu = function (editedMenu, userRef) {

    if (editedMenu.restaurantRef.toString() !== userRef.restaurantRef.toString()) {
      return Promise.reject({
        'errCode': 'MENU_NOT_FOUND'
      });
    }

    return Menu.countDocuments({
      name: new RegExp(`^${editedMenu.name}$`, 'i'),
      status: app.config.contentManagement.menu.active,
      restaurantRef: editedMenu.restaurantRef,
      _id: {
        $ne: editedMenu._id
      }
    })
      .then(count => count ? Promise.reject({
        'errCode': 'MENU_ALREADY_EXISTS'
      }) : editedMenu.save());
  };

  /**
   * Fetches a list of menus
   * @param  {Object} options  The options object
   * @return {Promise}        The promise
   */
  const getList = function (options) {
    return Menu.pagedFind(options);
  };

  /**
   * Removes a menu
   * @param  {Object} menu The menu document
   * @return {Promise}     The promise
   */
  const removeMenu = function (menu, userRef) {
    if (menu.restaurantRef.toString() !== userRef.restaurantRef.toString()) {
      return Promise.reject({
        'errCode': 'MENU_NOT_FOUND'
      });
    }
    return Menu.removeMenu(menu._id);
  };

  const listFromApp = (options) => {
    const aggrArr = [];
    aggrArr.push(
      {
        $match: {
          restaurantRef: new mongoose.Types.ObjectId(options.filters.restaurantRef),
          status: options.filters.status
        }
      }
    );
    aggrArr.push({
      $sort: { order: 1 } // Sort by order before grouping
    })
    aggrArr.push(
      {
        $group: {
          _id: '$categoryRef',
          menus: {
            $push: {
              _id: '$_id',
              name: '$name',
              price: '$price',
              order: '$order',
              veg: '$isVeg',
              spicy: '$isSpicy',
              available: '$isAvailable',
              images: '$images',
              restaurantRef: '$restaurantRef',
              excludeGST: '$excludeGST',
              excludeServiceCharge: '$excludeServiceCharge',
            }
          }
        }
      },
      {
        $project: {
          categoryId: '$_id',
          menus: 1,
          _id: 0
        }
      }
    );

    return Menu.aggregate(aggrArr).then(data => {
      return Promise.resolve(data);
    });
  }

  const removeInventoryItem = async (inventoryId) => {
    await Menu.updateMany(
      {},
      { $pull: { ingredients: { inventoryRef: inventoryId } } }
    );
    return Promise.resolve({});
  }

  const updateOrderCount = async (orderId) => {
    const order = await Order.findById(orderId).select("cart.menuRef cart.quantity");

    if (!order) throw new Error("Order not found");

    // Prepare bulk operations
    const bulkOps = order.cart
      .filter(item => item.menuRef) // only if menuRef is present
      .map(item => ({
        updateOne: {
          filter: { _id: item.menuRef },
          update: { $inc: { noOfOrders: item.quantity } } // increase by quantity
        }
      }));

    if (bulkOps.length > 0) {
      await Menu.bulkWrite(bulkOps);
    }
  };

  const updateBulkOrderCount = async (carts) => {
    console.log("carts ", carts)
    // Prepare bulk operations
    const bulkOps = carts
      .filter(item => item.menuRef) // only if menuRef is present
      .map(item => ({
        updateOne: {
          filter: { _id: item.menuRef },
          update: { $inc: { noOfOrders: item.quantity } } // increase by quantity
        }
      }));

    if (bulkOps.length > 0) {
      await Menu.bulkWrite(bulkOps);
    }
  };


  function cleanAndTag(str) {
    // List of prepositions to remove (extend as needed)
    const stopWords = ["and", "or", "the", "of", "in", "on", "with", "a", "an"];

    // Extract only words with alphabets
    const words = str.match(/[A-Za-z]+/g) || [];

    // Filter out prepositions (case-insensitive)
    const filtered = words.filter(
      (w) => !stopWords.includes(w.toLowerCase())
    );

    return filtered.map((w) => w.toLowerCase());
  }

  const bulkUpload = async (MenuMock, userRef) => {
    console.log('bulk upload cron job started');
    const json = MenuMock;
    // console.log("json ",json);

    const obj = {};

    json.categories.forEach(each => {
      obj[each.name] = each.items;
    });

    // console.log("obj ", obj);

    if (Object.keys(obj).length) {
      let catOrder = 0;
      for (const categoryName in obj) {
        let categoryDoc = await Category.findOne({
          name: categoryName,
          restaurantRef: userRef.restaurantRef,
          createdBy: userRef._id
        });
        if (!categoryDoc) {
          catOrder++;
          categoryDoc = await Category.create({
            order: catOrder,
            name: categoryName,
            filterText: categoryName.split(' ').slice(0, 2).join(' '),
            restaurantRef: userRef.restaurantRef,
            createdBy: userRef._id,
            totalMenu: obj[categoryName].length
          });
        }

        const menuItems = obj[categoryName];
        let menuOrder = 0;
        for (const menuItem of menuItems) {
          menuOrder++;
          const { name, price, isVeg, description } = menuItem;

          const cleaned = cleanAndTag(name);

          const results = await ImageByAI.find({
            $expr: {
              $gte: [
                { $size: { $setIntersection: ["$tags", cleaned] } },
                2 // <-- at least 2 matches required
              ]
            }
          });

          // console.log("results ", results.map(r => r.url).slice(0, 2))

          await Menu.insertMany([{
            order: menuOrder,
            name,
            isVeg,
            images: results.length ? results.map(r => r.url).slice(0, 1) : [],
            description: description || "",
            price,
            categoryRef: categoryDoc._id,
            restaurantRef: userRef.restaurantRef,
            createdBy: userRef._id,
            isCreatedByImmeDine: false
          }], { ordered: false });

        }
      }
    }


  };

  /**
   * Clones menus from source restaurant to target restaurant (franchise)
   * Creates categories if not exist and maps menus to them
   * Optimized for minimal DB calls using bulk operations
   *
   * @param  {Object} config  The config object
   * @param  {Array} config.menuIds - Array of menu IDs to clone
   * @param  {String} config.restaurantRef - Target restaurant ID (franchise)
   * @param  {String} config.createdBy - User who is creating the menus
   * @return {Promise}        The promise with cloned menu results
   */
  const cloneMenusToFranchise = async function (config) {
    const { menuIds, restaurantRef, createdBy } = config;

    // Step 1: Fetch all source menus in a single query
    const sourceMenus = await Menu.find({
      _id: { $in: menuIds },
      status: app.config.contentManagement.menu.active
    })
    .populate({
      path: 'ingredients.inventoryRef',
      select: 'name quantity unit'
    })
    .lean();

    if (!sourceMenus || sourceMenus.length === 0) {
      return Promise.reject({ errCode: 'SOURCE_MENUS_NOT_FOUND' });
    }

    // Step 2: Extract unique category names from source menus
    const categoryNames = [...new Set(sourceMenus.map(m => m.categoryRef).filter(Boolean))];

    // If categoryRef is an object with name, extract it; otherwise assume it's already the name
    const uniqueCategoryNames = categoryNames.map(cat => {
      if (typeof cat === 'object' && cat !== null && cat.name) {
        return cat.name;
      }
      return cat;
    }).filter(Boolean);

    // Step 3: Fetch all existing categories for target restaurant in single query
    const existingCategories = await Category.find({
      name: { $in: uniqueCategoryNames },
      restaurantRef: restaurantRef,
      status: app.config.contentManagement.category.active
    }).lean();

    // Create a map for quick lookup: categoryName -> categoryId
    const categoryMap = new Map();
    existingCategories.forEach(cat => {
      categoryMap.set(cat.name.toLowerCase(), cat._id);
    });

    // Step 4: Identify categories that need to be created
    const categoriesToCreate = [];
    uniqueCategoryNames.forEach(catName => {
      const key = catName.toLowerCase();
      if (!categoryMap.has(key)) {
        categoriesToCreate.push({
          name: catName,
          restaurantRef: restaurantRef,
          createdBy: createdBy,
          filterText: catName.split(' ').slice(0, 2).join(' '),
          status: app.config.contentManagement.category.active,
          totalMenu: 0
        });
      }
    });

    // Bulk create missing categories (if any)
    if (categoriesToCreate.length > 0) {
      const createdCategories = await Category.insertMany(categoriesToCreate, { ordered: false });
      createdCategories.forEach(cat => {
        categoryMap.set(cat.name.toLowerCase(), cat._id);
      });
    }

    // Step 5: Build menu clone data with mapped categoryIds
    const menusToCreate = sourceMenus.map(sourceMenu => {
      // Get category name from source menu
      let categoryName;
      if (typeof sourceMenu.categoryRef === 'object' && sourceMenu.categoryRef !== null) {
        categoryName = sourceMenu.categoryRef.name;
      } else {
        categoryName = sourceMenu.categoryRef;
      }

      const categoryId = categoryMap.get(categoryName.toLowerCase());

      return {
        name: sourceMenu.name,
        order: sourceMenu.order,
        status: app.config.contentManagement.menu.active,
        restaurantRef: restaurantRef,
        createdBy: createdBy,
        isCreatedByImmeDine: sourceMenu.isCreatedByImmeDine || false,
        categoryRef: categoryId,
        price: sourceMenu.price,
        isVeg: sourceMenu.isVeg,
        isNonVeg: sourceMenu.isNonVeg,
        isSpicy: sourceMenu.isSpicy,
        description: sourceMenu.description,
        images: sourceMenu.images || [],
        excludeGST: sourceMenu.excludeGST || false,
        excludeServiceCharge: sourceMenu.excludeServiceCharge || false,
        isAvailable: false, // Default to unavailable for franchise to review
        preparationTime: sourceMenu.preparationTime,
        availability: sourceMenu.availability,
        // Clone languages if present
        languagesRef: sourceMenu.languagesRef || []
      };
    }).filter(menu => menu.categoryRef); // Only include menus with valid categoryRef

    // Step 6: Bulk insert all menus
    const createdMenus = await Menu.insertMany(menusToCreate, { ordered: false });

    // Step 7: Update totalMenu count for created/updated categories
    const categoryIds = [...new Set(createdMenus.map(m => m.categoryRef.toString()))];
    if (categoryIds.length > 0) {
      await Category.updateMany(
        { _id: { $in: categoryIds } },
        { $inc: { totalMenu: 1 } }
      );
    }

    return Promise.resolve({
      success: true,
      createdMenusCount: createdMenus.length,
      createdCategoriesCount: categoriesToCreate.length,
      menus: createdMenus
    });
  };

  return {
    'create': createMenu,
    'get': findMenuById,
    'edit': editMenu,
    'list': getList,
    'remove': removeMenu,
    'listFromApp': listFromApp,
    'removeInventoryItem': removeInventoryItem,
    'updateOrderCount': updateOrderCount,
    'updateBulkOrderCount': updateBulkOrderCount,
    'bulkUpload': bulkUpload,
    'cloneMenusToFranchise': cloneMenusToFranchise
  };
};