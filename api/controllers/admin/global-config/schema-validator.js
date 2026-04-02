'use strict';

module.exports = function (app) {
  /////////////
  // edit   //
  /////////////

  const edit = {
    supportContactNo: {
          type: 'object',
          properties: {
            'number': {
              type: 'string',
            },
            'countryCode': {
              type: 'string',
              allowEmpty: false
            },
          }
    },
    supportEmail: {
      type: 'string',
      allowEmpty: false,
      format: 'email',
    },
    playStoreLink: {
      type: 'string',
      allowEmpty: false,
      format: 'url',
    },
    appleStoreLink: {
      type: 'string',
      allowEmpty: false,
      format: 'url',
    }
  };

  return {
    edit: edit,
  };
};
