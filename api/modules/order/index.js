'use strict';

/**
 * This module handles all functionality of Admin Order
 * @module Modules/Order
 */

// const services = require('../../../services/order/index');

module.exports = function (app) {

  /**
   * order Model
   * @type {Mongoose.Model}
   */
  const Order = app.models.Order;
  const Table = app.models.Table;
  const OrderQueue = app.models.OrderQueue;

  /**
   * Creates a Order
   * @param  {Object} config  The config object
   * @return {Promise}        The promise
   */
  const createOrder = async (config, userRef) => {
    if (userRef) {
      config.createdBy = userRef._id;
      config.addedByOwner = true;
      config.restaurantRef = userRef.restaurantRef;

    }

    if (config.tableRef) {
      const tableDetails = await Table.findById(config.tableRef);
      if (tableDetails) {
        config.tableId = tableDetails.tableId;
      }
    }

    const totalOrders = await Order.countDocuments({
      restaurantRef: userRef ? userRef.restaurantRef : config.restaurantRef
    });
    config.orderId = totalOrders ? (totalOrders + 1).toString() : "1";
    return Order.createOrder(config);
  };

  const createMultiOrder = async (orders, userRef) => {
    if (!Array.isArray(orders) || orders.length === 0) {
      return Promise.resolve([]);
    }

    const restaurantRef = userRef ? userRef.restaurantRef : (orders[0] && orders[0].restaurantRef);
    const totalOrders = await Order.countDocuments({ restaurantRef });

    // collect unique table refs and fetch their tableId values
    const tableRefs = [...new Set(orders.map(o => o.tableRef).filter(Boolean))];
    const tableMap = {};
    if (tableRefs.length) {
      const tables = await Table.find({ _id: { $in: tableRefs } });
      tables.forEach(t => { tableMap[t._id.toString()] = t.tableId; });
    }

    // prepare docs with sequential orderId and other fields
    const docs = orders.map((o, idx) => {
      const config = Object.assign({}, o);
      if (userRef) {
        config.createdBy = userRef._id;
        config.addedByOwner = true;
        config.restaurantRef = restaurantRef;
      }
      if (config.tableRef) {
        const tid = tableMap[config.tableRef.toString()];
        if (tid) config.tableId = tid;
      }
      config.orderId = (totalOrders + idx + 1).toString();
      return config;
    });

    // bulk insert
    return Order.insertMany(docs);
  };

  /**
   * Bulk updates multiple orders.
   * Each item in the orders array should contain an _id (or orderId) and the fields to update.
   * Example item: { _id: '...', status: 'completed', billRef: '...', totalMenu: 5 }
   * @param {Array} orders
   * @return {Promise}
   */
  const bulkUpdateOrders = async (orders, userRef) => {
    if (!Array.isArray(orders) || orders.length === 0) {
      return Promise.resolve(null);
    }

    const ops = [];
    const ids = [];
    const orderIds = [];

    orders.forEach(item => {
      const id = item._id;
      const orderId = item.orderId;
      if (!id && !orderId) return;

      const set = {};
      Object.keys(item).forEach(k => {
        if (k === '_id' || k === 'orderId') return;
        set[k] = item[k];
      });

      if (Object.keys(set).length === 0) return;

      const filter = id ? { _id: id } : { orderId: orderId };
      if (userRef && userRef.restaurantRef) {
        filter.restaurantRef = userRef.restaurantRef;
      }
      ops.push({
        updateOne: {
          filter,
          update: { $set: set }
        }
      });

      if (id) ids.push(id);
      else orderIds.push(orderId);
    });

    if (ops.length === 0) return Promise.resolve(null);

    // perform bulk update
    await Order.bulkWrite(ops, { ordered: false });

    // fetch and return the updated documents
    let query;
    if (ids.length && orderIds.length) {
      query = { $or: [{ _id: { $in: ids } }, { orderId: { $in: orderIds } }] };
    } else if (ids.length) {
      query = { _id: { $in: ids } };
    } else {
      query = { orderId: { $in: orderIds } };
    }

    const updatedDocs = await Order.find(query);
    return updatedDocs;
  };

  /**
   * Fetches a order by Id
   * @param  {String} orderId  The order id
   * @return {Promise}        The promise
   */
  const findOrderById = function (orderId, userRef) {
    return Order.findById(orderId)
      .populate({
        path: 'billRef'
      })
      .populate({
        path: 'otpDetails'
      })
      .then(orderDetails => {
        if (!orderDetails || (orderDetails && userRef &&
          orderDetails.restaurantRef.toString() !== userRef.restaurantRef.toString())) {
          return Promise.reject({
            'errCode': 'ORDER_NOT_FOUND'
          });
        } else {
          return Promise.resolve(orderDetails);
        }
      });
  };

  const findOrderFromUserById = function (orderId, userRef) {
    return Order.findById(orderId)
      .populate({
        path: 'billRef'
      })
      .populate({
        path: 'restaurantRef',
        select: 'name _id logo primaryColor secondaryColor config'
      })
      .then(orderDetails => {
        if (!orderDetails || (orderDetails && userRef &&
          orderDetails.restaurantRef.toString() !== userRef.restaurantRef.toString())) {
          return Promise.reject({
            'errCode': 'ORDER_NOT_FOUND'
          });
        } else {
          return Promise.resolve(orderDetails);
        }
      });
  };

  const getOrderByIdbId = function (orderId, userRef) {
    return Order.findOne({
      idbId: orderId
    })
      .populate({
        path: 'billRef'
      })
      .populate({
        path: 'userRef',
        select: '_id personalInfo'
      })
      .then(orderDetails => {
        if (!orderDetails || (orderDetails && userRef &&
          orderDetails.restaurantRef.toString() !== userRef.restaurantRef.toString())) {
          return Promise.reject({
            'errCode': 'ORDER_NOT_FOUND'
          });
        } else {
          return Promise.resolve(orderDetails);
        }
      });
  };

  /**
   * Edits a order
   * @param  {Object} editedOrder The edited order document
   * @return {Promise}           The promise
   */
  const editOrder = function (editedOrder, userRef) {

    if (userRef && editedOrder.restaurantRef.toString() !== userRef.restaurantRef.toString()) {
      return Promise.reject({
        'errCode': 'ORDER_NOT_FOUND'
      });
    }

    return editedOrder.save();
  };

  /**
   * Fetches a list of orders
   * @param  {Object} options  The options object
   * @return {Promise}        The promise
   */
  // const getList = function (options) {
  //   return Order.pagedFind(options);
  // };

  /**
   * Removes a order
   * @param  {Object} order The order document
   * @return {Promise}     The promise
   */
  const removeOrder = function (order, userRef) {
    if (order.restaurantRef.toString() !== userRef.restaurantRef.toString()) {
      return Promise.reject({
        'errCode': 'ORDER_NOT_FOUND'
      });
    }
    return Order.removeOrder(order._id);
  };

  const updateBillDetails = (orderId, billDetails, userData) => {
    return Order.findOne({
      _id: orderId
    })
      .then(order => {
        if (order) {
          order.billRef = billDetails._id;
          if (userData && userData._id) {
            order.userRef = userData._id;
          }
          return order.save();
        } else {
          return Promise.resolve(null);
        }
      });
  };

  const updateUserDetails = (orderId, userData) => {
    return Order.findOne({
      idbId: orderId
    })
      .then(order => {
        if (order) {
          if (userData && userData._id) {
            order.userRef = userData._id;
          }
          return order.save();
        } else {
          return Promise.resolve(null);
        }
      });
  };

  const updateBillDetailsBulk = (updates) => {
    if (!updates) return Promise.resolve(null);

    return Order.bulkWrite(
      updates.map(u => ({
        updateOne: {
          filter: { _id: u.orderId },
          update: { $set: { billRef: u.billRef } }
        }
      }))
    );
  };

  const updateStatus = (orderId) => {
    return Order.findOne({
      _id: orderId
    })
      .then(order => {
        if (order) {
          order.status = app.config.contentManagement.order.completed;
          return order.save();
        } else {
          return Promise.resolve(null);
        }
      });
  };

  const getList = async (options) => {
    const limit = options.limit;     // from API query params
    const skip = options.skip;

    const aggArr = [{
      $lookup: {
        from: "bills",              // collection name
        localField: "billRef",
        foreignField: "_id",
        as: "billRef"
      }
    }, { $unwind: "$billRef" },];

    if (options.filters) {
      aggArr.push({
        $match: options.filters
      })
    }

    aggArr.push({
      $facet: {
        totalCount: [{ $count: "count" }],

        data: [
          {
            $project: options.select,
          }
        ]
      }
    });

    if (options.sort) {

      if (options.sort.createdAt) {
        aggArr[aggArr.length - 1].$facet.data.push({
          $sort: { "createdAt": options.sort.createdAt }
        });
      }

    }

    aggArr[aggArr.length - 1].$facet.data.push({ $skip: skip });
    aggArr[aggArr.length - 1].$facet.data.push({ $limit: limit });

    const orders = await Order.aggregate(aggArr).exec();
    return Promise.resolve({
      data: orders[0]?.data || [],
      total: orders[0]?.totalCount[0]?.count || 0,
      limit: limit,
      skip: skip
    });
  }

  const isMenuInOrderCart = async (menuRef, restaurantRef) => {
    if (!menuRef || !restaurantRef) return false;

    const query = {
      restaurantRef: restaurantRef,
      $or: [
        { 'cart.menuRef': menuRef },
      ]
    };

    const exists = await Order.exists(query);
    return Promise.resolve(!!exists);
  };

  const hasOrderForOwner = async (restaurantOwnerId) => {
    if (!restaurantOwnerId) return Promise.resolve(false);

    const filter = { createdBy: restaurantOwnerId };

    const exists = await Order.exists(filter);
    return Promise.resolve(!!exists);
  };

  const addOrdersToQueue = async (orders) => {
    if (!orders?.length) {
      return [];
    }

    const orderIds = orders.map(
      (order) => order.orderId
    );

    /*
     * Get existing queue documents for all incoming orders
     */
    const existingQueueOrders = await OrderQueue.find(
      {
        orderId: {
          $in: orderIds,
        },
      },
      {
        _id: 1,
        orderId: 1,
        restaurantId: 1,
        userId: 1,
        deviceId: 1,
        operation: 1,
        payload: 1,
        status: 1,
      }
    ).lean();

    const existingQueueMap = new Map(
      existingQueueOrders.map((item) => [
        item.orderId,
        item,
      ])
    );

    const operations = [];

    /*
     * Keep track of what happened to each incoming order.
     */
    const resultMap = new Map();

    for (const order of orders) {
      const existingQueue =
        existingQueueMap.get(order.orderId);

      /*
       * No existing queue document.
       *
       * Insert it.
       */
      if (!existingQueue) {
        operations.push({
          updateOne: {
            filter: {
              orderId: order.orderId,
            },

            update: {
              $set: {
                restaurantId: order.restaurantId,
                userId: order.userId,
                deviceId: order.deviceId,
                operation: order.operation,
                payload: order.payload,
                status: "PENDING",
                processingAt: null,
                processedAt: null,
                lastError: null,
              },

              $setOnInsert: {
                orderId: order.orderId,
                retryCount: 0,
              },
            },

            upsert: true,
          },
        });

        resultMap.set(order.orderId, {
          orderId: order.orderId,
          status: "QUEUED",
        });

        continue;
      }

      /*
       * CREATE operation
       *
       * Normally there should not be another CREATE
       * for the same orderId.
       *
       * If one exists, don't overwrite it blindly.
       */
      if (order.operation === "CREATE") {
        resultMap.set(order.orderId, {
          orderId: order.orderId,
          status: "ALREADY_EXISTS",
        });

        continue;
      }

      /*
       * UPDATE operation
       *
       * Compare incoming updatedAt with the
       * updatedAt already stored in OrderQueue.
       */
      if (order.operation === "UPDATE") {
        const incomingUpdatedAt =
          order.payload?.updatedAt;

        const existingUpdatedAt =
          existingQueue.payload?.updatedAt;

        /*
         * If incoming payload does not contain updatedAt,
         * you can either reject it or allow it.
         *
         * For safety, I'm rejecting it here.
         */
        if (!incomingUpdatedAt) {
          resultMap.set(order.orderId, {
            orderId: order.orderId,
            status: "INVALID_UPDATED_AT",
          });

          continue;
        }

        const incomingDate =
          new Date(incomingUpdatedAt);

        /*
         * Invalid incoming timestamp
         */
        if (Number.isNaN(incomingDate.getTime())) {
          resultMap.set(order.orderId, {
            orderId: order.orderId,
            status: "INVALID_UPDATED_AT",
          });

          continue;
        }

        /*
         * If existing queue has updatedAt,
         * compare the two timestamps.
         */
        if (existingUpdatedAt) {
          const existingDate =
            new Date(existingUpdatedAt);

          /*
           * Existing queue has a newer or equal update.
           *
           * Do NOT replace it.
           */
          if (
            !Number.isNaN(existingDate.getTime()) &&
            incomingDate <= existingDate
          ) {
            resultMap.set(order.orderId, {
              orderId: order.orderId,
              queueId: existingQueue._id,
              status: "SKIPPED_OLDER_UPDATE",
            });

            continue;
          }
        }

        /*
         * Incoming update is newer.
         *
         * Replace the queue payload and make it
         * PENDING again so Change Stream processes it.
         */
        operations.push({
          updateOne: {
            filter: {
              _id: existingQueue._id,
            },

            update: {
              $set: {
                restaurantId: order.restaurantId,
                userId: order.userId,
                deviceId: order.deviceId,
                operation: order.operation,
                payload: order.payload,
                status: "PENDING",
                processingAt: null,
                processedAt: null,
                lastError: null,
              },
            },

            upsert: false,
          },
        });

        resultMap.set(order.orderId, {
          orderId: order.orderId,
          queueId: existingQueue._id,
          status: "QUEUED",
        });
      }
    }

    /*
     * Execute all inserts/updates together.
     */
    if (operations.length > 0) {
      await OrderQueue.bulkWrite(
        operations,
        {
          ordered: false,
        }
      );
    }

    /*
     * Fetch the actual queue documents again.
     *
     * This is useful for newly inserted documents because
     * their _id is generated by MongoDB.
     */
    const finalQueueOrders = await OrderQueue.find(
      {
        orderId: {
          $in: orderIds,
        },
      },
      {
        _id: 1,
        orderId: 1,
        status: 1,
      }
    ).lean();

    const finalQueueMap = new Map(
      finalQueueOrders.map((item) => [
        item.orderId,
        item,
      ])
    );

    /*
     * Return one result for every incoming order.
     */
    return orders.map((order) => {
      const result =
        resultMap.get(order.orderId);

      const queueOrder =
        finalQueueMap.get(order.orderId);

      /*
       * If this was a newly inserted order,
       * get the generated queueId.
       */
      if (
        result?.status === "QUEUED" &&
        queueOrder
      ) {
        return {
          orderId: order.orderId,
          queueId: queueOrder._id,
          status: queueOrder.status,
        };
      }

      /*
       * Older update / invalid update / etc.
       */
      return {
        orderId: order.orderId,
        queueId:
          result?.queueId ||
          queueOrder?._id ||
          null,
        status:
          result?.status ||
          queueOrder?.status ||
          "UNKNOWN",
      };
    });
  };

  const processingQueue = [];
  let isProcessingQueue = false;

  const sleep = (ms) =>
    new Promise((resolve) => setTimeout(resolve, ms));


  const isWriteConflict = (error) => {
    return (
      error?.code === 112 ||
      error?.codeName === "WriteConflict" ||
      error?.message?.includes("Write conflict")
    );
  };


  /**
   * Process one OrderQueue document.
   *
   * Only one order is processed at a time because
   * inventory functions can update the same inventory
   * documents concurrently.
   */
  const processOrderQueue = async (
    queueId,
    maxRetries = 3
  ) => {
    console.log("Processing queueId:", queueId);

    /*
     * Atomically claim the queue record.
     *
     * If another process already claimed it,
     * findOneAndUpdate returns null.
     */
    const queueOrder = await OrderQueue.findOneAndUpdate(
      {
        _id: queueId,
        status: "PENDING",
      },
      {
        $set: {
          status: "PROCESSING",
          processingAt: new Date(),
        },
      },
      {
        new: true,
      }
    );

    console.log("queueOrder:", queueOrder);

    /*
     * Already being processed or already completed.
     */
    if (!queueOrder) {
      return;
    }

    const userData = {
      _id: queueOrder.userId,
      restaurantRef: queueOrder.restaurantId,
    };

    let lastError = null;

    /*
     * Retry only the actual order processing.
     *
     * We don't re-claim the queue document on every retry.
     */
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        let actualOrder;

        if (queueOrder.operation === "CREATE") {
          actualOrder =
            await app.service.order.createOfflineOrder(
              queueOrder.payload,
              userData
            );

        } else if (queueOrder.operation === "UPDATE") {
          actualOrder = await app.service.order.updateOfflineOrder(
            {
              ...queueOrder.payload,
              idbId: queueOrder.orderId,
            },
            userData
          );

        } else {
          throw new Error(
            `Unsupported operation: ${queueOrder.operation}`
          );
        }

        /*
         * Everything succeeded.
         *
         * Mark queue item as SYNCED.
         */
        await OrderQueue.updateOne(
          {
            _id: queueOrder._id,
            status: "PROCESSING",
          },
          {
            $set: {
              status: "SYNCED",
              processedAt: new Date(),
              processingAt: null,
              orderRef: actualOrder?._id || null,
              lastError: null,
            },
          }
        );

        console.log(
          `Offline order synced: ${queueOrder.orderId}`
        );

        return;

      } catch (error) {
        lastError = error;

        console.error(
          `Offline order processing failed. ` +
          `Order: ${queueOrder.orderId}, ` +
          `Attempt: ${attempt}/${maxRetries}`,
          error
        );

        /*
         * Retry only MongoDB write conflicts.
         *
         * Other errors should not be retried.
         */
        if (!isWriteConflict(error)) {
          break;
        }

        /*
         * Final attempt failed.
         */
        if (attempt === maxRetries) {
          break;
        }

        /*
         * Exponential-ish backoff:
         *
         * Attempt 1 → 300ms
         * Attempt 2 → 600ms
         * Attempt 3 → final
         */
        const delay = attempt * 300;

        console.log(
          `Write conflict detected for queue ` +
          `${queueOrder._id}. Retrying after ${delay}ms`
        );

        await sleep(delay);
      }
    }

    /*
     * All retries failed or a non-retryable error occurred.
     *
     * ONLY NOW mark the queue item as FAILED.
     */
    try {
      await OrderQueue.updateOne(
        {
          _id: queueOrder._id,
          status: "PROCESSING",
        },
        {
          $set: {
            status: "FAILED",
            processingAt: null,
            lastError:
              lastError?.message ||
              "Unknown error",
          },
          $inc: {
            retryCount: 1,
          },
        }
      );

    } catch (queueUpdateError) {
      console.error(
        `Failed to mark queue item as FAILED: ${queueOrder._id}`,
        queueUpdateError
      );
    }

    console.error(
      `Offline order permanently failed: ${queueOrder.orderId}`
    );
  };


  /**
   * Add an order to the in-memory processing queue.
   */
  const enqueueOrderForProcessing = (queueId) => {
    if (!queueId) {
      return;
    }

    processingQueue.push(queueId);

    processNextOrder();
  };


  /**
   * Process queue items sequentially.
   *
   * Only one order is allowed to execute at a time.
   */
  const processNextOrder = async () => {
    if (
      isProcessingQueue ||
      processingQueue.length === 0
    ) {
      return;
    }

    isProcessingQueue = true;

    const queueId = processingQueue.shift();

    try {
      await processOrderQueue(queueId);
    } catch (error) {
      /*
       * This should mainly catch unexpected errors outside
       * the normal processing flow.
       */
      console.error(
        `Unexpected OrderQueue error: ${queueId}`,
        error
      );
    } finally {
      isProcessingQueue = false;

      /*
       * Process next queued order.
       */
      processNextOrder();
    }
  };


  /**
   * Start MongoDB Change Stream.
   */
  const startOrderQueueChangeStream = () => {
    const changeStream = OrderQueue.watch([
      {
        $match: {
          operationType: {
            $in: ["insert", "update"],
          },
        },
      },
    ]);

    changeStream.on("change", (change) => {
      try {
        console.log(
          "OrderQueue change:",
          change
        );

        /*
         * INSERT
         *
         * New queue document.
         */
        if (
          change.operationType === "insert"
        ) {
          const queueOrder =
            change.fullDocument;

          if (!queueOrder?._id) {
            return;
          }

          enqueueOrderForProcessing(
            queueOrder._id
          );

          return;
        }

        /*
         * UPDATE
         *
         * Process only when status changes
         * to PENDING.
         */
        if (
          change.operationType === "update"
        ) {
          const status =
            change
              .updateDescription
              ?.updatedFields
              ?.status;

          if (status !== "PENDING") {
            return;
          }

          /*
           * For update events, fullDocument is not
           * available by default.
           *
           * Use documentKey._id.
           */
          const queueId =
            change.documentKey?._id;

          if (!queueId) {
            return;
          }

          console.log(
            "Queue item moved to PENDING:",
            queueId
          );

          enqueueOrderForProcessing(
            queueId
          );
        }

      } catch (error) {
        console.error(
          "OrderQueue Change Stream processing error:",
          error
        );
      }
    });

    changeStream.on("error", (error) => {
      console.error(
        "OrderQueue Change Stream error:",
        error
      );
    });

    changeStream.on("close", () => {
      console.error(
        "OrderQueue Change Stream closed"
      );
    });

    console.log(
      "OrderQueue Change Stream started"
    );

    return changeStream;
  };

  return {
    'create': createOrder,
    'createMulti': createMultiOrder,
    'get': findOrderById,
    'getFromUser': findOrderFromUserById,
    'getOrderByIdbId': getOrderByIdbId,
    'edit': editOrder,
    'list': getList,
    'remove': removeOrder,
    'updateBillDetails': updateBillDetails,
    'updateStatus': updateStatus,
    'updateBillDetailsBulk': updateBillDetailsBulk,
    'bulkUpdateOrders': bulkUpdateOrders,
    'isMenuInOrderCart': isMenuInOrderCart,
    'hasOrderForOwner': hasOrderForOwner,
    'updateUserDetails': updateUserDetails,
    'addOrdersToQueue': addOrdersToQueue,
    'processOrderQueue': processOrderQueue,
    'startOrderQueueChangeStream': startOrderQueueChangeStream
  };
};