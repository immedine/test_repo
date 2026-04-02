'use strict';

module.exports = function (app) {
  process.on('uncaughtException', function (error) {
    // app.logger.error('>>> Uncaught Exception');
    console.log(error);
    if (typeof error === 'object' && error.hasOwnProperty('stack')) {
      console.log(error.stack);
    }
    process.exit();
  });

  return function (error, request, response, next) {
    // jshint ignore:line
    // app.logger.error('>>> Unhandled Error');
    console.log(error);
    if (typeof error === 'object') {
      if (error.hasOwnProperty('message')) {
        console.log(error.message);
      }
      if (error.hasOwnProperty('stack')) {
        console.log(error.stack);
      }
    }
    return response.status(500).end();
  };
};
