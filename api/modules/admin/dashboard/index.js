'use strict';

/**
 * This module handles all functionality of dashboard portion in admin
 * @module Modules/Admin/Dashboard
 */

module.exports = function(app) {
  const User = app.models.User;
  const City = app.models.City;
  const Story = app.models.Story;
  const Route = app.models.Route;

  const getStats = (userRef) => {
    if (!userRef) {
      return Promise.all([
        User.countDocuments({
          accountStatus: { $nin: [
              app.config.user.accountStatus.user.blocked,
              app.config.user.accountStatus.user.deleted,
            ], },
        }).exec()
      ]).spread((totalUser) => {
        return {
          totalUser

        };
      });
    }
    
  };
  return { getStats };
};