'use strict';
/**
 * Messages Class
 * @class
 */

class Message {
  /**
   * @this Message
   * generate a required field error message for user
   * @param {String} item     name of the required field
   * @return {String}         generated string
   */
  REQUIRED(item) {
    return item + ' is required';
  }

  /**
   * @this Message
   * generate a invalid field error message for user
   * @param {String} item     name of the invalid field
   * @return {String}         generated string
   */
  INVALID(item) {
    return item + ' is invalid';
  }

  /**
   * @this Message
   * generate a not found error message for user
   * @param {String} item     name of the not found field
   * @return {String}         generated string
   */
  NOTFOUND(item) {
    return item + ' is not found';
  }

  /**
   * @this Message
   * generate a write error message
   * @param {String} item     name of the readonly field
   * @return {String}         generated string
   */
  READONLY(item) {
    return item + ' is read-only';
  }

  /**
   * @this Message
   * generate a overflow error message
   * @param {String} item     name of the overflow field
   * @return {String}         generated string
   */
  OVERFLOW(item) {
    return item + ' length exceeded';
  }

  /**
   * @this Message
   * generate a minimum value error message
   * @param {String} item     name of the field
   * @return {String}         generated string
   */
  MIN(item, minValue) {
    return item + ' must have minimum value of ' + minValue;
  }

  /**
   * @this Message
   * generate a maximum value error message
   * @param {String} item     name of the field
   * @return {String}         generated string
   */
  MAX(item, maxValue) {
    return item + ' must have maximum value of ' + maxValue;
  }
}

/**
 * this function sets the development mesages field in the express app variable
 * @param  {express.app} app express server app
 */

module.exports = new Message();
