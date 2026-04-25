'use strict';

/**
 * This module handles all functionality of Admin RequisitionOrder
 * @module Modules/RequisitionOrder
 */
module.exports = function (app) {


  /**
   * requisitionOrder Model
   * @type {Mongoose.Model}
   */
  const RequisitionOrder = app.models.RequisitionOrder;

  /**
   * Creates a RequisitionOrder
   * @param  {Object} config  The config object
   * @return {Promise}        The promise
   */
  const createRequisitionOrder = function (config, userRef) {
    return RequisitionOrder.createRequisitionOrder(config);
  };

  /**
   * Fetches a requisitionOrder by Id
   * @param  {String} requisitionOrderId  The requisitionOrder id
   * @return {Promise}        The promise
   */
  const findRequisitionOrderById = function (requisitionOrderId, userRef) {
    return RequisitionOrder.findById(requisitionOrderId)
    .then(requisitionOrderDetails => {
      if(!requisitionOrderDetails || (requisitionOrderDetails && 
        requisitionOrderDetails.requestedByRestaurantRef.toString() !== userRef.restaurantRef.toString())) {
        return Promise.reject({
          'errCode': 'REQUISITION_NOT_FOUND'
        });
      } else {
        return Promise.resolve(requisitionOrderDetails);
      }
    });
  };

  /**
   * Edits a requisitionOrder
   * @param  {Object} editedRequisitionOrder The edited requisitionOrder document
   * @return {Promise}           The promise
   */
  const editRequisitionOrder = function (editedRequisitionOrder, userRef) {

    // if (editedRequisitionOrder.requestedByRestaurantRef.toString() !== userRef.restaurantRef.toString()) {
    //   return Promise.reject({
    //     'errCode': 'REQUISITION_NOT_FOUND'
    //   });
    // }

    return editedRequisitionOrder.save();
  };

  /**
   * Fetches a list of requisitionOrderOrders
   * @param  {Object} options  The options object
   * @return {Promise}        The promise
   */
  const getList = function (options) {
    return RequisitionOrder.pagedFind(options);
  };

  /**
   * Removes a requisitionOrder
   * @param  {Object} requisitionOrder The requisitionOrder document
   * @return {Promise}     The promise
   */
  const removeRequisitionOrder = function (requisitionOrder, userRef) {
    if (requisitionOrder.requestedByRestaurantRef.toString() !== userRef.restaurantRef.toString()) {
      return Promise.reject({
        'errCode': 'REQUISITION_NOT_FOUND'
      });
    }
    return RequisitionOrder.removeRequisitionOrder(requisitionOrder._id);
  };

  const getCount = function (options) {
    return RequisitionOrder.countDocuments(options);
  };

  return {
    'create': createRequisitionOrder,
    'get': findRequisitionOrderById,
    'edit': editRequisitionOrder,
    'list': getList,
    'remove': removeRequisitionOrder,
    'getCount': getCount
  };
};