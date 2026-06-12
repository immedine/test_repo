'use strict';

module.exports = function(app) {

  const listQuery = {
    'skip': {
      type: 'string',
      'conform': function(value) {
        return app.utility.isValidate.isNumber(value);
      }
    },
    'limit': {
      type: 'string',
      'conform': function(value) {
        return app.utility.isValidate.isNumber(value);
      }
    }
  };

  const param = {
    'menuId': {
      type: 'string',
      required: true,
      'conform': function(value) {
        return app.utility.checkMongooseObjectId(value);
      }
    }
  };

  const list = {
    'sortConfig': {
      type: 'object',
      properties: {
        'name': {
          type: 'number',
          enum: [1, -1]
        }
      }
    },
    'filters': {
      type: 'object',
      required: true,
      properties: {
        'name': {
          type: 'string',
          allowEmpty: false
        },
        'restaurantRef': {
          type: 'string',
          required: true,
          allowEmpty: false,
          'conform': function(value) {
            return app.utility.checkMongooseObjectId(value);
          }
        }
      }
    }
  };

  return {
    listQuery: listQuery,
    param: param,
    list: list, 
  };

};