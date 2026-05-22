'use strict';

/**
 * This module handles all functionality of Admin Sales History
 * @module Modules/SalesHistory
 */
module.exports = function (app) {


  /**
   * salesHistory Model
   * @type {Mongoose.Model}
   */
  const SalesHistory = app.models.SalesHistory;

  /**
   * Creates a Sales History
   * @param  {Object} config  The config object
   * @return {Promise}        The promise
   */
  const createSalesHistory = function (config) {
    return SalesHistory.createSalesHistory(config);
  };

  /**
   * Fetches a sales history by Id
   * @param  {String} salesHistoryId  The sales history id
   * @return {Promise}        The promise
   */
  const findSalesHistoryById = function (salesHistoryId) {
    return SalesHistory.findById(salesHistoryId);
  };

  /**
   * Edits a sales history
   * @param  {Object} editedSalesHistory The edited sales history document
   * @return {Promise}           The promise
   */
  const editSalesHistory = function (editedSalesHistory) {
    return editedSalesHistory.save();
  };

  /**
   * Fetches a list of sales histories
   * @param  {Object} options  The options object
   * @return {Promise}        The promise
   */
  const getList = function (options) {
    return SalesHistory.pagedFind(options);
  };

  return {
    'create': createSalesHistory,
    'get': findSalesHistoryById,
    'edit': editSalesHistory,
    'list': getList
  };
};