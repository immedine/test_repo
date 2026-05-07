'use strict';

/**
 * This module handles all functionality of dashboard portion in admin
 * @module Modules/Admin/Dashboard
 */

module.exports = function (app) {
  const mongoose = require('mongoose');
  
  const Category = app.models.Category;
  const Menu = app.models.Menu;
  const Order = app.models.Order;
  const Bill = app.models.Bill;
  const Table = app.models.Table;
  const Inventory = app.models.Inventory;
  const Restaurant = app.models.Restaurant;

  // Get today's revenue (only paid bills) with trend comparison to yesterday
  const getTodayRevenue = async (restaurantId) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayEnd = new Date(today);
    yesterdayEnd.setMilliseconds(-1);

    // Get today's revenue
    const todayResult = await Bill.aggregate([
      {
        $match: {
          restaurantRef: new mongoose.Types.ObjectId(restaurantId),
          "paymentDetails.status": app.config.contentManagement.paymentStatus.paid,
          createdAt: {
            $gte: today,
            $lt: tomorrow
          }
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$total" }
        }
      },
      {
        $project: {
          _id: 0,
          totalRevenue: { $ifNull: ["$totalRevenue", 0] }
        }
      }
    ]);

    // Get yesterday's revenue
    const yesterdayResult = await Bill.aggregate([
      {
        $match: {
          restaurantRef: new mongoose.Types.ObjectId(restaurantId),
          "paymentDetails.status": app.config.contentManagement.paymentStatus.paid,
          createdAt: {
            $gte: yesterday,
            $lt: today
          }
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$total" }
        }
      },
      {
        $project: {
          _id: 0,
          totalRevenue: { $ifNull: ["$totalRevenue", 0] }
        }
      }
    ]);

    const todayRevenue = todayResult[0]?.totalRevenue || 0;
    const yesterdayRevenue = yesterdayResult[0]?.totalRevenue || 0;

    // Calculate trend percentage
    let trendPercentage = 0;
    if (yesterdayRevenue > 0) {
      trendPercentage = ((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100;
    } else if (todayRevenue > 0) {
      trendPercentage = 100; // 100% increase if yesterday was 0
    }

    return Promise.resolve({
      totalRevenue: todayRevenue,
      yesterdayRevenue: yesterdayRevenue,
      trendPercentage: Math.round(trendPercentage * 10) / 10 // Round to 1 decimal
    });
  };

  // Get average order value this week with trend comparison to last week
  const getAvgOrderValueThisWeek = async (restaurantId) => {
    const now = new Date();

  // How many days have passed this week (0 = Mon, 1 = Tue ...)
  const dayOfWeek = now.getDay();
  const daysElapsed = dayOfWeek % 7; // Mon=0, Tue=1 ... today

  // This week: Monday 00:00 → today 23:59
  const thisWeekStart = new Date(now);
  thisWeekStart.setDate(now.getDate() - daysElapsed);
  thisWeekStart.setHours(0, 0, 0, 0);

  const thisWeekEnd = new Date(now);
  thisWeekEnd.setHours(23, 59, 59, 999);

  // Last week: same Mon → same day last week
  // e.g. if today is Wed, last week Mon → last week Wed
  const lastWeekStart = new Date(thisWeekStart);
  lastWeekStart.setDate(thisWeekStart.getDate() - 7);

  const lastWeekEnd = new Date(thisWeekEnd);
  lastWeekEnd.setDate(thisWeekEnd.getDate() - 7);

    // Get this week's average order value
    const thisWeekResult = await Bill.aggregate([
      {
        $match: {
          restaurantRef: new mongoose.Types.ObjectId(restaurantId),
          "paymentDetails.status": app.config.contentManagement.paymentStatus.paid,
          createdAt: {
            $gte: thisWeekStart,
            $lt: thisWeekEnd
          }
        }
      },
      {
        $group: {
          _id: null,
          avgOrderValue: { $avg: "$total" },
          totalOrderValue: { $sum: "$total" },
          totalOrders: { $sum: 1 }
        }
      },
      {
        $project: {
          _id: 0,
          avgOrderValue: { $ifNull: ["$avgOrderValue", 0] },
          totalOrderValue: { $ifNull: ["$totalOrderValue", 0] },
          totalOrders: 1
        }
      }
    ]);

    // Get last week's average order value for partial period
    const lastWeekResult = await Bill.aggregate([
      {
        $match: {
          restaurantRef: new mongoose.Types.ObjectId(restaurantId),
          "paymentDetails.status": app.config.contentManagement.paymentStatus.paid,
          createdAt: {
            $gte: lastWeekStart,
            $lt: lastWeekEnd
          }
        }
      },
      {
        $group: {
          _id: null,
          avgOrderValue: { $avg: "$total" },
          totalOrderValue: { $sum: "$total" },
          totalOrders: { $sum: 1 }
        }
      },
      {
        $project: {
          _id: 0,
          avgOrderValue: { $ifNull: ["$avgOrderValue", 0] },
          totalOrderValue: { $ifNull: ["$totalOrderValue", 0] },
          totalOrders: 1
        }
      }
    ]);

    const thisWeekAvg = thisWeekResult[0]?.avgOrderValue || 0;
    const lastWeekAvg = lastWeekResult[0]?.avgOrderValue || 0;
    const totalOrders = thisWeekResult[0]?.totalOrders || 0;

    // Calculate trend percentage
    let trendPercentage = 0;
    if (lastWeekAvg > 0) {
      trendPercentage = ((thisWeekAvg - lastWeekAvg) / lastWeekAvg) * 100;
    } else if (thisWeekAvg > 0) {
      trendPercentage = 100;
    }

    return Promise.resolve({
      avgOrderValue: thisWeekAvg,
      totalOrders: totalOrders,
      lastWeekAvg: lastWeekAvg,
      trendPercentage: Math.round(trendPercentage * 10) / 10
    });
  };

  // Get this month's revenue with trend comparison to same period last year
  const getThisMonthRevenue = async (restaurantId) => {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    // Get this month's revenue (partial period: day 1 to today)
    const thisMonthResult = await Bill.aggregate([
      {
        $match: {
          restaurantRef: new mongoose.Types.ObjectId(restaurantId),
          "paymentDetails.status": app.config.contentManagement.paymentStatus.paid,
          createdAt: {
            $gte: startOfMonth,
            $lt: today
          }
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$total" }
        }
      },
      {
        $project: {
          _id: 0,
          totalRevenue: { $ifNull: ["$totalRevenue", 0] }
        }
      }
    ]);

    // Get last year's same period revenue (partial period)
    const lastYearStart = new Date(today.getFullYear() - 1, today.getMonth(), 1);
    const lastYearEnd = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate());

    const lastYearResult = await Bill.aggregate([
      {
        $match: {
          restaurantRef: new mongoose.Types.ObjectId(restaurantId),
          "paymentDetails.status": app.config.contentManagement.paymentStatus.paid,
          createdAt: {
            $gte: lastYearStart,
            $lt: lastYearEnd
          }
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$total" }
        }
      },
      {
        $project: {
          _id: 0,
          totalRevenue: { $ifNull: ["$totalRevenue", 0] }
        }
      }
    ]);

    const thisMonthRevenue = thisMonthResult[0]?.totalRevenue || 0;
    const lastYearRevenue = lastYearResult[0]?.totalRevenue || 0;

    // Calculate trend percentage
    let trendPercentage = 0;
    if (lastYearRevenue > 0) {
      trendPercentage = ((thisMonthRevenue - lastYearRevenue) / lastYearRevenue) * 100;
    } else if (thisMonthRevenue > 0) {
      trendPercentage = 100;
    }

    return Promise.resolve({
      totalRevenue: thisMonthRevenue,
      lastYearRevenue: lastYearRevenue,
      trendPercentage: Math.round(trendPercentage * 10) / 10
    });
  };

  // Get table occupancy
  const getTableOccupancy = async (restaurantId) => {

    // Get all active (not deleted) tables
    const allTables = await Table.find({
      restaurantRef: restaurantId,
      status: {
        '$ne': app.config.contentManagement.table.deleted
      }
    }).select('tableId noOfSeats currentSessionRef status _id').exec();

    // Separate free and occupied tables
    const tablesWithStatus = allTables.map(table => ({
      tableId: table.tableId,
      _id: table._id,
      noOfSeats: table.noOfSeats,
      status: table.status
    }));

    return Promise.resolve({
      totalTables: allTables.length,
      tables: tablesWithStatus
    });
  };

  // Get top 5 low stock items (quantity < threshold in any location)
  const getLowStockItems = async (restaurantId) => {
    const lowStockItems = await Inventory.aggregate([
      // Match active inventory for the restaurant
      {
        $match: {
          restaurantRef: new mongoose.Types.ObjectId(restaurantId),
          status: app.config.contentManagement.inventory.active
        }
      },
      // Filter locationList to only keep low stock locations
      {
        $addFields: {
          lowStockLocations: {
            $filter: {
              input: "$locationList",
              as: "loc",
              cond: { $lt: ["$$loc.quantity", "$$loc.threshold"] }
            }
          }
        }
      },
      // Match only items with at least one low stock location
      {
        $match: {
          lowStockLocations: { $ne: [], $exists: true }
        }
      },
      // Calculate deficit (min threshold - quantity across low stock locations)
      {
        $addFields: {
          deficit: {
            $min: {
              $map: {
                input: "$lowStockLocations",
                as: "loc",
                in: { $subtract: ["$$loc.threshold", "$$loc.quantity"] }
              }
            }
          }
        }
      },
      // Sort by deficit descending (most critical first)
      { $sort: { deficit: -1 } },
      // Limit to top 5
      { $limit: 5 },
      // Project final output
      {
        $project: {
          _id: 1,
          name: 1,
          unit: 1,
          saveAsUnit: 1,
          quantity: 1,
          lowStockLocations: {
            $map: {
              input: "$lowStockLocations",
              as: "loc",
              in: {
                location: "$$loc.location",
                quantity: "$$loc.quantity",
                threshold: "$$loc.threshold"
              }
            }
          }
        }
      }
    ]);

    return Promise.resolve(lowStockItems);
  };

  const getLast7DaysOrder = async (restaurantId) => {
    const last7days = await Order.aggregate([
      // 1. Match last 7 days
      {
        $match: {
          restaurantRef: new mongoose.Types.ObjectId(restaurantId),
          createdAt: {
            $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          }
        }
      },

      // 2. Group day-wise
      {
        $group: {
          _id: {
            day: { $dayOfWeek: "$createdAt" }, // 1=Sun, 7=Sat
            date: {
              $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }
            }
          },
          orders: { $sum: 1 }
        }
      },

      // 3. Sort by date
      { $sort: { "_id.date": 1 } },

      // 4. Final projection
      {
        $project: {
          _id: 0,
          day: {
            $arrayElemAt: [
              ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
              { $subtract: ["$_id.day", 1] }
            ]
          },
          orders: 1,
          date: "$_id.date"
        }
      }
    ]);

    // Build LAST 7 DAYS array
    const last7 = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);

      const key = d.toISOString().split("T")[0];
      const dayName = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d.getDay()];

      const found = last7days.find(x => x.date === key);

      last7.push({
        day: dayName,
        orders: found?.orders || 0
      });
    }

    return Promise.resolve(last7);

  };

  const getMonthlySale = async (restaurantId) => {
    const result = await Bill.aggregate([

      // 1. Filters
      {
        $match: {
          restaurantRef: new mongoose.Types.ObjectId(restaurantId),
          "paymentDetails.status": app.config.contentManagement.paymentStatus.paid  // paid
        }
      },

      // 2. Convert date to the first day of that month
      {
        $set: {
          monthStart: {
            $dateFromParts: {
              year: { $year: "$createdAt" },
              month: { $month: "$createdAt" },
              day: 1
            }
          }
        }
      },

      // 3. Densify → ensures all months exist
      {
        $densify: {
          field: "monthStart",
          range: {
            step: 1,
            unit: "month",
            bounds: "full"
          }
        }
      },

      // 4. Now group by month (missing months will have no totals)
      {
        $group: {
          _id: "$monthStart",
          totalSale: { $sum: "$total" }
        }
      },

      // 5. Restrict to last 12 months only
      {
        $match: {
          _id: {
            $gte: new Date(
              new Date().getFullYear(),
              new Date().getMonth() - 11,
              1
            )
          }
        }
      },

      // 6. Format proper output with zero fallback
      {
        $project: {
          _id: 0,
          year: { $year: "$_id" },
          month: { $month: "$_id" },
          totalSale: { $ifNull: ["$totalSale", 0] }
        }
      },

      // 7. Sort chronologically
      { $sort: { year: 1, month: 1 } }
    ]);
    return Promise.resolve(result);

  };

  const getRestaurantDetails =  async (restaurantId) => {
    return Restaurant.findById(restaurantId)
    .select('_id name inventoryLocations');
  };

  const getStats = (restaurantId) => {
    return Promise.all([
      Order.countDocuments({
        restaurantRef: restaurantId,
        status: app.config.contentManagement.order.completed,
      }).exec(),
      Order.find({
        restaurantRef: restaurantId,
        createdAt: {
          $gte: new Date(new Date().setHours(0, 0, 0, 0)),
          $lt: new Date(new Date().setHours(23, 59, 59, 999)),
        },
      }, {
        _id: 1,
        idbId: 1,
        status: 1,
        orderId: 1,
        tableId: 1,
        orderType: 1,
        billRef: 1,
      }).populate({
        path: 'billRef',
        select: 'total'
      }).sort({ createdAt: -1 }).exec(),
      Menu.find({
        restaurantRef: restaurantId,
        noOfOrders: {
          $gt: 0
        }
      })
        .sort({ noOfOrders: -1 })
        .limit(10)
        .select('name noOfOrders price').exec(),
      getMonthlySale(restaurantId),
      getLast7DaysOrder(restaurantId),
      getTodayRevenue(restaurantId),
      getAvgOrderValueThisWeek(restaurantId),
      getThisMonthRevenue(restaurantId),
      getTableOccupancy(restaurantId),
      getLowStockItems(restaurantId),
      getRestaurantDetails(restaurantId),
    ]).spread((totalOrder, todayOrders, mostOrderedItems, monthlySale, last7DaysOrder, todayRevenue, avgOrderValueThisWeek, thisMonthRevenue, tableOccupancy, lowStockItems, restaurantData) => {
      return {
        totalOrder,
        todayOrders,
        mostOrderedItems,
        monthlySale,
        last7DaysOrder,
        todayRevenue,
        avgOrderValue: avgOrderValueThisWeek,
        thisMonthRevenue,
        tableOccupancy,
        lowStockItems,
        restaurantData
      };
    });

  };

  const xgetLast7DaysOrder = async (restaurantId) => {
    const last7days = await Order.aggregate([
      // 1. Match last 7 days
      {
        $match: {
          restaurantRef: new mongoose.Types.ObjectId(restaurantId),
          createdAt: {
            $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          }
        }
      },

      // 2. Group day-wise
      {
        $group: {
          _id: {
            day: { $dayOfWeek: "$createdAt" }, // 1=Sun, 7=Sat
            date: {
              $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }
            }
          },
          orders: { $sum: 1 }
        }
      },

      // 3. Sort by date
      { $sort: { "_id.date": 1 } },

      // 4. Final projection
      {
        $project: {
          _id: 0,
          day: {
            $arrayElemAt: [
              ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
              { $subtract: ["$_id.day", 1] }
            ]
          },
          orders: 1,
          date: "$_id.date"
        }
      }
    ]);

    // Build LAST 7 DAYS array
    const last7 = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);

      const key = d.toISOString().split("T")[0];
      const dayName = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d.getDay()];

      const found = last7days.find(x => x.date === key);

      last7.push({
        day: dayName,
        orders: found?.orders || 0
      });
    }

    return Promise.resolve(last7);

  };

  const xgetMonthlySale = async (restaurantId) => {
    const result = await Bill.aggregate([

      // 1. Filters
      {
        $match: {
          restaurantRef: new mongoose.Types.ObjectId(restaurantId),
          "paymentDetails.status": app.config.contentManagement.paymentStatus.paid  // paid
        }
      },

      // 2. Convert date to the first day of that month
      {
        $set: {
          monthStart: {
            $dateFromParts: {
              year: { $year: "$createdAt" },
              month: { $month: "$createdAt" },
              day: 1
            }
          }
        }
      },

      // 3. Densify → ensures all months exist
      {
        $densify: {
          field: "monthStart",
          range: {
            step: 1,
            unit: "month",
            bounds: "full"
          }
        }
      },

      // 4. Now group by month (missing months will have no totals)
      {
        $group: {
          _id: "$monthStart",
          totalSale: { $sum: "$total" }
        }
      },

      // 5. Restrict to last 12 months only
      {
        $match: {
          _id: {
            $gte: new Date(
              new Date().getFullYear(),
              new Date().getMonth() - 11,
              1
            )
          }
        }
      },

      // 6. Format proper output with zero fallback
      {
        $project: {
          _id: 0,
          year: { $year: "$_id" },
          month: { $month: "$_id" },
          totalSale: { $ifNull: ["$totalSale", 0] }
        }
      },

      // 7. Sort chronologically
      { $sort: { year: 1, month: 1 } }
    ]);
    return Promise.resolve(result);

  };

  const xgetStats = (restaurantId) => {
    return Promise.all([
      Order.countDocuments({
        restaurantRef: restaurantId,
        status: app.config.contentManagement.order.completed,
      }).exec(),
      Order.find({
        restaurantRef: restaurantId,
        createdAt: {
          $gte: new Date(new Date().setHours(0, 0, 0, 0)),
          $lt: new Date(new Date().setHours(23, 59, 59, 999)),
        },
      }, {
        _id: 1,
        idbId: 1,
        status: 1,
        orderId: 1,
        tableId: 1,
        orderType: 1
      }).sort({ createdAt: -1 }).exec(),
      Menu.find({
        restaurantRef: restaurantId,
        noOfOrders: {
          $gt: 0
        }
      })
        .sort({ noOfOrders: -1 })
        .limit(10)
        .select('name noOfOrders images').exec(),
      getMonthlySale(restaurantId),
      getLast7DaysOrder(restaurantId),
    ]).spread((totalOrder, todayOrders, mostOrderedItems, monthlySale, last7DaysOrder) => {
      return {
        totalOrder,
        todayOrders,
        mostOrderedItems,
        monthlySale,
        last7DaysOrder
      };
    });

  };
  return { getStats };
};