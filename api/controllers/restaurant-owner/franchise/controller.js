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
  const restaurantOwner = app.module.restaurantOwner;

  const addRestaurant = (req, res, next) => {
    req.body.createdBy = req.session.user._id;
    req.body.type = app.config.contentManagement.outletType.franchise;
    req.body.masterRestaurant = req.session.user.restaurantRef;
    req.body.deviceType = [app.config.user.deviceType.android];
    restaurant.create(req.body)
      .then(output => {
        req.workflow.emit('response');
      })
      .catch(next);
  };
  /**
   * Edit Restaurant
   * @param  {Object}   req  Request
   * @param  {Object}   res  Response
   * @param  {Function} next Next is used to pass control to the next middleware function
   * @return {Promise}       The Promise
   */
  const editRestaurant = (req, res, next) => {
    restaurant
      .set(req.params.franchiseId, req.body)
      .then((output) => {
        req.workflow.outcome.data = output;

        req.workflow.emit('response');
      })
      .catch(next);
  };

  /**
   * Fetch Restaurant details
   * @param  {Object}   req  Request
   * @param  {Object}   res  Response
   * @param  {Function} next Next is used to pass control to the next middleware function
   * @return {Promise}       The Promise
   */
  const getRestaurantDetails = (req, res, next) => {
    restaurant
      .get(req.params.franchiseId)
      .then((output) => {
        req.workflow.outcome.data = output;

        req.workflow.emit('response');
      })
      .catch(next);
  };

  /**
   * Fetches a list of admin users
   * @param  {Object}   req  Request 
   * @param  {Object}   res  Response
   * @param  {Function} next Next is used to pass control to the next middleware function
   * @return {Promise}       The Promise
   */
  const getRestaurantList = (req, res, next) => {
    let query = {
      skip: Number(req.query.skip) || app.config.page.defaultSkip,
      limit: Number(req.query.limit) || app.config.page.defaultLimit,
      filters: {
        accountStatus: {
          $ne: app.config.contentManagement.restaurant.deleted
        },
        masterRestaurant: req.session.user.restaurantRef
      },
      sort: { createdAt: -1 },
      keys: 'name _id address status createdAt'
    };

    restaurant.list(query)
      .then(output => {
        req.workflow.outcome.data = output;
        req.workflow.emit('response');
      })
      .catch(next);
  };

  /**
   * Deletes a Admin User
   * @param  {Object}   req  Request 
   * @param  {Object}   res  Response
   * @param  {Function} next Next is used to pass control to the next middleware function
   * @return {Promise}       The Promise
   */
  const deleteRestaurant = (req, res, next) => {
    req.franchiseId.status = app.config.contentManagement.restaurant.deleted;

    restaurant.edit(req.franchiseId)
      .then(output => {
        req.workflow.emit('response');
      })
      .catch(next);
  };

  const changeStatus = (req, res, next) => {

    req.franchiseId.status = req.franchiseId.status === app.config.contentManagement.restaurant.inactive ? 
    app.config.contentManagement.restaurant.active : app.config.contentManagement.restaurant.inactive;

    restaurant.edit(req.franchiseId)
      .then(output => {
        req.workflow.emit('response');
      })
      .catch(next);
  };

  return {
    create: addRestaurant,
    edit: editRestaurant,
    get: getRestaurantDetails,
    list: getRestaurantList,
    delete: deleteRestaurant,
    changeStatus: changeStatus
  };
};
