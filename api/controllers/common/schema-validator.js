'use strict';

module.exports = function (app) {

  const contactUs = {
    firstName: {
      type: 'string',
      allowEmpty: false,
      required: true,
    },
    lastName: {
      type: 'string',
      allowEmpty: false,
      required: true,
    },
    email: {
      type: 'string',
      format: 'email',
      allowEmpty: false,
      required: true,
    },
    phone: {
      type: 'object',
      required: true,
      properties: {
        number: {
          type: 'string',
          allowEmpty: false,
          required: true,
        },
        countryCode: {
          type: 'string',
          allowEmpty: false,
          enum: Object.keys(app.config.countryCode.countryList),
          required: true,
        },
      },
    },
    description: {
      type: 'string',
      allowEmpty: false,
      required: true,
    },
  };

  return {
    contactUs,
  };
};
