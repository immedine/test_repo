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
  const Restaurant = app.models.Restaurant;

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

  const createOrderIdempotent = async (config, userRef) => {
    if (userRef) {
      config.createdBy = userRef._id;
      config.addedByOwner = true;
      config.restaurantRef = userRef.restaurantRef;
    }

    /*
   * ---------------------------------------------------------
   * 1. Check whether this offline operation already created
   *    an order.
   * ---------------------------------------------------------
   */
    const existingOrder = await Order.findOne({
      restaurantRef: config.restaurantRef,
      idbId: config.idbId
    });

    if (existingOrder) {
      return existingOrder;
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
    if (idempotencyKey) {
      config.idempotencyKey = idempotencyKey;
    }
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

  const getOrderByIdbId = function (orderId, userRef, noError) {
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
        if (!noError && (!orderDetails || (orderDetails && userRef &&
          orderDetails.restaurantRef.toString() !== userRef.restaurantRef.toString()))) {
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

  /*
 * Offline order queue processor.
 *
 * Features:
 * - Sequential processing per restaurant.
 * - Different restaurants process concurrently.
 * - MongoDB is the durable queue.
 * - Startup recovery for stale PROCESSING records.
 * - Change Stream triggers plus direct processing.
 * - Retry on MongoDB WriteConflict.
 *
 * IMPORTANT:
 * This in-memory restaurant lock assumes ONE Node.js/PM2 worker.
 * Multiple workers require a database-backed restaurant lease.
 */

  const { randomUUID } = require("node:crypto");

  const MAX_ORDER_RETRIES = 3;
  const PROCESSING_STALE_AFTER_MS = 10 * 60 * 1000;

  const restaurantQueueStates = new Map();

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const isWriteConflict = (error) =>
    error?.code === 112 ||
    error?.codeName === "WriteConflict" ||
    /write conflict/i.test(error?.message || "");

  const getRestaurantQueueState = (key) => {
    if (!restaurantQueueStates.has(key)) {
      restaurantQueueStates.set(key, {
        isProcessing: false,
        rerunRequested: false,
      });
    }

    return restaurantQueueStates.get(key);
  };

  /**
   * Add one offline batch.
   */
  const addOrdersToQueuex = async (orders, user) => {
    if (!Array.isArray(orders) || orders.length === 0) {
      return [];
    }

    const restaurantId = user.restaurantRef;
    const orderSyncId = randomUUID();
    const startedAt = new Date();

    // Atomically allow only one active batch per restaurant.
    const restaurant = await Restaurant.findOneAndUpdate(
      {
        _id: restaurantId,
        orderSyncing: { $ne: true },
      },
      {
        $set: {
          orderSyncing: true,
          orderSyncStartedAt: startedAt,
          orderSyncId,
        },
      },
      { new: true }
    );

    if (!restaurant) {
      const error = new Error(
        "Order synchronization is already in progress"
      );

      error.statusCode = 409;
      throw error;
    }

    console.log(
      `Starting order sync for restaurant ${restaurantId}; ` +
      `batch ${orderSyncId}; ${orders.length} incoming orders`
    );

    try {
      const orderIds = [
        ...new Set(orders.map((order) => order.orderId)),
      ];

      const existingQueueOrders = await OrderQueue.find(
        {
          restaurantId,
          orderId: { $in: orderIds },
          status: { $ne: "SYNCED" },
        },
        {
          _id: 1,
          orderId: 1,
          restaurantId: 1,
          payload: 1,
          operation: 1,
          status: 1,
          orderSyncId: 1,
        }
      ).lean();

      const existingQueueMap = new Map(
        existingQueueOrders.map((item) => [
          item.orderId,
          item,
        ])
      );

      const operations = [];
      const resultMap = new Map();

      for (const order of orders) {
        if (
          !order?.orderId ||
          !order.operation ||
          !order.payload
        ) {
          resultMap.set(order?.orderId, {
            orderId: order?.orderId ?? null,
            status: "INVALID_ORDER",
          });

          continue;
        }

        const existingQueue = existingQueueMap.get(
          order.orderId
        );

        // New order: insert it into the durable queue.
        if (!existingQueue) {
          operations.push({
            updateOne: {
              filter: {
                restaurantId,
                orderId: order.orderId,
              },

              update: {
                $set: {
                  restaurantId,
                  userId: order.userId,
                  deviceId: order.deviceId,
                  operation: order.operation,
                  payload: order.payload,
                  orderSyncId,
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

        // Avoid overwriting an existing CREATE operation.
        if (order.operation === "CREATE") {
          resultMap.set(order.orderId, {
            orderId: order.orderId,
            queueId: existingQueue._id,
            status: "ALREADY_EXISTS",
          });

          continue;
        }

        if (order.operation !== "UPDATE") {
          resultMap.set(order.orderId, {
            orderId: order.orderId,
            queueId: existingQueue._id,
            status: "UNSUPPORTED_OPERATION",
          });

          continue;
        }

        /*
         * Do not overwrite the payload while a worker is processing it.
         * The client should retry this update after processing finishes.
         */
        if (existingQueue.status === "PROCESSING") {
          resultMap.set(order.orderId, {
            orderId: order.orderId,
            queueId: existingQueue._id,
            status: "PROCESSING_TRY_AGAIN",
          });

          continue;
        }

        const incomingUpdatedAt = order.payload?.updatedAt;
        const existingUpdatedAt =
          existingQueue.payload?.updatedAt;

        if (
          !incomingUpdatedAt ||
          Number.isNaN(
            new Date(incomingUpdatedAt).getTime()
          )
        ) {
          resultMap.set(order.orderId, {
            orderId: order.orderId,
            queueId: existingQueue._id,
            status: "INVALID_UPDATED_AT",
          });

          continue;
        }

        // Reject stale or duplicate updates.
        if (existingUpdatedAt) {
          const existingDate = new Date(existingUpdatedAt);

          if (
            !Number.isNaN(existingDate.getTime()) &&
            new Date(incomingUpdatedAt) <= existingDate
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
         * The status condition protects against a worker claiming
         * this queue record after our initial read.
         */
        operations.push({
          updateOne: {
            filter: {
              _id: existingQueue._id,
              status: { $ne: "PROCESSING" },
            },

            update: {
              $set: {
                restaurantId,
                userId: order.userId,
                deviceId: order.deviceId,
                operation: "UPDATE",
                payload: order.payload,
                orderSyncId,
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

      if (operations.length > 0) {
        await OrderQueue.bulkWrite(
          operations,
          { ordered: false }
        );
      }

      const finalQueueOrders = await OrderQueue.find(
        {
          restaurantId,
          orderId: { $in: orderIds },
        },
        {
          _id: 1,
          orderId: 1,
          status: 1,
          orderSyncId: 1,
        }
      ).lean();

      const finalQueueMap = new Map(
        finalQueueOrders.map((item) => [
          item.orderId,
          item,
        ])
      );

      const results = orders.map((order) => {
        const result = resultMap.get(order.orderId);
        const queueOrder = finalQueueMap.get(order.orderId);

        // The worker may have claimed the item between our read
        // and our conditional update.
        if (
          result?.status === "QUEUED" &&
          queueOrder?.status === "PROCESSING"
        ) {
          return {
            orderId: order.orderId,
            queueId: queueOrder._id,
            status: "PROCESSING_TRY_AGAIN",
          };
        }

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

      // Process directly; don't rely only on Change Streams.
      void processRestaurantQueue(restaurantId);

      // Handles batches containing no processable items.
      await checkAndCompleteOrderSync(
        restaurantId,
        orderSyncId
      );

      return results;
    } catch (error) {
      console.error(
        `Could not enqueue offline batch ${orderSyncId}`,
        error
      );

      /*
       * bulkWrite can partially succeed.
       * Do not clear the sync flag if this batch still has work.
       */
      const outstanding = await OrderQueue.countDocuments({
        restaurantId,
        orderSyncId,
        status: {
          $in: ["PENDING", "PROCESSING", "FAILED"],
        },
      }).catch(() => 1);

      if (outstanding === 0) {
        await Restaurant.updateOne(
          {
            _id: restaurantId,
            orderSyncId,
          },
          {
            $set: {
              orderSyncing: false,
              orderSyncStartedAt: null,
              orderSyncId: null,
            },
          }
        );
      } else {
        void processRestaurantQueue(restaurantId);
      }

      throw error;
    }
  };

  const addOrdersToQueue = async (orders, user) => {
    if (!Array.isArray(orders) || orders.length === 0) {
      return [];
    }

    const restaurantId = user.restaurantRef;
    const orderSyncId = randomUUID();
    const startedAt = new Date();

    const restaurant = await Restaurant.findOneAndUpdate(
      {
        _id: restaurantId,
        orderSyncing: { $ne: true },
      },
      {
        $set: {
          orderSyncing: true,
          orderSyncStartedAt: startedAt,
          orderSyncId,
        },
      },
      { new: true }
    );

    if (!restaurant) {
      throw new Error("Order synchronization is already in progress");
    }

    try {
      const orderIds = [
        ...new Set(
          orders
            .map((order) => order?.orderId)
            .filter(Boolean)
        ),
      ];

      // 1. Fetch existing queue records
      const existingQueueOrders = await OrderQueue.find(
        {
          restaurantId,
          orderId: { $in: orderIds },
          status: { $ne: "SYNCED" },
        },
        {
          _id: 1,
          orderId: 1,
          restaurantId: 1,
          payload: 1,
          operation: 1,
          status: 1,
          orderSyncId: 1,
        }
      ).lean();

      const existingQueueMap = new Map(
        existingQueueOrders.map((item) => [item.orderId, item])
      );

      // 2. Fetch existing orders from Order collection
      const existingOrders = await Order.find(
        {
          restaurantRef: restaurantId,
          idbId: { $in: orderIds },
        },
        {
          _id: 1,
          idbId: 1,
          lastOfflineUpdatedAt: 1,
        }
      ).lean();

      const existingOrderMap = new Map(
        existingOrders.map((item) => [item.idbId, item])
      );

      const operations = [];
      const resultMap = new Map();

      for (const order of orders) {
        if (!order?.orderId || !order.operation || !order.payload) {
          resultMap.set(order?.orderId ?? null, {
            orderId: order?.orderId ?? null,
            status: "INVALID_ORDER",
          });

          continue;
        }

        const existingQueue = existingQueueMap.get(order.orderId);
        const existingOrder = existingOrderMap.get(order.orderId);

        // 3. Handle CREATE operation
        if (order.operation === "CREATE") {
          if (existingQueue || existingOrder) {
            resultMap.set(order.orderId, {
              orderId: order.orderId,
              queueId: existingQueue?._id ?? null,
              status: "ALREADY_EXISTS",
            });

            continue;
          }

          operations.push({
            updateOne: {
              filter: {
                restaurantId,
                orderId: order.orderId,
              },
              update: {
                $set: {
                  restaurantId,
                  userId: order.userId,
                  deviceId: order.deviceId,
                  operation: "CREATE",
                  payload: order.payload,
                  orderSyncId,
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

        // 4. Validate operation
        if (order.operation !== "UPDATE") {
          resultMap.set(order.orderId, {
            orderId: order.orderId,
            status: "UNSUPPORTED_OPERATION",
          });

          continue;
        }

        // 5. Validate incoming updatedAt
        const incomingDate = new Date(order.payload.updatedAt);

        if (
          !order.payload.updatedAt ||
          Number.isNaN(incomingDate.getTime())
        ) {
          resultMap.set(order.orderId, {
            orderId: order.orderId,
            status: "INVALID_UPDATED_AT",
          });

          continue;
        }

        // 6. Do not overwrite an order currently being processed
        if (existingQueue?.status === "PROCESSING") {
          resultMap.set(order.orderId, {
            orderId: order.orderId,
            queueId: existingQueue._id,
            status: "PROCESSING_TRY_AGAIN",
          });

          continue;
        }

        // 7. Compare incoming timestamp with queue and Order DB
        const queueDate = existingQueue?.payload?.updatedAt
          ? new Date(existingQueue.payload.updatedAt)
          : null;

        const dbDate = existingOrder?.lastOfflineUpdatedAt
          ? new Date(existingOrder.lastOfflineUpdatedAt)
          : null;

        const validDates = [queueDate, dbDate].filter(
          (date) => date && !Number.isNaN(date.getTime())
        );

        const latestDate =
          validDates.length > 0
            ? new Date(
              Math.max(...validDates.map((date) => date.getTime()))
            )
            : null;

        if (latestDate && incomingDate <= latestDate) {
          resultMap.set(order.orderId, {
            orderId: order.orderId,
            queueId: existingQueue?._id ?? null,
            status: "SKIPPED_OLDER_UPDATE",
          });

          continue;
        }

        // 8. Insert new UPDATE queue record
        if (!existingQueue) {
          operations.push({
            updateOne: {
              filter: {
                restaurantId,
                orderId: order.orderId,
              },
              update: {
                $set: {
                  restaurantId,
                  userId: order.userId,
                  deviceId: order.deviceId,
                  operation: "UPDATE",
                  payload: order.payload,
                  orderSyncId,
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

        // 9. Update existing queue record only if not PROCESSING
        operations.push({
          updateOne: {
            filter: {
              _id: existingQueue._id,
              status: { $ne: "PROCESSING" },
            },
            update: {
              $set: {
                userId: order.userId,
                deviceId: order.deviceId,
                operation: "UPDATE",
                payload: order.payload,
                orderSyncId,
                status: "PENDING",
                processingAt: null,
                processedAt: null,
                lastError: null,
              },
            },
          },
        });

        resultMap.set(order.orderId, {
          orderId: order.orderId,
          queueId: existingQueue._id,
          status: "QUEUED",
        });
      }

      // 10. Execute bulk operations
      if (operations.length > 0) {
        await OrderQueue.bulkWrite(operations, {
          ordered: false,
        });
      }

      // 11. Re-fetch final queue records
      const finalQueueOrders = await OrderQueue.find(
        {
          restaurantId,
          orderId: { $in: orderIds },
        },
        {
          _id: 1,
          orderId: 1,
          status: 1,
        }
      ).lean();

      const finalQueueMap = new Map(
        finalQueueOrders.map((item) => [item.orderId, item])
      );

      const results = orders.map((order) => {
        const result = resultMap.get(order?.orderId ?? null);

        if (!result || result.status !== "QUEUED") {
          return result || {
            orderId: order?.orderId ?? null,
            status: "INVALID_ORDER",
          };
        }

        const finalQueue = finalQueueMap.get(order.orderId);

        if (!finalQueue) {
          return {
            ...result,
            status: "QUEUE_WRITE_FAILED",
          };
        }

        if (finalQueue.status === "PROCESSING") {
          return {
            ...result,
            queueId: finalQueue._id,
            status: "PROCESSING_TRY_AGAIN",
          };
        }

        return {
          ...result,
          queueId: finalQueue._id,
          status:
            finalQueue.status === "PENDING"
              ? "QUEUED"
              : finalQueue.status,
        };
      });

      // 12. Start queue processing
      void processRestaurantQueue(restaurantId);

      await checkAndCompleteOrderSync(restaurantId, orderSyncId);

      return results;
    } catch (error) {
      // 13. Check whether this sync still has active queue records
      const remainingOrders = await OrderQueue.countDocuments({
        restaurantId,
        orderSyncId,
        status: {
          $in: ["PENDING", "PROCESSING"],
        },
      });

      if (remainingOrders === 0) {
        await Restaurant.updateOne(
          {
            _id: restaurantId,
            orderSyncId,
          },
          {
            $set: {
              orderSyncing: false,
            },
            $unset: {
              orderSyncStartedAt: 1,
              orderSyncId: 1,
            },
          }
        );
      } else {
        void processRestaurantQueue(restaurantId);
      }

      throw error;
    }
  };

  /**
   * Complete a batch only when all its queue items are resolved.
   *
   * FAILED is intentionally unresolved until retried or handled.
   */
  const checkAndCompleteOrderSync = async (restaurantId, orderSyncId) => {
    if (!restaurantId || !orderSyncId) return false;

    const outstanding = await OrderQueue.countDocuments({
      restaurantId,
      orderSyncId,
      status: { $in: ["PENDING", "PROCESSING"] },
    });

    if (outstanding > 0) return false;

    const result = await Restaurant.updateOne(
      {
        _id: restaurantId,
        orderSyncId,
        orderSyncing: true,
      },
      {
        $set: {
          orderSyncing: false,
          orderSyncStartedAt: null,
          orderSyncId: null,
        },
      }
    );

    if (result.modifiedCount > 0) {
      console.log(
        `Order sync completed for restaurant ${restaurantId}, batch ${orderSyncId}`
      );
      return true;
    }

    return false;
  };

  /**
   * Process a queue document that has ALREADY been claimed.
   */
  const processClaimedOrder = async (queueOrder) => {
    const userData = {
      _id: queueOrder.userId,
      restaurantRef: queueOrder.restaurantId,
    };

    let lastError;

    for (
      let attempt = 1;
      attempt <= MAX_ORDER_RETRIES;
      attempt += 1
    ) {
      let businessOperationCompleted = false;

      try {
        let actualOrder;

        if (queueOrder.operation === "CREATE") {
          actualOrder =
            await app.service.order.createOfflineOrder(
              queueOrder.payload,
              userData
            );
        } else if (queueOrder.operation === "UPDATE") {
          actualOrder =
            await app.service.order.updateOfflineOrder(
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
         * The business operation succeeded.
         * Do not repeat it immediately if only the queue-status
         * update fails; doing so could duplicate side effects.
         */
        businessOperationCompleted = true;

        // return;

        const updateResult = await OrderQueue.updateOne(
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

        if (updateResult.modifiedCount !== 1) {
          throw new Error(
            `Business operation completed, but queue item ` +
            `${queueOrder._id} was not marked SYNCED`
          );
        }

        console.log(
          `Offline order synced: ${queueOrder.orderId}`
        );

        return;
      } catch (error) {
        lastError = error;

        console.error(
          `Offline order failed: ${queueOrder.orderId}; ` +
          `attempt ${attempt}/${MAX_ORDER_RETRIES}`,
          error
        );

        if (businessOperationCompleted) {
          /*
           * Keep PROCESSING for later recovery.
           * The underlying service must be idempotent.
           */
          return;
        }

        if (
          !isWriteConflict(error) ||
          attempt === MAX_ORDER_RETRIES
        ) {
          break;
        }

        await sleep(attempt * 300);
      }
    }

    await OrderQueue.updateOne(
      {
        _id: queueOrder._id,
        status: "PROCESSING",
      },
      {
        $set: {
          status: "FAILED",
          processingAt: null,
          lastError: lastError?.message || "Unknown error",
        },
        $inc: {
          retryCount: 1,
        },
      }
    ).catch((error) => {
      console.error(
        `Could not mark queue item FAILED: ${queueOrder._id}`,
        error
      );
    });

    await checkAndCompleteOrderSync(
      queueOrder.restaurantId,
      queueOrder.orderSyncId
    );

    console.error(
      `Offline order permanently failed: ${queueOrder.orderId}`
    );
  };

  /**
   * One processor loop per restaurant.
   *
   * Same restaurant: sequential.
   * Different restaurants: concurrent.
   */
  const processRestaurantQueue = async (restaurantId) => {
    if (!restaurantId) {
      return;
    }

    const key = restaurantId.toString();
    const state = getRestaurantQueueState(key);

    if (state.isProcessing) {
      state.rerunRequested = true;
      return;
    }

    state.isProcessing = true;
    state.rerunRequested = false;

    try {
      while (true) {
        const queueOrder =
          await OrderQueue.findOneAndUpdate(
            {
              restaurantId,
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
              sort: {
                createdAt: 1,
                _id: 1,
              },
            }
          );

        if (!queueOrder) {
          break;
        }

        await processClaimedOrder(queueOrder);

        await checkAndCompleteOrderSync(
          queueOrder.restaurantId,
          queueOrder.orderSyncId
        );
      }
    } catch (error) {
      console.error(
        `Queue processor failed for restaurant ${key}`,
        error
      );
    } finally {
      // Release the in-memory processing lock first.
      state.isProcessing = false;

      try {
        // 1. Check whether the current restaurant still has an active sync.
        const restaurant = await Restaurant.findOne(
          {
            _id: restaurantId,
            orderSyncing: true,
          },
          {
            orderSyncId: 1,
          }
        ).lean();

        // 2. Check whether the current batch is complete.
        if (restaurant?.orderSyncId) {
          await checkAndCompleteOrderSync(
            restaurantId,
            restaurant.orderSyncId
          );
        }

        // 3. Check whether another processing pass was requested
        // while this processor was running.
        const shouldRerun = state.rerunRequested;
        state.rerunRequested = false;

        // 4. Check the actual database for pending orders.
        const pending = await OrderQueue.exists({
          restaurantId,
          status: "PENDING",
        });

        // 5. Start another processing pass if necessary.
        if (shouldRerun || pending) {
          queueMicrotask(() => {
            void processRestaurantQueue(restaurantId).catch((error) => {
              console.error(
                `Queue processor restart failed for restaurant ${key}`,
                error
              );
            });
          });
        }
      } catch (error) {
        console.error(
          `Queue processor cleanup failed for restaurant ${key}`,
          error
        );
      }
    }
  };

  /**
   * Change Streams are a trigger, not the source of truth.
   */
  const startOrderQueueChangeStream = () => {
    const changeStream = OrderQueue.watch([
      {
        $match: {
          operationType: {
            $in: ["insert", "update", "replace"],
          },
        },
      },
    ], {
      fullDocument: "updateLookup",
    });

    changeStream.on("change", async (change) => {
      try {
        let queueOrder = change.fullDocument;

        if (change.operationType !== "insert") {
          const changedStatus =
            change.updateDescription?.updatedFields?.status;

          if (
            change.operationType === "update" &&
            changedStatus !== "PENDING"
          ) {
            return;
          }

          if (
            !queueOrder &&
            change.documentKey?._id
          ) {
            queueOrder = await OrderQueue.findById(
              change.documentKey._id,
              {
                restaurantId: 1,
                status: 1,
              }
            ).lean();
          }
        }

        if (
          queueOrder?.restaurantId &&
          queueOrder.status === "PENDING"
        ) {
          void processRestaurantQueue(
            queueOrder.restaurantId
          );
        }
      } catch (error) {
        console.error(
          "OrderQueue Change Stream handler failed",
          error
        );
      }
    });

    changeStream.on("error", (error) => {
      console.error(
        "OrderQueue Change Stream error",
        error
      );
    });

    changeStream.on("close", () => {
      console.error("OrderQueue Change Stream closed");
    });

    console.log("OrderQueue Change Stream started");

    return changeStream;
  };

  /**
   * Run once after MongoDB connects.
   *
   * Recover stale PROCESSING records, then scan MongoDB for
   * PENDING records so missed Change Stream events don't lose work.
   */
  const recoverOrderQueueOnStartup = async () => {
    const staleBefore = new Date(
      Date.now() - PROCESSING_STALE_AFTER_MS
    );

    // Only run this at startup, when the previous process is no longer
    // processing queue items. Do not run indiscriminately while workers
    // are active.
    const recovery = await OrderQueue.updateMany(
      {
        status: "PROCESSING",
        $or: [
          { processingAt: null },
          { processingAt: { $lt: staleBefore } },
        ],
      },
      {
        $set: {
          status: "PENDING",
          processingAt: null,
          lastError: "Recovered after stale processing / server restart",
        },
        $inc: {
          retryCount: 1,
        },
      }
    );

    console.log(
      `Recovered ${recovery.modifiedCount || 0} stale OrderQueue item(s)`
    );

    // Find restaurants whose sync flag may have been left true.
    const restaurants = await Restaurant.find(
      { orderSyncing: true },
      { _id: 1, orderSyncId: 1 }
    ).lean();

    for (const restaurant of restaurants) {
      const { _id: restaurantId, orderSyncId } = restaurant;

      if (!orderSyncId) {
        console.error(
          `Restaurant ${restaurantId} has orderSyncing=true without orderSyncId`
        );
        continue;
      }

      const outstanding = await OrderQueue.countDocuments({
        restaurantId,
        orderSyncId,
        status: { $in: ["PENDING", "PROCESSING"] },
      });

      if (outstanding === 0) {
        // All records are terminal. Clear the abandoned sync flag.
        await checkAndCompleteOrderSync(restaurantId, orderSyncId);
      } else {
        // Continue processing this restaurant's active batch.
        void processRestaurantQueue(restaurantId).catch((error) => {
          console.error(
            `Startup queue recovery failed for ${restaurantId}`,
            error
          );
        });
      }
    }

    // Also process PENDING records that may not belong to a currently
    // flagged restaurant, so they are not silently ignored.
    // const pendingRestaurantIds = await OrderQueue.distinct(
    //   "restaurantId",
    //   { status: "PENDING" }
    // );

    // for (const restaurantId of pendingRestaurantIds) {
    //   void processRestaurantQueue(restaurantId).catch((error) => {
    //     console.error(
    //       `Startup pending queue processing failed for ${restaurantId}`,
    //       error
    //     );
    //   });
    // }
  };

  /**
   * Optional helper for an explicit admin retry action.
   */
  const retryFailedOrderQueueItem = async (queueId) => {
    const queueOrder = await OrderQueue.findById(queueId).lean();

    if (!queueOrder || queueOrder.status !== "FAILED") {
      return null;
    }

    const restaurantId = queueOrder.restaurantId;
    const newOrderSyncId = randomUUID();

    // Start a new sync batch. Only one active batch per restaurant.
    const restaurant = await Restaurant.findOneAndUpdate(
      {
        _id: restaurantId,
        orderSyncing: { $ne: true },
      },
      {
        $set: {
          orderSyncing: true,
          orderSyncStartedAt: new Date(),
          orderSyncId: newOrderSyncId,
        },
      },
      { new: true }
    );

    if (!restaurant) {
      throw new Error(
        "Order synchronization is already in progress for this restaurant"
      );
    }

    try {
      const updatedQueueOrder = await OrderQueue.findOneAndUpdate(
        {
          _id: queueId,
          status: "FAILED",
        },
        {
          $set: {
            status: "PENDING",
            processingAt: null,
            lastError: null,
            orderSyncId: newOrderSyncId,
          },
        },
        { new: true }
      );

      if (!updatedQueueOrder) {
        await checkAndCompleteOrderSync(
          restaurantId,
          newOrderSyncId
        );

        return null;
      }

      void processRestaurantQueue(restaurantId).catch((error) => {
        console.error(
          `Failed to retry queue item ${queueId}`,
          error
        );
      });

      return updatedQueueOrder;
    } catch (error) {
      await checkAndCompleteOrderSync(
        restaurantId,
        newOrderSyncId
      ).catch((cleanupError) => {
        console.error("Retry cleanup failed:", cleanupError);
      });

      throw error;
    }
  };

  /*
   * Export using your project's existing module/export style.
   *
   * Startup, AFTER MongoDB connects:
   *
   * startOrderQueueChangeStream();
   * await recoverOrderQueueOnStartup();
   */

  return {
    'create': createOrder,
    'createIdempotent': createOrderIdempotent,
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
    'startOrderQueueChangeStream': startOrderQueueChangeStream,
    'recoverOrderQueueOnStartup': recoverOrderQueueOnStartup,
    'retryFailedOrderQueueItem': retryFailedOrderQueueItem
  };
};