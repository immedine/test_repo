'use strict';

module.exports = function (app) {
  const auth = require('./auth')(app);
  const profile = require('./profile')(app);
  const dashboard = require('./dashboard')(app);

  return {
    auth,
    profile,
    dashboard,
  };
};
