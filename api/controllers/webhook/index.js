'use strict';

/**
 * The router for public routes
 * @type {Express.Router}
 */
const router = require('express').Router();


module.exports = function(app) {

  /**
   * The Controllers for these APIs
   * @type {Object}
   */
  const controllers = require('./controller')(app);


  router.post('/confirm-payment', controllers.verify, controllers.handleWebhook);

  return {
    'public': router
  };
};