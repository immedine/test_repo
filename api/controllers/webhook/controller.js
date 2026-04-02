'use strict';

/**
 * This Controller handles all functionality of Webhook
 * @module Controllers/Webhook
 */

module.exports = function(app) {

  let knownEvents = require('./events')(app);

  /**
   * verify controller
   * @param  {Object}   req  Request 
   * @param  {Object}   res  Response
   * @param  {Function} next Next is used to pass control to the next middleware function
   * @return {Promise}       The Promise
   */
  function verify(req, res, next) {
    let sig = req.headers['stripe-signature'];
    let endpointSecret = process.env.PAYMENT_ENV === 'production' ? app.config.stripe.live.endpointSecret : app.config.stripe.test.endpointSecret;
    let event = app.utility.stripe.stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    req.stripeEvent = event;
    return next();

  }

  /**
   * handleWebhook Controller
   * @param  {Object}   req  Request 
   * @param  {Object}   res  Response
   * @param  {Function} next Next is used to pass control to the next middleware function
   * @return {Promise}       The Promise
   */
  let handleWebhook = function(req, res, next) {

    if (!knownEvents[req.stripeEvent.type]) {
      console.log(req.stripeEvent.type + ': Not found in our event list');
      return res.status(200).end();
    }
    if (req.stripeEvent && req.stripeEvent.type) {

      knownEvents[req.stripeEvent.type](req, res, next);

    } else {
      return next(new Error('Stripe Event not found'));
    }

  };

  /**
   * handleBraintreeWebhook Controller
   * @param  {Object}   req  Request 
   * @param  {Object}   res  Response
   * @param  {Function} next Next is used to pass control to the next middleware function
   * @return {Promise}       The Promise
   */
  let handleBraintreeWebhook = function(req, res, next) {
    app.utility.braintree.webhookValidation(req.body.bt_signature, req.body.bt_payload, function(err, webhookNotification) {
      if (!knownEvents[webhookNotification.kind]) {
        console.log(webhookNotification.kind + ': Not found in our event list');
        return res.status(200).end();
      }
      if (webhookNotification.kind) {

        knownEvents[webhookNotification.kind](webhookNotification, res, next);

      } else {
        return next(new Error('Braintree Event not found'));
      }
    });
  };

  return {
    'verify': verify,
    'handleWebhook': handleWebhook,
    'handleBraintreeWebhook': handleBraintreeWebhook,
  };
};