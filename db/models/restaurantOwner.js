'use strict';
/**
 * Unique ID generation module
 * @type {Npm.Module}
 */
const Puid = require('puid');
const jwt = require('jsonwebtoken');
module.exports = function (app, mongoose /*, plugins*/) {
  const restaurantOwnerSchema = new mongoose.Schema(
    {
      restaurantRef: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Restaurant',
        required: true
      },
      deviceRegistrationCode: {
        type: String
      },
      isDeviceRegistered: {
        type: Boolean,
        default: false
      },
      isFranchise: {
        type: Boolean,
        default: false
      },
      registeredDevice: [{
        deviceId: String,
        deviceType: Number
      }],
      deviceRegistrationAttempt: {
        type: Number
      },
      /**
       * Personal Info
       */
      personalInfo: {
        // /**
        //  * First name
        //  */
        // firstName: {
        //   type: String,
        //   required: true,
        // },
        // /**
        //  * Last name
        //  */
        // lastName: {
        //   type: String,
        //   required: true,
        // },
        /**
         * Full Name
         */
        fullName: {
          type: String,
        },
        /**
         * Profile pic link
         */
        profilePicture: {
          type: String,
          default: null,
        },

        /**
         * Email address
         */
        email: {
          type: String,
          required: true,
        },
        /**
         * Country
         */
        country: {
          type: String,
          default: 'IN',
        },

        phone: {
          countryCode: { type: String, default: 'IN' },
          number: { type: String },
        },
      },
      /**
       * Authentication Info
       */
      authenticationInfo: {
        /**
         * Password string
         */
        password: {
          type: String,
        },
        link: {
          /**
           * Code string
           */
          token: String,

          /**
           * Time at which Token will become invalid
           */
          timeout: Date,
        },
      },
      restaurantRef: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Restaurant'
      },
      /**
       * Role Info
       */
      roleInfo: {
        isSuperRestaurantOwner: {
          type: Boolean,
          required: true,
          default: true,
        },
        roleId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Role',
        }
      },
      /**
       * Account Status
       */
      accountStatus: {
        type: Number,
        required: true,
        default: app.config.user.accountStatus.restaurantOwner.unverified,
      },
      socialInfo: [
        {
          socialId: String,
          socialType: String, // e.g., 'google'
        },
      ],
      loginType: String,
      /**
       * Settings
       */
      settings: {
        selectedLanguage: {
          type: String,
          default: app.config.user.defaultLang,
        },
        timeZoneOffset: {
          type: Number,
        },
      },
      createdByAdmin: {
        type: Boolean,
        default: false
      },
      securityPinDetails: {
        pin: {
          type: String,
          default: "0000"
        },
        updateDate: {
          type: Date
        }
      },
      /**
       * Session Information
       */
      sessionInfo: [{
        deviceId: {
          type: String,
        },
        deviceType: {
          type: Number,
        },
        accessToken: {
          type: String,
        },
        refreshToken: {
          type: String,
        },
        destroyTime: {
          type: Date,
        },
        notificationKey: {
          type: String,
        },
      }],
    },
    {
      versionKey: false,
      timestamps: true,
      autoIndex: true,
    }
  );

  /**
   * Pre Hook to save name as full
   * @param  {Object} next) {                     this.fullName The Full Name
   */
  // restaurantOwnerSchema.pre('save', function (next) {
  //   this.personalInfo.fullName = this.personalInfo.firstName + ' ' + this.personalInfo.lastName;
  //   next();
  // });

  restaurantOwnerSchema.statics.sendVerificationLink = function (email) {
    return this.findOne({
      'personalInfo.email': email,
      accountStatus: {
        $ne: app.config.user.accountStatus.user.deleted,
      },
    })
      .exec()
      .then((userDoc) =>
        userDoc
          ? Promise.resolve(userDoc)
          : Promise.reject({
            errCode: 'RESTAURANT_OWNER_NOT_FOUND',
          })
      )
      .then((userDoc) =>
        userDoc.accountStatus !== app.config.user.accountStatus.user.blocked
          ? Promise.resolve(userDoc)
          : Promise.reject({
            errCode: 'RESTAURANT_OWNER_HAS_BEEN_SUSPENDED',
          })
      )
      .then((restaurantOwnerDoc) => {
        restaurantOwnerDoc.authenticationInfo.link = {
          token: app.utility.getRandomCode(20),
          timeout: new Date(new Date().getTime() + 10 * 60 * 1000),
        };

        return restaurantOwnerDoc.save().then((restaurantOwnerDoc) => {
          ////////////////////////////////////////
          //TODO: Send OTP for forgot password  //
          ///////////////////////////////////////
          let emailNotification = app.config.notification.email(app, app.config.lang.defaultLanguage),
            multilangConfig = app.config.lang[app.config.lang.defaultLanguage];
          // create email template
          app.render(
            emailNotification.sendVerificationLink.pageName,
            {
              greeting: multilangConfig.email.sendVerificationLink.greeting,
              firstName: restaurantOwnerDoc.personalInfo.fullName,
              message: multilangConfig.email.sendVerificationLink.message,
              resendVerificationLink: `https://immedine.com/auth/verify-token?token=${restaurantOwnerDoc.authenticationInfo.link.token}&type=register`,
              note: multilangConfig.email.sendVerificationLink.note
            },
            function (err, renderedText) {
              if (err) {
                console.log(err);
              } else {
                // send email
                app.service.notification.email.immediate({
                  userId: restaurantOwnerDoc._id,
                  userType: app.config.user.role.restaurantOwner,
                  emailId: restaurantOwnerDoc.personalInfo.email,
                  subject: emailNotification.sendVerificationLink.subject,
                  body: renderedText,
                });
              }
            }
          );

          return Promise.resolve({});
        });
      });
  };

  /**
   * Custom login details validation
   * @param  {String} email    The email address
   * @param  {String} password The password
   * @return {Promise}         The promise
   */
  restaurantOwnerSchema.statics.loginValidate = function (email, password) {
    return this.findOne({
      'personalInfo.email': email,
      accountStatus: {
        $ne: app.config.user.accountStatus.restaurantOwner.deleted,
      },
    })
      .populate('restaurantRef')
      .populate('roleInfo.roleId')
      .exec()
      .then((restaurantOwnerDoc) =>
        restaurantOwnerDoc
          ? Promise.resolve(restaurantOwnerDoc)
          : Promise.reject({
            errCode: 'RESTAURANT_OWNER_NOT_FOUND',
          })
      )
      .then((restaurantOwnerDoc) => {
        if (restaurantOwnerDoc.authenticationInfo.password) {
          return app.utility.validatePassword(password, restaurantOwnerDoc.authenticationInfo.password).then((result) =>
            result
              ? Promise.resolve(restaurantOwnerDoc)
              : Promise.reject({
                errCode: 'PASSWORD_MISMATCH',
              })
          )
        } else {
          return Promise.reject({
            errCode: 'RESTAURANT_OWNER_IS_SOCIAL_REGISTERED',
          });
        }

      })
      .then((restaurantOwnerDoc) =>
        restaurantOwnerDoc.accountStatus !== app.config.user.accountStatus.restaurantOwner.blocked
          ? Promise.resolve(restaurantOwnerDoc)
          : Promise.reject({
            errCode: 'RESTAURANT_OWNER_HAS_BEEN_SUSPENDED',
          })
      )
      .then((restaurantOwnerDoc) => {
        if (restaurantOwnerDoc.isFranchise && !restaurantOwnerDoc.isDeviceRegistered) {
          return Promise.reject({
            errCode: 'DEVICE_NOT_REGISTERED',
          })
        } else {
          return Promise.resolve(restaurantOwnerDoc)
        }
      })
      // .then((restaurantOwnerDoc) =>{
      //   if (restaurantOwnerDoc.isFranchise &&
      //     restaurantOwnerDoc.registeredDevice
      //   ) {
      //     return Promise.reject({
      //       errCode: 'DEVICE_NOT_REGISTERED',
      //     })
      //   } else {
      //     return Promise.resolve(restaurantOwnerDoc)
      //   }
      // })
      .then((restaurantOwnerDoc) => {
        return Promise.resolve({
          userDoc: restaurantOwnerDoc,
          userType: app.config.user.role.restaurantOwner,
        });
      });
  };

  restaurantOwnerSchema.statics.loginWithRestaurantValidate = function (email, password, restaurantId) {
    return this.findOne({
      'personalInfo.email': email,
      'restaurantRef': restaurantId,
      accountStatus: {
        $ne: app.config.user.accountStatus.restaurantOwner.deleted,
      },
    })
      .populate('restaurantRef')
      .populate('roleInfo.roleId')
      .exec()
      .then((restaurantOwnerDoc) =>
        restaurantOwnerDoc
          ? Promise.resolve(restaurantOwnerDoc)
          : Promise.reject({
            errCode: 'RESTAURANT_OWNER_NOT_FOUND',
          })
      )
      .then((restaurantOwnerDoc) => {
        if (restaurantOwnerDoc.authenticationInfo.password) {
          return app.utility.validatePassword(password, restaurantOwnerDoc.authenticationInfo.password).then((result) =>
            result
              ? Promise.resolve(restaurantOwnerDoc)
              : Promise.reject({
                errCode: 'PASSWORD_MISMATCH',
              })
          )
        } else {
          return Promise.reject({
            errCode: 'RESTAURANT_OWNER_IS_SOCIAL_REGISTERED',
          });
        }

      })
      .then((restaurantOwnerDoc) =>
        restaurantOwnerDoc.accountStatus !== app.config.user.accountStatus.restaurantOwner.blocked
          ? Promise.resolve(restaurantOwnerDoc)
          : Promise.reject({
            errCode: 'RESTAURANT_OWNER_HAS_BEEN_SUSPENDED',
          })
      )
      .then((restaurantOwnerDoc) => {
        if (restaurantOwnerDoc.isFranchise && !restaurantOwnerDoc.isDeviceRegistered) {
          return Promise.reject({
            errCode: 'DEVICE_NOT_REGISTERED',
          })
        } else {
          return Promise.resolve(restaurantOwnerDoc)
        }
      })
      .then((restaurantOwnerDoc) => {
        return Promise.resolve({
          userDoc: restaurantOwnerDoc,
          userType: app.config.user.role.restaurantOwner,
        });
      });
  };

  restaurantOwnerSchema.statics.socialLoginWithRestaurantValidate = async function (socialId, socialType, fullName, email, restaurantId) {
    let userDoc = await this.findOne({ 'personalInfo.email': email, 'restaurantRef': restaurantId })
      .populate('restaurantRef')
      .populate('roleInfo.roleId')
      .exec();

    if (userDoc) {
      if (userDoc.accountStatus === app.config.user.accountStatus.restaurantOwner.deleted) {
        return Promise.reject({ errCode: 'RESTAURANT_OWNER_DELETED' });
      }
      if (userDoc.accountStatus === app.config.user.accountStatus.restaurantOwner.blocked) {
        return Promise.reject({ errCode: 'RESTAURANT_OWNER_BLOCKED' });
      }
      if (userDoc.isFranchise && !userDoc.isDeviceRegistered) {
        return Promise.reject({
          errCode: 'DEVICE_NOT_REGISTERED',
        })
      }

      const exists = userDoc.socialInfo.some(
        (s) => s.socialId === socialId && s.socialType === socialType
      );
      const socialExists = userDoc.socialInfo.filter(
        (s) => s.socialType === socialType
      )[0];

      if (socialExists && socialExists.socialId && socialExists.socialId !== socialId) {
        return Promise.reject({ errCode: 'RESTAURANT_OWNER_ALREADY_REGISTERED_DIFFERENT_SOCIAL_ACCOUNT' });
      }

      if (!exists) {
        userDoc.socialInfo.push({ socialId, socialType });
      }

      userDoc.loginType = app.config.user.loginType[socialType];
      userDoc.accountStatus = app.config.user.accountStatus.restaurantOwner.active;

      await userDoc.save();
      return {
        userDoc,
        userType: app.config.user.role.restaurantOwner,
      };

    } else {
      return {
        message: 'NEW_REGISTER'
      };
    }


  };

  restaurantOwnerSchema.statics.changeRestaurantValidate = function (email, restaurantId) {
    return this.findOne({
      'personalInfo.email': email,
      'restaurantRef': restaurantId,
      accountStatus: {
        $ne: app.config.user.accountStatus.restaurantOwner.deleted,
      },
    })
      .populate('restaurantRef')
      .populate('roleInfo.roleId')
      .exec()
      .then((restaurantOwnerDoc) =>
        restaurantOwnerDoc
          ? Promise.resolve(restaurantOwnerDoc)
          : Promise.reject({
            errCode: 'RESTAURANT_OWNER_NOT_FOUND',
          })
      )
      .then((restaurantOwnerDoc) =>
        restaurantOwnerDoc.accountStatus !== app.config.user.accountStatus.restaurantOwner.blocked
          ? Promise.resolve(restaurantOwnerDoc)
          : Promise.reject({
            errCode: 'RESTAURANT_OWNER_HAS_BEEN_SUSPENDED',
          })
      )
      .then((restaurantOwnerDoc) => {
        if (restaurantOwnerDoc.isFranchise && !restaurantOwnerDoc.isDeviceRegistered) {
          return Promise.reject({
            errCode: 'DEVICE_NOT_REGISTERED',
          })
        } else {
          return Promise.resolve(restaurantOwnerDoc)
        }
      })
      .then((restaurantOwnerDoc) => {
        return Promise.resolve({
          userDoc: restaurantOwnerDoc,
          userType: app.config.user.role.restaurantOwner,
        });
      });
  };

  restaurantOwnerSchema.statics.multiLoginValidate = function (email, password) {
    return this.find({
      'personalInfo.email': email,
      accountStatus: {
        $ne: app.config.user.accountStatus.restaurantOwner.deleted,
      },
    })
      .populate('restaurantRef')
      .populate('roleInfo.roleId')
      .exec()
      .then((restaurantOwnerDocs) =>
        restaurantOwnerDocs?.length
          ? Promise.resolve(restaurantOwnerDocs)
          : Promise.reject({
            errCode: 'RESTAURANT_OWNER_NOT_FOUND',
          })
      )
      .then((restaurantOwnerDocs) => {
        if (restaurantOwnerDocs[0].authenticationInfo.password) {
          return app.utility.validatePassword(password, restaurantOwnerDocs[0].authenticationInfo.password).then((result) =>
            result
              ? Promise.resolve(restaurantOwnerDocs)
              : Promise.reject({
                errCode: 'PASSWORD_MISMATCH',
              })
          )
        } else {
          return Promise.reject({
            errCode: 'RESTAURANT_OWNER_IS_SOCIAL_REGISTERED',
          });
        }

      })
      .then((restaurantOwnerDocs) => {
        const docs = restaurantOwnerDocs.filter(doc => doc.accountStatus !== app.config.user.accountStatus.restaurantOwner.blocked);
        if (!docs.length) {
          return Promise.reject({
            errCode: 'RESTAURANT_OWNER_HAS_BEEN_SUSPENDED',
          })
        } else {
          return Promise.resolve(docs);
        }

      })
      .then((restaurantOwnerDocs) => {
        const restaurantOwnerDoc = restaurantOwnerDocs[0];
        if (restaurantOwnerDocs.length === 1 && restaurantOwnerDoc.isFranchise && !restaurantOwnerDoc.isDeviceRegistered) {
          return Promise.reject({
            errCode: 'DEVICE_NOT_REGISTERED',
          })
        } else {
          return Promise.resolve(restaurantOwnerDocs)
        }
      })
      .then((restaurantOwnerDocs) => {
        return Promise.resolve({
          userDocs: restaurantOwnerDocs,
          userType: app.config.user.role.restaurantOwner,
        });
      });
  };

  restaurantOwnerSchema.statics.registerDevice = function (loginData, headerData) {
    return this.findOne({
      'personalInfo.email': loginData.email,
      accountStatus: {
        $ne: app.config.user.accountStatus.restaurantOwner.deleted,
      },
    })
      .exec()
      .then((restaurantOwnerDoc) =>
        restaurantOwnerDoc
          ? Promise.resolve(restaurantOwnerDoc)
          : Promise.reject({
            errCode: 'RESTAURANT_OWNER_NOT_FOUND',
          })
      )
      .then((restaurantOwnerDoc) =>
        restaurantOwnerDoc.accountStatus !== app.config.user.accountStatus.restaurantOwner.blocked
          ? Promise.resolve(restaurantOwnerDoc)
          : Promise.reject({
            errCode: 'RESTAURANT_OWNER_HAS_BEEN_SUSPENDED',
          })
      )
      .then(async (restaurantOwnerDoc) => {
        if (restaurantOwnerDoc.deviceRegistrationCode !== loginData.deviceRegistrationCode) {
          restaurantOwnerDoc.deviceRegistrationAttempt = restaurantOwnerDoc.deviceRegistrationAttempt ? ++restaurantOwnerDoc.deviceRegistrationAttempt : 1;

          if (restaurantOwnerDoc.deviceRegistrationAttempt > 5) {
            return Promise.reject({
              errCode: 'REGISTRATION_CODE_MAX_ATTEMPT_REACHED',
            })
          }

          await restaurantOwnerDoc.save();

          return Promise.reject({
            errCode: 'INVALID_REGISTRATION_CODE',
          })
        }
        restaurantOwnerDoc.registeredDevice = [headerData];
        restaurantOwnerDoc.isDeviceRegistered = true;
        restaurantOwnerDoc.deviceRegistrationCode = "";
        return restaurantOwnerDoc.save();
      })
      .then((restaurantOwnerDoc) => {
        return Promise.resolve({
          userDoc: restaurantOwnerDoc,
          userType: app.config.user.role.restaurantOwner,
        });
      });
  }

  /**
   * Creates a new OTP for forgot password
   * @param  {String}  email The email
   * @return {Promise}       The promise
   */
  restaurantOwnerSchema.statics.forgotPasswordCreateOTP = function (email) {

    return this.findOne({
      'personalInfo.email': email,
      accountStatus: {
        $ne: app.config.user.accountStatus.restaurantOwner.deleted,
      },
    })
      .exec()
      .then((restaurantOwnerDoc) =>
        restaurantOwnerDoc
          ? Promise.resolve(restaurantOwnerDoc)
          : Promise.reject({
            errCode: 'RESTAURANT_OWNER_NOT_FOUND',
          })
      )
      .then((restaurantOwnerDoc) =>
        restaurantOwnerDoc.accountStatus !== app.config.user.accountStatus.restaurantOwner.blocked
          ? Promise.resolve(restaurantOwnerDoc)
          : Promise.reject({
            errCode: 'RESTAURANT_OWNER_HAS_BEEN_SUSPENDED',
          })
      )
      .then((restaurantOwnerDoc) => {
        restaurantOwnerDoc.authenticationInfo.link = {
          token: app.utility.getRandomCode(20),
          timeout: new Date(new Date().getTime() + 10 * 60 * 1000),
        };

        return restaurantOwnerDoc.save().then((restaurantOwnerDoc) => {
          ////////////////////////////////////////
          //TODO: Send OTP for forgot password  //
          ///////////////////////////////////////
          let emailNotification = app.config.notification.email(app, app.config.lang.defaultLanguage),
            multilangConfig = app.config.lang[app.config.lang.defaultLanguage];
          // create email template
          app.render(
            emailNotification.forgotPassword.pageName,
            {
              greeting: multilangConfig.email.forgotPassword.greeting,
              firstName: restaurantOwnerDoc.personalInfo.fullName,
              message: multilangConfig.email.forgotPassword.message,
              resetPasswordLink: `https://immedine.com/auth/verify-token?token=${restaurantOwnerDoc.authenticationInfo.link.token}&type=reset`,
              note: multilangConfig.email.forgotPassword.note
            },
            function (err, renderedText) {
              if (err) {
                console.log(err);
              } else {
                // send email
                app.service.notification.email.immediate({
                  userId: restaurantOwnerDoc._id,
                  userType: app.config.user.role.restaurantOwner,
                  emailId: restaurantOwnerDoc.personalInfo.email,
                  subject: emailNotification.forgotPassword.subject,
                  body: renderedText,
                });
              }
            }
          );

          return Promise.resolve({});
        });
      });
  };

  restaurantOwnerSchema.statics.verifyToken = function (token, type) {
    if (type === 'reset' || type === 'registration') {

      return this.findOne({
        'authenticationInfo.link.token': token,
        accountStatus: {
          $ne: app.config.user.accountStatus.restaurantOwner.deleted,
        },
      })
        .exec()
        .then((restaurantOwnerDoc) =>
          restaurantOwnerDoc
            ? Promise.resolve(restaurantOwnerDoc)
            : Promise.reject({
              errCode: 'TOKEN_INVALID',
            })
        )
        .then((restaurantOwnerDoc) => {
          let savedToken = {
            token: restaurantOwnerDoc.authenticationInfo.link.token,
            timeout: restaurantOwnerDoc.authenticationInfo.link.timeout,
          };

          if (savedToken.timeout && new Date() < savedToken.timeout) {
            if (savedToken.token === token) {
              return Promise.resolve(restaurantOwnerDoc);
            } else {
              return Promise.reject({
                errCode: 'TOKEN_INVALID',
              });
            }
          } else {
            return Promise.reject({
              errCode: 'TOKEN_TIMEDOUT',
            });
          }
        })
        .then((restaurantOwnerDoc) => {
          if (type === 'registration') {
            // status change
            restaurantOwnerDoc.accountStatus = app.config.user.accountStatus.restaurantOwner.active;
            restaurantOwnerDoc.authenticationInfo = {
              ...restaurantOwnerDoc.authenticationInfo,
              link: {
                token: ''
              }
            }
            return restaurantOwnerDoc.save().then((userDoc) => {
              userDoc = userDoc.toObject();
              return Promise.resolve({
                ...userDoc,
                restaurantActive: true
              });
            })
          }
        });
    } else {
      return Promise.reject({ err: 'Fake call' });
    }

  };

  restaurantOwnerSchema.statics.socialLoginValidate = async function (socialId, socialType, fullName, email) {
    let userDoc = await this.findOne({ 'personalInfo.email': email })
      .populate('restaurantRef')
      .populate('roleInfo.roleId')
      .exec();

    if (userDoc) {
      if (userDoc.accountStatus === app.config.user.accountStatus.restaurantOwner.deleted) {
        return Promise.reject({ errCode: 'RESTAURANT_OWNER_DELETED' });
      }
      if (userDoc.accountStatus === app.config.user.accountStatus.restaurantOwner.blocked) {
        return Promise.reject({ errCode: 'RESTAURANT_OWNER_BLOCKED' });
      }
      if (userDoc.isFranchise && !userDoc.isDeviceRegistered) {
        return Promise.reject({
          errCode: 'DEVICE_NOT_REGISTERED',
        })
      }

      const exists = userDoc.socialInfo.some(
        (s) => s.socialId === socialId && s.socialType === socialType
      );
      const socialExists = userDoc.socialInfo.filter(
        (s) => s.socialType === socialType
      )[0];

      if (socialExists && socialExists.socialId && socialExists.socialId !== socialId) {
        return Promise.reject({ errCode: 'RESTAURANT_OWNER_ALREADY_REGISTERED_DIFFERENT_SOCIAL_ACCOUNT' });
      }

      if (!exists) {
        userDoc.socialInfo.push({ socialId, socialType });
      }

      userDoc.loginType = app.config.user.loginType[socialType];
      userDoc.accountStatus = app.config.user.accountStatus.restaurantOwner.active;

      await userDoc.save();
      return {
        userDoc,
        userType: app.config.user.role.restaurantOwner,
      };

    } else {
      return {
        message: 'NEW_REGISTER'
      };
      // create new user
      // userDoc = new this({
      //   personalInfo: {
      //     fullName,
      //     email,
      //   },
      //   socialInfo: [{ socialId, socialType }],
      //   loginType: app.config.user.loginType[socialType],
      //   accountStatus: app.config.user.accountStatus.restaurantOwner.active,
      // });
    }


  };

  restaurantOwnerSchema.statics.multiSocialLoginValidate = async function (socialId, socialType, fullName, email) {
    let userDocs = await this.find({ 'personalInfo.email': email })
      .populate('restaurantRef')
      .populate('roleInfo.roleId')
      .exec();

    if (userDocs && userDocs.length) {
      let docs = userDocs.filter(doc => doc.accountStatus !== app.config.user.accountStatus.restaurantOwner.deleted);
      if (!docs.length) {
        return Promise.reject({ errCode: 'RESTAURANT_OWNER_DELETED' });
      }
      docs = userDocs.filter(doc => doc.accountStatus !== app.config.user.accountStatus.restaurantOwner.blocked);
      if (!docs.length) {
        return Promise.reject({ errCode: 'RESTAURANT_OWNER_BLOCKED' });
      }
      const userDoc = userDocs[0];
      if (userDocs.length === 1 && userDoc.isFranchise && !userDoc.isDeviceRegistered) {
        return Promise.reject({
          errCode: 'DEVICE_NOT_REGISTERED',
        })
      }

      // Collect all social IDs and types
      let socialIds = [];
      let socialTypes = [];

      for (let i = 0; i < userDocs.length; i++) {
        const doc = userDocs[i];
        socialIds = socialIds.concat(doc.socialInfo.map(s => s.socialId));
        socialTypes = socialTypes.concat(doc.socialInfo.map(s => s.socialType));

      }

      if (socialTypes.includes(socialType) && socialIds[socialTypes.indexOf(socialType)] !== socialId) {
        return Promise.reject({ errCode: 'RESTAURANT_OWNER_ALREADY_REGISTERED_DIFFERENT_SOCIAL_ACCOUNT' });
      }

      if (!socialTypes.includes(socialType) && !socialIds.includes(socialId)) {
        for (let i = 0; i < userDocs.length; i++) {
          const doc = userDocs[i];
          doc.socialInfo.push({ socialId, socialType });
          doc.loginType = app.config.user.loginType[socialType];
          doc.accountStatus = app.config.user.accountStatus.restaurantOwner.active;
          await doc.save();
        }
      }
      return {
        userDocs,
        userType: app.config.user.role.restaurantOwner,
      };

    } else {
      return {
        message: 'NEW_REGISTER'
      };
    }


  };

  /**
   * Verifies the OTP and sets the new password
   * @param  {String}  email    The email
   * @param  {String}  otp      The OTP to be verified
   * @param  {String}  password The new password to be set
   * @return {Promise}          The promise
   */
  restaurantOwnerSchema.statics.forgotPasswordVerifyOTP = function (token, password) {
    return this.findOne({
      'authenticationInfo.link.token': token,
      accountStatus: {
        $ne: app.config.user.accountStatus.restaurantOwner.deleted,
      },
    })
      .exec()
      .then((restaurantOwnerDoc) =>
        restaurantOwnerDoc
          ? Promise.resolve(restaurantOwnerDoc)
          : Promise.reject({
            errCode: 'TOKEN_INVALID',
          })
      )
      .then((restaurantOwnerDoc) => {
        let savedToken = {
          token: restaurantOwnerDoc.authenticationInfo.link.token,
          timeout: restaurantOwnerDoc.authenticationInfo.link.timeout,
        };

        if (savedToken.timeout && new Date() < savedToken.timeout) {
          if (savedToken.token === token) {
            //////////////////////////
            // Unset the otp object //
            //////////////////////////
            restaurantOwnerDoc
              .updateOne({
                $unset: {
                  'authenticationInfo.link.token': 1,
                },
              })
              .exec();
            return Promise.resolve(restaurantOwnerDoc);
          } else {
            return Promise.reject({
              errCode: 'TOKEN_INVALID',
            });
          }
        } else {
          //////////////////////////
          // Unset the otp object //
          //////////////////////////
          restaurantOwnerDoc
            .updateOne({
              $unset: {
                'authenticationInfo.link.token': 1,
              },
            })
            .exec();
          return Promise.reject({
            errCode: 'TOKEN_TIMEDOUT',
          });
        }
      })
      .then((restaurantOwnerDoc) =>
        app.utility.encryptPassword(password).then((hash) => {
          restaurantOwnerDoc.authenticationInfo.password = hash;
          return restaurantOwnerDoc.save();
        })
      );
  };

  /**
   * Checks whether a document exists according to a condition
   * @param  {Object} query   The query object
   * @return {Promise}        The Promise
   */
  restaurantOwnerSchema.statics.exists = function (query) {
    return this.countDocuments(query).exec();
  };

  /**
   * Adds an restaurantOwner to the system
   * @param  {Object} restaurantOwnerObj    The restaurantOwner object to be added
   * @return {Promise}            The Promise
   */
  restaurantOwnerSchema.statics.addRestaurantOwner = function (restaurantOwnerObj) {
    return this.exists({
      'personalInfo.email': restaurantOwnerObj.personalInfo.email,
      restaurantRef: restaurantOwnerObj.restaurantRef,
      accountStatus: {
        $ne: app.config.user.accountStatus.restaurantOwner.deleted,
      },
    })
      .then((count) => {
        if (count) {
          return Promise.reject({
            errCode: 'RESTAURANT_OWNER_EMAIL_ALREADY_EXISTS',
          })
        } else {
          return Promise.resolve();
        }
      }
      )
      .then(() => {
        return this.findOne({
          'personalInfo.email': restaurantOwnerObj.personalInfo.email,
          accountStatus: {
            $ne: app.config.user.accountStatus.restaurantOwner.deleted,
          },
        }).then(userData => {
          if (userData) {
            return Promise.resolve(userData);
          } else {
            return Promise.resolve(false);
          }
        });
      })
      .then((userData) => {
        if (restaurantOwnerObj.from !== "signup") {
          if (userData) {
            restaurantOwnerObj.authenticationInfo = {
              password: userData.authenticationInfo.password,
            };
            restaurantOwnerObj.socialInfo = userData.socialInfo;
            restaurantOwnerObj.loginType = userData.loginType;
            restaurantOwnerObj.accountStatus = app.config.user.accountStatus.restaurantOwner.active;
            return new this(restaurantOwnerObj).save().then((user) => {
              return Promise.resolve({ user, skip: true });
            });
          }
          let password = app.utility.getRandomCode(8, true);
          // let password = process.env.RESTAURANT_OWNER_DEFAULT_PASSWORD;
          return app.utility
            .encryptPassword(password)
            .then((password) => {
              restaurantOwnerObj.authenticationInfo = {
                password: password,
              };
              return new this(restaurantOwnerObj).save();
            })
            .then((updatedRestaurantOwnerObj) => {
              ////////////////////////////////////////////////////
              //Send email to newly created restaurant owner    //
              ////////////////////////////////////////////////////
              let emailNotification = app.config.notification.email(app, app.config.lang.defaultLanguage),
                multilangConfig = app.config.lang[app.config.lang.defaultLanguage];
              app.render(
                emailNotification.restaurantOwnerAddedByAdmin.pageName,
                {
                  greeting: multilangConfig.email.restaurantOwnerAddedByAdmin.greeting,
                  firstName: updatedRestaurantOwnerObj.personalInfo.fullName,
                  message: multilangConfig.email.restaurantOwnerAddedByAdmin.message,
                  emailText: multilangConfig.email.restaurantOwnerAddedByAdmin.emailText,
                  email: updatedRestaurantOwnerObj.personalInfo.email,
                  passwordText: multilangConfig.email.restaurantOwnerAddedByAdmin.passwordText,
                  password: password,
                  loginLink: 'https://immedine.com/auth/sign-in',
                  note: multilangConfig.email.restaurantOwnerAddedByAdmin.note
                },
                function (err, renderedText) {
                  if (err) {
                    console.log(err);
                  } else {
                    // send email
                    app.service.notification.email.immediate({
                      userId: updatedRestaurantOwnerObj._id,
                      userType: app.config.user.role.restaurantOwner,
                      emailId: updatedRestaurantOwnerObj.personalInfo.email,
                      subject: emailNotification.restaurantOwnerAddedByAdmin.subject,
                      body: renderedText,
                    });
                  }
                }
              );

              ////////
              //End //
              ////////
              return Promise.resolve(updatedRestaurantOwnerObj);
            });
        } else {
          if (restaurantOwnerObj.socialInfo) {
            return new this(restaurantOwnerObj).save().then((user) => {
              return Promise.resolve(user);
            });
          } else {
            if (userData) {
              restaurantOwnerObj.authenticationInfo = {
                password: userData.authenticationInfo.password,
              };
              restaurantOwnerObj.socialInfo = userData.socialInfo;
              restaurantOwnerObj.loginType = userData.loginType;
              restaurantOwnerObj.accountStatus = app.config.user.accountStatus.restaurantOwner.active;
              return new this(restaurantOwnerObj).save().then((user) => {
                return Promise.resolve({ user, skip: true });
              });
            } else {
              return app.utility.encryptPassword(restaurantOwnerObj.personalInfo.password).then((encryptedPassword) => {
                return Promise.resolve({
                  password: encryptedPassword,
                });
              })
                .then(({ password }) => {
                  restaurantOwnerObj.authenticationInfo = {
                    password,
                    link: {
                      token: app.utility.getRandomCode(20),
                      timeout: new Date(new Date().getTime() + 10 * 60 * 1000),
                    }
                  };

                  return new this(restaurantOwnerObj).save().then((user) => {
                    let emailNotification = app.config.notification.email(app, app.config.lang.defaultLanguage),
                      multilangConfig = app.config.lang[app.config.lang.defaultLanguage];
                    // create email template
                    app.render(
                      emailNotification.userSignupRequest.pageName,
                      {
                        greeting: multilangConfig.email.userSignupRequest.greeting,
                        firstName: user.personalInfo.fullName,
                        message: multilangConfig.email.userSignupRequest.message,
                        verificationLink: `https://immedine.com/auth/verify-token?token=${user.authenticationInfo.link.token}&type=register`,
                        note: multilangConfig.email.userSignupRequest.note
                      },
                      function (err, renderedText) {
                        if (err) {
                          console.log(err);
                        } else {
                          // send email
                          app.service.notification.email.immediate({
                            userId: user._id,
                            userType: app.config.user.role.restaurantOwner,
                            emailId: user.personalInfo.email,
                            subject: emailNotification.userSignupRequest.subject,
                            body: renderedText,
                          });
                        }
                      }
                    );
                    return Promise.resolve(user);
                  });
                });
            }
          }

        }

      });
  };

  restaurantOwnerSchema.statics.addRestaurantFranchiseOwner = function (restaurantOwnerObj) {
    return this.exists({
      'personalInfo.email': restaurantOwnerObj.personalInfo.email,
      restaurantRef: restaurantOwnerObj.restaurantRef,
      accountStatus: {
        $ne: app.config.user.accountStatus.restaurantOwner.deleted,
      },
    })
      .then((count) => {
        if (count) {
          return Promise.reject({
            errCode: 'RESTAURANT_OWNER_EMAIL_ALREADY_EXISTS',
          })
        } else {
          return Promise.resolve();
        }
      }
      )
      .then(() => {
        let password = app.utility.getRandomCode(8, true);
        // let password = process.env.RESTAURANT_OWNER_DEFAULT_PASSWORD;
        return app.utility
          .encryptPassword(password)
          .then((password) => {
            restaurantOwnerObj.authenticationInfo = {
              password: password,
            };
            let uniqueCode = app.utility.getRandomCode();
            console.log("uniqueCode ", uniqueCode)
            restaurantOwnerObj.deviceRegistrationCode = uniqueCode;
            return new this(restaurantOwnerObj).save();
          })
          .then((updatedRestaurantOwnerObj) => {
            return updatedRestaurantOwnerObj.populate('restaurantRef');
          })
          .then((updatedRestaurantOwnerObj) => {

            ////////////////////////////////////////////////////
            //Send email to newly created restaurant owner    //
            ////////////////////////////////////////////////////
            let emailNotification = app.config.notification.email(app, app.config.lang.defaultLanguage),
              multilangConfig = app.config.lang[app.config.lang.defaultLanguage];

            app.render(
              emailNotification.restaurantOwnerAddedByFranchiseOwner.pageName,
              {
                greeting: multilangConfig.email.restaurantOwnerAddedByFranchiseOwner.greeting,
                firstName: updatedRestaurantOwnerObj.personalInfo.fullName,
                message: multilangConfig.email.restaurantOwnerAddedByFranchiseOwner.message(updatedRestaurantOwnerObj?.restaurantRef?.name || ''),
                emailText: multilangConfig.email.restaurantOwnerAddedByFranchiseOwner.emailText,
                email: updatedRestaurantOwnerObj.personalInfo.email,
                codeText: multilangConfig.email.restaurantOwnerAddedByFranchiseOwner.codeText,
                code: updatedRestaurantOwnerObj.deviceRegistrationCode,
                link: 'https://play.google.com/',
                teamName: updatedRestaurantOwnerObj?.restaurantRef?.name || ''
              },
              function (err, renderedText) {
                if (err) {
                  console.log(err);
                } else {
                  // send email
                  app.service.notification.email.immediate({
                    userId: updatedRestaurantOwnerObj._id,
                    userType: app.config.user.role.restaurantOwner,
                    emailId: updatedRestaurantOwnerObj.personalInfo.email,
                    subject: emailNotification.restaurantOwnerAddedByFranchiseOwner.subject(updatedRestaurantOwnerObj?.restaurantRef?.name || ''),
                    body: renderedText,
                  });
                }
              }
            );

            ////////
            //End //
            ////////
            return Promise.resolve(updatedRestaurantOwnerObj);
          });


      });
  };


  //////////////////////
  // Session Handling //
  //////////////////////

  const jwtTokenGenerator = (expiresIn, data) => {
    let puid = new Puid().generate();
    return {
      token: puid,
      jwt: jwt.sign(
        {
          token: puid,
          data,
        },
        'secret',
        { expiresIn: expiresIn }
      ),
    };
  };
  const decryptJwtToken = (token) => {
    try {
      var decoded = jwt.verify(token, 'secret');
      return { err: false, token: decoded.token };
    } catch (err) {
      return { err: true, msg: err.message };
    }
  };

  /**
   * Creates a new session
   * @param  {Number}   deviceType            The device type
   * @param  {String}   deviceId              The device id
   * @param  {Object}   userDoc               The user document
   * @return {Promise}                        The Promise
   */
  restaurantOwnerSchema.statics.createSession = function (deviceType, deviceId, userDoc, notificationKey) {
    const tokenData = {
      id: userDoc._id,
      role: app.config.user.role.restaurantOwner,
      email: userDoc.personalInfo.email,
    };
    let jwtAccessToken = jwtTokenGenerator('30d', tokenData);
    let jwtRefreshToken = jwtTokenGenerator('300d', tokenData);
    let sessionInfo = {
      deviceType: deviceType,
      accessToken: jwtAccessToken.token,
      refreshToken: jwtRefreshToken.token,
      deviceId: deviceId,
    };

    if (notificationKey) {
      sessionInfo.notificationKey = notificationKey;
    }
    if (userDoc.sessionInfo && userDoc.sessionInfo.length) {
      userDoc.sessionInfo.push(sessionInfo);
    } else {
      userDoc.sessionInfo = [sessionInfo];
    }

    return this.removeSessionByDeviceId(deviceId)
      .then(() => userDoc.save())
      .then((savedUser) => {
        return Promise.resolve({
          userId: savedUser,
          userType: app.config.user.role.restaurantOwner,
          deviceId: savedUser.sessionInfo.deviceId,
          accessToken: jwtAccessToken.jwt,
          refreshToken: jwtRefreshToken.jwt,
        });
      });
  };

  /**
   * Validates a session
   * @param  {String}  token       The unique token
   * @param  {Number}  deviceType  The device type
   * @param  {String}  deviceId    The device id
   * @param  {Boolean} getUserInfo True, if user doc is to be retrieved along with token
   * @return {Promise}             The Promise
   */
  restaurantOwnerSchema.statics.validateSession = function (accessToken, deviceType, deviceId, notificationKey) {
    let decryptedToken = decryptJwtToken(accessToken);
    if (decryptedToken.err) {
      if (decryptedToken.message && decryptedToken.message === 'jwt expired') {
        return Promise.reject({ errCode: 'ACCESS_TOKEN_EXPIRED' });
      } else {
        return Promise.reject({ errCode: 'SESSION_NOT_FOUND' });
      }
    }
    return this.findOne({
      'sessionInfo': {
        '$elemMatch': {
          'accessToken': decryptedToken.token,
          'deviceId': deviceId,
          'deviceType': deviceType,
          // 'destroyTime': {
          //   '$gt': new Date()
          // }
        }
      }
    })
      .exec()
      .then((userDoc) => {
        if (!userDoc) {
          return Promise.reject({ errCode: 'SESSION_NOT_FOUND' });
        }

        if (userDoc.accountStatus === app.config.user.accountStatus.restaurantOwner.blocked) {
          return Promise.reject({
            errCode: 'RESTAURANT_OWNER_HAS_BEEN_SUSPENDED',
          });
        }

        if (userDoc.accountStatus === app.config.user.accountStatus.restaurantOwner.deleted) {
          return Promise.reject({
            errCode: 'RESTAURANT_OWNER_HAS_BEEN_DELETED',
          });
        }
        let sessionIndex = userDoc.sessionInfo.findIndex(eachSession => {
          return (eachSession.deviceId.toString() === deviceId.toString() && eachSession.deviceType.toString() === deviceType.toString());
        });
        if (notificationKey) {
          userDoc.sessionInfo[sessionIndex].notificationKey = notificationKey;
        }
        return userDoc.save().then((savedUser) => {
          return Promise.resolve({
            userType: app.config.user.role.restaurantOwner,
            userId: savedUser,
            deviceId: savedUser.sessionInfo[sessionIndex].deviceId,
          });
        });
      });
  };
  restaurantOwnerSchema.statics.refreshSession = function (refreshToken, deviceType, deviceId, notificationKey) {
    let decryptedToken = decryptJwtToken(refreshToken);
    if (decryptedToken.err) {
      if (decryptedToken.message && decryptedToken.message === 'jwt expired') {
        return Promise.reject({ errCode: 'REFRESH_TOKEN_EXPIRED' });
      } else {
        return Promise.reject({ errCode: 'SESSION_NOT_FOUND' });
      }
    }
    return this.findOne({
      'sessionInfo': {
        '$elemMatch': {
          'refreshToken': decryptedToken.token,
          'deviceId': deviceId,
          'deviceType': deviceType,
          // 'destroyTime': {
          //   '$gt': new Date()
          // }
        }
      }
    })
      .exec()
      .then((userDoc) => {
        if (!userDoc) {
          return Promise.reject({ errCode: 'SESSION_NOT_FOUND' });
        }

        if (userDoc.accountStatus === app.config.user.accountStatus.restaurantOwner.blocked) {
          return Promise.reject({
            errCode: 'RESTAURANT_OWNER_HAS_BEEN_SUSPENDED',
          });
        }

        if (userDoc.accountStatus === app.config.user.accountStatus.restaurantOwner.deleted) {
          return Promise.reject({
            errCode: 'RESTAURANT_OWNER_HAS_BEEN_DELETED',
          });
        }
        let sessionIndex = userDoc.sessionInfo.findIndex(eachSession => {
          return (eachSession.deviceId.toString() === deviceId.toString() && eachSession.deviceType.toString() === deviceType.toString());
        });
        if (notificationKey) {
          userDoc.sessionInfo[sessionIndex].notificationKey = notificationKey;
        }
        let jwtAccessToken = jwtTokenGenerator('30d');
        let jwtRefreshToken = jwtTokenGenerator('300d');
        userDoc.sessionInfo[sessionIndex].accessToken = jwtAccessToken.token;
        userDoc.sessionInfo[sessionIndex].refreshToken = jwtRefreshToken.token;
        return userDoc.save().then((savedUser) => {
          return Promise.resolve({
            userType: app.config.user.role.restaurantOwner,
            userId: savedUser,
            deviceId: savedUser.sessionInfo[sessionIndex].deviceId,
            accessToken: jwtAccessToken.jwt,
            refreshToken: jwtRefreshToken.jwt,
          });
        });
      });
  };

  /**
   * Removes a session by its userId
   * @param  {String}  userId      The ObjectId of the user
   * @return {Promise}             The Promise
   */
  restaurantOwnerSchema.statics.removeSessionByUserId = function (userId) {
    return this.updateOne(
      {
        _id: userId,
      },
      {
        $unset: {
          sessionInfo: 1,
        },
      }
    ).exec();
  };

  restaurantOwnerSchema.statics.removeSessionByDeviceId = function (deviceId) {
    return this.updateOne(
      {
        'sessionInfo.deviceId': deviceId,
      },
      {
        $unset: {
          sessionInfo: {
            deviceId: deviceId
          },
        },
      }
    ).exec();
  };

  restaurantOwnerSchema.statics.removeSession = function (token, deviceType, deviceId) {
    console.log(token, deviceType, deviceId)
    let decryptedToken = decryptJwtToken(token);
    if (decryptedToken.err) {
      if (decryptedToken.message && decryptedToken.message === 'jwt expired') {
        return Promise.reject({ errCode: 'ACCESS_TOKEN_EXPIRED' });
      } else {
        return Promise.reject({ errCode: 'SESSION_NOT_FOUND' });
      }
    }
    return this.updateOne({
      'sessionInfo': {
        $elemMatch: {
          'deviceId': deviceId,
          'accessToken': decryptedToken.token,
          'deviceType': deviceType,
        }
      }
    }, {
      $pull: {
        sessionInfo: {
          'deviceId': deviceId,
          'accessToken': decryptedToken.token,
          'deviceType': deviceType
        }
      }
    })
      .exec();
  };

  return restaurantOwnerSchema;
};
