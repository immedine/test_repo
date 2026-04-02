'use strict';

module.exports = function (app) {
  /////////////
  // edit   //
  /////////////

  const add = {
    name: {
      type: 'string',
      allowEmpty: false,
      required: true
    },
    introductoryText: {
      type: 'string'
    },
    logo: {
      type: 'string',
      format: 'url',
    },
    primaryThmeColor: {
      type: 'string'
    },
    secondaryThmeColor: {
      type: 'string',
    }
  };

  const edit = {
    name: {
      type: 'string',
      allowEmpty: false,
      required: true
    },
    introductoryText: {
      type: 'string'
    },
    logo: {
      type: 'string'
    },
    primaryThmeColor: {
      type: 'string'
    },
    secondaryThmeColor: {
      type: 'string',
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
    'franchiseId': {
      type: 'string',
      required: true,
      'conform': function(value) {
        return app.utility.checkMongooseObjectId(value);
      }
    }
  };

  return {
    add: add,
    edit: edit,
    listQuery: listQuery,
    param: param
  };
};
