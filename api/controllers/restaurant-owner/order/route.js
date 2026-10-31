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
  const restControllers = require('../restaurant/controller')(app);

  /**
   * The Common Middlewares for these APIs
   * @type {Object}
   */
  const commonMiddlewares = require('../../common/middleware')(app);

  /**
   * Adds a order
   */
  router.post('/create', [
    options.validateBody(schemaValidator.add),
    restControllers.checkOrderSync,
    controllers.add
  ]);

  router.post('/sync-master', [
    // options.validateBody(schemaValidator.syncMaster),
    controllers.syncMaster
  ]);


  router.post('/order-otp-list', [
    // options.validateBody(schemaValidator.add),
    controllers.getOrderOtpList
  ]);

  /**
   * Fetches a list of orders
   */
  router.post('/list', [
    options.validateQuery(schemaValidator.listQuery),
    options.validateBody(schemaValidator.list),
    controllers.list
  ]);

  router.post('/ongoing-list', [
    options.validateQuery(schemaValidator.listQuery),
    options.validateBody(schemaValidator.list),
    controllers.getOngoingOrderList
  ]);

  router.post('/ongoing-list-v2', [
    options.validateQuery(schemaValidator.listQuery),
    options.validateBody(schemaValidator.list),
    controllers.getOngoingOrderListV2
  ]);

  router.post(
    "/order-queue/bulk",
    restControllers.checkOrderSync,
    controllers.addOrdersToQueue
  );

  router.put('/mark-done/:otpId', [
    options.validateParams(schemaValidator.otpParam),
    commonMiddlewares.validateId('TempOTP', 'otpId'),
    controllers.markAsDone
  ]);

  router.get('/get-by-idbid/:orderId', [
    controllers.getByIdbId
  ]);

  router.get('/get-kots/:orderId', [
    controllers.getKotsByOrderId
  ]);

  router.put('/update-by-idbid/:orderId', [
    restControllers.checkOrderSync,
    controllers.updateByIdbId
  ]);

  router.put('/update-by-idbid-v2/:orderId', [
    restControllers.checkOrderSync,
    controllers.updateByIdbIdV2
  ]);

  router.put('/update-cart-by-idbid/:orderId', [
    restControllers.checkOrderSync,
    controllers.updateCartByIdbId
  ]);

  router.route('/change-status/:orderId')
    .put([
      options.validateBody(schemaValidator.changeStatus),
      restControllers.checkOrderSync,
      controllers.changeStatus
    ]);

  router.route('/update-note/:orderId')
    .put([
      options.validateBody(schemaValidator.updateNote),
      restControllers.checkOrderSync,
      controllers.updateNote
    ]);

  router.route('/accept/:orderId')
    .put([
      restControllers.checkOrderSync,
      controllers.acceptOrder
    ]);

  router.route('/cancel/:orderId')
    .put([
      restControllers.checkOrderSync,
      controllers.cancelOrder
    ]);

  /**
   * Fetches a order, edits a order and removes a order
   */
  router.route('/:orderId')
    .all([
      options.validateParams(schemaValidator.param),
      commonMiddlewares.validateId('Order', 'orderId')
    ])
    .get([
      controllers.get
    ])
    .put([
      // options.validateBody(schemaValidator.edit),
      controllers.edit
    ]);


  return router;
};