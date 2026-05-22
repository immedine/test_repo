'use strict';
/**
 * This Controller handles all functionality of restaurant owner sales history
 * @module Controllers/RestaurantOwner/sales-history
 */
module.exports = function(app) {

  /**
   * salesHistory module
   * @type {Object}
   */
  const salesHistory = app.module.salesHistory;

  /**
   * Adds a sales history
   * @param  {Object}   req  Request
   * @param  {Object}   res  Response
   * @param  {Function} next Next is used to pass control to the next middleware function
   * @return {Promise}       The Promise
   */
  const addSalesHistory = (req, res, next) => {
    req.body.restaurantRef = req.session.user.restaurantRef;
    req.body.createdBy = req.session.user._id;
    salesHistory.create(req.body)
      .then(output => {
        req.workflow.outcome.data = output;
        req.workflow.emit('response');
      })
      .catch(next);
  };

  /**
   * Fetches a sales history
   * @param  {Object}   req  Request
   * @param  {Object}   res  Response
   * @param  {Function} next Next is used to pass control to the next middleware function
   * @return {Promise}       The Promise
   */
  const getSalesHistory = (req, res, next) => {
    salesHistory.get(req.params.salesHistoryId)
      .then(output => {
        req.workflow.outcome.data = output;
        req.workflow.emit('response');
      })
      .catch(next);
  };

  /**
   * Fetches a list of sales histories
   * @param  {Object}   req  Request
   * @param  {Object}   res  Response
   * @param  {Function} next Next is used to pass control to the next middleware function
   * @return {Promise}       The Promise
   */
  const getSalesHistoryList = (req, res, next) => {
    let query = {
      skip: Number(req.query.skip) || app.config.page.defaultSkip,
      limit: Number(req.query.limit) || app.config.page.defaultLimit,
      filters: {
        restaurantRef: req.session.user.restaurantRef,
        status: {
          $ne: app.config.contentManagement.salesHistory.deleted
        }
      },
      sort: {}
    };

    if (req.body.filters) {
      let { name } = req.body.filters;
      if (name) {
        query.filters.name = new RegExp(`^${name}`, 'ig');
      }
    }

    salesHistory.list(query)
      .then(output => {
        req.workflow.outcome.data = output;
        req.workflow.emit('response');
      })
      .catch(next);
  };

  const getMySalesHistoryList = (req, res, next) => {
    let query = {
      skip: Number(req.query.skip) || app.config.page.defaultSkip,
      limit: Number(req.query.limit) || app.config.page.defaultLimit,
      filters: {
        restaurantRef: req.session.user.restaurantRef,
        createdBy: req.session.user._id,
        status: {
          $ne: app.config.contentManagement.salesHistory.deleted
        }
      },
      sort: {}
    };

    if (req.body.filters) {
      let { name } = req.body.filters;
      if (name) {
        query.filters.name = new RegExp(`^${name}`, 'ig');
      }
    }

    salesHistory.list(query)
      .then(output => {
        req.workflow.outcome.data = output;
        req.workflow.emit('response');
      })
      .catch(next);
  };

  /**
   * Edits a sales history
   * @param  {Object}   req  Request
   * @param  {Object}   res  Response
   * @param  {Function} next Next is used to pass control to the next middleware function
   * @return {Promise}       The Promise
   */
  const editSalesHistory = (req, res, next) => {
    req.salesHistoryId.name = req.body.name;
    req.salesHistoryId.description = req.body.description;
    if (req.body.images) {
      req.salesHistoryId.images = req.body.images;
    }
    salesHistory.edit(req.salesHistoryId)
      .then(output => {
        req.workflow.outcome.data = output;
        req.workflow.emit('response');
      })
      .catch(next);
  };

  return {
    add: addSalesHistory,
    get: getSalesHistory,
    edit: editSalesHistory,
    list: getSalesHistoryList,
    myList: getMySalesHistoryList
  };

};