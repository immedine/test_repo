'use strict';
/**
 * This Controller handles all functionality of admin user
 * @module Controllers/Admin/user
 */
module.exports = function (app) {

  /**
   * user module
   * @type {Object}
   */
  const user = app.module.user;
  const order = app.module.order;

  /**
   * Fetches a user
   * @param  {Object}   req  Request 
   * @param  {Object}   res  Response
   * @param  {Function} next Next is used to pass control to the next middleware function
   * @return {Promise}       The Promise
   */
  const getUser = (req, res, next) => {
    user.details(req.params.userId)
      .then(output => {
        req.workflow.outcome.data = output;
        req.workflow.emit('response');
      })
      .catch(next);
  };

  /**
   * Fetches a list of categories
   * @param  {Object}   req  Request 
   * @param  {Object}   res  Response
   * @param  {Function} next Next is used to pass control to the next middleware function
   * @return {Promise}       The Promise
   */
  const getUserList = (req, res, next) => {
    let query = {
      skip: Number(req.query.skip) || app.config.page.defaultSkip,
      limit: Number(req.query.limit) || app.config.page.defaultLimit,
      filters: {
        restaurantWiseVisits: {
          $elemMatch: {
            restaurantRef: req.session.user.restaurantRef
          }
        }
      },
      sort: {
        createdAt: -1
      },
      keys: "personalInfo accountStatus createdAt restaurantWiseVisits",
      restaurantRef: req.session.user.restaurantRef
    };

    if (req.body.filters && Object.keys(req.body.filters).length) {
      let { fullName, phoneNumber } = req.body.filters;
      if (fullName) {
        query.filters["personalInfo.fullName"] = new RegExp(`^${fullName}`, 'ig');
      }
      if (phoneNumber) {
        query.filters["personalInfo.phone.number"] = new RegExp(`^${phoneNumber}`, 'ig');
      }
    }
    if (req.body.sortConfig && Object.keys(req.body.sortConfig).length) {
      query.sort = {};
      let { visitCount, lastVisited } = req.body.sortConfig;
      if (visitCount) {
        query.sort['restaurantVisit.visitCount'] = visitCount;
      } else if (lastVisited) {
        query.sort['restaurantVisit.lastVisited'] = lastVisited;
      }
    }

    user.getAll(query)
      .then(output => {
        req.workflow.outcome.data = output;
        req.workflow.emit('response');
      })
      .catch(next);
  };

  const editUser = (req, res, next) => {
    if (req.body && Object.keys(req.body).length) {
      if (req.body.onlyPersonal) {
        for (let prop in req.body.personalInfo) {
          req.userId.personalInfo[prop] = req.body.personalInfo[prop];
        }
      } else {
        for (let prop in req.body) {
          req.userId[prop] = req.body[prop];
        }
      }
    }
    user.crud.edit(req.userId)
      .then(async output => {
        req.workflow.outcome.data = output;
        req.workflow.emit('response');
      })
      .catch(next);
  };

  const findOrCreateUserByPhone = (req, res, next) => {

    const userData = req.body.contactDetails || req.body.personalInfo || req.body;

    user.crud.findOrCreateUserByPhone(
      userData.phone.countryCode || "+91",
      userData.phone.number,
      userData.fullName
    )
      .then(async output => {
        if (req.body.orderId) {
          await order.updateUserDetails(req.body.orderId, output);
          if (output.restaurantWiseVisits && output.restaurantWiseVisits.length) {
            const restaurantVisit = output.restaurantWiseVisits.find(visit => visit.restaurantRef.toString() === req.session.user.restaurantRef.toString());
            if (restaurantVisit) {
              restaurantVisit.visitCount += 1;
              restaurantVisit.lastVisited = new Date();
            } else {
              output.restaurantWiseVisits = output.restaurantWiseVisits || [];
              output.restaurantWiseVisits.push({
                restaurantRef: req.session.user.restaurantRef,
                visitCount: 1,
                lastVisited: new Date(),
                loyaltyPts: 0
              });
            }
            await user.crud.edit(output);
          } else {
            output.restaurantWiseVisits = [{
              restaurantRef: req.session.user.restaurantRef,
              visitCount: 1,
              lastVisited: new Date(),
              loyaltyPts: 0
            }];
            await user.crud.edit(output);
          }
        } else {
          if (output.restaurantWiseVisits && output.restaurantWiseVisits.length) {
            const restaurantVisit = output.restaurantWiseVisits.find(visit => visit.restaurantRef.toString() === req.session.user.restaurantRef.toString());
            if (!restaurantVisit) {
              output.restaurantWiseVisits = output.restaurantWiseVisits || [];

              output.restaurantWiseVisits.push({
                restaurantRef: req.session.user.restaurantRef,
                visitCount: 0,
                lastVisited: new Date(),
                loyaltyPts: 0
              });
              await user.crud.edit(output);
            }
          } else {
            output.restaurantWiseVisits = [{
              restaurantRef: req.session.user.restaurantRef,
              visitCount: 0,
              lastVisited: new Date(),
              loyaltyPts: 0
            }];
            await user.crud.edit(output);
          }
        }

        req.workflow.outcome.data = output;
        req.workflow.emit('response');
      })
      .catch(next);
  };


  return {
    get: getUser,
    list: getUserList,
    edit: editUser,
    findOrCreateUserByPhone: findOrCreateUserByPhone
  };

};