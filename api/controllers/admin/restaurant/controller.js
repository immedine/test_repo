'use strict';

/**
 * This Controller handles all functionality of admin user
 * @module Controllers/Admin/Admin-User
 */

module.exports = function(app) {

  /**
   * restaurant Module
   * @type {Object}
   */
  const restaurant = app.module.restaurant;

  /**
   * Session Module
   * @type {Object}
   */
  const session = app.module.session;

  /**
   * Adds an admin
   * @param  {Object}   req  Request 
   * @param  {Object}   res  Response
   * @param  {Function} next Next is used to pass control to the next middleware function
   * @return {Promise}       The Promise
   */
  const addRestaurant = (req, res, next) => {
    req.body.createdByAdmin = true;
    restaurant.create(req.body)
      .then(output => {
        req.workflow.emit('response');
      })
      .catch(next);
  };

  /**
   * Fetches an admin
   * @param  {Object}   req  Request 
   * @param  {Object}   res  Response
   * @param  {Function} next Next is used to pass control to the next middleware function
   * @return {Promise}       The Promise
   */
  const getRestaurant = (req, res, next) => {
    restaurant.get(req.restaurantId)
      .then(output => {
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
      },
      sort: { createdAt: -1 }
    };

    restaurant.list(query)
      .then(output => {
        req.workflow.outcome.data = output;
        req.workflow.emit('response');
      })
      .catch(next);
  };

  /**
   * Edits an admin
   * @param  {Object}   req  Request 
   * @param  {Object}   res  Response
   * @param  {Function} next Next is used to pass control to the next middleware function
   * @return {Promise}       The Promise
   */
  const editRestaurant = (req, res, next) => {
    req.restaurantId.name = req.body.name || req.restaurantId.name;
    req.restaurantId.introductoryText = req.body.introductoryText || req.restaurantId.introductoryText;
    req.restaurantId.logo = req.body.logo || req.restaurantId.logo;
    req.restaurantId.primaryColor = req.body.primaryColor || req.restaurantId.primaryColor;
    req.restaurantId.secondaryColor = req.body.secondaryColor || req.restaurantId.secondaryColor;
    req.restaurantId.status = req.body.status || req.restaurantId.status;
    restaurant.edit(req.restaurantId)
      .then(output => {
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
    req.restaurantId.status = app.config.contentManagement.restaurant.deleted;

    restaurant.edit(req.restaurantId)
      .then(output => {
        req.workflow.emit('response');
      })
      .catch(next);
  };
  /**
   * Changes(Suspend) the status of an Admin User
   * @param  {Object}   req  Request 
   * @param  {Object}   res  Response
   * @param  {Function} next Next is used to pass control to the next middleware function
   * @return {Promise}       The Promise
   */
  const changeStatus = (req, res, next) => {

    if (!req.session.user.roleInfo.isSuperAdmin) {
      return next({ 'errCode': 'N0_ACCESS' });
    }
    if (req.restaurantId.roleInfo.isSuperAdmin) {
      return next({ 'errCode': 'SUPER_ADMIN_CANNOT_BE_SUSPENDED' });
    }
    restaurant.changeStatus(req.restaurantId, req.body)
      .then(output => {
        if (req.body.accountStatus === app.config.user.accountStatus.admin.blocked) {
          return session.remove(req.restaurantId._id, app.config.user.role.admin).then(() => output);
        } else {
          return output;
        }
      })
      .then(output => {
        req.workflow.outcome.data = app.utility.format.admin(output);
        req.workflow.emit('response');
      })
      .catch(next);
  };

  return {
    add: addRestaurant,
    get: getRestaurant,
    edit: editRestaurant,
    list: getRestaurantList,
    delete: deleteRestaurant,
    changeStatus: changeStatus
  };

};