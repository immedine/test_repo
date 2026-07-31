'use strict';

/**
 * This module handles all functionality of Admin Inventory
 * @module Modules/Inventory
 */
module.exports = function (app) {
  const mongoose = require('mongoose');


  /**
   * inventory Model
   * @type {Mongoose.Model}
   */
  const Inventory = app.models.Inventory;
  const Restaurant = app.models.Restaurant;
  const Menu = app.models.Menu;
  const Order = app.models.Order;
  const InventoryHistory = app.models.InventoryHistory;

  /**
   * Creates a Inventory
   * @param  {Object} config  The config object
   * @return {Promise}        The promise
   */
  const createInventory = function (config, userRef) {
    config.restaurantRef = userRef.restaurantRef;
    config.createdBy = userRef._id;
    return Inventory.createInventory(config);
  };

  /**
   * Fetches a inventory by Id
   * @param  {String} inventoryId  The inventory id
   * @return {Promise}        The promise
   */
  const findInventoryById = function (inventoryId, userRef) {
    return Inventory.findById(inventoryId)
      .then(inventoryDetails => {
        if (!inventoryDetails || (inventoryDetails &&
          inventoryDetails.restaurantRef.toString() !== userRef.restaurantRef.toString())) {
          return Promise.reject({
            'errCode': 'INVENTORY_NOT_FOUND'
          });
        } else {
          return Promise.resolve(inventoryDetails);
        }
      });
  };

  /**
   * Edits a inventory
   * @param  {Object} editedInventory The edited inventory document
   * @return {Promise}           The promise
   */
  const editInventory = function (editedInventory, userRef) {

    if (editedInventory.restaurantRef.toString() !== userRef.restaurantRef.toString()) {
      return Promise.reject({
        'errCode': 'INVENTORY_NOT_FOUND'
      });
    }

    editedInventory.name_lower = editedInventory.name.toLowerCase();

    return Inventory.countDocuments({
      name_lower: editedInventory.name_lower,
      status: app.config.contentManagement.inventory.active,
      restaurantRef: editedInventory.restaurantRef,
      _id: {
        $ne: editedInventory._id
      }
    })
      .then(count => count ? Promise.reject({
        'errCode': 'INVENTORY_ALREADY_EXISTS'
      }) : editedInventory.save());
  };

  /**
   * Fetches a list of inventories
   * @param  {Object} options  The options object
   * @return {Promise}        The promise
   */
  const getList = function (options) {
    return Inventory.pagedFind(options);
  };

  /**
   * Removes a inventory
   * @param  {Object} inventory The inventory document
   * @return {Promise}     The promise
   */
  const removeInventory = function (inventory, userRef) {
    if (inventory.restaurantRef.toString() !== userRef.restaurantRef.toString()) {
      return Promise.reject({
        'errCode': 'INVENTORY_NOT_FOUND'
      });
    }
    return Inventory.removeInventory(inventory._id);
  };

  const updateInventoryCountx = async (orderItems, orderId, userData) => {
    const session = await app.db.startSession();
    session.startTransaction();

    try {
      // Prepare a map for bulk updates
      const bulkUpdates = [];
      const invIds = [];

      for (const orderItem of orderItems) {
        if (orderItem.menuRef) {
          const menu = await Menu.findById(orderItem.menuRef).populate("ingredients.inventoryRef");

          if (!menu) {
            await session.abortTransaction();
            session.endSession();
            return Promise.reject({
              'errCode': 'MENU_NOT_FOUND'
            });
          }

          if (menu.ingredients && menu.ingredients.length) {
            for (const ing of menu.ingredients) {
              if (ing.inventoryRef) {
                if ((orderId && orderItem.isNewToCart) || (!orderId)) {
                  let requiredQty = ing.quantity * orderItem.quantity;


                  // if (ing.inventoryRef.quantity < requiredQty) {
                  //   await session.abortTransaction();
                  //   session.endSession();
                  //   return Promise.reject({
                  //     'errCode': 'NOT_ENOUGH_STOCK'
                  //   });
                  // }

                  // const locationList = ing.inventoryRef.locationList;
                  // const locationData = locationList.find(each => each.location.toString() === ing.location.toString());
                  // if (locationData && Object.keys(locationData).length) {
                  //   if (locationData.quantity < requiredQty) {
                  //     await session.abortTransaction();
                  //     session.endSession();
                  //     return Promise.reject({
                  //       'errCode': 'NOT_ENOUGH_STOCK'
                  //     });
                  //   }
                  // }

                  // console.log("orderItem ", orderItem)

                  const historyEntry = {
                    quantity: requiredQty,
                    isDebited: true,
                    reason: 'NEW_ORDER',
                    prevLocQuantity: ing.inventoryRef.locationList &&
                      ing.inventoryRef.locationList.length ? ing.inventoryRef.locationList.find(loc => loc.location.toString() === ing.location.toString())?.quantity : 0,
                    prevTotalQuantity: ing.inventoryRef.quantity || 0,
                    userRef: userData._id,
                    userName: userData.personalInfo?.fullName
                  };

                  if (orderId) {
                    historyEntry.orderRef = orderId;
                  }

                  const updateObj = {
                    $inc: { 'locationList.$[loc].quantity': -requiredQty, quantity: -requiredQty },
                  }

                  if ((orderId && orderItem.isNewToCart) || (!orderId)) {
                    updateObj["$push"] = { 'locationList.$[loc].history': historyEntry }
                  }

                  invIds.push(ing.inventoryRef._id.toString());

                  console.log("updateObj ", updateObj)

                  // Push to bulk update list
                  bulkUpdates.push({
                    updateOne: {
                      filter: { _id: new mongoose.Types.ObjectId(ing.inventoryRef._id) },
                      update: updateObj,
                      arrayFilters: [{ 'loc.location': new mongoose.Types.ObjectId(ing.location) }]
                    }
                  });
                }

              }


            }

          }
          // Perform all inventory updates in bulk

        }

      }

      if (bulkUpdates.length > 0) {
        await Inventory.bulkWrite(bulkUpdates, { session });
      }


      await session.commitTransaction();
      session.endSession();

      return Promise.resolve({ success: true, message: "Order placed & inventory updated", invIds: invIds });

    } catch (err) {
      await session.abortTransaction();
      session.endSession();
      return Promise.reject({ success: false, error: err.message });
    }
  };

  const updateInventoryCount = async (orderItems, orderId, userData) => {
    const session = await app.db.startSession();
    session.startTransaction();

    try {
      // Prepare a map for bulk updates
      const bulkUpdates = [];
      const invIds = [];
      const historyRecords = [];

      for (const orderItem of orderItems) {
        if (orderItem.menuRef) {
          const menu = await Menu.findById(orderItem.menuRef).populate("ingredients.inventoryRef");

          if (!menu) {
            await session.abortTransaction();
            session.endSession();
            return Promise.reject({
              'errCode': 'MENU_NOT_FOUND'
            });
          }

          if (menu.ingredients && menu.ingredients.length) {
            for (const ing of menu.ingredients) {
              if (ing.inventoryRef) {
                if ((orderId && orderItem.isNewToCart) || (!orderId)) {
                  let requiredQty = ing.quantity * orderItem.quantity;


                  // if (ing.inventoryRef.quantity < requiredQty) {
                  //   await session.abortTransaction();
                  //   session.endSession();
                  //   return Promise.reject({
                  //     'errCode': 'NOT_ENOUGH_STOCK'
                  //   });
                  // }

                  // const locationList = ing.inventoryRef.locationList;
                  // const locationData = locationList.find(each => each.location.toString() === ing.location.toString());
                  // if (locationData && Object.keys(locationData).length) {
                  //   if (locationData.quantity < requiredQty) {
                  //     await session.abortTransaction();
                  //     session.endSession();
                  //     return Promise.reject({
                  //       'errCode': 'NOT_ENOUGH_STOCK'
                  //     });
                  //   }
                  // }

                  // console.log("orderItem ", orderItem)

                  const prevLocQuantity = ing.inventoryRef.locationList &&
                    ing.inventoryRef.locationList.length ? ing.inventoryRef.locationList.find(loc => loc.location.toString() === ing.location.toString())?.quantity : 0;
                  const prevTotalQuantity = ing.inventoryRef.quantity || 0;

                  // Create history record for InventoryHistory collection
                  const historyRecord = {
                    restaurantRef: ing.inventoryRef.restaurantRef,
                    inventoryRef: ing.inventoryRef._id,
                    locationRef: ing.location,
                    quantity: requiredQty,
                    isDebited: true,
                    reason: 'NEW_ORDER',
                    prevLocQuantity: prevLocQuantity,
                    prevTotalQuantity: prevTotalQuantity,
                    userRef: userData._id,
                    userName: userData.personalInfo?.fullName,
                    menuRef: orderItem.menuRef
                  };

                  if (orderId) {
                    historyRecord.orderRef = orderId;
                  }

                  if ((orderId && orderItem.isNewToCart) || (!orderId)) {
                    historyRecords.push(historyRecord);
                  }

                  const updateObj = {
                    $inc: { 'locationList.$[loc].quantity': -requiredQty, quantity: -requiredQty },
                  }

                  invIds.push(ing.inventoryRef._id.toString());

                  console.log("updateObj ", updateObj)

                  // Push to bulk update list
                  bulkUpdates.push({
                    updateOne: {
                      filter: { _id: new mongoose.Types.ObjectId(ing.inventoryRef._id) },
                      update: updateObj,
                      arrayFilters: [{ 'loc.location': new mongoose.Types.ObjectId(ing.location) }]
                    }
                  });
                }

              }


            }

          }
          // Perform all inventory updates in bulk

        }

      }

      if (bulkUpdates.length > 0) {
        await Inventory.bulkWrite(bulkUpdates, { session });
      }

      // Insert history records to InventoryHistory collection
      if (historyRecords.length > 0) {
        await InventoryHistory.insertMany(historyRecords, { session });
      }


      await session.commitTransaction();
      session.endSession();

      return Promise.resolve({ success: true, message: "Order placed & inventory updated", invIds: invIds });

    } catch (err) {
      await session.abortTransaction();
      session.endSession();
      return Promise.reject({ success: false, error: err.message });
    }
  };

  const updateInventoryCountSync = async (orderItems) => {
    // console.log("updateInventoryCountSync", orderItems)

    const session = await app.db.startSession();
    session.startTransaction();

    try {
      // Prepare a map for bulk updates
      const allHistoryRecords = [];
      for (const orderItem of orderItems) {
        const bulkUpdates = [];
        const invIds = [];
        if (orderItem.menuRef && orderItem.status !== app.config.contentManagement.order.deleted) {
          const menu = await Menu.findById(orderItem.menuRef).populate("ingredients.inventoryRef");

          if (!menu) {
            if (session.inTransaction()) {
              await session.abortTransaction();
              session.endSession();
            }
          }

          if (menu.ingredients && menu.ingredients.length) {
            for (const ing of menu.ingredients) {
              if (ing.inventoryRef) {
                const requiredQty = ing.quantity * orderItem.quantity;

                console.log("here called")

                const prevLocQuantity = ing.inventoryRef.locationList &&
                  ing.inventoryRef.locationList.length ? ing.inventoryRef.locationList.find(loc => loc.location.toString() === ing.location.toString())?.quantity : 0;
                const prevTotalQuantity = ing.inventoryRef.quantity || 0;

                // Create history record for InventoryHistory collection
                const historyRecord = {
                  restaurantRef: ing.inventoryRef.restaurantRef,
                  inventoryRef: ing.inventoryRef._id,
                  locationRef: ing.location,
                  quantity: requiredQty,
                  isDebited: true,
                  reason: 'NEW_ORDER',
                  prevLocQuantity: prevLocQuantity,
                  prevTotalQuantity: prevTotalQuantity
                };

                if (orderItem.orderId) {
                  historyRecord.orderRef = orderItem.orderId;
                }

                allHistoryRecords.push(historyRecord);

                invIds.push(ing.inventoryRef._id.toString());

                // Push to bulk update list
                bulkUpdates.push({
                  updateOne: {
                    filter: { _id: new mongoose.Types.ObjectId(ing.inventoryRef._id) },
                    update: {
                      $inc: { 'locationList.$[loc].quantity': -requiredQty, quantity: -requiredQty }
                    },
                    arrayFilters: [{ 'loc.location': new mongoose.Types.ObjectId(ing.location) }]
                  }
                });
              }


            }
          }
          // Perform all inventory updates in bulk

        }

        if (bulkUpdates.length > 0) {
          await Inventory.bulkWrite(bulkUpdates, { session });
        }
      }

      // Insert history records to InventoryHistory collection
      if (allHistoryRecords.length > 0) {
        await InventoryHistory.insertMany(allHistoryRecords, { session });
      }

      await session.commitTransaction();
      session.endSession();

      return Promise.resolve({ success: true, message: "Order placed & inventory updated", invIds: invIds });

    } catch (err) {
      if (session.inTransaction()) {
        await session.abortTransaction();
        session.endSession();
      }
      return Promise.resolve({ success: false, error: err.message });
    }
  };

  const updateHistoryOrderRefx = async (inventoryIds, orderId) => {
    const session = await app.db.startSession();
    session.startTransaction();

    try {
      const getEntryDate = (entry) => {
        if (entry.date) return new Date(entry.date);
      };

      for (const invId of inventoryIds) {
        const inv = await Inventory.findById(invId).session(session);
        if (!inv) continue;

        let changed = false;

        if (Array.isArray(inv.locationList)) {
          for (const loc of inv.locationList) {
            if (!Array.isArray(loc.history) || !loc.history.length) continue;

            // Update orderRef where missing
            // for (const h of loc.history) {
            //   if (!h.orderRef) {
            //     h.orderRef = orderId;
            //     changed = true;
            //   }
            // }

            // Sort history by date (newest first). Fallbacks are attempted above.
            loc.history.sort((a, b) => getEntryDate(b) - getEntryDate(a));

            // Find consecutive entries with same prevLocQuantity within 1 minute
            const duplicates = [];
            for (let i = 0; i < loc.history.length - 1; i++) {
              const current = loc.history[i];
              const next = loc.history[i + 1] ? loc.history[i + 1] : null;

              if (current?.prevLocQuantity === next?.prevLocQuantity) {
                const timeDiff = Math.abs(new Date(current.date) - new Date(next.date)) / (1000 * 60);
                if (timeDiff <= 1) {
                  duplicates.push(next._id.toString());
                } else {
                  break;
                }
              } else {
                break;
              }
            }

            // console.log("duplicates ", duplicates)

            if (!loc.history[0].orderRef) {
              loc.history[0].orderRef = orderId.toString();
              if (duplicates.length) {
                const otherHistory = loc.history.filter(h => duplicates.includes(h._id.toString()));
                otherHistory.forEach(h => {
                  if (!h.orderRef) {
                    h.orderRef = orderId.toString();
                  }
                });
              }
              changed = true;
            }
          }
        }

        if (changed) {
          await inv.save({ session });
        }
      }

      await session.commitTransaction();
      session.endSession();
      return Promise.resolve({ success: true, message: 'History orderRef updated and sorted' });
    } catch (err) {
      await session.abortTransaction();
      session.endSession();
      return Promise.reject({ success: false, error: err.message || err });
    }
  };

  const updateHistoryOrderRef = async (inventoryIds, orderRef) => {
    const session = await app.db.startSession();

    try {
      session.startTransaction();

      const getEntryDate = (entry) => {
        if (entry.createdAt) return new Date(entry.createdAt);
        if (entry.date) return new Date(entry.date);
        return new Date(0);
      };

      for (const invId of inventoryIds) {

        const historyRecords = await InventoryHistory.find({
          inventoryRef: invId
        }).session(session);

        if (!historyRecords.length) continue;

        const byLocation = {};

        for (const record of historyRecords) {
          const locRef = record.locationRef?.toString();
          if (!locRef) continue;

          if (!byLocation[locRef]) {
            byLocation[locRef] = [];
          }

          byLocation[locRef].push(record);
        }

        for (const locHistory of Object.values(byLocation)) {

          locHistory.sort((a, b) => getEntryDate(b) - getEntryDate(a));

          const idsToUpdate = [];

          const latestRecord = locHistory[0];

          if (!latestRecord || latestRecord.orderRef) {
            continue;
          }

          idsToUpdate.push(latestRecord._id);

          for (let i = 0; i < locHistory.length - 1; i++) {

            const current = locHistory[i];
            const next = locHistory[i + 1];

            if (!next) break;

            if (current.prevLocQuantity !== next.prevLocQuantity) {
              break;
            }

            const diff =
              Math.abs(getEntryDate(current) - getEntryDate(next)) /
              (1000 * 60);

            if (diff > 1) {
              break;
            }

            if (!next.orderRef) {
              idsToUpdate.push(next._id);
            }
          }

          if (idsToUpdate.length) {
            await InventoryHistory.updateMany(
              {
                _id: { $in: idsToUpdate }
              },
              {
                $set: {
                  orderRef
                }
              },
              {
                session
              }
            );
          }
        }
      }

      await session.commitTransaction();

      return {
        success: true,
        message: "History orderRef updated and sorted"
      };

    } catch (err) {

      await session.abortTransaction();

      throw err;

    } finally {

      await session.endSession();

    }
  };

  async function rollbackInventoryx(orderId, updatedItems, onlyRemove, reOrderCount, userData) {
    const session = await app.db.startSession();
    session.startTransaction();

    try {
      // Step 1: Fetch existing order
      const existingOrder = await Order.findById(orderId)
        .populate({
          path: "cart.menuRef",
          populate: { path: "ingredients.inventoryRef" }
        })
        .session(session);

      if (!existingOrder) {
        await session.abortTransaction();
        session.endSession();
        return Promise.reject({
          'errCode': 'ORDER_NOT_FOUND'
        });
      }

      // Step 2: Restore inventory from old order
      const restoreUsage = {};
      const restoreUsageLoc = {};
      const restorePrevQuantity = {};

      existingOrder.cart.forEach(item => {
        // console.log('updatedItems ', updatedItems, item)

        // check if existing item is removed from coming cart or same cart is present but updated
        const updatedItem = updatedItems.find(
          u => u && u._id && item && item._id && u._id.toString() === item._id.toString()
        );
        if (onlyRemove || (!onlyRemove && (item._id && !updatedItem) || (updatedItem && updatedItem?.updated))) {

          if (item.menuRef) {
            item.menuRef.ingredients.forEach(ing => {
              if (ing.inventoryRef) {
                const qty = ing.quantity * item.quantity;
                if (!restoreUsage[ing.inventoryRef._id]) {
                  restoreUsage[ing.inventoryRef._id] = 0;
                }
                restoreUsage[ing.inventoryRef._id] += qty;
                restoreUsageLoc[ing.inventoryRef._id] = ing.location;

                restorePrevQuantity[ing.inventoryRef._id] = {
                  prevLocQuantity: ing.inventoryRef.locationList &&
                    ing.inventoryRef.locationList.length ? ing.inventoryRef.locationList.find(loc => loc.location.toString() === ing.location.toString())?.quantity : 0,
                  prevTotalQuantity: ing.inventoryRef.quantity || 0
                }
              }

            });
          }
        }
      });

      if (restoreUsage && Object.keys(restoreUsage).length) {
        // const restoreOps = Object.entries(restoreUsage).map(([invId, qty]) => ({
        //   updateOne: { filter: { _id: invId }, update: { $inc: { quantity: qty } } }
        // }));

        const restoreOps = Object.entries(restoreUsage).map(([invId, qty]) => {
          const historyEntry = {
            orderRef: orderId,
            quantity: qty,
            isDebited: false,
            reason: 'ORDER_UPDATE',
            prevLocQuantity: restorePrevQuantity[invId]?.prevLocQuantity || 0,
            prevTotalQuantity: restorePrevQuantity[invId]?.prevTotalQuantity || 0,
            userRef: userData._id,
            userName: userData.personalInfo?.fullName
          };
          if (!onlyRemove) {
            historyEntry.reOrderCount = reOrderCount;
          }
          return {
            updateOne: {
              filter: { _id: new mongoose.Types.ObjectId(invId) },
              update: {
                $inc: {
                  'locationList.$[loc].quantity': qty, quantity: qty,
                },
                $push: { 'locationList.$[loc].history': historyEntry }
              },
              arrayFilters: [{ 'loc.location': new mongoose.Types.ObjectId(restoreUsageLoc[invId]) }]
            }
          }
        });

        if (restoreOps.length > 0) {
          await Inventory.bulkWrite(restoreOps, { session });
        }
      }


      if (!onlyRemove) {
        // Step 3: Deduct inventory for new items
        const newIngredientUsage = {};
        const newIngredientLoc = {};
        const newPrevQuantity = {};
        for (const item of updatedItems) {
          if (item.menuRef && (item.updated || !item._id)) {
            const menu = await Menu.findById(item.menuRef).populate("ingredients.inventoryRef").session(session);
            if (!menu) {
              await session.abortTransaction();
              session.endSession();
              return Promise.reject({
                'errCode': 'MENU_NOT_FOUND'
              });
            }

            menu.ingredients.forEach(ing => {
              if (ing.inventoryRef) {
                const qty = ing.quantity * item.quantity;
                if (!newIngredientUsage[ing.inventoryRef._id]) {
                  newIngredientUsage[ing.inventoryRef._id] = 0;
                }
                newIngredientUsage[ing.inventoryRef._id] += qty;
                newIngredientLoc[ing.inventoryRef._id] = ing.location;

                newPrevQuantity[ing.inventoryRef._id] = {
                  prevLocQuantity: ing.inventoryRef.locationList &&
                    ing.inventoryRef.locationList.length ? ing.inventoryRef.locationList.find(loc => loc.location.toString() === ing.location.toString())?.quantity : 0,
                  prevTotalQuantity: ing.inventoryRef.quantity || 0
                }
              }

            });
          }

        }

        // Step 3a: Validate stock before deduction
        if (newIngredientUsage && Object.keys(newIngredientUsage).length) {
          // for (const [invId, qty] of Object.entries(newIngredientUsage)) {
          // const inv = await Inventory.findById(invId).session(session);

          // const locationList = inv.locationList;
          // const locationData = locationList.find(each => each.location.toString() === newIngredientLoc[invId].toString());
          // if (locationData && Object.keys(locationData).length) {
          //   if (locationData.quantity < qty) {
          //     await session.abortTransaction();
          //     session.endSession();
          //     return Promise.reject({
          //       'errCode': 'NOT_ENOUGH_STOCK'
          //     });
          //   }
          // }


          //   if (!inv || inv.quantity < qty) {
          //     await session.abortTransaction();
          //     session.endSession();
          //     // throw new Error(`Insufficient stock for ingredient ${inv?.name || invId}`);
          //     return Promise.reject({
          //       'errCode': 'NOT_ENOUGH_STOCK'
          //     });
          //   }
          // }

          // const deductOps = Object.entries(newIngredientUsage).map(([invId, qty]) => ({
          //   updateOne: { filter: { _id: invId }, update: { $inc: { 
          //     quantity: -qty
          //   } } }
          // }));

          const deductOps = Object.entries(newIngredientUsage).map(([invId, qty]) => {
            const historyEntry = {
              orderRef: orderId,
              quantity: qty,
              isDebited: true,
              reason: 'ORDER_UPDATE',
              prevLocQuantity: newPrevQuantity[invId].prevLocQuantity,
              prevTotalQuantity: newPrevQuantity[invId].prevTotalQuantity,
              userRef: userData._id,
              userName: userData.personalInfo?.fullName
            };

            historyEntry.reOrderCount = reOrderCount;

            return {
              updateOne: {
                filter: { _id: new mongoose.Types.ObjectId(invId) },
                update: {
                  $inc: { 'locationList.$[loc].quantity': -qty, quantity: -qty },
                  $push: { 'locationList.$[loc].history': historyEntry }
                },
                arrayFilters: [{ 'loc.location': new mongoose.Types.ObjectId(newIngredientLoc[invId]) }]
              }
            };
          });

          if (deductOps.length > 0) {
            await Inventory.bulkWrite(deductOps, { session });
          }
        }
      }

      await session.commitTransaction();
      session.endSession();

      return Promise.resolve({ success: true, message: "Order updated and inventory adjusted" });

    } catch (err) {
      await session.abortTransaction();
      session.endSession();
      console.log(err)
      return Promise.reject({ success: false });
    }
  }


  async function rollbackInventory(orderId, updatedItems, onlyRemove, reOrderCount, userData) {
    const session = await app.db.startSession();

    try {
      session.startTransaction();

      // Step 1: Fetch existing order
      const existingOrder = await Order.findById(orderId)
        .populate({
          path: "cart.menuRef",
          populate: {
            path: "ingredients.inventoryRef"
          }
        })
        .session(session);

      if (!existingOrder) {
        throw {
          errCode: "ORDER_NOT_FOUND"
        };
      }

      // =====================================================
      // STEP 2 : Restore inventory from previous order
      // =====================================================

      const restoreUsage = {};
      const restoreUsageLoc = {};
      const restorePrevQuantity = {};
      const restoreUsageMenuRef = {};

      existingOrder.cart.forEach(item => {

        const updatedItem = updatedItems.find(
          u =>
            u &&
            u._id &&
            item &&
            item._id &&
            u._id.toString() === item._id.toString()
        );

        if (
          onlyRemove ||
          (
            !onlyRemove &&
            (
              (item._id && !updatedItem) ||
              (updatedItem && updatedItem.updated)
            )
          )
        ) {

          if (!item.menuRef) return;

          item.menuRef.ingredients.forEach(ing => {

            if (!ing.inventoryRef) return;

            const qty = ing.quantity * item.quantity;

            if (!restoreUsage[ing.inventoryRef._id]) {
              restoreUsage[ing.inventoryRef._id] = 0;
              restoreUsageMenuRef[ing.inventoryRef._id] = item.menuRef._id || item.menuRef;
            }

            restoreUsage[ing.inventoryRef._id] += qty;

            restoreUsageLoc[ing.inventoryRef._id] = ing.location;

            restorePrevQuantity[ing.inventoryRef._id] = {
              prevLocQuantity:
                ing.inventoryRef.locationList?.find(
                  loc =>
                    loc.location.toString() ===
                    ing.location.toString()
                )?.quantity || 0,

              prevTotalQuantity:
                ing.inventoryRef.quantity || 0
            };

          });

        }

      });

      if (Object.keys(restoreUsage).length) {

        const restoreOps = Object.entries(restoreUsage).map(
          ([invId, qty]) => ({
            updateOne: {
              filter: {
                _id: new mongoose.Types.ObjectId(invId)
              },
              update: {
                $inc: {
                  "locationList.$[loc].quantity": qty,
                  quantity: qty
                }
              },
              arrayFilters: [
                {
                  "loc.location":
                    new mongoose.Types.ObjectId(
                      restoreUsageLoc[invId]
                    )
                }
              ]
            }
          })
        );

        if (restoreOps.length) {
          await Inventory.bulkWrite(restoreOps, {
            session
          });
        }

        // -------------------------------
        // Fetch inventories once
        // -------------------------------

        const inventories = await Inventory.find({
          _id: {
            $in: Object.keys(restoreUsage)
          }
        }).session(session);

        const inventoryMap = new Map(
          inventories.map(inv => [
            inv._id.toString(),
            inv
          ])
        );

        const historyDocs = [];

        for (const [invId, qty] of Object.entries(restoreUsage)) {

          const inventory = inventoryMap.get(invId);

          if (!inventory) continue;

          const historyData = {
            restaurantRef: inventory.restaurantRef,
            inventoryRef: inventory._id,
            locationRef: restoreUsageLoc[invId],
            orderRef: orderId,
            quantity: qty,
            isDebited: false,
            reason: "ORDER_UPDATE",
            prevLocQuantity:
              restorePrevQuantity[invId]?.prevLocQuantity || 0,
            prevTotalQuantity:
              restorePrevQuantity[invId]?.prevTotalQuantity || 0,
            userRef: userData._id,
            userName:
              userData.personalInfo?.fullName,
            menuRef: restoreUsageMenuRef[invId]
          };

          if (!onlyRemove) {
            historyData.reOrderCount = reOrderCount;
          }

          historyDocs.push(historyData);

        }

        if (historyDocs.length) {
          await InventoryHistory.insertMany(
            historyDocs,
            {
              session
            }
          );
        }

      }

      // =====================================================
      // STEP 3 : Deduct inventory for updated/new items
      // =====================================================

      if (!onlyRemove) {

        const newIngredientUsage = {};
        const newIngredientLoc = {};
        const newPrevQuantity = {};
        const newIngredientMenuRef = {};
        for (const item of updatedItems) {

          if (!(item.menuRef && (item.updated || !item._id))) {
            continue;
          }

          const menu = await Menu.findById(item.menuRef)
            .populate("ingredients.inventoryRef")
            .session(session);

          if (!menu) {
            throw {
              errCode: "MENU_NOT_FOUND"
            };
          }

          menu.ingredients.forEach(ing => {

            if (!ing.inventoryRef) return;

            const qty = ing.quantity * item.quantity;

            if (!newIngredientUsage[ing.inventoryRef._id]) {
              newIngredientUsage[ing.inventoryRef._id] = 0;
              newIngredientMenuRef[ing.inventoryRef._id] = item.menuRef;
            }

            newIngredientUsage[ing.inventoryRef._id] += qty;

            newIngredientLoc[ing.inventoryRef._id] =
              ing.location;

            newPrevQuantity[ing.inventoryRef._id] = {
              prevLocQuantity:
                ing.inventoryRef.locationList?.find(
                  loc =>
                    loc.location.toString() ===
                    ing.location.toString()
                )?.quantity || 0,

              prevTotalQuantity:
                ing.inventoryRef.quantity || 0
            };

          });

        }

        // =====================================================
        // Stock validation (kept commented as in original)
        // =====================================================

        // for (const [invId, qty] of Object.entries(newIngredientUsage)) {
        //   const inv = await Inventory.findById(invId).session(session);
        //
        //   const locationData = inv.locationList.find(
        //     each =>
        //       each.location.toString() ===
        //       newIngredientLoc[invId].toString()
        //   );
        //
        //   if (locationData.quantity < qty) {
        //     throw { errCode: "NOT_ENOUGH_STOCK" };
        //   }
        // }

        if (Object.keys(newIngredientUsage).length) {

          const deductOps = Object.entries(newIngredientUsage).map(
            ([invId, qty]) => ({
              updateOne: {
                filter: {
                  _id: new mongoose.Types.ObjectId(invId)
                },
                update: {
                  $inc: {
                    "locationList.$[loc].quantity": -qty,
                    quantity: -qty
                  }
                },
                arrayFilters: [
                  {
                    "loc.location":
                      new mongoose.Types.ObjectId(
                        newIngredientLoc[invId]
                      )
                  }
                ]
              }
            })
          );

          if (deductOps.length) {
            await Inventory.bulkWrite(deductOps, {
              session
            });
          }

          // ---------------------------------------------
          // Fetch inventories ONCE
          // ---------------------------------------------

          const inventories = await Inventory.find({
            _id: {
              $in: Object.keys(newIngredientUsage)
            }
          }).session(session);

          const inventoryMap = new Map(
            inventories.map(inv => [
              inv._id.toString(),
              inv
            ])
          );

          const historyDocs = [];

          for (const [invId, qty] of Object.entries(newIngredientUsage)) {

            const inventory = inventoryMap.get(invId);

            if (!inventory) continue;

            historyDocs.push({
              restaurantRef: inventory.restaurantRef,
              inventoryRef: inventory._id,
              locationRef: newIngredientLoc[invId],
              orderRef: orderId,
              quantity: qty,
              isDebited: true,
              reason: "ORDER_UPDATE",
              prevLocQuantity:
                newPrevQuantity[invId].prevLocQuantity,
              prevTotalQuantity:
                newPrevQuantity[invId].prevTotalQuantity,
              userRef: userData._id,
              userName:
                userData.personalInfo?.fullName,
              reOrderCount,
              menuRef: newIngredientMenuRef[invId]
            });

          }

          if (historyDocs.length) {
            await InventoryHistory.insertMany(
              historyDocs,
              {
                session
              }
            );
          }

        }

      }

      // =====================================================
      // Commit transaction
      // =====================================================

      await session.commitTransaction();

      return {
        success: true,
        message: "Order updated and inventory adjusted"
      };

    } catch (err) {

      try {
        await session.abortTransaction();
      } catch (abortErr) {
        // Ignore abort errors
      }

      console.error("rollbackInventory error:", err);

      // Preserve your existing error objects if they already have errCode
      if (err?.errCode) {
        throw err;
      }

      throw {
        success: false,
        error: err.message || err
      };

    } finally {

      await session.endSession();

    }
  }

  async function rollbackInventorySync(updatedItems, onlyRemove) {
    // console.log("rollbackInventorySync",updatedItems)
    const session = await app.db.startSession();
    session.startTransaction();

    try {
      // Step 1: Fetch existing order
      for (const order of updatedItems) {
        // if (order.status !== app.config.contentManagement.order.deleted ||
        //   (order.status === app.config.contentManagement.order.deleted && order.isRestoredWhileCancel)) {
        const existingOrder = await Order.findById(order.orderId?.toString())
          .populate({
            path: "cart.menuRef",
            populate: { path: "ingredients.inventoryRef" }
          })
          .session(session);

        if (!existingOrder) {
          if (session.inTransaction()) {
            await session.abortTransaction();
            session.endSession();
          }
        }

        // Step 2: Restore inventory from old order
        const restoreUsage = {};
        const restoreUsageLoc = {};
        const restorePrevQuantity = {};
        existingOrder.cart.forEach(item => {
          if (item.menuRef) {
            item.menuRef.ingredients.forEach(ing => {
              if (ing.inventoryRef) {
                const qty = ing.quantity * item.quantity;
                if (!restoreUsage[ing.inventoryRef._id]) {
                  restoreUsage[ing.inventoryRef._id] = 0;
                }
                restoreUsage[ing.inventoryRef._id] += qty;
                restoreUsageLoc[ing.inventoryRef._id] = ing.location;

                restorePrevQuantity[ing.inventoryRef._id] = {
                  prevLocQuantity: ing.inventoryRef.locationList &&
                    ing.inventoryRef.locationList.length ? ing.inventoryRef.locationList.find(loc => loc.location.toString() === ing.location.toString())?.quantity : 0,
                  prevTotalQuantity: ing.inventoryRef.quantity || 0
                }
              }

            });
          }
        });

        if (restoreUsage && Object.keys(restoreUsage).length) {

          const restoreOps = Object.entries(restoreUsage).map(([invId, qty]) => {
            const historyEntry = {
              orderRef: order.orderId?.toString(),
              quantity: qty,
              isDebited: false,
              reason: 'ORDER_UPDATE',
              prevLocQuantity: restorePrevQuantity[invId]?.prevLocQuantity || 0,
              prevTotalQuantity: restorePrevQuantity[invId]?.prevTotalQuantity || 0
            };
            return {
              updateOne: {
                filter: { _id: new mongoose.Types.ObjectId(invId) },
                update: {
                  $inc: {
                    'locationList.$[loc].quantity': qty, quantity: qty,
                  },
                  $push: { 'locationList.$[loc].history': historyEntry }
                },
                arrayFilters: [{ 'loc.location': new mongoose.Types.ObjectId(restoreUsageLoc[invId]) }]
              }
            }
          });

          if (restoreOps.length > 0) {
            await Inventory.bulkWrite(restoreOps, { session });
          }
        }
        // }

      }

      // Step 3: Deduct inventory for new items
      for (const item of updatedItems) {
        if (item.status !== app.config.contentManagement.order.deleted ||
          (item.status === app.config.contentManagement.order.deleted && !item.isRestoredWhileCancel)
        ) {
          const newIngredientUsage = {};
          const newIngredientLoc = {};
          const newPrevQuantity = {};
          if (item.menuRef) {
            const menu = await Menu.findById(item.menuRef).populate("ingredients.inventoryRef").session(session);
            if (!menu) {
              if (session.inTransaction()) {
                await session.abortTransaction();
                session.endSession();
              }
            }

            menu.ingredients.forEach(ing => {
              if (ing.inventoryRef) {
                const qty = ing.quantity * item.quantity;
                if (!newIngredientUsage[ing.inventoryRef._id]) {
                  newIngredientUsage[ing.inventoryRef._id] = 0;
                }
                newIngredientUsage[ing.inventoryRef._id] += qty;
                newIngredientLoc[ing.inventoryRef._id] = ing.location;

                newPrevQuantity[ing.inventoryRef._id] = {
                  prevLocQuantity: ing.inventoryRef.locationList &&
                    ing.inventoryRef.locationList.length ? ing.inventoryRef.locationList.find(loc => loc.location.toString() === ing.location.toString())?.quantity : 0,
                  prevTotalQuantity: ing.inventoryRef.quantity || 0
                }
              }

            });
          }

          // Step 3a: Validate stock before deduction
          if (newIngredientUsage && Object.keys(newIngredientUsage).length) {

            const deductOps = Object.entries(newIngredientUsage).map(([invId, qty]) => {
              const historyEntry = {
                orderRef: item.orderId?.toString(),
                quantity: qty,
                isDebited: true,
                reason: 'ORDER_UPDATE',
                prevLocQuantity: newPrevQuantity[invId].prevLocQuantity,
                prevTotalQuantity: newPrevQuantity[invId].prevTotalQuantity
              };

              return {
                updateOne: {
                  filter: { _id: new mongoose.Types.ObjectId(invId) },
                  update: {
                    $inc: { 'locationList.$[loc].quantity': -qty, quantity: -qty },
                    $push: { 'locationList.$[loc].history': historyEntry }
                  },
                  arrayFilters: [{ 'loc.location': new mongoose.Types.ObjectId(newIngredientLoc[invId]) }]
                }
              };
            });

            if (deductOps.length > 0) {
              await Inventory.bulkWrite(deductOps, { session });
            }
          }
        }


      }


      await session.commitTransaction();
      session.endSession();

      return Promise.resolve({ success: true, message: "Order updated and inventory adjusted" });

    } catch (err) {
      if (session.inTransaction()) {
        await session.abortTransaction();
        session.endSession();
      }
      console.log(err)
      return Promise.resolve({ success: false });
    }
  }

  const updateInventoryWithPurchasex = async (payload, purchaseId, isDeduct) => {
    const bulkOps = [];

    // 1️⃣ Update main inventory fields + increment total quantity
    payload.forEach(item => {
      bulkOps.push({
        updateOne: {
          filter: { _id: item.itemRef },
          update: {
            $set: {
              unit: item.unit,
              saveAsUnit: item.saveAsUnit
            },
            $inc: {
              quantity: !isDeduct ? item.quantity : -item.quantity
            }
          }
        }
      });

      // 2️⃣ Increment location quantities + push history
      item.locationList.forEach(loc => {
        bulkOps.push({
          updateOne: {
            filter: {
              _id: item.itemRef,
              "locationList.location": loc.location.toString()
            },
            update: {
              $inc: {
                "locationList.$.quantity": !isDeduct ? loc.quantity : -loc.quantity
              },
              $push: {
                "locationList.$.history": {
                  $each: [{
                    quantity: loc.quantity,
                    expenseRef: purchaseId,
                    isDebited: !isDeduct,
                    reason: !isDeduct ? 'PURCHASE_ADDITION' : 'PURCHASE_DEDUCTION'
                  }]
                }
              }
            }
          }
        });

        // 3️⃣ If location does not exist, add it
        bulkOps.push({
          updateOne: {
            filter: {
              _id: item.itemRef,
              "locationList.location": { $ne: loc.location }
            },
            update: {
              $addToSet: {
                locationList: {
                  location: loc.location,
                  quantity: !isDeduct ? loc.quantity : -loc.quantity,
                  history: [{
                    quantity: loc.quantity,
                    expenseRef: purchaseId,
                    isDebited: !isDeduct,
                    reason: !isDeduct ? 'PURCHASE_ADDITION' : 'PURCHASE_DEDUCTION'
                  }]
                }
              }
            }
          }
        });
      });


    });

    await Inventory.bulkWrite(bulkOps);
    return Promise.resolve({ success: true, message: "inventory updated" });

  }

  const updateInventoryWithPurchase = async (payload, purchaseId, isDeduct, userData) => {

    const MAX_RETRIES = 3;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {

      const session = await app.db.startSession();

      try {

        session.startTransaction();

        const bulkOps = [];
        const historyRecords = [];

        // ---------------------------------------
        // Fetch all inventories
        // ---------------------------------------

        const itemIds = payload.map(item => item.itemRef);

        const existingInventories = await Inventory.find({
          _id: { $in: itemIds }
        })
          .session(session)
          .lean();

        // ---------------------------------------
        // Build lookup map
        // ---------------------------------------

        const inventoryMap = new Map(
          existingInventories.map(inv => [
            inv._id.toString(),
            inv
          ])
        );

        // ---------------------------------------
        // Build bulk operations
        // ---------------------------------------

        for (const item of payload) {

          const oldInventory = inventoryMap.get(
            item.itemRef.toString()
          );

          if (!oldInventory) {
            continue;
          }

          // -----------------------------
          // Main inventory update
          // -----------------------------

          bulkOps.push({
            updateOne: {
              filter: {
                _id: item.itemRef
              },
              update: {
                $set: {
                  unit: item.unit,
                  saveAsUnit: item.saveAsUnit
                },
                $inc: {
                  quantity: !isDeduct
                    ? item.quantity
                    : -item.quantity
                }
              }
            }
          });

          // -----------------------------
          // Location updates
          // -----------------------------

          for (const loc of item.locationList) {

            const existingLoc =
              oldInventory.locationList?.find(
                l =>
                  l.location.toString() ===
                  loc.location.toString()
              );

            const prevLocQuantity =
              existingLoc?.quantity || 0;

            const prevTotalQuantity =
              oldInventory.quantity || 0;

            let newAvgRate =
              existingLoc?.avgRate || 0;

            if (!isDeduct) {

              const prevAmount =
                (existingLoc?.quantity || 0) *
                (existingLoc?.avgRate || 0);

              newAvgRate =
                (prevAmount + (item.amount || 0)) /
                (
                  (existingLoc?.quantity || 0) +
                  loc.quantity
                );

            }

            // -----------------------------
            // Existing location update
            // -----------------------------

            bulkOps.push({
              updateOne: {
                filter: {
                  _id: item.itemRef,
                  "locationList.location":
                    loc.location.toString()
                },
                update: {
                  $set: {
                    "locationList.$.avgRate":
                      Number.isFinite(newAvgRate)
                        ? Number(newAvgRate)
                        : 0
                  },
                  $inc: {
                    "locationList.$.quantity":
                      !isDeduct
                        ? loc.quantity
                        : -loc.quantity
                  }
                }
              }
            });

            // -----------------------------
            // Inventory history
            // -----------------------------

            historyRecords.push({
              restaurantRef:
                oldInventory.restaurantRef,
              inventoryRef: item.itemRef,
              locationRef: loc.location,
              quantity: loc.quantity,
              prevLocQuantity,
              prevTotalQuantity,
              expenseRef: purchaseId,
              isDebited: isDeduct,
              reason: !isDeduct
                ? "PURCHASE_ADDITION"
                : "PURCHASE_DEDUCTION",
              userRef: userData._id,
              userName:
                userData.personalInfo?.fullName
            });

            // -----------------------------
            // Add location if missing
            // -----------------------------

            bulkOps.push({
              updateOne: {
                filter: {
                  _id: item.itemRef,
                  "locationList.location": {
                    $ne: loc.location
                  }
                },
                update: {
                  $addToSet: {
                    locationList: {
                      location: loc.location,
                      quantity: !isDeduct
                        ? loc.quantity
                        : -loc.quantity,
                      avgRate: Number.isFinite(newAvgRate)
                        ? Number(newAvgRate)
                        : 0
                    }
                  }
                }
              }
            });

          } // end location loop

        } // end payload loop

        // ---------------------------------------
        // Execute inventory updates
        // ---------------------------------------

        if (bulkOps.length) {
          await Inventory.bulkWrite(
            bulkOps,
            { session }
          );
        }

        // ---------------------------------------
        // Insert inventory history
        // ---------------------------------------

        if (historyRecords.length) {
          await InventoryHistory.insertMany(
            historyRecords,
            { session }
          );
        }

        // ---------------------------------------
        // Commit transaction
        // ---------------------------------------

        await session.commitTransaction();

        return {
          success: true,
          message: "Inventory updated",
          previousData: existingInventories
        };

      } catch (err) {

        try {
          await session.abortTransaction();
        } catch (abortErr) {
          // Ignore abort errors
        }

        // Retry only transient transaction errors
        if (
          err?.errorLabels?.includes("TransientTransactionError") &&
          attempt < MAX_RETRIES
        ) {
          console.warn(
            `Retrying updateInventoryWithPurchase (attempt ${attempt + 1})`
          );
          continue;
        }

        console.error(err);
        throw err;

      } finally {

        await session.endSession();

      }

    } // end retry loop

    throw new Error(
      "updateInventoryWithPurchase failed after maximum retry attempts."
    );

  };


  async function seedInventoryForRestaurant(restaurantId, invCategories, inventoryItems) {
    // console.log("start")
    const session = await app.db.startSession();
    session.startTransaction();


    try {
      // ============================
      // 1️⃣  FETCH RESTAURANT
      // ============================
      const restaurant = await Restaurant.findById(restaurantId).session(session);
      if (!restaurant) throw new Error("Restaurant not found");
      // console.log("restaurant ", restaurant)

      if (!restaurant.inventoryCategories) {
        restaurant.inventoryCategories = [];
      }

      // Existing category names (lowercase for safety)
      const existingNames = restaurant.inventoryCategories.map(c => c.name.toLowerCase());

      // ============================
      // 2️⃣  ADD NEW CATEGORIES
      // ============================
      const newCategories = [];

      for (const cat of invCategories) {
        if (!existingNames.includes(cat.name.toLowerCase())) {
          const newCat = {
            _id: new mongoose.Types.ObjectId(),
            name: cat.name,
            name_lower: cat.name.toLowerCase(),
            code: cat.name
          };
          newCategories.push(newCat);
          restaurant.inventoryCategories.push(newCat);
        }
      }

      // console.log("newCategories ", newCategories)
      // Save restaurant with new categories
      await restaurant.save({ session });

      // Build quick lookup map:  categoryName → categoryId
      const categoryMap = {};
      for (const cat of restaurant.inventoryCategories) {
        categoryMap[cat.name.toLowerCase()] = cat._id;
      }

      // ============================
      // 3️⃣  PREPARE INVENTORY ITEMS FOR BULK INSERT
      // ============================
      const bulkOps = [];

      for (const item of inventoryItems) {
        const categoryId = categoryMap[item.categoryName.toLowerCase()];
        if (!categoryId) continue; // skip if category missing

        const obj = {
          name: item.name,
          name_lower: item.name.toLowerCase(),
          restaurantRef: restaurantId,
          isDefault: true,
          preCode: `${item.categoryName.slice(0, 3).replaceAll(' ', '')}`,
          code: `${item.name.slice(0, 6).replaceAll(' ', '')}`,
          unit: item.unit,
          saveAsUnit: item.saveAsUnit,
          locationList: [{
            location: restaurant.inventoryLocations[0]?._id
          }]
        };

        if (categoryId) {
          obj.categoryId = categoryId;
        }

        bulkOps.push({
          updateOne: {
            filter: {
              name_lower: item.name.toLowerCase(),
              restaurantRef: restaurantId
            },
            update: {
              $setOnInsert: obj
            },
            upsert: true
          }
        });
      }

      // ============================
      // 4️⃣  EXECUTE BULK INSERT
      // ============================
      if (bulkOps.length > 0) {
        await Inventory.bulkWrite(bulkOps, { session });
      }

      await session.commitTransaction();
      session.endSession();

      return Promise.resolve({
        status: "success",
        addedCategories: newCategories.length,
        itemsInsertedOrUpserted: bulkOps.length
      });

    } catch (err) {
      await session.abortTransaction();
      session.endSession();
      return Promise.reject({ err });
    }
  }

  const downloadReport = async ({
    startDate,
    endDate,
    restaurantId
  }) => {
    const start = new Date(startDate);
    const end = new Date(endDate);

    return await Inventory.aggregate([
      // 1️⃣ Exclude docs with null or empty locationList early (performance)
      {
        $match: {
          locationList: { $exists: true, $ne: [], $ne: null },
          restaurantRef: restaurantId
        },
      },

      // 2️⃣ Unwind locationList to process each location
      {
        $unwind: "$locationList"
      },

      // 3️⃣ Lookup history from InventoryHistory collection
      {
        $lookup: {
          from: "inventoryhistories",
          let: {
            invId: "$_id",
            locId: "$locationList.location"
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$inventoryRef", "$$invId"] },
                    { $eq: ["$locationRef", "$$locId"] }
                  ]
                },
                createdAt: { $gte: start, $lte: end }
              }
            },
            {
              $sort: { createdAt: -1 }
            }
          ],
          as: "locationList.history"
        }
      },

      // 4️⃣ Remove locations with empty history
      {
        $match: {
          "locationList.history": { $ne: [] }
        }
      },

      // 5️⃣ Group back to inventory structure
      {
        $group: {
          _id: "$_id",
          name: { $first: "$name" },
          preCode: { $first: "$preCode" },
          code: { $first: "$code" },
          status: { $first: "$status" },
          restaurantRef: { $first: "$restaurantRef" },
          createdBy: { $first: "$createdBy" },
          isDefault: { $first: "$isDefault" },
          image: { $first: "$image" },
          quantity: { $first: "$quantity" },
          unit: { $first: "$unit" },
          saveAsUnit: { $first: "$saveAsUnit" },
          inAppDisplayable: { $first: "$inAppDisplayable" },
          categoryId: { $first: "$categoryId" },
          createdAt: { $first: "$createdAt" },
          updatedAt: { $first: "$updatedAt" },
          locationList: {
            $push: "$locationList"
          }
        }
      },

      // 6️⃣ Final guard: remove docs where locationList became empty
      {
        $match: {
          locationList: { $ne: [] },
        },
      },

      // 7️⃣ Lookup orders from orderRefs in history
      {
        $lookup: {
          from: "orders",
          let: {
            orderIds: {
              $reduce: {
                input: "$locationList",
                initialValue: [],
                in: {
                  $concatArrays: [
                    "$$value",
                    {
                      $map: {
                        input: "$$this.history",
                        as: "h",
                        in: {
                          $cond: [
                            {
                              $and: [
                                { $ne: ["$$h.orderRef", null] },
                                { $ne: ["$$h.orderRef", ""] },
                              ],
                            },
                            { $toObjectId: "$$h.orderRef" },
                            null,
                          ],
                        },
                      },
                    },
                  ],
                },
              },
            },
          },
          pipeline: [
            {
              $match: {
                $expr: { $in: ["$_id", "$$orderIds"] },
              },
            },
            {
              $project: {
                _id: 1,
                idbId: 1,
                orderId: 1
              },
            },
          ],
          as: "orders",
        },
      },

      // 8️⃣ Inject populated order into each history item
      {
        $addFields: {
          locationList: {
            $map: {
              input: "$locationList",
              as: "loc",
              in: {
                $mergeObjects: [
                  "$$loc",
                  {
                    history: {
                      $map: {
                        input: "$$loc.history",
                        as: "hist",
                        in: {
                          $mergeObjects: [
                            "$$hist",
                            {
                              order: {
                                $arrayElemAt: [
                                  {
                                    $filter: {
                                      input: "$orders",
                                      as: "ord",
                                      cond: {
                                        $eq: [
                                          "$$ord._id",
                                          {
                                            $cond: [
                                              {
                                                $and: [
                                                  { $ne: ["$$hist.orderRef", null] },
                                                  { $ne: ["$$hist.orderRef", ""] },
                                                ],
                                              },
                                              { $toObjectId: "$$hist.orderRef" },
                                              null,
                                            ],
                                          },
                                        ],
                                      },
                                    },
                                  },
                                  0,
                                ],
                              },
                            },
                          ],
                        },
                      },
                    },
                  },
                ],
              },
            },
          },
        },
      },

      // 9️⃣ Cleanup helper array
      {
        $project: {
          orders: 0,
        },
      },
    ]);
  };

  const getInventoryCount = async (filter = {}) => {
    try {
      const count = await Inventory.countDocuments(filter);
      return count;
    } catch (error) {
      throw error;
    }
  };

  const updateInventoryCountForRequisition = async (orderItems, requisitionRef, userData) => {
    const session = await app.db.startSession();
    session.startTransaction();

    try {
      // Prepare a map for bulk updates
      const bulkUpdates = [];
      const invIds = [];
      const historyRecords = [];


      for (const ing of orderItems) {
        ing.inventoryRef = await Inventory.findById(ing.inventoryRef).session(session);
        if (ing.inventoryRef) {
          if (requisitionRef) {
            let requiredQty = ing.approvedQuantity || 0;

            // console.log("orderItem ", orderItem)

            const prevLocQuantity = ing.inventoryRef.locationList &&
              ing.inventoryRef.locationList.length ? ing.inventoryRef.locationList.find(loc => loc.location.toString() === ing.location.toString())?.quantity : 0;
            const prevTotalQuantity = ing.inventoryRef.quantity || 0;

            // Create history record for InventoryHistory collection
            const historyRecord = {
              restaurantRef: ing.inventoryRef.restaurantRef,
              inventoryRef: ing.inventoryRef._id,
              locationRef: ing.location,
              quantity: requiredQty,
              isDebited: true,
              reason: 'NEW_REQUISITION_ORDER',
              prevLocQuantity: prevLocQuantity,
              prevTotalQuantity: prevTotalQuantity,
              userRef: userData._id,
              userName: userData.personalInfo?.fullName,
              requisitionRef: requisitionRef
            };

            historyRecords.push(historyRecord);

            const updateObj = {
              $inc: { 'locationList.$[loc].quantity': -requiredQty, quantity: -requiredQty },
            }

            invIds.push(ing.inventoryRef._id.toString());

            // console.log("updateObj ", updateObj)

            // Push to bulk update list
            bulkUpdates.push({
              updateOne: {
                filter: { _id: new mongoose.Types.ObjectId(ing.inventoryRef._id) },
                update: updateObj,
                arrayFilters: [{ 'loc.location': new mongoose.Types.ObjectId(ing.location) }]
              }
            });
          }

        }

      }


      if (bulkUpdates.length > 0) {
        await Inventory.bulkWrite(bulkUpdates, { session });
      }

      // Insert history records to InventoryHistory collection
      if (historyRecords.length > 0) {
        await InventoryHistory.insertMany(historyRecords, { session });
      }


      await session.commitTransaction();
      session.endSession();

      return Promise.resolve({ success: true, message: "Order placed & inventory updated", invIds: invIds });

    } catch (err) {
      await session.abortTransaction();
      session.endSession();
      return Promise.reject({ success: false, error: err.message });
    }
  };

  // const addInventoryCountForRequisition = async (orderItems, requisitionRef, restaurantDetails, userData) => {
  //   const session = await app.db.startSession();
  //   session.startTransaction();

  //   try {
  //     // Prepare a map for bulk updates
  //     const bulkUpdates = [];
  //     const invIds = [];

  //     for (const ing of orderItems) {
  //       ing.inventoryRef = await Inventory.findById(ing.inventoryRef).session(session);
  //       if (ing.inventoryRef) {
  //         if (requisitionRef) {
  //           let requiredQty = ing.approvedQuantity || 0;

  //           // Check if inventory exists with case-insensitive name and restaurantRef
  //           const existingInventory = await Inventory.findOne({
  //             name: { $regex: `^${ing.inventoryRef.name}$`, $options: "i" },
  //             restaurantRef: restaurantDetails._id.toString()
  //           }).session(session);

  //           if (!existingInventory) {
  //             // Create new inventory if not found
  //             const newInventory = new Inventory({
  //               name: ing.inventoryRef.name,
  //               restaurantRef: restaurantDetails._id.toString(),
  //               quantity: requiredQty,
  //               locationList: [{
  //                 location: restaurantDetails.inventoryLocations[0]._id,
  //                 quantity: requiredQty,
  //                 history: [{
  //                   quantity: requiredQty,
  //                   isDebited: false,
  //                   reason: 'NEW_REQUISITION_ORDER',
  //                   prevLocQuantity: 0,
  //                   prevTotalQuantity: 0,
  //                   userRef: userData._id,
  //                   userName: userData.personalInfo?.fullName,
  //                   requisitionRef: requisitionRef
  //                 }]
  //               }]
  //             });
  //             await newInventory.save({ session });
  //             // ing.inventoryRef = newInventory;
  //           } else {
  //             // If inventory exists, use its ID for updates

  //             existingInventory.locationList[0].history.push({
  //               quantity: requiredQty,
  //               isDebited: false,
  //               reason: 'NEW_REQUISITION_ORDER',
  //               prevLocQuantity: existingInventory.locationList[0].quantity,
  //               prevTotalQuantity: existingInventory.quantity,
  //               userRef: userData._id,
  //               userName: userData.personalInfo?.fullName,
  //               requisitionRef: requisitionRef
  //             });
  //             existingInventory.quantity += requiredQty;
  //             existingInventory.locationList[0].quantity += requiredQty;

  //             await existingInventory.save({ session });
  //           }
  //         }

  //       }

  //     }

  //     await session.commitTransaction();
  //     session.endSession();

  //     return Promise.resolve({ success: true, message: "Req Order placed & inventory updated" });

  //   } catch (err) {
  //     await session.abortTransaction();
  //     session.endSession();
  //     return Promise.reject({ success: false, error: err.message });
  //   }
  // };

  const addInventoryCountForRequisitionx = async (
    orderItems,
    requisitionRef,
    restaurantDetails,
    userData
  ) => {
    const MAX_RETRIES = 3;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      const session = await app.db.startSession();

      try {
        session.startTransaction();

        const locationId = restaurantDetails.inventoryLocations[0]._id;

        // -------------------------------------------------
        // Load requested inventory documents
        // -------------------------------------------------

        const inventoryIds = [
          ...new Set(orderItems.map(i => i.inventoryRef.toString()))
        ];

        const invDocs = await Inventory.find({
          _id: { $in: inventoryIds }
        }).session(session);

        const invMap = new Map();

        invDocs.forEach(doc => {
          invMap.set(doc._id.toString(), doc);
        });

        // -------------------------------------------------
        // Load inventories already existing in destination
        // restaurant
        // -------------------------------------------------

        const names = [
          ...new Set(
            invDocs.map(doc => doc.name.toLowerCase())
          )
        ];

        const existingInventories = await Inventory.find({
          restaurantRef: restaurantDetails._id,
          name_lower: { $in: names }
        }).session(session);

        const existingMap = new Map();

        existingInventories.forEach(doc => {
          const locationMap = new Map();

          (doc.locationList || []).forEach(loc => {
            locationMap.set(loc.location.toString(), loc);
          });

          existingMap.set(doc.name_lower, {
            inventory: doc,
            locationMap
          });
        });

        // -------------------------------------------------
        // Collections for bulk operations
        // -------------------------------------------------

        const updateOps = [];
        const insertDocs = [];
        const historyRecords = [];

        // Prevent duplicate inventory inserts
        const pendingInsertMap = new Map();

        // -------------------------------------------------
        // Build operations
        // -------------------------------------------------

        for (const ing of orderItems) {
          const sourceInventory = invMap.get(
            ing.inventoryRef.toString()
          );

          if (!sourceInventory) {
            continue;
          }

          const requiredQty = ing.approvedQuantity || 0;

          const nameLower = sourceInventory.name.toLowerCase();

          const existingData = existingMap.get(nameLower);

          // -------------------------------------------------
          // Inventory already exists in destination restaurant
          // -------------------------------------------------

          if (existingData) {
            const existingInventory = existingData.inventory;

            const location =
              existingData.locationMap.get(locationId.toString());

            const prevLocQuantity = location?.quantity || 0;
            const prevTotalQuantity = existingInventory.quantity || 0;

            updateOps.push({
              updateOne: {
                filter: {
                  _id: existingInventory._id
                },
                update: {
                  $inc: {
                    quantity: requiredQty,
                    "locationList.$[loc].quantity": requiredQty
                  }
                },
                arrayFilters: [
                  {
                    "loc.location": locationId
                  }
                ]
              }
            });

            historyRecords.push({
              restaurantRef: existingInventory.restaurantRef,
              inventoryRef: existingInventory._id,
              locationRef: locationId,
              quantity: requiredQty,
              isDebited: false,
              reason: "NEW_REQUISITION_ORDER",
              prevLocQuantity,
              prevTotalQuantity,
              requisitionRef,
              userRef: userData._id,
              userName: userData.personalInfo?.fullName
            });

            continue;
          }

          // -------------------------------------------------
          // Inventory does not exist yet
          // Prevent duplicate inserts
          // -------------------------------------------------

          if (!pendingInsertMap.has(nameLower)) {

            pendingInsertMap.set(nameLower, true);

            insertDocs.push({
              name: sourceInventory.name,
              name_lower: nameLower,
              restaurantRef: restaurantDetails._id,
              quantity: requiredQty,

              unit: sourceInventory.unit,
              saveAsUnit: sourceInventory.saveAsUnit,
              image: sourceInventory.image,
              preCode: sourceInventory.preCode,
              code: sourceInventory.code,
              categoryId: sourceInventory.categoryId,
              status: sourceInventory.status,
              inAppDisplayable: sourceInventory.inAppDisplayable,

              locationList: [
                {
                  location: locationId,
                  quantity: requiredQty
                }
              ]
            });

          } else {
            // Same inventory name already scheduled for insert.
            // Increase its quantity instead of creating another doc.

            const doc = insertDocs.find(
              d => d.name_lower === nameLower
            );

            if (doc) {
              doc.quantity += requiredQty;
              doc.locationList[0].quantity += requiredQty;
            }
          }

          historyRecords.push({
            restaurantRef: restaurantDetails._id,
            inventoryRef: null,
            locationRef: locationId,
            quantity: requiredQty,
            isDebited: false,
            reason: "NEW_REQUISITION_ORDER",
            prevLocQuantity: 0,
            prevTotalQuantity: 0,
            requisitionRef,
            userRef: userData._id,
            userName: userData.personalInfo?.fullName,

            // Temporary field for mapping after insert
            name_lower: nameLower
          });
        }

        // -------------------------------------------------
        // Execute updates
        // -------------------------------------------------

        if (updateOps.length) {
          await Inventory.bulkWrite(updateOps, { session });
        }

        let insertedDocs = [];

        // -------------------------------------------------
        // Insert newly created inventories
        // -------------------------------------------------

        if (insertDocs.length) {
          insertedDocs = await Inventory.insertMany(insertDocs, {
            session
          });

          // Map inserted inventory IDs by name_lower
          const insertedMap = new Map();

          insertedDocs.forEach(doc => {
            insertedMap.set(doc.name_lower, doc._id);
          });

          // Update history records with newly created inventory IDs
          historyRecords.forEach(record => {
            if (
              !record.inventoryRef &&
              record.name_lower &&
              insertedMap.has(record.name_lower)
            ) {
              record.inventoryRef = insertedMap.get(record.name_lower);
            }

            // Remove temporary field before insert
            delete record.name_lower;
          });
        } else {
          // Cleanup temporary mapping field if nothing was inserted
          historyRecords.forEach(record => {
            delete record.name_lower;
          });
        }

        // -------------------------------------------------
        // Insert history
        // -------------------------------------------------

        if (historyRecords.length) {
          await InventoryHistory.insertMany(historyRecords, {
            session
          });
        }

        await session.commitTransaction();

        return {
          success: true
        };

      } catch (err) {
        await session.abortTransaction();

        // Retry transient transaction / write conflict
        const retryable =
          err?.errorLabels?.includes("TransientTransactionError") ||
          err?.errorLabels?.includes("UnknownTransactionCommitResult") ||
          err?.code === 112;

        if (retryable && attempt < MAX_RETRIES) {
          console.log(
            `Retrying addInventoryCountForRequisition (${attempt}/${MAX_RETRIES})`
          );
          continue;
        }

        console.error(err);
        throw err;

      } finally {
        await session.endSession();
      }
    }
  };

  const addInventoryCountForRequisition = async (
    orderItems,
    requisitionRef,
    restaurantDetails,
    userData
  ) => {
    const MAX_RETRIES = 3;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      const session = await app.db.startSession();

      try {
        session.startTransaction();

        const locationId = restaurantDetails.inventoryLocations[0]._id;

        // -------------------------------------------------
        // Load source inventories
        // -------------------------------------------------

        const inventoryIds = [
          ...new Set(orderItems.map(i => i.inventoryRef.toString()))
        ];

        const invDocs = await Inventory.find({
          _id: { $in: inventoryIds }
        }).session(session);

        const invMap = new Map();

        for (const doc of invDocs) {
          invMap.set(doc._id.toString(), doc);
        }

        // -------------------------------------------------
        // Load destination inventories
        // -------------------------------------------------

        const names = [
          ...new Set(invDocs.map(i => i.name.toLowerCase()))
        ];

        const existingDocs = await Inventory.find({
          restaurantRef: restaurantDetails._id,
          name_lower: { $in: names }
        }).session(session);

        const existingMap = new Map();

        for (const doc of existingDocs) {
          const locationMap = new Map();

          for (const loc of doc.locationList || []) {
            locationMap.set(loc.location.toString(), loc);
          }

          existingMap.set(doc.name_lower, {
            inventory: doc,
            locationMap
          });
        }

        // -------------------------------------------------
        // Merge duplicate inventory updates
        // key = inventoryId_locationId
        // -------------------------------------------------

        const mergedUpdates = new Map();

        for (const item of orderItems) {
          const key =
            item.inventoryRef.toString() +
            "_" +
            locationId.toString();

          if (!mergedUpdates.has(key)) {
            mergedUpdates.set(key, {
              inventoryRef: item.inventoryRef,
              quantity: 0
            });
          }

          mergedUpdates.get(key).quantity +=
            (item.approvedQuantity || 0);
        }

        const updateOps = [];
        const insertDocs = [];
        const historyRecords = [];

        // -------------------------------------------------
        // Prevent duplicate inventory inserts
        // Store actual insert doc instead of boolean
        // -------------------------------------------------

        const pendingInsertMap = new Map();

        // -------------------------------------------------
        // Build inventory updates
        // -------------------------------------------------

        for (const merged of mergedUpdates.values()) {

          const sourceInventory = invMap.get(
            merged.inventoryRef.toString()
          );

          if (!sourceInventory) {
            continue;
          }

          const requiredQty = merged.quantity;
          const nameLower = sourceInventory.name.toLowerCase();

          const existingData = existingMap.get(nameLower);

          // =============================================
          // Inventory already exists
          // =============================================

          if (existingData) {

            const existingInventory = existingData.inventory;

            const location =
              existingData.locationMap.get(locationId.toString());

            const prevLocQuantity = location?.quantity || 0;
            const prevTotalQuantity = existingInventory.quantity || 0;

            updateOps.push({
              updateOne: {
                filter: {
                  _id: existingInventory._id
                },
                update: {
                  $inc: {
                    quantity: requiredQty,
                    "locationList.$[loc].quantity": requiredQty
                  }
                },
                arrayFilters: [
                  {
                    "loc.location": locationId
                  }
                ]
              }
            });

            historyRecords.push({
              restaurantRef: existingInventory.restaurantRef,
              inventoryRef: existingInventory._id,
              locationRef: locationId,
              quantity: requiredQty,
              isDebited: false,
              reason: "NEW_REQUISITION_ORDER",
              prevLocQuantity,
              prevTotalQuantity,
              requisitionRef,
              userRef: userData._id,
              userName: userData.personalInfo?.fullName
            });

            continue;
          }

          // =============================================
          // Inventory doesn't exist
          // =============================================

          let pendingDoc = pendingInsertMap.get(nameLower);

          if (!pendingDoc) {

            pendingDoc = {
              name: sourceInventory.name,
              name_lower: nameLower,
              restaurantRef: restaurantDetails._id,

              quantity: requiredQty,

              unit: sourceInventory.unit,
              saveAsUnit: sourceInventory.saveAsUnit,
              image: sourceInventory.image,
              preCode: sourceInventory.preCode,
              code: sourceInventory.code,
              categoryId: sourceInventory.categoryId,
              status: sourceInventory.status,
              inAppDisplayable: sourceInventory.inAppDisplayable,

              locationList: [
                {
                  location: locationId,
                  quantity: requiredQty
                }
              ]
            };

            pendingInsertMap.set(nameLower, pendingDoc);
            insertDocs.push(pendingDoc);

          } else {

            // Merge duplicate insert quantities

            pendingDoc.quantity += requiredQty;
            pendingDoc.locationList[0].quantity += requiredQty;

          }

          historyRecords.push({
            restaurantRef: restaurantDetails._id,
            inventoryRef: null,
            locationRef: locationId,
            quantity: requiredQty,
            isDebited: false,
            reason: "NEW_REQUISITION_ORDER",
            prevLocQuantity: 0,
            prevTotalQuantity: 0,
            requisitionRef,
            userRef: userData._id,
            userName: userData.personalInfo?.fullName,

            // temporary mapping
            name_lower: nameLower
          });

        }

        // -------------------------------------------------
        // Execute inventory updates
        // -------------------------------------------------

        if (updateOps.length) {
          await Inventory.bulkWrite(updateOps, {
            session
          });
        }

        let insertedDocs = [];

        if (insertDocs.length) {
          insertedDocs = await Inventory.insertMany(
            insertDocs,
            { session }
          );
        }

        // -------------------------------------------------
        // Map inserted inventory IDs back to history
        // -------------------------------------------------

        if (insertedDocs.length) {

          const insertedMap = new Map();

          for (const doc of insertedDocs) {
            insertedMap.set(doc.name_lower, doc._id);
          }

          for (const history of historyRecords) {
            if (
              history.inventoryRef === null &&
              history.name_lower &&
              insertedMap.has(history.name_lower)
            ) {
              history.inventoryRef = insertedMap.get(
                history.name_lower
              );
            }

            delete history.name_lower;
          }

        } else {

          for (const history of historyRecords) {
            delete history.name_lower;
          }

        }

        // -------------------------------------------------
        // Insert inventory history
        // -------------------------------------------------

        if (historyRecords.length) {
          await InventoryHistory.insertMany(
            historyRecords,
            { session }
          );
        }

        await session.commitTransaction();

        return {
          success: true
        };

      } catch (err) {

        await session.abortTransaction();

        const retryable =
          err?.errorLabels?.includes("TransientTransactionError") ||
          err?.errorLabels?.includes("UnknownTransactionCommitResult") ||
          err?.code === 112;

        if (retryable && attempt < MAX_RETRIES) {

          console.log(
            `Retrying addInventoryCountForRequisition (${attempt}/${MAX_RETRIES})`
          );

          continue;
        }

        console.error(err);
        throw err;

      } finally {

        await session.endSession();

      }
    }
  };

  return {
    'create': createInventory,
    'get': findInventoryById,
    'edit': editInventory,
    'list': getList,
    'remove': removeInventory,
    'updateInventoryCount': updateInventoryCount,
    'rollbackInventory': rollbackInventory,
    'rollbackInventorySync': rollbackInventorySync,
    'updateHistoryOrderRef': updateHistoryOrderRef,
    updateInventoryCountSync: updateInventoryCountSync,
    updateInventoryWithPurchase: updateInventoryWithPurchase,
    seedInventoryForRestaurant: seedInventoryForRestaurant,
    downloadReport: downloadReport,
    getCount: getInventoryCount,
    updateInventoryCountForRequisition: updateInventoryCountForRequisition,
    addInventoryCountForRequisition: addInventoryCountForRequisition
  };
};