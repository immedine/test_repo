'use strict';

/**
 * This module handles all functionality of Global Config
 * @module Modules/GlobalConfig
 */
module.exports = function (app) {
  /**
   * The globalConfig model
   * @type {Mongoose.Model}
   */
  const GlobalConfig = app.models.GlobalConfig;

  /**
   * Get Global config by User types
   * @param  {userType} userType The user type
   * @return {Promise}           The Promise
   */
  const getGlobalConfigByUserType = function (userType) {
    let keyArray = [];
    switch (userType) {
      case app.config.user.role.user:
        keyArray = [
          'supportContactNo',
          'supportEmail',
          'appleStoreLink',
          'playStoreLink',
          'privacyPolicy',
          'termsAndConditions',
          'donate',
        ];
        break;
      default:
        keyArray = [
          'supportContactNo',
          'supportEmail',
          'appleStoreLink',
          'playStoreLink',
          'privacyPolicy',
          'termsAndConditions',
          'donate',
        ];
        break;
    }
    return GlobalConfig.getSelectedKey(keyArray);
  };

  /**
   * Set global config data
   * @param {Object} globalConfigData The global config data
   * @return {Promise} The promise
   */
  const setGlobalConfig = function (globalConfigData) {
    return GlobalConfig.findOne()
      .exec()
      .then((globalConfigDoc) => {
        if (!globalConfigDoc) {
          return (new GlobalConfig(globalConfigData)).save();
        } else {
          for (let key in globalConfigData) {
            globalConfigDoc[key] = globalConfigData[key];
          }
          return Promise.resolve(globalConfigDoc.save());
        }
      });
  };

  /**
   * Get Global config
   * @return {Promise} The promise
   */
  const getGlobalConfigDoc = function () {
    return GlobalConfig.findOne();
  };

  return {
    get: getGlobalConfigByUserType,
    set: setGlobalConfig,
    getGlobalConfigDoc: getGlobalConfigDoc,
  };
};
