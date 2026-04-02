'use strict';

module.exports = function (app, next) {
  const parallelScripts = [ require('./scripts/default-super-admin')],
    dependentScripts = [];

  Promise.all(parallelScripts.map((e) => e(app)))
    .then(() => {
      Promise.all(dependentScripts.map((e) => e(app)))
        .then(() => next())
        .catch(next);
    })
    .catch(next);
};
