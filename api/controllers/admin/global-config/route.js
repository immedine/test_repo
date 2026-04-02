'use strict';

///////////////////////////////////////////////////
// THIS IS THE ROUTE FILE FOR ADMIN USER MODULE //
///////////////////////////////////////////////////

/**
 * The express router
 * @type {Express.Router}
 */
const router = require('express').Router();

/**
 * @param  {Express} app     The express app reference
 * @param  {Object}  options The options for this module
 * @return {Object}          The revealed module
 */
module.exports = function (app, options) {
  /**
   * The JSON-Schema for these APIs
   * @type {Object}
   */
  const schemaValidator = require('./schema-validator')(app);

  /**
   * The Controllers for these APIs
   * @type {Object}
   */
  const controllers = require('./controller')(app);

  /**
   * The Common Middlewares for these APIs
   * @type {Object}
   */
  const commonMiddlewares = require('../../common/middleware')(app);
  /**
   * Fetch/Edit global config
   */
  router
    .route("/")
    .get([controllers.get])
    .put([
      commonMiddlewares.checkAdminRoleAccess([
        {
          moduleName: "globalSettings",
          role: 2,
        },
      ]),
      options.validateBody(schemaValidator.edit),
      controllers.edit,
    ]);

  return router;
};
