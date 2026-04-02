'use strict';

/**
 * This module handles all functionality of Admin User Management
 * @module Modules/AdminUser
 */
module.exports = function (app) {

  /**
   * Admin Model
   * @type {Mongoose.Model}
   */
  const Admin = app.models.Admin;

  /**
   * Adds an admin
   * @param {Object} zoneObj The zone object
   * @param {String} lang    The lang identifier
   * @return {Promise}        The promise
   */
  const addAdmin = function (adminObj) {
    return Admin.exists({
      'personalInfo.email': adminObj.personalInfo.email,
      'accountStatus': {
        $ne: app.config.user.accountStatus.admin.deleted
      }
    })
      .then(count => count ? Promise.reject({ 'errCode': 'ADMIN_EMAIL_ALREADY_EXISTS' }) : Admin.addAdmin(adminObj));
  };

  /**
   * Fetches a list of admin
   * @param  {Object} options The options
   * @return {Promise}        The promise
   */
  const getAdminList = function (options) {
    return Admin.pagedFind(options);
  };

  /**
   * Modifies an admin
   * @param  {Object} editedZoneDoc The edited zone document
   * @param {String} lang           The lang identifier
   * @return {Promise}              The promise
   */
  const editAdmin = function (editedAdminDoc) {
    return Admin.exists({
      'personalInfo.email': editedAdminDoc.personalInfo.email,
      '_id': {
        $ne: editedAdminDoc._id
      },
      'accountStatus': {
        $ne: app.config.user.accountStatus.admin.deleted
      }
    })
      .then(count => count ? Promise.reject({ 'errCode': 'ADMIN_EMAIL_ALREADY_EXISTS' }) : editedAdminDoc.save());
  };

  /**
   * Fetches an admin
   * @param  {Object} editedZoneDoc The edited zone document
   * @param {String} lang           The lang identifier
   * @return {Promise}              The promise
   */
  const getAdmin = function (adminDoc) {
    return adminDoc.populate({
      path: 'roleInfo.roleId'
    })
  };

  /**
   * Removes an admin
   * @param  {Object} zoneDoc  The zone document
   * @return {Promise}         The promise
   */
  const removeAdmin = function (adminDoc) {
    adminDoc.accountStatus = app.config.user.accountStatus.admin.deleted;
    return adminDoc.save();
    // return adminDoc.update({
    //   '$unset': {
    //     'roleInfo.roleId': 1
    //   },
    //   'accountStatus': app.config.user.accountStatus.admin.deleted
    // }).exec();
  };

  const changeStatus = (adminDoc, data) => {
    adminDoc.accountStatus = data.accountStatus;
    return adminDoc.save();
  };


  return {
    'add': addAdmin,
    'list': getAdminList,
    'edit': editAdmin,
    'remove': removeAdmin,
    'get': getAdmin,
    'changeStatus': changeStatus
  };
};