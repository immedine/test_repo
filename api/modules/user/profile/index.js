'use strict';

/**
 * This module handles all functionality of profile portion in admin
 * @module Modules/User/Profile
 */

module.exports = function (app) {
  const getProfile = (token) => {
    return app.models.User.getProfile(token);
  };
  
  const updateProfile = function (userDoc, profileData) {
    let oldProfilePicture = '';

    if (profileData.personalInfo) {
      if (profileData.personalInfo && profileData.personalInfo.firstName) {
        userDoc.personalInfo.firstName = profileData.personalInfo.firstName;
      }
      
      if (profileData.personalInfo && profileData.personalInfo.lastName) {
        userDoc.personalInfo.lastName = profileData.personalInfo.lastName;
      }
  
      if (profileData.personalInfo && profileData.personalInfo.email) {
        userDoc.personalInfo.email = profileData.personalInfo.email;
      }
  
      if (profileData.personalInfo && profileData.personalInfo.phone && Object.keys(profileData.personalInfo.phone).length===2) {
        userDoc.personalInfo.phone = profileData.personalInfo.phone;
      }
  
      if (profileData.personalInfo && profileData.personalInfo.profilePicture) {
        if (userDoc.personalInfo.profilePicture) {
          oldProfilePicture = userDoc.personalInfo.profilePicture;
        }
        userDoc.personalInfo.profilePicture = profileData.personalInfo.profilePicture;
      }
  
      if (profileData.personalInfo.nationality) {
        userDoc.personalInfo.nationality = profileData.personalInfo.nationality;
      }
      
      if (profileData.personalInfo.gender) {
        userDoc.personalInfo.gender = profileData.personalInfo.gender;
      }
  
      if (profileData.personalInfo.dob) {
        userDoc.personalInfo.dob = profileData.personalInfo.dob;
      }

      return app.models.User.countDocuments({
        'personalInfo.email': profileData.personalInfo.email,
        _id: {
          $ne: userDoc._id,
        },
      }).then((output) =>
        output
          ? Promise.reject({
              errCode: 'USER_ALREADY_EXISTS',
            })
          : userDoc.save().then((usrDoc) => {
              if (oldProfilePicture) {
                app.utility.removeFile(oldProfilePicture);
              }
              return usrDoc;
            })
      );
    } else if (profileData.isNotificationEnabled !== undefined && profileData.isNotificationEnabled !== null) {
      userDoc.isNotificationEnabled = profileData.isNotificationEnabled; 
      return userDoc.save().then((usrDoc) => {
        return usrDoc;
      })
    }

    
  };

  const changePassword = function (userDoc, oldPassword, newPassword) {
    return app.utility
      .validatePassword(oldPassword, userDoc.authenticationInfo.password)
      .then((isValid) =>
        isValid
          ? app.utility.encryptPassword(newPassword)
          : Promise.reject({
              errCode: 'PASSWORD_MISMATCH',
            })
      )
      .then((password) => {
        userDoc.authenticationInfo.password = password;
        return userDoc.save();
      });
  };

  const updatePreference = (token, payload) => {
    return app.models.User.updatePreference(token, payload);
  };

  const logout = function (headerData) {
    return app.module.session.kill(
      headerData.token,
      headerData.deviceType,
      headerData.deviceId,
      app.config.user.role.user
    );
  };

  const deleteAccount = function (userDoc) {
    userDoc.accountStatus = app.config.user.accountStatus.user.deleted; 
    return userDoc.save().then((usrDoc) => {
      return usrDoc;
    });
  };

  return {
    getProfile,
    updateProfile,
    changePassword,
    updatePreference,
    logout,
    deleteAccount
  };
};
