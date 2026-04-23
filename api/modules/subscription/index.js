'use strict';

/**
 * This module handles all functionality of Admin Subscription
 * @module Modules/Subscription
 */

const Razorpay = require("razorpay");

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

module.exports = function (app) {


  /**
   * subscription Model
   * @type {Mongoose.Model}
   */
  const Subscription = app.models.Subscription;
  const Payment = app.models.Payment;

  /**
   * Creates a Subscription
   * @param  {Object} config  The config object
   * @return {Promise}        The promise
   */
  const createSubscription = async function (config, userRef) {
    config.restaurantRef = userRef.restaurantRef;
    config.userRef = userRef._id;
    const options = {
      amount: config.price,
      currency: "INR",
      receipt: `SUBSCRIPTION_${userRef.restaurantRef}`,
    };

    const order = await razorpay.orders.create(options);
    console.log("Razorpay order created:", order);

    return Subscription.create({
      upcomingRazorpayOrderId: order.id,
      upcomingStatus: app.config.contentManagement.subscriptionStatus.created,
      upcomingAmount: config.price,
      upcomingPlanRef: config.planRef,
      restaurantRef: config.restaurantRef,
      upcomingUserRef: config.userRef,
      receipt: options.receipt
    }).then(subscription => {
      console.log("Subscription created in DB:", subscription);
      return Promise.resolve({
        orderId: order.id,
        subscriptionId: subscription._id
      });
    }).catch(err => {
      console.error("Error creating subscription in DB:", err);
      throw err;
    });
  };

  const cancelPaymentSubscription = async function (config, userRef) {
    return Subscription.findById(config.subscriptionId)
      .then(subscription => {
        if (!subscription) {
          return Promise.reject({
            'errCode': 'SUBSCRIPTION_NOT_FOUND'
          });
        } else if (subscription.restaurantRef.toString() !== userRef.restaurantRef.toString()) {
          return Promise.reject({
            'errCode': 'SUBSCRIPTION_NOT_FOUND'
          });
        } else {

          // subscription.razorpayOrderId = subscription.oldRazorpayOrderId;
          // subscription.status = subscription.oldStatus;
          // subscription.amount = subscription.oldAmount;
          // subscription.planRef = subscription.oldPlanRef;
          // subscription.userRef = subscription.oldUserRef;

          subscription.upcomingRazorpayOrderId = "";
          subscription.upcomingStatus = -1;
          subscription.upcomingAmount = -1;
          subscription.upcomingPlanRef = null;
          subscription.upcomingUserRef = null;

          return subscription.save();
        }
      })
      .then(subscription => {
        console.log("Subscription created in DB:", subscription);
        return Promise.resolve({
          orderId: subscription.razorpayOrderId,
          subscriptionId: subscription._id
        });
      })
      .catch(err => {
        console.error("Error updating subscription in DB:", err);
        throw err;
      });
  }

  const updateSubscription = async function (config, userRef) {
    // Implementation for updating subscription
    config.userRef = userRef._id;
    const options = {
      amount: config.price,
      currency: "INR",
      receipt: `SUBSCRIPTION_${userRef.restaurantRef}`,
    };

    const order = await razorpay.orders.create(options);
    return Subscription.findById(config.subscriptionId)
      .then(subscription => {
        if (!subscription) {
          return Promise.reject({
            'errCode': 'SUBSCRIPTION_NOT_FOUND'
          });
        } else if (subscription.restaurantRef.toString() !== userRef.restaurantRef.toString()) {
          return Promise.reject({
            'errCode': 'SUBSCRIPTION_NOT_FOUND'
          });
        } else {
          subscription.upcomingRazorpayOrderId = order.id;
          subscription.upcomingStatus = app.config.contentManagement.subscriptionStatus.created;
          subscription.upcomingAmount = config.price;
          subscription.upcomingPlanRef = config.planRef || subscription.planRef;
          subscription.upcomingUserRef = config.userRef || subscription.userRef;

          // subscription.razorpayOrderId = order.id;
          // subscription.status = app.config.contentManagement.subscriptionStatus.created;
          // subscription.amount = config.price;
          // subscription.planRef = config.planRef || subscription.planRef;
          // subscription.userRef = config.userRef || subscription.userRef;
          return subscription.save();
        }
      })
      .then(subscription => {
        console.log("Subscription created in DB:", subscription);
        return Promise.resolve({
          orderId: order.id,
          subscriptionId: subscription._id
        });
      })
      .catch(err => {
        console.error("Error updating subscription in DB:", err);
        throw err;
      });
  };

  const deleteSubscription = async function (config) {
    // Implementation for updating subscription

    return Subscription.deleteOne({ _id: config.subscriptionId })
      .catch(err => {
        console.error("Error updating subscription in DB:", err);
        throw err;
      });
  };


  const updatePayment = async function (config, userRef) {
    // Implementation for updating payment
    return Subscription.findById(config.subscriptionId)
      .then(subscription => {
        if (!subscription) {
          return Promise.reject({
            'errCode': 'SUBSCRIPTION_NOT_FOUND'
          });
        } else if (subscription.restaurantRef.toString() !== userRef.restaurantRef.toString()) {
          return Promise.reject({
            'errCode': 'SUBSCRIPTION_NOT_FOUND'
          });
        } else {
          subscription.paymentId = config.paymentId;
          subscription.status = app.config.contentManagement.subscriptionStatus.paymentPending;
          return subscription.save();
        }
      })
      .then(updatedSubscription => {
        console.log("Subscription payment updated in DB:", updatedSubscription);
        return Promise.resolve(updatedSubscription);
        // return Payment.create({
        //   orderId: updatedSubscription.receipt,
        //   razorpayOrderId: updatedSubscription.razorpayOrderId,
        //   razorpayPaymentId: config.paymentId,
        //   status: app.config.contentManagement.subscriptionPaymentStatus.created,
        //   amount: updatedSubscription.price,
        //   restaurantRef: userRef.restaurantRef,
        //   userRef: userRef._id,
        // }).then(payment => {
        //   console.log("Payment created in DB:", payment);
        //   return Promise.resolve(updatedSubscription);
        // }).catch(err => {
        //   console.error("Error creating subscription in DB:", err);
        //   throw err;
        // });
      })
      .catch(err => {
        console.error("Error updating subscription payment in DB:", err);
        throw err;
      });
  };

  // /**
  //  * Fetches a subscription by Id
  //  * @param  {String} subscriptionId  The subscription id
  //  * @return {Promise}        The promise
  //  */
  // const findSubscriptionById = function (subscriptionId, userRef) {
  //   return Subscription.findById(subscriptionId)
  //   .then(subscriptionDetails => {
  //     if(!subscriptionDetails || (subscriptionDetails && 
  //       subscriptionDetails.restaurantRef.toString() !== userRef.restaurantRef.toString())) {
  //       return Promise.reject({
  //         'errCode': 'CATEGORY_NOT_FOUND'
  //       });
  //     } else {
  //       return Promise.resolve(subscriptionDetails);
  //     }
  //   });
  // };

  // /**
  //  * Edits a subscription
  //  * @param  {Object} editedSubscription The edited subscription document
  //  * @return {Promise}           The promise
  //  */
  // const editSubscription = function (editedSubscription, userRef) {

  //   if (editedSubscription.restaurantRef.toString() !== userRef.restaurantRef.toString()) {
  //     return Promise.reject({
  //       'errCode': 'CATEGORY_NOT_FOUND'
  //     });
  //   }

  //   return Subscription.countDocuments({
  //     name: new RegExp(`^${editedSubscription.name}$`, 'i'),
  //     status: app.config.contentManagement.subscription.active,
  //     restaurantRef: editedSubscription.restaurantRef,
  //     _id: {
  //       $ne: editedSubscription._id
  //     }
  //   })
  //     .then(count => count ? Promise.reject({
  //     'errCode': 'CATEGORY_ALREADY_EXISTS'
  //     }) : editedSubscription.save());
  // };

  // /**
  //  * Fetches a list of subscriptions
  //  * @param  {Object} options  The options object
  //  * @return {Promise}        The promise
  //  */
  // const getList = function (options) {
  //   return Subscription.pagedFind(options);
  // };

  // /**
  //  * Removes a subscription
  //  * @param  {Object} subscription The subscription document
  //  * @return {Promise}     The promise
  //  */
  // const removeSubscription = function (subscription, userRef) {
  //   if (subscription.restaurantRef.toString() !== userRef.restaurantRef.toString()) {
  //     return Promise.reject({
  //       'errCode': 'CATEGORY_NOT_FOUND'
  //     });
  //   }
  //   return Subscription.removeSubscription(subscription._id);
  // };

  // const updateMenuCount = (subscriptionId, value) => {
  //   return Subscription.findOne({
  //     _id: subscriptionId
  //   })
  //   .then(subscription =>{
  //     if (subscription) {
  //       subscription.totalMenu = value === 1 ? subscription.totalMenu + 1 : subscription.totalMenu - 1;
  //       return subscription.save(); 
  //     } else {
  //       return Promise.resolve(null);
  //     }
  //   });
  // };

  return {
    'create': createSubscription,
    'updatePayment': updatePayment,
    'updateSubscription': updateSubscription,
    'cancelPaymentSubscription': cancelPaymentSubscription,
    'deleteSubscription': deleteSubscription
    // 'get': findSubscriptionById,
    // 'edit': editSubscription,
    // 'list': getList,
    // 'remove': removeSubscription,
    // 'updateMenuCount': updateMenuCount
  };
};