'use strict';

module.exports = function (app) {
  const addRequisition = {
    'remarks': {
      type: 'string'
    },
    'priority': {
      type: 'number'
    },
    'requestedToRestaurantRef': {
      type: 'string',
      required: true,
      'conform': function (value) {
        return app.utility.checkMongooseObjectId(value);
      }
    },
    'cart': {
      type: 'array',
      required: true,
      allowEmpty: false,
      items: {
        type: 'object',
        properties: {
          'name': {
            type: 'string',
            required: true,
            allowEmpty: false,
          },
          'requestedQuantity': {
            type: 'number',
            required: true,
            allowEmpty: false,
          },
          'pricePerItem': {
            type: 'number',
            required: true,
            allowEmpty: false,
          },
          'unit': {
            type: 'number',
            required: true,
            allowEmpty: false,
          },
          'saveAsUnit': {
            type: 'number',
            required: true,
            allowEmpty: false,
          },
          'inventoryRef': {
            type: 'string',
            conform: function (value) {
              return app.utility.checkMongooseObjectId(value);
            },
          },
          'justification': {
            type: 'string',
          },
        }
      },
    },
    'subTotal': {
      type: 'number',
      required: true,
      allowEmpty: false,
    },
    'total': {
      type: 'number',
      required: true,
      allowEmpty: false,
    },
    deliveryAddress: {
      type: 'object',
      properties: {
        'addressLine1': {
          type: 'string',
          required: true,
          allowEmpty: false,
        },
        'addressLine2': {
          type: 'string',
        },
        'city': {
          type: 'string',
          required: true,
          allowEmpty: false,
        },
        'state': {
          type: 'string',
          required: true,
          allowEmpty: false,
        },
        'country': {
          type: 'string',
          required: true,
          allowEmpty: false,
        },
        'postalCode': {
          type: 'string',
          required: true,
          allowEmpty: false,
        },
      }
    }
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
    'requisitionId': {
      type: 'string',
      required: true,
      'conform': function (value) {
        return app.utility.checkMongooseObjectId(value);
      }
    }
  };

  const orderIdParam = {
    'orderId': {
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
        'name': {
          type: 'number',
          enum: [1, -1]
        }
      }
    },
    'filters': {
      type: 'object',
      properties: {
        'name': {
          type: 'string',
          allowEmpty: false
        }
      }
    }
  };

  return {
    add: addRequisition,
    edit: addRequisition,
    listQuery: listQuery,
    param: param,
    orderIdParam: orderIdParam,
    list: list,
  };

};