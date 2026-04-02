'use strict';

/**
 * This module handles all functionality of auth portion in admin
 * @module Modules/Admin/Auth
 */
module.exports = function (app) {
  /**
   * The admin model
   * @type {Mongoose.Model}
   */
  const Admin = app.models.Admin;

  /**
   * Login function for admin
   * @param  {Object}   headerData             The header data
   * @param  {Number}   headerData.deviceType  The device type
   * @param  {String}   headerData.deviceId    The device id
   * @param  {Object}   loginData              The login data
   * @param  {String}   loginData.email        The email address
   * @param  {String}   loginData.password     The password
   * @return {Promise}                         The promise
   */
  const login = function (headerData, loginData) {
    return Admin.loginValidate(loginData.email, loginData.password).then((output) => {
      if (output.userDoc.accountStatus === app.config.user.accountStatus.admin.blocked) {
        return Promise.reject({ errCode: 'ADMIN_BLOCKED_BY_ADMIN' });
      } else {
        return Promise.resolve(output);
      }
    });
  };

  /**
   * Creates a new OTP for forgot password
   * @param  {String}  email The email
   * @return {Promise}       The promise
   */
  const forgotPasswordCreateOTP = function (email) {
    return Admin.forgotPasswordCreateOTP(email);
  };

  /**
   * Verifies the OTP and sets the new password
   * @param  {String}  email    The email
   * @param  {String}  otp      The OTP to be verified
   * @param  {String}  password The new password to be set
   * @return {Promise}          The promise
   */
  const forgotPasswordVerifyOTP = function (email, otp, password) {
    return Admin.forgotPasswordVerifyOTP(email, otp, password);
  };

  return {
    login: login,
    forgotPassword: {
      create: forgotPasswordCreateOTP,
      verify: forgotPasswordVerifyOTP,
    },
  };
};
