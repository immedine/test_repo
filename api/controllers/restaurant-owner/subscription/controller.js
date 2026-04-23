'use strict';
/**
 * This Controller handles all functionality of admin subscription
 * @module Controllers/Admin/subscription
 */

module.exports = function(app) {

  /**
   * subscription module
   * @type {Object}
   */
  const subscription = app.module.subscription;

  /**
   * Adds a subscription
   * @param  {Object}   req  Request 
   * @param  {Object}   res  Response
   * @param  {Function} next Next is used to pass control to the next middleware function
   * @return {Promise}       The Promise
   */
  const initiateSubscription = (req, res, next) => {
    subscription.create(req.body, req.session.user)
      .then(output => {
        req.workflow.outcome.data = output;
        req.workflow.emit('response');
      })
      .catch(next);
  };

  const updateSubscription = (req, res, next) => {
    subscription.updateSubscription(req.body, req.session.user)
      .then(output => {
        req.workflow.outcome.data = output;
        req.workflow.emit('response');
      })
      .catch(next);
  };

  const cancelPaymentSubscription = (req, res, next) => {
    subscription.cancelPaymentSubscription(req.body, req.session.user)
      .then(output => {
        req.workflow.outcome.data = output;
        req.workflow.emit('response');
      })
      .catch(next);
  };

  const deleteSubscription = (req, res, next) => {
    subscription.deleteSubscription(req.body)
      .then(output => {
        req.workflow.emit('response');
      })
      .catch(next);
  };

  const updatePayment = (req, res, next) => {
    subscription.updatePayment(req.body, req.session.user)
      .then(output => {
        req.workflow.outcome.data = output;
        req.workflow.emit('response');
      })
      .catch(next);
  };

  /**
   * Fetches a subscription
   * @param  {Object}   req  Request 
   * @param  {Object}   res  Response
   * @param  {Function} next Next is used to pass control to the next middleware function
   * @return {Promise}       The Promise
   */
  const getSubscription = (req, res, next) => {
    // subscription.get(req.params.subscriptionId,req.session.user)
    //   .then(output => {
        req.workflow.outcome.data = req.subscriptionId;
        req.workflow.emit('response');
      // })
      // .catch(next);
  };

  // /**
  //  * Fetches a list of subscriptions
  //  * @param  {Object}   req  Request 
  //  * @param  {Object}   res  Response
  //  * @param  {Function} next Next is used to pass control to the next middleware function
  //  * @return {Promise}       The Promise
  //  */
  // const getSubscriptionList = (req, res, next) => {
  //   let query = {
  //     skip: Number(req.query.skip) || app.config.page.defaultSkip,
  //     limit: Number(req.query.limit) || app.config.page.defaultLimit,
  //     filters: {
  //       status: app.config.contentManagement.subscription.active,
  //       restaurantRef: req.session.user.restaurantRef
  //     },
  //     sort: {
  //       order: 1
  //     }
  //   };

  //   if (req.body.filters) {
  //     let { name } = req.body.filters;
  //     if (name) {
  //       query.filters.name = new RegExp(`^${name}`, 'ig');
  //     }
  //   }
  //   if (req.body.sortConfig) {
  //     let { name,order } = req.body.sortConfig;
  //     if (name) {
  //       query.sort = {name};
  //     } else if (order) {
  //       query.sort = {order};
  //     }
  //   }

  //   subscription.list(query)
  //     .then(output => {
  //       req.workflow.outcome.data = output;
  //       req.workflow.emit('response');
  //     })
  //     .catch(next);
  // };

  // /**
  //  * Edits a subscription
  //  * @param  {Object}   req  Request 
  //  * @param  {Object}   res  Response
  //  * @param  {Function} next Next is used to pass control to the next middleware function
  //  * @return {Promise}       The Promise
  //  */
  // const editSubscription = (req, res, next) => {
  //   req.subscriptionId.name = req.body.name;
  //   req.subscriptionId.order = req.body.order;
  //   req.subscriptionId.filterText = req.body.filterText;
  //   req.subscriptionId.image = req.body.image;
  //   subscription.edit(req.subscriptionId, req.session.user)
  //     .then(output => {
  //       req.workflow.outcome.data = output;
  //       req.workflow.emit('response');
  //     })
  //     .catch(next);
  // };

  // /**
  //  * Deletes a subscription
  //  * @param  {Object}   req  Request 
  //  * @param  {Object}   res  Response
  //  * @param  {Function} next Next is used to pass control to the next middleware function
  //  * @return {Promise}       The Promise
  //  */
  // const deleteSubscription = (req, res, next) => {
  //   req.subscriptionId.status = app.config.contentManagement.subscription.deleted;
  //   subscription.edit(req.subscriptionId, req.session.user)
  //     .then(output => {
  //       req.workflow.emit('response');
  //     })
  //     .catch(next);
  // };

  return {
    initiate: initiateSubscription,
    updatePayment: updatePayment,
    updateSubscription: updateSubscription,
    get: getSubscription,
    cancelPaymentSubscription: cancelPaymentSubscription,
    deleteSubscription: deleteSubscription
    // edit: editSubscription,
    // list: getSubscriptionList,
    // delete: deleteSubscription
  };

};