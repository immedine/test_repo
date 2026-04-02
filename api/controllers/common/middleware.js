'use strict';

module.exports = function (app) {
  /**
   * Middleware for checking and validating the session
   * @param  {Object}   req  The request object
   * @param  {Object}   res  The response object
   * @param  {Function} next The next middleware
   */
  const checkSession = function (userType) {
    return function (req, res, next) {
      console.log('req.token', req.token);
      app.module.session
        .get(
          req.token,
          req.headers['x-auth-devicetype'],
          req.headers['x-auth-deviceid'],
          userType,
          req.headers['x-auth-notificationkey']
        )
        .then((sessionDoc) => {
          req.session = {
            userType: sessionDoc.userType,
            user: sessionDoc.userId,
            deviceId: sessionDoc.deviceId || null,
          };
          next();
        })
        .catch(next);
    };
  };

  /**
   * Checks whether user has access to this API
   * @param  {Number|Number[]} userRoles The array of user roles which are allowed for this API
   * @return {Function}                  The middleware
   */
  const checkUserAccess = function (userRoles) {
    if (!Array.isArray(userRoles)) {
      userRoles = [userRoles];
    }
    return function (req, res, next) {
      if (!userRoles.some((e) => e === req.session.userType)) {
        next({
          errCode: 'NO_USER_ACCESS',
        });
      } else {
        next();
      }
    };
  };

  /**
   * Validates the given ObjectId (in param) against model and returns the object
   * @param  {String}   modelName The name of the model
   * @param  {String}   paramName The name of the parm
   * @return {Function}           The middleware
   */
  const validateId = function (modelName, paramName) {
    if (!app.models.hasOwnProperty(modelName)) {
      throw new Error({
        code: 'MODEL_NOT_FOUND',
        modelName: modelName,
      });
    }

    return function (req, res, next) {
      if (req.params[paramName].toString().length !== 24) {
        req.workflow.outcome.errfor[paramName] = app.utility.message.INVALID(paramName);
        req.workflow.emit('response');
      }

      app.models[modelName]
        .findById(req.params[paramName])
        .then((doc) => {
          if (doc) {
            req[paramName] = doc;
            next();
          } else {
            res.status(404).send();
            // req.workflow.outcome.errfor[paramName] = app.utility.message.NOTFOUND(paramName);
            // req.workflow.emit('response');
          }
        })
        .catch(next);
    };
  };

  /**
   * Validates the header for required fields (device type and device id)
   * @return {Function} The middleware
   */
  const headerValidator = function () {
    /**
     * Default header schema
     * @type {Object}
     */
    const headerSchema = {
      'x-auth-deviceid': {
        type: 'string',
        required: true,
      },
      'x-auth-devicetype': {
        required: true,
        conform: function (val) {
          return Object.keys(app.config.user.deviceType).some((e) => app.config.user.deviceType[e] + '' === val);
        },
      },
    };

    return app.utility.apiValidate.headers(headerSchema);
  };

  /**
   * Validates the header for required fields (latitude and longitude)
   * @return {Function} The middleware
   */
  const locationValidator = function () {
    /**
     * Default location schema
     * @type {Object}
     */
    const locationSchema = {
      'x-auth-latitude': {
        type: 'string',
        required: true,
        allowEmpty: false,
        conform: function (value) {
          return app.utility.isValidate.isNumber(value);
        },
      },
      'x-auth-longitude': {
        type: 'string',
        required: true,
        allowEmpty: false,
        conform: function (value) {
          return app.utility.isValidate.isNumber(value);
        },
      },
    };

    return app.utility.apiValidate.headers(locationSchema);
  };

  /**
   * Validates the header for required token field
   * @return {Function} The middleware
   */
  const tokenValidator = () => {
    /**
     * Additional header schema for /account* route
     */
    const tokenHeaderSchema = {
      authorization: {
        type: 'string',
        required: true,
        allowEmpty: false,
      },
    };
    return app.utility.apiValidate.headers(tokenHeaderSchema);
  };

  /**
   * @returns {Function} middleware function
   */
  const checkBearerAuthToken = () => {
    return (req, res, next) => {
      const bearer = req.headers['authorization'].split(' ');
      const bearerToken = bearer[1];
      if (bearerToken === undefined) {
        return next({ errCode: 'INVALID_TOKEN_TYPE', statusCode: 400 });
      }
      req.token = bearerToken;
      next();
    };
  };

  /**
   * Validates the header for for lat and long belonging to a Zone
   * @return {Function} The middleware
   */
  const locationValidate = function (req, res, next) {
    app.module.zone
      .check(req.headers['x-auth-longitude'], req.headers['x-auth-latitude'])
      .then((zone) => {
        req.zone = zone;
        next();
      })
      .catch(() => {
        next();
      });
  };

  /**
   * Checks whether admin has access to this API based on their role
   * @param  {Object[]} modulePermissions            The array of accepted admin roles
   * @param  {String}   modulePermissions.moduleName The module name
   * @param  {Number}   modulePermissions.role       The role type of the admin
   * @param  {Object}   opts                         The extra privilege required
   * @return {Function}                              The middleware
   */
  const checkAdminRoleAccess = function(modulePermissions, opts) {

    return function(req, res, next) {

      let admin = req.session.user,
        permissionObject = {};
      if (admin.roleInfo.isSuperAdmin) {
        next();
      } else {
        admin.roleInfo.roleId.permissions.forEach(each => permissionObject[each.moduleName] = each.role);

        let hasPermission = modulePermissions.map(each => {
          return {
            'expected': each.role,
            'actual': permissionObject[each.moduleName]
          };
        }).every(each => each.expected <= each.actual);

        if (hasPermission && hasExtraPrivilege) {
          next();
        } else {
          next({
            'errCode': 'ADMIN_NO_ACCESS'
          });
        }
      }
    };
  };

  return {
    checkSession: checkSession,
    checkUserAccess: checkUserAccess,
    validateId: validateId,
    headerValidator: headerValidator,
    tokenValidator: tokenValidator,
    checkBearerAuthToken: checkBearerAuthToken,
    locationValidator: locationValidator,
    locationValidate: locationValidate,
    checkAdminRoleAccess: checkAdminRoleAccess
  };
};
