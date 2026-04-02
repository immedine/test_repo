'use strict';

/**
 * This Controller handles all functionality of Global Config
 * @module Controllers/Admin/Restaurant
 */
module.exports = function (app) {
  /**
   * admin module
   * @type {Object}
   */
  const restaurant = app.module.restaurant;
  const restaurantOwner = app.module.restaurantOwner;

  const addRestaurant = (req, res, next) => {
    req.body.createdBy = req.session.user._id;
    req.body.masterRestaurant = req.session.user.restaurantRef;
    restaurant.create(req.body)
      .then(output => {
        // console.log("output ", output)
        restaurantOwner.crud.add({
          restaurantRef: output._id.toString(),
          accountStatus: app.config.user.accountStatus.restaurantOwner.active,
          personalInfo: {
            fullName: req.body.ownerInfo.fullName,
            email: req.body.ownerInfo.email,
            phone: req.body.ownerInfo.phone
          }
        })
        .then(output1 => {
          req.workflow.emit('response');
        })
        .catch(next);
      })
      .catch(next);
  };
  /**
   * Edit Restaurant
   * @param  {Object}   req  Request
   * @param  {Object}   res  Response
   * @param  {Function} next Next is used to pass control to the next middleware function
   * @return {Promise}       The Promise
   */
  const editRestaurant = (req, res, next) => {
    restaurant
      .set(req.session.user.restaurantRef, req.body)
      .then((output) => {
        req.workflow.outcome.data = output;

        req.workflow.emit('response');
      })
      .catch(next);
  };

  const updateParcel = (req, res, next) => {
    restaurant
      .updateParcel(req.session.user.restaurantRef, req.body)
      .then((output) => {
        req.workflow.outcome.data = output;

        req.workflow.emit('response');
      })
      .catch(next);
  };

  const updateBillDetails = (req, res, next) => {
    restaurant
      .updateBillDetails(req.session.user.restaurantRef, req.body)
      .then((output) => {
        req.workflow.outcome.data = output;

        req.workflow.emit('response');
      })
      .catch(next);
  };

  const updateWater = (req, res, next) => {
    restaurant
      .updateWater(req.session.user.restaurantRef, req.body)
      .then((output) => {
        req.workflow.outcome.data = output;

        req.workflow.emit('response');
      })
      .catch(next);
  };

  const updateBranding = (req, res, next) => {
    restaurant
      .updateBranding(req.session.user.restaurantRef, req.body)
      .then((output) => {
        req.workflow.outcome.data = output;

        req.workflow.emit('response');
      })
      .catch(next);
  };

  const updateGstDetails = (req, res, next) => {
    restaurant
      .updateGstDetails(req.session.user.restaurantRef, req.body)
      .then((output) => {
        req.workflow.outcome.data = output;

        req.workflow.emit('response');
      })
      .catch(next);
  };

  const updateServiceTaxDetails = (req, res, next) => {
    restaurant
      .updateServiceTaxDetails(req.session.user.restaurantRef, req.body)
      .then((output) => {
        req.workflow.outcome.data = output;

        req.workflow.emit('response');
      })
      .catch(next);
  };

  const updateLocations = (req, res, next) => {
    restaurant
      .updateLocations(req.session.user.restaurantRef, req.body)
      .then((output) => {
        req.workflow.outcome.data = output;

        req.workflow.emit('response');
      })
      .catch(next);
  };

  const updateInventoryCategories = (req, res, next) => {
    restaurant
      .updateInventoryCategories(req.session.user.restaurantRef, req.body)
      .then((output) => {
        req.workflow.outcome.data = output;

        req.workflow.emit('response');
      })
      .catch(next);
  };

  /**
   * Fetch Restaurant details
   * @param  {Object}   req  Request
   * @param  {Object}   res  Response
   * @param  {Function} next Next is used to pass control to the next middleware function
   * @return {Promise}       The Promise
   */
  const getRestaurantDetails = (req, res, next) => {
    restaurant
      .get(req.session.user.restaurantRef)
      .then((output) => {
        req.workflow.outcome.data = output;

        req.workflow.emit('response');
      })
      .catch(next);
  };

  return {
    create: addRestaurant,
    edit: editRestaurant,
    get: getRestaurantDetails,
    updateGstDetails: updateGstDetails,
    updateLocations: updateLocations,
    updateInventoryCategories: updateInventoryCategories,
    updateParcel: updateParcel,
    updateServiceTaxDetails: updateServiceTaxDetails,
    updateWater: updateWater,
    updateBillDetails: updateBillDetails,
    updateBranding: updateBranding
  };
};
