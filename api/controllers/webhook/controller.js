'use strict';

const crypto = require("crypto");

/**
 * This Controller handles all functionality of Webhook
 * @module Controllers/Webhook
 */

module.exports = function (app) {

  let knownEvents = require('./events')(app);

  /**
   * verify controller
   * @param  {Object}   req  Request 
   * @param  {Object}   res  Response
   * @param  {Function} next Next is used to pass control to the next middleware function
   * @return {Promise}       The Promise
   */
  async function verify(req, res, next) {
    // let sig = req.headers['x-razorpay-signature'];
    // // let endpointSecret = process.env.PAYMENT_ENV === 'production' ? app.config.stripe.live.endpointSecret : app.config.stripe.test.endpointSecret;
    // let endPointSecret = "ImmeDine@2025";
    // let event = app.utility.stripe.stripe.webhooks.constructEvent(req.body, sig, endPointSecret);
    // req.stripeEvent = event;
    // return next();
    try {
      const webhookSecret = "ImmeDine@2025";

      const signature = req.headers["x-razorpay-signature"];

      console.log("🔐 Verifying webhook with signature:", signature);

      // 🔐 Verify signature
      const expectedSignature = crypto
        .createHmac("sha256", webhookSecret)
        .update(req.body)
        .digest("hex");

      console.log("🔐 Expected signature:", expectedSignature);

      if (signature !== expectedSignature) {
        console.log("❌ Invalid signature");
        return res.status(400).send("Invalid signature");
      }

      // ✅ Parse body AFTER verification
      const event = JSON.parse(req.body.toString());

      console.log("✅ Webhook received:", event.event);

      // 🎯 Handle events
      switch (event.event) {
        case "payment.authorized": {
          const payment = event.payload.payment.entity;

          console.log("💰 Payment Success:", payment);

          // 👉 Update DB
          if (payment.description === "SUBSCRIPTION") {
            const subData = await app.models.Subscription.findOne({
              upcomingRazorpayOrderId: payment.order_id
            });
            subData.razorpayOrderId = subData.upcomingRazorpayOrderId;
            subData.status = subData.upcomingStatus;
            subData.amount = subData.upcomingAmount;
            subData.planRef = subData.upcomingPlanRef;
            subData.userRef = subData.upcomingUserRef;

            subData.upcomingRazorpayOrderId = "";
            subData.upcomingStatus = -1;
            subData.upcomingAmount = -1;
            subData.upcomingPlanRef = null;
            subData.upcomingUserRef = null;

            await subData.save();

            await app.models.Payment.create({
              orderId: subData.receipt,
              razorpayOrderId: payment.order_id,
              razorpayPaymentId: payment.id,
              restaurantRef: subData.restaurantRef,
              userRef: subData.userRef,
              amount: payment.amount,
              currency: payment.currency,
              status: app.config.contentManagement.subscriptionPaymentStatus.authorized,
              method: payment.method,
              bank: payment.bank,
              wallet: payment.wallet,
              vpa: payment.vpa,
              rawResponse: payment,
            });
          }

          break;
        }
        case "payment.captured": {
          const payment = event.payload.payment.entity;

          console.log("💰 Payment Success:", payment);

          // 👉 Update DB
          if (payment.description === "SUBSCRIPTION") {
            await app.models.Payment.updateOne({
              razorpayPaymentId: payment.id
            }, {
              status: app.config.contentManagement.subscriptionPaymentStatus.captured,
              capturedAt: new Date(),
              webhookReceived: true
            });
            const subData = await app.models.Subscription.findOneAndUpdate({
              razorpayOrderId: payment.order_id
            }, {
              status: app.config.contentManagement.subscriptionStatus.paid,
              paymentId: payment.id
            });

            await app.models.Restaurant.findOneAndUpdate({
              _id: subData.restaurantRef
            }, {
              subscriptionRef: subData._id
            });
          }

          break;
        }

        case "payment.failed": {
          const payment = event.payload.payment.entity;

          console.log("❌ Payment Failed:", payment.id);

          // 👉 Update DB
          if (payment.description === "SUBSCRIPTION") {
            await app.models.Payment.updateOne({
              razorpayPaymentId: payment.id
            }, {
              status: app.config.contentManagement.subscriptionPaymentStatus.failed,
              failedAt: new Date(),
              webhookReceived: true
            });
            const subData = await app.models.Subscription.findOneAndUpdate({
              razorpayOrderId: payment.order_id
            }, {
              status: app.config.contentManagement.subscriptionStatus.failed,
              paymentId: payment.id
            });

          }

          break;
        }

        default:
          console.log("Unhandled event:", event.event);
      }

      res.status(200).json({ status: "ok" });
    } catch (err) {
      console.error("Webhook error:", err);
      res.status(500).send("Server error");
    }

  }

  /**
   * handleWebhook Controller
   * @param  {Object}   req  Request 
   * @param  {Object}   res  Response
   * @param  {Function} next Next is used to pass control to the next middleware function
   * @return {Promise}       The Promise
   */
  let handleWebhook = function (req, res, next) {

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
  let handleBraintreeWebhook = function (req, res, next) {
    app.utility.braintree.webhookValidation(req.body.bt_signature, req.body.bt_payload, function (err, webhookNotification) {
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