'use strict';

/**
 * This module handles all functionality of Admin TempOTP
 * @module Modules/TempOTP
 */
module.exports = function (app) {


  /**
   * tempOTP Model
   * @type {Mongoose.Model}
   */
  const TempOTP = app.models.TempOTP;

  /**
   * Creates a TempOTP
   * @param  {Object} config  The config object
   * @return {Promise}        The promise
   */

  const createTempOTP = async (deviceDetails) => {
    deviceDetails.otp = app.utility.getRandomCodeNumber(4);
    deviceDetails.refNo = `REF-${app.utility.getRandomCodeNumber(8)}`;
    deviceDetails.expiryTime = new Date(Date.now() + app.config.contentManagement.defaultOrderOTPExpiryTime);
    return TempOTP.createOTP(deviceDetails);
  };

  /**
   * Fetches a tempOTP by Id
   * @param  {String} tempOTPId  The tempOTP id
   * @return {Promise}        The promise
   */
  const findTempOTPByOTP = function (data) {
    return TempOTP.findOne(data)
    .then(otpDetails => {
      return Promise.resolve(otpDetails);
    });
  };

  /**
   * Removes a tempOTP
   * @param  {Object} tempOTP The tempOTP document
   * @return {Promise}     The promise
   */
  const removeTempOTP = function (data) {
    return TempOTP.removeOTP(data);
  };

  const editTempOTP = function (editedOTPDetails) {
    return editedOTPDetails.save();
  };

  const getList = function (options) {
    return TempOTP.pagedFind(options);
  };

  return {
    'create': createTempOTP,
    'get': findTempOTPByOTP,
    'remove': removeTempOTP,
    'edit': editTempOTP,
    'list': getList
  };
};