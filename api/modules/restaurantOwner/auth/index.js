'use strict';

/**
 * This module handles all functionality of auth portion in restaurantOwner
 * @module Modules/RestaurantOwner/Auth
 */
module.exports = function (app) {
  /**
   * The restaurantOwner model
   * @type {Mongoose.Model}
   */
  const RestaurantOwner = app.models.RestaurantOwner;

  /**
   * Login function for restaurantOwner
   * @param  {Object}   headerData             The header data
   * @param  {Number}   headerData.deviceType  The device type
   * @param  {String}   headerData.deviceId    The device id
   * @param  {Object}   loginData              The login data
   * @param  {String}   loginData.email        The email address
   * @param  {String}   loginData.password     The password
   * @return {Promise}                         The promise
   */
  const login = function (headerData, loginData) {
    return RestaurantOwner.loginValidate(loginData.email, loginData.password).then((output) => {
      if (output.userDoc.accountStatus === app.config.user.accountStatus.restaurantOwner.blocked) {
        return Promise.reject({ errCode: 'RESTAURANT_OWNER_BLOCKED_BY_ADMIN' });
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
    return RestaurantOwner.forgotPasswordCreateOTP(email);
  };

  /**
   * Verifies the OTP and sets the new password
   * @param  {String}  email    The email
   * @param  {String}  token      The Token to be verified
   * @param  {String}  password The new password to be set
   * @return {Promise}          The promise
   */
  const forgotPasswordVerifyOTP = function (token, password) {
    return RestaurantOwner.forgotPasswordVerifyOTP(token, password);
  };

  const verifyToken = function (token, type) {
    return RestaurantOwner.verifyToken(token, type);
  };

  const socialLogin = function (loginData) {
    return RestaurantOwner.socialLoginValidate(
      loginData.socialId,
      loginData.socialType,
      loginData.fullName,
      loginData.email
    ).then((output) => {
      if (output.message && output.message === "NEW_REGISTER") {
        return Promise.resolve(output);
      }
      if (output.userDoc.accountStatus === app.config.user.accountStatus.restaurantOwner.blocked) {
        return Promise.reject({ errCode: 'RESTAURANT_OWNER_BLOCKED' });
      } else {
        return Promise.resolve(output);
      }
    });
  }

  const sendVerificationLink = ({ email }) => {
    return RestaurantOwner.sendVerificationLink(email);
  };

  return {
    login: login,
    verifyToken: verifyToken,
    socialLogin,
    forgotPassword: {
      create: forgotPasswordCreateOTP,
      verify: forgotPasswordVerifyOTP,
    },
    sendVerificationLink
  };
};
