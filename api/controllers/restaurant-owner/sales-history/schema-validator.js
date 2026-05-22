'use strict';

module.exports = function(app) {
  const addSalesHistory = {
    'name': {
      type: 'string',
      allowEmpty: false,
      required: true
    },
    'description': {
      type: 'string',
      allowEmpty: false,
      required: true
    },
    'images': {
      type: 'array',
      items: {
        type: 'string'
      },
      required: false
    },
    'location': {
      type: 'object',
      properties: {
        'coordinates': {
          type: 'array',
          items: {
            type: 'number'
          },
          required: true
        }
      },
      required: true
    }
  };

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
    'salesHistoryId': {
      type: 'string',
      required: true,
      'conform': function(value) {
        return app.utility.checkMongooseObjectId(value);
      }
    }
  };

  const edit = {
    'name': {
      type: 'string',
      allowEmpty: false,
      required: true
    },
    'description': {
      type: 'string',
      allowEmpty: false,
      required: true
    },
    'images': {
      type: 'array',
      items: {
        type: 'string'
      },
      required: false
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
    add: addSalesHistory,
    edit: edit,
    listQuery: listQuery,
    param: param,
    list: list
  };

};