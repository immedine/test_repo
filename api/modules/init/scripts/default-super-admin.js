'use strict';
/**
 * This module handles all functionality of Super Admin
 * @module Modules/Init/DefaultSuperAdmin
 */
module.exports = function (app) {
  // return Promise.all([
  //   app.models.Admin.countDocuments({
  //     'roleInfo.isSuperAdmin': true,
  //   }).exec(),
  //   app.utility.encryptPassword(app.config.user.defaultAdmin.password),
  // ]).spread((countSuperAdmin, encryptedPassword) => {
  //   if (countSuperAdmin === 0) {
  //     return Promise.map(app.config.user.defaultAdmin.admins, (each) => {
  //       return new app.models.Admin({
  //         personalInfo: {
  //           firstName: each.firstName,
  //           lastName: each.lastName,
  //           email: each.email,
  //         },
  //         authenticationInfo: {
  //           password: encryptedPassword,
  //         },
  //         roleInfo: {
  //           isSuperAdmin: app.config.user.defaultAdmin.isSuperAdmin,
  //         },
  //       }).save();
  //     });
  //   } else {
  //     return Promise.resolve(null);
  //   }
  // });
  return Promise.resolve(null);
};
