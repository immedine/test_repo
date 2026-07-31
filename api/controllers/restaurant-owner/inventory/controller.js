'use strict';

const { inventoryCategories, inventoryItems } = require("../../../modules/cron/scripts/inventory");

/**
 * This Controller handles all functionality of admin inventory
 * @module Controllers/Admin/inventory
 */
module.exports = function (app) {

  /**
   * inventory module
   * @type {Object}
   */
  const inventory = app.module.inventory;
  const menu = app.module.menu;
  const InventoryHistory = app.models.InventoryHistory;

  /**
   * Adds a inventory
   * @param  {Object}   req  Request 
   * @param  {Object}   res  Response
   * @param  {Function} next Next is used to pass control to the next middleware function
   * @return {Promise}       The Promise
   */
  const addInventory = (req, res, next) => {
    inventory.create(req.body, req.session.user)
      .then(output => {
        req.workflow.outcome.data = output;
        req.workflow.emit('response');
      })
      .catch(next);
  };

  /**
   * Fetches a inventory
   * @param  {Object}   req  Request 
   * @param  {Object}   res  Response
   * @param  {Function} next Next is used to pass control to the next middleware function
   * @return {Promise}       The Promise
   */
  const getInventory = (req, res, next) => {
    inventory.get(req.params.inventoryId, req.session.user)
      .then(output => {
        req.workflow.outcome.data = output;
        req.workflow.emit('response');
      })
      .catch(next);
  };

  /**
   * Fetches a list of Inventories
   * @param  {Object}   req  Request 
   * @param  {Object}   res  Response
   * @param  {Function} next Next is used to pass control to the next middleware function
   * @return {Promise}       The Promise
   */
  const getInventoryList = (req, res, next) => {
    let query = {
      skip: Number(req.query.skip) || app.config.page.defaultSkip,
      limit: Number(req.query.limit) || app.config.page.defaultLimit,
      filters: {
        status: app.config.contentManagement.inventory.active,
        restaurantRef: req.session.user.restaurantRef
      },
      sort: {}
    };

    if (req.body.filters) {
      let { name, restaurantRef } = req.body.filters;
      if (name) {
        query.filters.name = new RegExp(`^${name}`, 'ig');
      }
      if (restaurantRef) {
        query.filters.restaurantRef = restaurantRef;
      }
    }
    if (req.body.sortConfig) {
      let { name } = req.body.sortConfig;
      if (name) {
        query.sort = { name };
      }
    }

    inventory.list(query)
      .then(output => {

        const filteredOutput = {
          ...output,
          data: output.data.map(item => {
            return {
              ...item._doc,
              locationList: item._doc.locationList?.length ? item._doc.locationList.map(location => {
                return {
                  ...location._doc,
                  history: []
                };
              }) : []
            }
          })
        };
        req.workflow.outcome.data = filteredOutput;
        req.workflow.emit('response');
      })
      .catch(next);
  };

  /**
   * Edits a inventory
   * @param  {Object}   req  Request
   * @param  {Object}   res  Response
   * @param  {Function} next Next is used to pass control to the next middleware function
   * @return {Promise}       The Promise
   */
  const editInventory = async (req, res, next) => {
    // Validate and prepare data before starting transaction
    if (req.body && Object.keys(req.body).length > 0) {
      for (let key in req.body) {
        if (key !== "locationList" && req.body[key] !== undefined && req.body[key] !== null) {
          req.inventoryId[key] = req.body[key];
        }
      }
    }

    // Validate restaurant ownership (from original inventory.edit)
    if (req.inventoryId.restaurantRef.toString() !== req.session.user.restaurantRef.toString()) {
      return next({ errCode: 'INVENTORY_NOT_FOUND' });
    }

    const locationList = [];
    const historyEntriesToCreate = [];

    if (req.body.locationList && req.body.locationList.length > 0) {
      req.body.locationList.forEach(location => {
        // Extract history entries from request to create in InventoryHistory collection
        if (location.history && location.history.length > 0) {
          location.history.forEach(hist => {
            historyEntriesToCreate.push({
              restaurantRef: req.inventoryId.restaurantRef,
              inventoryRef: req.inventoryId._id,
              locationRef: location.location,
              isDebited: hist.isDebited,
              quantity: hist.quantity,
              prevLocQuantity: hist.prevLocQuantity,
              prevTotalQuantity: hist.prevTotalQuantity,
              reason: hist.reason,
              reOrderCount: hist.reOrderCount || 1,
              orderRef: hist.orderRef,
              requisitionRef: hist.requisitionRef,
              expenseRef: hist.expenseRef,
              userRef: hist.userRef || req.session.user._id,
              userName: hist.userName || req.session.user.personalInfo?.fullName
            });
          });
        }

        // Remove history from location before saving to inventory
        const { history, ...locationWithoutHistory } = location;
        locationList.push(locationWithoutHistory);
      });

      req.inventoryId.locationList = locationList;
    }

    // Start transaction for atomic operations
    const session = await app.db.startSession();
    session.startTransaction();

    try {
      // Create history entries in InventoryHistory collection within transaction
      if (historyEntriesToCreate.length > 0) {
        await InventoryHistory.insertMany(historyEntriesToCreate, { session });
      }

      // Save inventory within transaction
      await req.inventoryId.save({ session });

      await session.commitTransaction();
      session.endSession();

      req.workflow.outcome.data = req.inventoryId;
      req.workflow.emit('response');
    } catch (err) {
      await session.abortTransaction();
      session.endSession();
      return next(err);
    }
  };

  /**
   * Deletes a inventory
   * @param  {Object}   req  Request 
   * @param  {Object}   res  Response
   * @param  {Function} next Next is used to pass control to the next middleware function
   * @return {Promise}       The Promise
   */
  const deleteInventory = (req, res, next) => {
    req.inventoryId.status = app.config.contentManagement.inventory.deleted;
    inventory.edit(req.inventoryId, req.session.user)
      .then(output => {
        menu.removeInventoryItem(req.inventoryId._id);
        req.workflow.emit('response');
      })
      .catch(next);
  };

  const seedInventory = (req, res, next) => {
    inventory.seedInventoryForRestaurant(req.session.user.restaurantRef, inventoryCategories, inventoryItems)
      .then(output => {
        req.workflow.emit('response');
      })
      .catch(next);
  };

  const downloadReport = (req, res, next) => {

    let { startDate, endDate } = req.body.filters;

    inventory.downloadReport({
      startDate,
      endDate,
      restaurantId: req.session.user.restaurantRef
    })
      .then(output => {
        // console.log("output ", output)
        req.workflow.outcome.data = output;
        req.workflow.emit('response');
      })
      .catch(next);
  };

  return {
    add: addInventory,
    get: getInventory,
    edit: editInventory,
    list: getInventoryList,
    delete: deleteInventory,
    seedInventory: seedInventory,
    downloadReport: downloadReport
  };

};