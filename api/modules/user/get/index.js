'use strict';

module.exports = function (app) {
  const User = app.models.User;

  const getAll = (options) => {
    return User.pagedFind(options);
  };

  return { getAll };
};
