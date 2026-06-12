'use strict';
/**
 * This Controller handles all functionality of admin menu
 * @module Controllers/Admin/menu
 */
module.exports = function(app) {

  /**
   * menu module
   * @type {Object}
   */
  const menu = app.module.menu;

  /**
   * Fetches a menu
   * @param  {Object}   req  Request 
   * @param  {Object}   res  Response
   * @param  {Function} next Next is used to pass control to the next middleware function
   * @return {Promise}       The Promise
   */
  const getMenu = (req, res, next) => {
    menu.get(req.params.menuId)
      .then(output => {
        req.workflow.outcome.data = output;
        req.workflow.emit('response');
      })
      .catch(next);
  };

  /**
   * Fetches a list of menus
   * @param  {Object}   req  Request 
   * @param  {Object}   res  Response
   * @param  {Function} next Next is used to pass control to the next middleware function
   * @return {Promise}       The Promise
   */
  const getMenuList = (req, res, next) => {
    let query = {
      skip: Number(req.query.skip) || app.config.page.defaultSkip,
      limit: Number(req.query.limit) || app.config.page.defaultLimit,
      filters: {
        status: app.config.contentManagement.menu.active,
        restaurantRef: req.body.filters.restaurantRef
      },
      sort: {
        order: 1
      }
    };

    if (req.body.filters) {
      let { name, categoryRef } = req.body.filters;
      if (name) {
        query.filters.name = new RegExp(`^${name}`, 'ig');
      }
      if (categoryRef) {
        query.filters.categoryRef = categoryRef;
      }
    }
    if (req.body.sortConfig) {
      let { name,order } = req.body.sortConfig;
      if (name) {
        query.sort.name = name;
      }
      if (order) {
        query.sort.order = order;
      }
    }

    menu.listFromApp(query)
      .then(output => {
        req.workflow.outcome.data = output;
        req.workflow.emit('response');
      })
      .catch(next);
  };


  return {
    get: getMenu,
    list: getMenuList
  };

};