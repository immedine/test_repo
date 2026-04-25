'use strict';

///////////////////////////////////////////////////
// THIS IS THE ROUTE FILE FOR CATEGORY MODULE //
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
   * Adds a requisition
   */
  router.post('/add', [
    options.validateBody(schemaValidator.add),
    controllers.add
  ]);

  /**
   * Fetches a list of requisitions
   */
  router.post('/list', [
    options.validateQuery(schemaValidator.listQuery),
    options.validateBody(schemaValidator.list),
    controllers.list
  ]);

  router.put('/cancel/:requisitionId', [
    options.validateParams(schemaValidator.param),
    commonMiddlewares.validateId('Requisition', 'requisitionId'),
    controllers.cancelRequisition
  ]);

  router.put('/approve-reject/:requisitionId', [
    options.validateParams(schemaValidator.param),
    commonMiddlewares.validateId('Requisition', 'requisitionId'),
    controllers.approveRejectRequisition
  ]);

  router.put('/create-order/:requisitionId', [
    options.validateParams(schemaValidator.param),
    commonMiddlewares.validateId('Requisition', 'requisitionId'),
    controllers.createRequisitionOrder
  ]);

  router.put('/order-delivered/:orderId', [
    options.validateParams(schemaValidator.orderIdParam),
    commonMiddlewares.validateId('RequisitionOrder', 'orderId'),
    controllers.requisitionOrderDelivered
  ]);

  /**
   * Fetches a requisition, edits a requisition and removes a requisition
   */
  router.route('/:requisitionId')
    .all([
      options.validateParams(schemaValidator.param),
      commonMiddlewares.validateId('Requisition', 'requisitionId')
    ])
    .get([
      controllers.get
    ])
    .put([
      options.validateBody(schemaValidator.edit),
      controllers.edit
    ]);


  return router;
};