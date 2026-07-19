'use strict';

/**
 * This module handles all functionality of KOT (Kitchen Order Ticket)
 * @module Modules/KOT
 */
module.exports = function (app) {

  /**
   * KOT Model
   * @type {Mongoose.Model}
   */
  const KOT = app.models.KOT;

  /**
   * Creates a KOT
   * @param  {Object} config  The config object
   * @return {Promise}        The promise
   */
  const createKOT = async function (config, userRef) {
    if (userRef) {
      config.restaurantRef = userRef.restaurantRef;
    }

    // Generate kotNo if not provided
    if (!config.kotNo) {
      const totalKOTs = await KOT.countDocuments({
        restaurantRef: config.restaurantRef,
        orderRef: config.orderRef
      });
      config.kotNo = totalKOTs ? (totalKOTs + 1).toString() : "1";
    }

    return KOT.createKOT(config);
  };

  /**
   * Fetches a KOT by Id
   * @param  {String} kotId  The KOT id
   * @return {Promise}        The promise
   */
  const findKOTById = function (kotId, userRef) {
    return KOT.findById(kotId)
      .then(kotDetails => {
        if (!kotDetails) {
          return Promise.reject({
            'errCode': 'KOT_NOT_FOUND'
          });
        } else if (userRef && kotDetails.restaurantRef.toString() !== userRef.restaurantRef.toString()) {
          return Promise.reject({
            'errCode': 'KOT_NOT_FOUND'
          });
        } else {
          return Promise.resolve(kotDetails);
        }
      });
  };

  /**
   * Fetches KOTs by order Id
   * @param  {String} orderId  The order id
   * @return {Promise}        The promise
   */
  const findKOTByOrderId = function (orderId, userRef) {
    return KOT.find({ orderRef: orderId })
      .populate({
        path: 'items.subItems.menuRef',
        select: 'name _id'
      })
      .populate({
        path: 'items.menuRef',
        select: 'name _id'
      })
      .then(kotDetails => {
        if (userRef && kotDetails.length > 0) {
          const hasAccess = kotDetails.every(kot =>
            kot.restaurantRef.toString() === userRef.restaurantRef.toString()
          );
          if (!hasAccess) {
            return Promise.reject({
              'errCode': 'KOT_NOT_FOUND'
            });
          }
        }
        return Promise.resolve(kotDetails);
      });
  };

  /**
   * Fetches a list of KOTs
   * @param  {Object} options  The options object
   * @return {Promise}        The promise
   */
  const getList = function (options) {
    return KOT.pagedFind(options);
  };

  /**
   * Fetches KOTs by restaurant
   * @param  {String} restaurantRef  The restaurant id
   * @param  {Object} options         The options object
   * @return {Promise}               The promise
   */
  const getKOTsByRestaurant = function (restaurantRef, options) {
    return KOT.pagedFind({
      ...options,
      restaurantRef
    });
  };

  /**
   * Removes a KOT
   * @param  {Object} kot The KOT document
   * @return {Promise}     The promise
   */
  const removeKOT = function (kot, userRef) {
    if (userRef && kot.restaurantRef.toString() !== userRef.restaurantRef.toString()) {
      return Promise.reject({
        'errCode': 'KOT_NOT_FOUND'
      });
    }
    return KOT.removeKOT(kot._id);
  };

  return {
    'create': createKOT,
    'get': findKOTById,
    'getByOrder': findKOTByOrderId,
    'list': getList,
    'listByRestaurant': getKOTsByRestaurant,
    'remove': removeKOT
  };
};