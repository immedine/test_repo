'use strict';
/**
 * This Controller handles all functionality of admin requisition
 * @module Controllers/Admin/requisition
 */
module.exports = function(app) {

  function generateRequisitionId(count, restaurantName) {
    const date = new Date().toISOString().slice(0,10).replace(/-/g,'');
    return `REQ-${restaurantName.slice(0, 3).toUpperCase()}-${date}-${String(count).padStart(3, '0')}`;
  }

  /**
   * requisition module
   * @type {Object}
   */
  const requisition = app.module.requisition;
  const restaurant = app.module.restaurant;

  /**
   * Adds a requisition
   * @param  {Object}   req  Request 
   * @param  {Object}   res  Response
   * @param  {Function} next Next is used to pass control to the next middleware function
   * @return {Promise}       The Promise
   */
  const addRequisition = async (req, res, next) => {

    const restaurantDetails = await restaurant.get(req.session.user.restaurantRef);

    const requisitionCountQuery = {
      restaurantRef: req.session.user.restaurantRef,
      createdAt: {
        $gte: new Date(new Date().setHours(0, 0, 0, 0)),
        $lte: new Date(new Date().setHours(23, 59, 59, 999))
      }
    };

    const requisitionCount = await requisition.getCount(requisitionCountQuery, restaurantDetails.name);

    req.body.reqId = generateRequisitionId(requisitionCount + 1, restaurantDetails.name);
    req.body.requestedByRestaurantRef = req.session.user.restaurantRef;
    req.body.requestedBy = req.session.user._id;

    req.body.history = [{
      status: app.config.contentManagement.requisitionStatus.active,
      changedBy: req.session.user._id,
      remarks: 'REQUISITION_CREATED'
    }];

    requisition.create(req.body, req.session.user)
      .then(output => {
        req.workflow.outcome.data = output;
        req.workflow.emit('response');
      })
      .catch(next);
  };

  /**
   * Fetches a requisition
   * @param  {Object}   req  Request 
   * @param  {Object}   res  Response
   * @param  {Function} next Next is used to pass control to the next middleware function
   * @return {Promise}       The Promise
   */
  const getRequisition = (req, res, next) => {
    requisition.get(req.params.requisitionId,req.session.user)
      .then(output => {
        req.workflow.outcome.data = output;
        req.workflow.emit('response');
      })
      .catch(next);
  };

  /**
   * Fetches a list of requisitions
   * @param  {Object}   req  Request 
   * @param  {Object}   res  Response
   * @param  {Function} next Next is used to pass control to the next middleware function
   * @return {Promise}       The Promise
   */
  const getRequisitionList = (req, res, next) => {
    let query = {
      skip: Number(req.query.skip) || app.config.page.defaultSkip,
      limit: Number(req.query.limit) || app.config.page.defaultLimit,
      filters: {
        status: app.config.contentManagement.requisitionStatus.active,
        requestedByRestaurantRef: req.session.user.restaurantRef
      },
      sort: {
        createdAt: -1
      },
      keys: '_id reqId status createdAt total'
    };

    if (req.body.filters) {
      let { reqId } = req.body.filters;
      if (reqId) {
        query.filters.reqId = new RegExp(`^${reqId}`, 'ig');
      }
    }
    // if (req.body.sortConfig) {
    //   let { name,order } = req.body.sortConfig;
    //   if (name) {
    //     query.sort = {name};
    //   }
    // }

    requisition.list(query)
      .then(output => {
        req.workflow.outcome.data = output;
        req.workflow.emit('response');
      })
      .catch(next);
  };

  /**
   * Edits a requisition
   * @param  {Object}   req  Request 
   * @param  {Object}   res  Response
   * @param  {Function} next Next is used to pass control to the next middleware function
   * @return {Promise}       The Promise
   */
  const editRequisition = (req, res, next) => {
    
    if (req.requisitionId.status === app.config.contentManagement.requisitionStatus.approved) {
      return next({
        'errCode': 'REQUISITION_ALREADY_APPROVED'
      });
    }

    if (Object.keys(req.body).length) {
      for (let key in req.body) {
        req.requisitionId[key] = req.body[key];
      }

      req.requisitionId.history.push({
        status: req.body.status || req.requisitionId.status,
        changedBy: req.session.user._id,
        remarks: 'REQUISITION_UPDATED'
      });
    }

    requisition.edit(req.requisitionId, req.session.user)
      .then(output => {
        req.workflow.outcome.data = output;
        req.workflow.emit('response');
      })
      .catch(next);
  };

  const cancelRequisition = (req, res, next) => {
    
    if (req.requisitionId.status === app.config.contentManagement.requisitionStatus.approved) {
      return next({
        'errCode': 'REQUISITION_ALREADY_APPROVED'
      });
    } else if (req.requisitionId.status === app.config.contentManagement.requisitionStatus.rejected) {
      return next({
        'errCode': 'REQUISITION_ALREADY_REJECTED'
      });
    } else if (req.requisitionId.status === app.config.contentManagement.requisitionStatus.cancelled) {
      return next({
        'errCode': 'REQUISITION_ALREADY_CANCELLED'
      });
    }

    if (Object.keys(req.body).length) {
      req.requisitionId.status = app.config.contentManagement.requisitionStatus.cancelled;

      req.requisitionId.history.push({
        status: app.config.contentManagement.requisitionStatus.cancelled,
        changedBy: req.session.user._id,
        remarks: 'REQUISITION_CANCELLED',
        comments: req.body.comments
      });
    }

    requisition.edit(req.requisitionId, req.session.user)
      .then(output => {
        req.workflow.outcome.data = output;
        req.workflow.emit('response');
      })
      .catch(next);
  };

  const approveRejectRequisition = (req, res, next) => {
    
    if (req.requisitionId.status === app.config.contentManagement.requisitionStatus.approved) {
      return next({
        'errCode': 'REQUISITION_ALREADY_APPROVED'
      });
    } else if (req.requisitionId.status === app.config.contentManagement.requisitionStatus.rejected) {
      return next({
        'errCode': 'REQUISITION_ALREADY_REJECTED'
      });
    } else if (req.requisitionId.status === app.config.contentManagement.requisitionStatus.cancelled) {
      return next({
        'errCode': 'REQUISITION_ALREADY_CANCELLED'
      });
    }

    if (req.session.user.isFranchise && req.requisitionId.requestedToRestaurantRef.toString() !== req.session.user.restaurantRef.toString()) {
      return next({
        'errCode': 'UNAUTHORIZED_REQUISITION_ACTION'
      });
    }

    if (Object.keys(req.body).length) {
      req.requisitionId.status = req.body.status;

      req.requisitionId.history.push({
        status: req.body.status,
        changedBy: req.session.user._id,
        remarks: req.body.status === app.config.contentManagement.requisitionStatus.approved ? 'REQUISITION_APPROVED' : 'REQUISITION_REJECTED',
        comments: req.body.comments
      });
    }

    requisition.edit(req.requisitionId, req.session.user)
      .then(output => {
        req.workflow.outcome.data = output;
        req.workflow.emit('response');
      })
      .catch(next);
  };

  /**
   * Deletes a requisition
   * @param  {Object}   req  Request 
   * @param  {Object}   res  Response
   * @param  {Function} next Next is used to pass control to the next middleware function
   * @return {Promise}       The Promise
   */
  const deleteRequisition = (req, res, next) => {
    req.requisitionId.status = app.config.contentManagement.requisitionStatus.deleted;
    requisition.edit(req.requisitionId, req.session.user)
      .then(output => {
        req.workflow.emit('response');
      })
      .catch(next);
  };

  return {
    add: addRequisition,
    get: getRequisition,
    edit: editRequisition,
    list: getRequisitionList,
    delete: deleteRequisition,
    cancelRequisition: cancelRequisition,
    approveRejectRequisition: approveRejectRequisition
  };

};