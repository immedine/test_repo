'use strict';

/**
 * This Controller handles all functionality of Global Config
 * @module Controllers/Admin/Restaurant
 */
module.exports = function (app) {
  /**
   * admin module
   * @type {Object}
   */
  const restaurant = app.module.restaurant;
  const sse = app.module.sse;
  const table = app.module.table;
  const notification = app.module.notification;

  /**
   * Fetch Restaurant details
   * @param  {Object}   req  Request
   * @param  {Object}   res  Response
   * @param  {Function} next Next is used to pass control to the next middleware function
   * @return {Promise}       The Promise
   */
  const getRestaurantDetails = (req, res, next) => {
    req.workflow.outcome.data = req.restaurantId;
    req.workflow.emit('response');
  };

  const getRestaurantList = (req, res, next) => {
    let query = {
      skip: Number(req.query.skip) || app.config.page.defaultSkip,
      limit: Number(req.query.limit) || app.config.page.defaultLimit,
      filters: {
        accountStatus: {
          $ne: app.config.contentManagement.restaurant.deleted
        },
      },
      sort: { name: 1 },
      keys: 'name _id status logo primaryColor secondaryColor config gstDetails serviceTaxDetails introductoryText'
    };

    restaurant.list(query)
      .then(output => {
        req.workflow.outcome.data = output;
        req.workflow.emit('response');
      })
      .catch(next);
  };

  const callWaiter = async (req, res, next) => {

    let message = "Call from Customer";

    if (req.body.orderId) {
      message += ` for order ${req.body.orderId}`;
    }
    if (req.body.tableId) {
      const tableDetails = await table.getFromApp(req.body.tableId);
      if (tableDetails && tableDetails.tableId) {
        message += ` at table ${tableDetails.tableId}`;
      }
    }

    sse.broadcastOrderUpdate({
      restaurantRef: req.params.restaurantId,
      type: "CALL_WAITER",
      message
    });

    notification.sendInAppNotificationToRestaurantStaffs(req.params.restaurantId, {
      notificationType: "CALL_WAITER",
      message
    });

    req.workflow.emit('response');
  };

  return {
    get: getRestaurantDetails,
    list: getRestaurantList,
    callWaiter: callWaiter
  };
};
