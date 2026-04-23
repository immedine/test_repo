'use strict';

/**
 * This module handles all functionality of Admin Requisition
 * @module Modules/Requisition
 */
module.exports = function (app) {


  /**
   * requisition Model
   * @type {Mongoose.Model}
   */
  const Requisition = app.models.Requisition;

  /**
   * Creates a Requisition
   * @param  {Object} config  The config object
   * @return {Promise}        The promise
   */
  const createRequisition = function (config, userRef) {
    return Requisition.createRequisition(config);
  };

  /**
   * Fetches a requisition by Id
   * @param  {String} requisitionId  The requisition id
   * @return {Promise}        The promise
   */
  const findRequisitionById = function (requisitionId, userRef) {
    return Requisition.findById(requisitionId)
    .then(requisitionDetails => {
      if(!requisitionDetails || (requisitionDetails && 
        requisitionDetails.requestedByRestaurantRef.toString() !== userRef.restaurantRef.toString())) {
        return Promise.reject({
          'errCode': 'REQUISITION_NOT_FOUND'
        });
      } else {
        return Promise.resolve(requisitionDetails);
      }
    });
  };

  /**
   * Edits a requisition
   * @param  {Object} editedRequisition The edited requisition document
   * @return {Promise}           The promise
   */
  const editRequisition = function (editedRequisition, userRef) {

    if (editedRequisition.requestedByRestaurantRef.toString() !== userRef.restaurantRef.toString()) {
      return Promise.reject({
        'errCode': 'REQUISITION_NOT_FOUND'
      });
    }

    return editedRequisition.save();
  };

  /**
   * Fetches a list of requisitions
   * @param  {Object} options  The options object
   * @return {Promise}        The promise
   */
  const getList = function (options) {
    return Requisition.pagedFind(options);
  };

  /**
   * Removes a requisition
   * @param  {Object} requisition The requisition document
   * @return {Promise}     The promise
   */
  const removeRequisition = function (requisition, userRef) {
    if (requisition.requestedByRestaurantRef.toString() !== userRef.restaurantRef.toString()) {
      return Promise.reject({
        'errCode': 'REQUISITION_NOT_FOUND'
      });
    }
    return Requisition.removeRequisition(requisition._id);
  };

  const getCount = function (options) {
    return Requisition.countDocuments(options);
  };

  return {
    'create': createRequisition,
    'get': findRequisitionById,
    'edit': editRequisition,
    'list': getList,
    'remove': removeRequisition,
    'getCount': getCount
  };
};