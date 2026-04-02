'use strict';

/**
 * This module handles all functionality of profile portion in admin
 * @module Modules/Admin/Profile
 */

module.exports = function (app) {
  /**
   * Sets the profile data of the admin
   * @param  {Object}  adminDoc                      The admin document
   * @param  {Object}  profileData                   The profile data object
   * @param  {String}  profileData.firstName         The first name
   * @param  {String}  profileData.lastName          The last name
   * @param  {String}  profileData.email             The email address
   * @return {Promise}                               The promise
   */
  const setProfile = function (adminDoc, profileData) {
    let oldProfilePicture = '';

    if (profileData.firstName) {
      adminDoc.personalInfo.firstName = profileData.firstName;
    }
    if (profileData.lastName) {
      adminDoc.personalInfo.lastName = profileData.lastName;
    }
    if (profileData.email) {
      profileData.email = profileData.email.toLowerCase();
      adminDoc.personalInfo.email = profileData.email;
    }
    if (profileData.profilePicture) {
      if (adminDoc.personalInfo.profilePicture) {
        oldProfilePicture = adminDoc.personalInfo.profilePicture;
      }
      adminDoc.personalInfo.profilePicture = profileData.profilePicture;
    }
    return app.models.Admin.countDocuments({
      'personalInfo.email': profileData.email,
      _id: {
        $ne: adminDoc._id,
      },
    }).then((output) =>
      output
        ? Promise.reject({
            errCode: 'ADMIN_EMAIL_ALREADY_EXISTS',
          })
        : adminDoc.save().then((admin) => {
            if (oldProfilePicture) {
              app.utility.removeFile(oldProfilePicture);
            }
            return admin;
          })
    );
  };

  /**
   * Changes the user password
   * @param  {Object}  adminDoc    The admin document
   * @param  {String}  oldPassword The old password
   * @param  {String}  newPassword The new password
   * @return {Promise}             The promise
   */
  const changePassword = function (adminDoc, oldPassword, newPassword) {
    return app.utility
      .validatePassword(oldPassword, adminDoc.authenticationInfo.password)
      .then((isValid) =>
        isValid
          ? app.utility.encryptPassword(newPassword)
          : Promise.reject({
              errCode: 'PASSWORD_MISMATCH',
            })
      )
      .then((password) => {
        adminDoc.authenticationInfo.password = password;
        return adminDoc.save();
      });
  };

  /**
   * Logout function for admin
   * @param  {Object}  headerData            The header data
   * @param  {String}  headerData.token      The auth token
   * @param  {Number}  headerData.deviceType The device type
   * @param  {String}  headerData.deviceId   The device id
   * @return {Promise}                       The promise
   */
  const logout = function (headerData) {
    return app.module.session.kill(
      headerData.token,
      headerData.deviceType,
      headerData.deviceId,
      app.config.user.role.admin
    );
  };

  return {
    set: setProfile,
    changePassword: changePassword,
    logout: logout,
  };
};
