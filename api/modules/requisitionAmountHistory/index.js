'use strict';

/**
 * This module handles all functionality of Admin RequisitionAmountHistory
 * @module Modules/RequisitionAmountHistory
 */
module.exports = function (app) {
  const mongoose = require('mongoose');

  /**
   * RequisitionAmountHistory Model
   * @type {Mongoose.Model}
   */
  const RequisitionAmountHistory = app.models.RequisitionAmountHistory;

  /**
   * Creates a RequisitionAmountHistory
   * @param  {Object} config  The config object
   * @return {Promise}        The promise
   */
  const createRequisitionAmountHistory = function (config) {
    return RequisitionAmountHistory.createRequisitionAmountHistory(config);
  };

  /**
   * Fetches a RequisitionAmountHistory by Id
   * @param  {String} RequisitionAmountHistoryId  The RequisitionAmountHistory id
   * @return {Promise}        The promise
   */
  const findRequisitionAmountHistoryById = function (RequisitionAmountHistoryId, userRef) {
    return RequisitionAmountHistory.findById(RequisitionAmountHistoryId)
      .then(RequisitionAmountHistoryDetails => {
        if (!RequisitionAmountHistoryDetails) {
          return Promise.reject({
            'errCode': 'REQUISITION_AMOUNT_HISTORY_NOT_FOUND'
          });
        } else {
          return Promise.resolve(RequisitionAmountHistoryDetails);
        }
      });
  };

  /**
   * Fetches a list of inventories
   * @param  {Object} options  The options object
   * @return {Promise}        The promise
   */
  const getList = function (options) {
    return RequisitionAmountHistory.pagedFind(options);
  };

  return {
    'create': createRequisitionAmountHistory,
    'get': findRequisitionAmountHistoryById,
    'list': getList
  };
};