'use strict';

module.exports = function (app) {
  const profilePicture = {
    profilePicture: {
      type: 'object',
    },
  };

  const deleteAccount = {
    password: {
      type: 'string',
      required: true,
    },
  };

  const user = {
    userRef: {
      type: 'string',
      required: true,
      conform: function (value) {
        return app.utility.checkMongooseObjectId(value);
      },
    },
  };

  const updateProfile = {
    personalInfo: {
      type: "object",
      // required: true,
      properties: {
        firstName: {
          type: "string",
          allowEmpty: false,
        },
        lastName: {
          type: "string",
          allowEmpty: false,
        },
        profilePicture: {
          type: "string",
          allowEmpty: true,
        },
        'email': {
          type: 'string',
          format: 'email',
          allowEmpty: false
        },
        phone: {
          type: 'object',
          properties: {
            'phone': {
              type: 'string',
            },
            'countryCode': {
              type: 'string',
              allowEmpty: false
            },
          }
        },
        'dob': {
          type: 'string'
        },
        'nationality': {
          type: 'string'
        },
        'gender': {
          type: 'string',
          enum: Object.keys(app.config.user.gender).map(each => app.config.user.gender[each].toString()),
          allowEmpty: false,
        },
      },
    },
  };
  
  const changePassword = {
    newPassword: {
      type: 'string',
      required: true,
    },
    oldPassword: {
      type: 'string',
      required: true,
    },
  };

  return {
    updateProfile,
    changePassword,
    user,
    profilePicture,
    deleteAccount
  };
};
