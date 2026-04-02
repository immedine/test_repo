'use strict';

/**
 * This Controller handles all functionality of Global Config
 * @module Controllers/Admin/GlobalConfig
 */
module.exports = function (app) {
  /**
   * admin module
   * @type {Object}
   */
  const globalConfig = app.module.globalConfig;
  /**
   * Edit GlobalConfig
   * @param  {Object}   req  Request
   * @param  {Object}   res  Response
   * @param  {Function} next Next is used to pass control to the next middleware function
   * @return {Promise}       The Promise
   */
  const editGlobalConfig = (req, res, next) => {
    globalConfig
      .set(req.body)
      .then((output) => {
        req.workflow.outcome.data = output;

        req.workflow.emit('response');
      })
      .catch(next);
  };

  /**
   * Fetch GlobalConfig details
   * @param  {Object}   req  Request
   * @param  {Object}   res  Response
   * @param  {Function} next Next is used to pass control to the next middleware function
   * @return {Promise}       The Promise
   */
  const getGlobalConfigDetails = (req, res, next) => {
    globalConfig
      .get(app.config.user.role.admin)
      .then((output) => {
        req.workflow.outcome.data = output;

        req.workflow.emit('response');
      })
      .catch(next);
  };

  return {
    edit: editGlobalConfig,
    get: getGlobalConfigDetails,
  };
};
