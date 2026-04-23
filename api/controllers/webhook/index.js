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


  router.post('/handle-payment', controllers.verify);

  return {
    'public': router
  };
};