'use strict';

module.exports = function (app) {

  const addRestaurantOwner = {
    restaurantRef: {
      type: 'string',
      required: true,
      'conform': function (value) {
        return app.utility.checkMongooseObjectId(value);
      }
    },
    personalInfo: {
      type: 'object',
      required: true,
      allowEmpty: false,
      properties: {
        fullName: {
          type: 'string',
          required: true,
          allowEmpty: false,
          conform: function (value) {
            return app.utility.isValidate.isNameComponent(value);
          }
        },
        email: {
          type: 'string',
          required: true,
          allowEmpty: false,
          format: 'email'
        }
      }
    },
  };

  const listQuery = {
    'skip': {
      type: 'string',
      'conform': function (value) {
        return app.utility.isValidate.isNumber(value);
      }
    },
    'limit': {
      type: 'string',
      'conform': function (value) {
        return app.utility.isValidate.isNumber(value);
      }
    }
  };

  const param = {
    'restaurantOwnerUserId': {
      type: 'string',
      required: true,
      'conform': function (value) {
        return app.utility.checkMongooseObjectId(value);
      }
    }
  };

  const list = {
    'sortConfig': {
      type: 'object',
      properties: {
        'roleName': {
          type: 'number',
          enum: [1, -1]
        },
        'name': {
          type: 'number',
          enum: [1, -1]
        },
        'email': {
          type: 'number',
          enum: [1, -1]
        }
      }
    },
    'filters': {
      type: 'object',
      properties: {
        'restaurantRef': {
          type: 'string',
          required: true,
          allowEmpty: false,
          'conform': function (value) {
            return app.utility.checkMongooseObjectId(value);
          }
        },
        'name': {
          type: 'string',
          allowEmpty: false
        },
        'roleInfo': {
          'type': 'object',
          'isSuperRestaurantOwner': {
            type: 'boolean'
          },
          'roleId': {
            type: 'string',
            allowEmpty: false,
            'conform': function (value) {
              return app.utility.checkMongooseObjectId(value);
            }
          },
        },
        'email': {
          type: 'string',
          format: 'email',
          allowEmpty: false
        },
      }
    }
  };

  return {
    add: addRestaurantOwner,
    edit: addRestaurantOwner,
    listQuery: listQuery,
    param: param,
    list: list,
  };

};