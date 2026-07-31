'use strict';

///////////////////////////////////////////////////
// THIS IS THE ROUTE FILE FOR Requisition amount HISTORY MODULE //
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
   * Fetches a list of Requisition amount histories
   */
  router.post('/list', [
    options.validateQuery(schemaValidator.listQuery),
    options.validateBody(schemaValidator.list),
    controllers.list
  ]);

  router.post('/my-list', [
    options.validateQuery(schemaValidator.listQuery),
    options.validateBody(schemaValidator.list),
    controllers.myList
  ]);

  /**
   * Fetches a Requisition amount history and edits a Requisition amount history
   */
  router.route('/:requisitionAmountHistoryId')
    .all([
      options.validateParams(schemaValidator.param),
      commonMiddlewares.validateId('RequisitionAmountHistory', 'requisitionAmountHistoryId')
    ])
    .get([
      controllers.get
    ]);


  return router;
};