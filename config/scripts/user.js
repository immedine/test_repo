'use strict';

const restaurantOwner = require("../../api/controllers/restaurant-owner");

module.exports = {
  role: {
    user: 1,
    restaurantOwner: 2,
    admin: 3
  },
  loginType: {
    custom: 1,
    apple: 2,
    google: 3,
    facebook: 4,
  },

  deviceType: {
    android: 1,
    iOS: 2,
    browser: 3,
  },
  gender: {
    male: 1,
    female: 2,
    other: 3,
  },

  accountStatus: {
    user: {
      pending: 0,
      active: 1,
      blocked: 2,
      deleted: 3,
    },
    restaurantOwner: {
      active: 1,
      blocked: 2,
      deleted: 3,
      unverified: 4
    },
    admin: {
      active: 1,
      blocked: 2,
      deleted: 3,
    },
  },

  defaultAdmin: {
    admins: [
      {
        firstName: 'Souraj',
        lastName: 'Sadhukhan',
        email: 'souraj.93.sadhukhan@gmail.com',
      },
      {
        firstName: 'Arnab',
        lastName: 'Chaudhuri',
        email: 'arnab.chaudhuri@gmail.com',
      }
    ],
    password: process.env.ADMIN_DEFAULT_PASSWORD,
    isSuperAdmin: true,
  },

  sessionExpiredTime: 30 * 24 * 60 * 60 * 1000, // 1 month (in milliseconds)

  otpExpiredTime: 24 * 60 * 60 * 1000, // 1 day (in milliseconds)

  activeTime: 30 * 60 * 1000, //30 minutes (in milliseconds)

  defaultCurrency: 'INR',

  defaultLang: 'en-us',
};
