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
   * Adds a category
   */
  router.post('/initiate', [
    // options.validateBody(schemaValidator.add),
    controllers.initiate
  ]);

  router.put('/update-subscription', [
    // options.validateBody(schemaValidator.add),
    controllers.updateSubscription
  ]);

  router.put('/update-payment', [
    // options.validateBody(schemaValidator.add),
    controllers.updatePayment
  ]);

  router.put('/cancel-payment-subscription', [
    // options.validateBody(schemaValidator.add),
    controllers.cancelPaymentSubscription
  ]);

  router.put('/delete-subscription', [
    // options.validateBody(schemaValidator.add),
    controllers.deleteSubscription
  ]);

  // /**
  //  * Fetches a list of categories
  //  */
  // router.post('/list', [
  //   options.validateQuery(schemaValidator.listQuery),
  //   options.validateBody(schemaValidator.list),
  //   controllers.list
  // ]);

  // /**
  //  * Fetches a category, edits a category and removes a category
  //  */
  router.route('/:subscriptionId')
    .all([
      options.validateParams(schemaValidator.param),
      commonMiddlewares.validateId('Subscription', 'subscriptionId')
    ])
    .get([
      controllers.get
    ]);


  return router;
};