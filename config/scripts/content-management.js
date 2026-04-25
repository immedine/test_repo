'use strict';

const category = require("../../db/models/category");

module.exports = {
  category: {
    active: 1,
    deleted: 2
  },
  inventory: {
    active: 1,
    deleted: 2
  },
  expense: {
    active: 1,
    deleted: 2
  },
  menu: {
    active: 1,
    deleted: 2
  },
  restaurant: {
    active: 1,
    deleted: 2,
    unPublished: 3,
    inactive: 4
  },
  language: {
    active: 1,
    deleted: 2
  },
  feedback: {
    active: 1,
    deleted: 2
  },
  faq: {
    active: 1,
    deleted: 2
  },
  order: {
    active: 1,
    cooking: 2,
    served: 3,
    completed: 4,
    deleted: 5, // need to be changed -> cancelled
    pending: 6
  },
  orderType: {
    inStore: 1,
    swiggy: 2,
    zomato: 3,
    takeaway: 4,
    others: 5
  },
  bill: {
    active: 1,
    completed: 4,
    deleted: 5, // need to be changed -> cancelled
    pending: 6
  },
  paymentStatus: {
    pending: 1,
    paid: 2,
    refund: 3,
    failed: 4,
    cancelled: 5
  },
  paymentMode: {
    offline: 1,
    online: 2
  },
  paymentSubMode: {
    upi: 1,
    card: 2,
    other: 3,
    zomatoPayment: 4
  },
  table: {
    active: 1,
    inActive: 2,
    deleted: 3,
    occupied: 4,
    reserved: 5
  },
  tableSession: {
    active: 1,
    closed: 2
  },
  role: {
    active: 1,
    inActive: 2,
    deleted: 3
  },
  location: {
    active: 1,
    inActive: 2,
    deleted: 3
  },
  invCategories: {
    active: 1,
    inActive: 2,
    deleted: 3
  },
  defaultAppView: {
    list: 1,
    card: 2
  },
  vendor: {
    active: 1,
    deleted: 2
  },
  subscriptionPlan: {
    active: 1,
    deleted: 2,
  },
  subscriptionTier: {
    base: 1,
    pro: 2,
  },
  subscriptionPlanType: {
    subscription: 1,
    addon: 2,
    usage: 3
  },
  revenueShareType: {
    percentage: 1,
    fixed: 2
  },
  outletType: {
    franchise: 1,
    owned: 2
  },
  subscriptionStatus: {
    created: 1,
    paymentPending: 2,
    paid: 3,
    failed: 4,
    cancelled: 5,
    expired: 6
  },
  subscriptionPaymentStatus: {
    created: 1,
    authorized: 2,
    captured: 3,
    failed: 4,
    refunded: 5,
  },
  requisitionType: {
    inventory: 1
  },
  requisitionPriority: {
    low: 1,
    normal: 2,
    high: 3
  },
  requisitionStatus: {
    active: 1,
    approved: 2,
    rejected: 3,
    cancelled: 4,
    completed: 5
  },
  requisitionOrderStatus: {
    active: 1,
    inTransit: 2,
    delivered: 3,
    cancelled: 4
  }
};