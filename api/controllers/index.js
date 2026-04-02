'use strict';

const router = require('express').Router();
// const express = require('express');


module.exports = function(app) {
  const schemaValidators = {
    common: require('./common/schema-validator')(app),
  };

  /**
   * Attaching to app for ease
   * @type {Object}
   */
  app.apiSchema = schemaValidators;

  /**
   * All the middlewares in this project
   * @type {Object}
   */
  const middlewares = {
    common: require('./common/middleware')(app),
  };

  /**
   * Attaching to app for ease
   * @type {Object}
   */
  app.middlewares = middlewares;

  /**
   * All the API routes in this project
   * @type {Object}
   */
  const routes = {
    admin: require('./admin')(app),
    restaurantOwner: require('./restaurant-owner')(app),
    user: require('./user')(app),
    common: require('./common/route.js')(app),
    webhook: require('./webhook/index.js')(app),
  };

  //////////////////////////////////////////////
  // Attaching the body-parser module for raw //
  //////////////////////////////////////////////
  router.use('/webhook', require('body-parser').raw({ type: '*/*' }), routes.webhook.public);
  ///////////////////////////////////////////////
  // Attaching the body-parser module for json //
  ///////////////////////////////////////////////
  router.all('*', require('body-parser').json());

  router.use('/account*', app.middlewares.common.headerValidator(), app.middlewares.common.tokenValidator());

  //----------------------------------------//
  // Attaching protected routes validations //
  //----------------------------------------//
  router.use(
    '/account*',
    app.middlewares.common.headerValidator(),
    app.middlewares.common.tokenValidator(),
    app.middlewares.common.checkBearerAuthToken()
  );

  router.use('/common', routes.common.public);

  // Admin Routes
  router.use('/admin', app.middlewares.common.headerValidator(), routes.admin.public);
  router.use(
    '/account/admin',
    app.middlewares.common.checkSession(app.config.user.role.admin),
    app.middlewares.common.checkUserAccess(app.config.user.role.admin),
    routes.admin.private
  );

  // Restaurant Owner Routes
  router.use('/restaurant-owner', app.middlewares.common.headerValidator(), routes.restaurantOwner.public);
  router.use(
    '/account/restaurant-owner',
    app.middlewares.common.checkSession(app.config.user.role.restaurantOwner),
    app.middlewares.common.checkUserAccess(app.config.user.role.restaurantOwner),
    routes.restaurantOwner.private
  );

  // Customer Routes
  router.use('/user', app.middlewares.common.headerValidator(), routes.user.public);
  router.use(
    '/account/user',
    app.middlewares.common.checkSession(app.config.user.role.user),
    app.middlewares.common.checkUserAccess(app.config.user.role.user),
    routes.user.private
  );

  return router;
};