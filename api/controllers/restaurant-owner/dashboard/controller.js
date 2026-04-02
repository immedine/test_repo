'use strict';

/**
 * This Controller handles all functionality of admin dashboard
 * @module Controllers/Admin/Dashboard
 */
module.exports = function (app) {
  /**
   * admin module
   * @type {Object}
   */
  const restaurantOwner = app.module.restaurantOwner;

  /**
   * Fetch dashboard parameters
   * @param  {Object}   req  Request
   * @param  {Object}   res  Response
   * @param  {Function} next Next is used to pass control to the next middleware function
   * @return {Promise}       The Promise
   */
  const home = function (req, res, next) {
    restaurantOwner.dashboard
      .getStats(req.session.user.restaurantRef)
      .then((output) => {
        req.workflow.outcome.data = output;
        req.workflow.emit('response');
      })
      .catch(next);
  };

  return {
    home,
  };
};
