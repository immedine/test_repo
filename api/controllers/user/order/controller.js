'use strict';

/**
 * This Controller handles all functionality of admin order
 * @module Controllers/Admin/order
 */
/**
 * Main export function for the user order controller
 * Initializes the controller with the Express app instance
 * @param {Object} app - Express app instance containing all modules
 */
module.exports = function (app) {

  /**
   * order module - handles order CRUD operations
   * @type {Object}
   */
  const order = app.module.order;
  /**
   * bill module - handles bill generation and management
   * @type {Object}
   */
  const bill = app.module.bill;
  /**
   * inventory module - handles inventory tracking
   * @type {Object}
   */
  const inventory = app.module.inventory;
  /**
   * restaurant module - handles restaurant details and settings
   * @type {Object}
   */
  const restaurant = app.module.restaurant;
  /**
   * tableSession module - manages table session data
   * @type {Object}
   */
  const tableSession = app.module.tableSession;
  /**
   * table module - manages table status and assignments
   * @type {Object}
   */
  const table = app.module.table;
  /**
   * sse module - Server-Sent Events for real-time updates
   * @type {Object}
   */
  const sse = app.module.sse;
  /**
   * notification module - handles in-app and push notifications
   * @type {Object}
   */
  const notification = app.module.notification;

  /**
   * Adds a new order or updates an existing order
   * This function handles the complete order creation flow including:
   * - Creating table session
   * - Calculating totals (subtotal, GST, service charge)
   * - Creating order and bill records
   * - Notifying restaurant staff via SSE and in-app notifications
   * @param  {Object}   req  Request object containing order data
   * @param  {Object}   res  Response object
   * @param  {Function} next Next is used to pass control to the next middleware function
   * @return {Promise}       The Promise
   */
  const addOrder = (req, res, next) => {
    // Check if this is an external order update (extOrderId present)
    // If yes, redirect to updateById function
    if (!req.body.extOrderId) {
      let subTotal = 0;
      let total = 0;

      // Step 1: Get or create an active table session for the user
      // This links the order to a specific table if applicable
      tableSession.createTableSessionFromUser(req.body)
        .then(output1 => {

          // Step 2: Calculate subtotal from cart items
          // Loop through each cart item and add price * quantity to subtotal
          // Also handle subItems (add-ons or variants) that have separate prices
          req.body.cart.forEach(element => {
            subTotal += (element.price * element.quantity);
            if (element.subItems && element.subItems.length) {
              element.subItems.forEach(element1 => {
                subTotal += (element1.price * element1.quantity);
              });
            }
          });

          total = subTotal;

          // Step 3: Create the order record in the database
          // Includes all request body data, calculated subtotal/total, and pending status
          order.create({
            ...req.body,
            subTotal,
            total,
            status: app.config.contentManagement.order.pending
          })
            .then(async output => {
              // Step 4: Get restaurant details to calculate taxes
              // We need GST and service tax settings from the restaurant
              const restDetails = await restaurant.get(req.body.restaurantRef);

              // Prepare bill creation request body
              const reqBody = {
                offlineId: req.body.idbId,
                billNo: output.orderId,
                orderRef: output._id,
                subTotal,
                total,
                restaurantRef: req.body.restaurantRef,
              };

              // Step 5a: Calculate total eligible for GST exemption
              // Some items may be marked as GST-exempt (excludeGST flag)
              let totalForNonGST = 0;
              req.body.cart.forEach(each => {
                if (each.excludeGST) {
                  totalForNonGST += (each.quantity * each.price) || 0;
                }
              });

              // Step 5b: Calculate total eligible for service charge exemption
              // Some items may be marked as service-charge-exempt
              let totalForNonServiceCharge = 0;
              req.body.cart.forEach(each => {
                if (each.excludeServiceCharge) {
                  totalForNonServiceCharge += (each.quantity * each.price) || 0;
                }
              });

              // Step 6: Apply GST if enabled by restaurant
              // Calculate CGST and SGST based on taxable amount
              if (restDetails.gstDetails.gstEnabled) {
                const cgst = Number((((subTotal - totalForNonGST) * (restDetails.gstDetails.cgst || 0)) / 100));
                const sgst = Number((((subTotal - totalForNonGST) * (restDetails.gstDetails.sgst || 0)) / 100));
                reqBody.gstDetails = {
                  cgst,
                  sgst,
                  cgstInPercentage: restDetails.gstDetails.cgst,
                  sgstInPercentage: restDetails.gstDetails.sgst,
                };
                // Add GST to total (rounded to 2 decimal places)
                reqBody.total = Number((reqBody.total + reqBody.gstDetails.cgst + reqBody.gstDetails.sgst).toFixed(2));
              }

              // Step 7: Apply service tax if enabled by restaurant
              if (restDetails.serviceTaxDetails.serviceTaxEnabled) {
                const serviceTax = Number((((subTotal - totalForNonServiceCharge) * (restDetails.serviceTaxDetails.serviceTax || 0)) / 100));
                reqBody.serviceTaxDetails = {
                  serviceTax,
                  serviceTaxInPercentage: restDetails.serviceTaxDetails.serviceTax
                };
                // Add service tax to total (rounded to 2 decimal places)
                reqBody.total = Number((reqBody.total + reqBody.serviceTaxDetails.serviceTax).toFixed(2));
              }

              // Step 8: Create the bill record
              bill.create(reqBody)
                .then(output2 => {

                  // Step 9: Link bill to order
                  // Update the order with bill details reference
                  output.billDetails = output2;
                  order.updateBillDetails(output._id, output2);

                  // Step 10: Handle table assignment if tableRef exists
                  // Mark table as unavailable and link order to table session
                  if (req.body.tableRef) {
                    table.markAsUnavailable(req.body.tableRef, output1._id);

                    // Update order reference in table session
                    output1.orderRef = output._id;
                    tableSession.edit(output1);
                  }

                  // Step 11: Send real-time notifications to restaurant staff
                  // Get notification message template for the default language
                  let inAppNotification = app.config.notification.inApp(app, app.config.lang.defaultLanguage);

                  // Broadcast order update via SSE (Server-Sent Events)
                  // This pushes the new order notification to all connected clients
                  sse.broadcastOrderUpdate({
                    restaurantRef: req.body.restaurantRef,
                    type: "NEW_ORDER",
                    message: inAppNotification.toRestaurantOwner.newOrder.body(),
                  });

                  // Also send in-app notifications to specific restaurant staff
                  notification.sendInAppNotificationToRestaurantStaffs(req.body.restaurantRef, {
                    moduleName: 'orders',
                    notificationType: "NEW_ORDER",
                    message: inAppNotification.toRestaurantOwner.newOrder.body(),
                    redirectionId: output.idbId
                  });

                  // Step 12: Return the created order as response
                  req.workflow.outcome.data = output;
                  req.workflow.emit('response');
                }).catch(next);
            })
            .catch(next);
        })
        .catch(next);
    } else {
      // If extOrderId exists, this is an order update instead of creation
      updateById(req, res, next);
    }

  };

  /**
   * Updates an existing order by ID
   * This function handles order modifications including:
   * - Merging new cart items with existing cart
   * - Recalculating totals (subtotal, GST, service charge)
   * - Adding water charges and parcel charges if applicable
   * - Updating the order and bill records
   * @param  {Object}   req  Request object containing updated order data
   * @param  {Object}   res  Response object
   * @param  {Function} next Next is used to pass control to the next middleware function
   */
  const updateById = (req, res, next) => {

    // Step 1: Fetch the existing order data using the external order ID
    order.get(req.body.extOrderId)
      .then(async orderData => {
        // Store old table reference in case we need to handle table changes
        const oldTableId = orderData.tableRef;

        let subTotal = 0;
        let total = 0;

        // Step 2: Calculate the new subtotal
        // Merge new cart items with existing cart items if order already has items
        // This allows adding more items to an ongoing order
        let cartToProcess = req.body.cart;
        if (orderData.cart && orderData.cart.length) {

          cartToProcess = [];
          // Mark existing cart items as not new
          orderData.cart.forEach(each => {
            each.isNewToCart = false;
            cartToProcess.push(each);
          });

          req.body.cart.forEach(newItem => {
            // Note: Previously there was logic to merge duplicate items, currently just appends new items
            // const existingItem = cartToProcess.find(item => item.menuRef.toString() === newItem.menuRef.toString());
            // if (existingItem) {
            //   existingItem.quantity += newItem.quantity;
            // } else {
            cartToProcess.push(newItem);
            // }
          });
        }

        // console.log("cartToProcess ", cartToProcess)
        // Step 3: Calculate the complete subtotal from all cart items
        // Includes main items and their subItems (add-ons/variants)
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

        // Step 4: Add any existing water charges to subtotal
        // Water details might include bottled water or beverages ordered earlier
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