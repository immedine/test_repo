'use strict';
/**
 * This Controller handles all functionality of restaurant owner sales history
 * @module Controllers/RestaurantOwner/sales-history
 */
module.exports = function(app) {

  /**
   * requisitionAmountHistory module
   * @type {Object}
   */
  const requisitionAmountHistory = app.module.requisitionAmountHistory;

  /**
   * Fetches a sales history
   * @param  {Object}   req  Request
   * @param  {Object}   res  Response
   * @param  {Function} next Next is used to pass control to the next middleware function
   * @return {Promise}       The Promise
   */
  const getRequisitionAmountHistory = (req, res, next) => {
    requisitionAmountHistory.get(req.params.requisitionAmountHistoryId)
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
  const getRequisitionAmountHistoryList = (req, res, next) => {
    let query = {
      skip: Number(req.query.skip) || app.config.page.defaultSkip,
      limit: Number(req.query.limit) || app.config.page.defaultLimit,
      filters: {
        masterRestaurantRef: req.session.user.restaurantRef
      },
      sort: {}
    };

    requisitionAmountHistory.list(query)
      .then(output => {
        req.workflow.outcome.data = output;
        req.workflow.emit('response');
      })
      .catch(next);
  };

  const getMyRequisitionAmountHistoryList = (req, res, next) => {
    let query = {
      skip: Number(req.query.skip) || app.config.page.defaultSkip,
      limit: Number(req.query.limit) || app.config.page.defaultLimit,
      filters: {
        restaurantRef: req.session.user.restaurantRef,
      },
      sort: {}
    };

    requisitionAmountHistory.list(query)
      .then(output => {
        req.workflow.outcome.data = output;
        req.workflow.emit('response');
      })
      .catch(next);
  };

  return {
    get: getRequisitionAmountHistory,
    list: getRequisitionAmountHistoryList,
    myList: getMyRequisitionAmountHistoryList
  };

};