'use strict';

/**
 * This Controller handles all functionality of admin order
 * @module Controllers/Admin/order
 */
module.exports = function (app) {

  /**
   * order module
   * @type {Object}
   */
  const order = app.module.order;
  const bill = app.module.bill;
  const inventory = app.module.inventory;
  const restaurant = app.module.restaurant;
  const tableSession = app.module.tableSession;
  const table = app.module.table;
  const sse = app.module.sse;
  const notification = app.module.notification;

  /**
   * Adds a order
   * @param  {Object}   req  Request 
   * @param  {Object}   res  Response
   * @param  {Function} next Next is used to pass control to the next middleware function
   * @return {Promise}       The Promise
   */
  const addOrder = (req, res, next) => {
    if (!req.body.extOrderId) {
      let subTotal = 0;
      let total = 0;

      // get active table session
      tableSession.createTableSessionFromUser(req.body)
        .then(output1 => {

          // calculate total
          req.body.cart.forEach(element => {
            subTotal += (element.price * element.quantity);
            if (element.subItems && element.subItems.length) {
              element.subItems.forEach(element1 => {
                subTotal += (element1.price * element1.quantity);
              });
            }
          });

          total = subTotal;

          // create order
          order.create({
            ...req.body,
            subTotal,
            total,
            status: app.config.contentManagement.order.pending
          })
            .then(async output => {
              const restDetails = await restaurant.get(req.body.restaurantRef);

              const reqBody = {
                offlineId: req.body.idbId,
                billNo: output.orderId,
                orderRef: output._id,
                subTotal,
                total,
                restaurantRef: req.body.restaurantRef,
              };

              let totalForNonGST = 0;
              req.body.cart.forEach(each => {
                if (each.excludeGST) {
                  totalForNonGST += (each.quantity * each.price) || 0;
                }
              });
              let totalForNonServiceCharge = 0;
              req.body.cart.forEach(each => {
                if (each.excludeServiceCharge) {
                  totalForNonServiceCharge += (each.quantity * each.price) || 0;
                }
              });
              if (restDetails.gstDetails.gstEnabled) {
                const cgst = Number((((subTotal - totalForNonGST) * (restDetails.gstDetails.cgst || 0)) / 100));
                const sgst = Number((((subTotal - totalForNonGST) * (restDetails.gstDetails.sgst || 0)) / 100));
                reqBody.gstDetails = {
                  cgst,
                  sgst,
                  cgstInPercentage: restDetails.gstDetails.cgst,
                  sgstInPercentage: restDetails.gstDetails.sgst,
                };
                reqBody.total = Number((reqBody.total + reqBody.gstDetails.cgst + reqBody.gstDetails.sgst).toFixed(2));
              }
              if (restDetails.serviceTaxDetails.serviceTaxEnabled) {
                const serviceTax = Number((((subTotal - totalForNonServiceCharge) * (restDetails.serviceTaxDetails.serviceTax || 0)) / 100));
                reqBody.serviceTaxDetails = {
                  serviceTax,
                  serviceTaxInPercentage: restDetails.serviceTaxDetails.serviceTax
                };
                reqBody.total = Number((reqBody.total + reqBody.serviceTaxDetails.serviceTax).toFixed(2));
              }
              // create bill
              bill.create(reqBody)
                .then(output2 => {

                  // update bill details in order
                  output.billDetails = output2;
                  order.updateBillDetails(output._id, output2);

                  if (req.body.tableRef) {
                    table.markAsUnavailable(req.body.tableRef, output1._id);

                    // update orderRef in table session
                    output1.orderRef = output._id;
                    tableSession.edit(output1);
                  }

                  let inAppNotification = app.config.notification.inApp(app, app.config.lang.defaultLanguage);

                  sse.broadcastOrderUpdate({
                    restaurantRef: req.body.restaurantRef,
                    type: "NEW_ORDER",
                    message: inAppNotification.toRestaurantOwner.newOrder.body(),
                  });

                  notification.sendInAppNotificationToRestaurantStaffs(req.body.restaurantRef, {
                    moduleName: 'orders',
                    notificationType: "NEW_ORDER",
                    message: inAppNotification.toRestaurantOwner.newOrder.body(),
                    redirectionId: output.idbId
                  });

                  req.workflow.outcome.data = output;
                  req.workflow.emit('response');
                }).catch(next);
            })
            .catch(next);
        })
        .catch(next);
    } else {
      updateById(req, res, next);
    }

  };

  const updateById = (req, res, next) => {

    order.get(req.body.extOrderId)
      .then(async orderData => {
        const oldTableId = orderData.tableRef;

        let subTotal = 0;
        let total = 0;

        // calculate total
        // Merge carts if order already has items
        let cartToProcess = req.body.cart;
        if (orderData.cart && orderData.cart.length) {

          cartToProcess = [];
          orderData.cart.forEach(each => {
            each.isNewToCart = false;
            cartToProcess.push(each);
          });

          req.body.cart.forEach(newItem => {
            // const existingItem = cartToProcess.find(item => item.menuRef.toString() === newItem.menuRef.toString());
            // if (existingItem) {
            //   existingItem.quantity += newItem.quantity;
            // } else {
            cartToProcess.push(newItem);
            // }
          });
        }

        // console.log("cartToProcess ", cartToProcess)
        // Calculate totals
        cartToProcess.forEach(element => {
          subTotal += (element.price * element.quantity);
          if (element.subItems && element.subItems.length) {
            element.subItems.forEach(element1 => {
              subTotal += (element1.price * element1.quantity);
            });
          }
        });

        // Update cart in request body for later use
        req.body.cart = cartToProcess;

        subTotal = subTotal + (orderData?.waterDetails?.totalCost || 0);

        total = subTotal;

        total = total + (orderData?.parcelDetails?.totalCost || 0);


        if (req.body && Object.keys(req.body).length) {
          for (let item in req.body) {
            orderData[item] = req.body[item];
          }
        }

        orderData.subTotal = subTotal;
        orderData.total = total;
        orderData.status = app.config.contentManagement.order.pending;

        order.edit(orderData)
          .then(async output => {

            const restDetails = await restaurant.get(req.body.restaurantRef);
            let gstDetails = {};
            let serviceTaxDetails = {};

            let totalForNonGST = orderData?.waterDetails?.totalCost || 0;
            orderData.cart.forEach(each => {
              if (each.excludeGST) {
                totalForNonGST += (each.quantity * each.price) || 0;
              }
            });
            let totalForNonServiceCharge = orderData?.waterDetails?.totalCost || 0;
            orderData.cart.forEach(each => {
              if (each.excludeServiceCharge) {
                totalForNonServiceCharge += (each.quantity * each.price) || 0;
              }
            });

            console.log("orderData ", orderData)


            console.log("totalForNonGST ", totalForNonGST, " totalForNonServiceCharge ", totalForNonServiceCharge, " subTotal ", subTotal)

            if (restDetails.gstDetails.gstEnabled) {
              const cgst = Number((((subTotal + (orderData?.parcelDetails?.totalCost || 0)  - totalForNonGST) * (restDetails.gstDetails.cgst || 0)) / 100));
              const sgst = Number((((subTotal + (orderData?.parcelDetails?.totalCost || 0)  - totalForNonGST) * (restDetails.gstDetails.sgst || 0)) / 100));
              gstDetails = {
                cgst,
                sgst,
                cgstInPercentage: restDetails.gstDetails.cgst,
                sgstInPercentage: restDetails.gstDetails.sgst,
              };
              total = Number((total + cgst + sgst).toFixed(2));
            }
            if (restDetails.serviceTaxDetails.serviceTaxEnabled) {
              const serviceTax = Number((((subTotal + (orderData?.parcelDetails?.totalCost || 0)  - totalForNonServiceCharge) * (restDetails.serviceTaxDetails.serviceTax || 0)) / 100));
              serviceTaxDetails = {
                serviceTax,
                serviceTaxInPercentage: restDetails.serviceTaxDetails.serviceTax
              };
              total = Number((total + serviceTax).toFixed(2));
            }


            const billRes = await bill.updateBillFromOrder(orderData.billRef, {
              subTotal: subTotal,
              total: total,
              gstDetails: gstDetails,
              serviceTaxDetails: serviceTaxDetails
            });

            if (req.body.tableRef && (oldTableId && req.body.tableRef.toString() === oldTableId.toString())) {

              tableSession.updateCartByOrderId(orderData._id, orderData.restaurantRef, req.body.cart);
            }

            const finalOutput = output;
            finalOutput.billRef = billRes;

            req.workflow.outcome.data = finalOutput;
            req.workflow.emit('response');
          })
          .catch(next);
      })
      .catch(next);


  };

  /**
   * Fetches a order
   * @param  {Object}   req  Request 
   * @param  {Object}   res  Response
   * @param  {Function} next Next is used to pass control to the next middleware function
   * @return {Promise}       The Promise
   */
  const getOrder = (req, res, next) => {
    order.getFromUser(req.params.orderId)
      .then(output => {
        req.workflow.outcome.data = output;
        req.workflow.emit('response');
      })
      .catch(next);
  };

  /**
   * Edits a order
   * @param  {Object}   req  Request 
   * @param  {Object}   res  Response
   * @param  {Function} next Next is used to pass control to the next middleware function
   * @return {Promise}       The Promise
   */
  const editOrder = (req, res, next) => {

    if (req.body && Object.keys(req.body).length) {
      for (let item in req.body) {
        req.orderId[item] = req.body[item];
      }
    }

    inventory.rollbackInventory(req.orderId._id, req.body.cart)
      .then(output1 => {
        order.edit(req.orderId, req.session.user)
          .then(output => {
            bill.updateBillFromOrder(req.orderId.billRef, {
              subTotal: req.body.subTotal,
              total: req.body.total,
            });
            req.workflow.outcome.data = output;
            req.workflow.emit('response');
          })
          .catch(next);
      })
      .catch(next);
  };

  return {
    add: addOrder,
    get: getOrder,
    edit: editOrder,
    updateById: updateById
  };

};