'use strict';

module.exports = function (app) {
  const notification = require('./notification')(app, app.config.notification.smsGateway.sns);

  return {
    notification,
  };
};
