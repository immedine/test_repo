'use strict';

module.exports = function(app) {

  return {

    'charge.succeeded': function(req, res, next) {
      console.log(req.stripeEvent.type + ': event processed');
      res.status(200).end();
    },
    'charge.failed': function(req, res, next) {
      console.log(req.stripeEvent.type + ': event processed');
      res.status(200).end();
    },
    'charge.refunded': function(req, res, next) {
      console.log(req.stripeEvent.type + ': event processed');
      res.status(200).end();
    },

    'customer.subscription.created': function(req, res, next) {
      console.log(req.stripeEvent.type + ': event processed');
      res.status(200).end();
    },
    'customer.subscription.updated': function(req, res, next) {
      console.log(req.stripeEvent.type + ': event processed');
      res.status(200).end();
    },

    'invoice.created': function(req, res, next) {
      console.log(req.stripeEvent.type + ': event processed');
      res.status(200).end();
      // console.log(req.stripeEvent.type + ': event processed');
      // if (req.stripeEvent.data.object.amount_due > 0) {
      //   app.module.subscription.instantPayInvoice(req.stripeEvent.data.object)
      //     .catch(console.log);
      // }
      // res.status(200).end();
    },
    'invoice.updated': function(req, res, next) {
      console.log(req.stripeEvent.type + ': event processed');
      res.status(200).end();
    },
    'invoice.upcoming': function(req, res, next) {
      console.log(req.stripeEvent.type + ': event processed');
      res.status(200).end();
    },
    'invoice.payment_succeeded': function(req, res, next) {
      console.log(req.stripeEvent.type + ': event processed');
      if (req.stripeEvent.data.object.charge) {
        app.module.subscription.paymentRecieved(req.stripeEvent.data.object)
          .catch(console.log);
      }
      res.status(200).end();
    },
    'invoice.payment_failed': function(req, res, next) {
      if (req.stripeEvent.data.object.charge) {
        app.module.subscription.paymentFailed(req.stripeEvent.data.object)
          .catch(console.log);
      }
    },
    'payment_intent.succeeded': function(req, res, next) {
      console.log(req.stripeEvent.type + ': event processed');
      res.status(200).end();
      // console.log(req.stripeEvent.type + ': event processed');
      // app.module.subscription.paymentIntentSucceeded(req.stripeEvent.data.object)
      //   .catch(console.log);
      // res.status(200).end();
    },
    'payment_intent.payment_failed': function(req, res, next) {
      console.log(req.stripeEvent.type + ': event processed');
      res.status(200).end();
      // console.log(req.stripeEvent.type + ': event processed');
      // app.module.subscription.paymentIntentFailed(req.stripeEvent.data.object)
      //   .catch(console.log);
      // res.status(200).end();
    },
    'ping': function(req, res, next) {
      console.log(req.stripeEvent.type + ': event processed');
      res.status(200).end();
    }
  };

};