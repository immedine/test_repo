'use strict';
/**
 * This module handles all functionality of Default Global Config
 * @module Modules/Init/DefaultGlobalConfig
 */
module.exports = function (app) {
  return new Promise((resolve, reject) => {
    app.models.GlobalConfig.countDocuments()
      .exec()
      .then((count) => {
        if (count === 0) {
          new app.models.GlobalConfig(app.config.globalConfig).save().then(resolve);
        } else {
          return Promise.resolve();
        }
      })
      .then(resolve)
      .catch(reject);
  });
};
