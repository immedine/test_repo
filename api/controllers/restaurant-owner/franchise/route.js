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

  router.post('/add', [
    options.validateBody(schemaValidator.add),
    controllers.create
  ]);

  router.put('/change-status/:franchiseId', [
    options.validateParams(schemaValidator.param),
    commonMiddlewares.validateId('Restaurant', 'franchiseId'),
    controllers.changeStatus
  ])

  router.post('/list', [
    options.validateQuery(schemaValidator.listQuery),
    controllers.list
  ]);
  /**
   * Fetch/Edit restaurant
   */
  router.route('/:franchiseId')
    .all([
      options.validateParams(schemaValidator.param),
      commonMiddlewares.validateId('Restaurant', 'franchiseId')
    ])
    .get([
      controllers.get
    ])
    .put([
      options.validateBody(schemaValidator.edit),
      controllers.edit
    ]);
    // .delete([
    //   controllers.delete
    // ]);

  return router;
};
