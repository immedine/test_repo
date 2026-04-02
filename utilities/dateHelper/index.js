'use strict';
/**
 * creates utility functions for handling date
 * @class
 */
class CustomDate {
  /**
   * this function returns the custom formatted date from a valid dateString
   *
   * @this CustomDate
   *
   * @param {object} config         config object
   * @param {Date}   config.date    date String or date
   * @param {RegExp} config.format  regular expression for the date string
   *
   * @return {String}               formatted Date string
   * @example
   * // return 20-01-2015
   * getDate({
   *   date : 'Tue Jan 20 2015 13:48:01',
   *   format : /dd-mm-yy/
   * });
   *
   */
  getDateString(config) {
    if (!this.isDate(config.date)) {
      return false;
    }

    let date = new Date(config.date),
      dateObject,
      months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

    dateObject = {
      dd: date.getDate(),
      mm: date.getMonth() + 1,
      yy: date.getFullYear(),
      HH: date.getHours(),
      MN: date.getMinutes(),
      SS: date.getSeconds(),
    };

    if (dateObject.HH > 11) {
      dateObject.hh = 12 + dateObject.HH - 24;
      dateObject.AMPM = 'PM';
    } else {
      dateObject.hh = dateObject.HH;
      dateObject.AMPM = 'AM';
    }

    //find occurrence of A exactly 1 times
    if (!/A{2}/i.test(config.format)) {
      config.format = config.format.replace(/A/gi, dateObject.AMPM);
    }

    //find occurrence of s at least one and not more than 2
    if (/s+/i.test(config.format) && !/s{3}/i.test(config.format)) {
      if (/s{2}/i.test(config.format)) {
        //find occurrence of s exactly 2 times
        config.format = config.format.replace(/ss/gi, dateObject.SS > 9 ? dateObject.SS : '0' + dateObject.SS);
      } else {
        //find occurrence of s exactly 1 times
        config.format = config.format.replace(/s/gi, dateObject.SS);
      }
    }

    //find occurrence of h at least one and not more than 2
    if (/h+/.test(config.format) && !/h{3}/.test(config.format)) {
      if (/h{2}/.test(config.format)) {
        //find occurrence of h exactly 2 times
        config.format = config.format.replace(/hh/g, dateObject.hh > 9 ? dateObject.hh : '0' + dateObject.hh);
      } else {
        //find occurrence of h exactly 1 times
        config.format = config.format.replace(/h/g, dateObject.hh);
      }
    }

    //find occurrence of H at least one and not more than 2
    if (/H+/.test(config.format) && !/H{3}/.test(config.format)) {
      if (/H{2}/.test(config.format)) {
        //find occurrence of H exactly 2 times
        config.format = config.format.replace(/HH/g, dateObject.HH > 9 ? dateObject.HH : '0' + dateObject.HH);
      } else {
        //find occurrence of H exactly 1 times
        config.format = config.format.replace(/HH/g, dateObject.HH);
      }
    }

    //find occurrence of T at least one and not more than 2
    if (/T+/gi.test(config.format) && !/T{3}/gi.test(config.format)) {
      if (/T{2}/i.test(config.format)) {
        //find occurrence of T exactly 2 times
        config.format = config.format.replace(/tt/gi, dateObject.MN > 9 ? dateObject.MN : '0' + dateObject.MN);
      } else {
        //find occurrence of T exactly 1 times
        config.format = config.format.replace(/t/gi, dateObject.MN);
      }
    }

    //find occurrence of d at least one and not more than 2
    if (/d+/i.test(config.format) && !/d{3}/i.test(config.format)) {
      if (/d{2}/i.test(config.format)) {
        //find occurrence of d exactly 2 times
        config.format = config.format.replace(/dd/gi, dateObject.dd > 9 ? dateObject.dd : '0' + dateObject.dd);
      } else {
        //find occurrence of d exactly 1 times
        config.format = config.format.replace(/d/gi, dateObject.dd);
      }
    }

    //find occurrence of y atleast 2 times
    if (/y+/i.test(config.format) && !/y{5}/i.test(config.format)) {
      //find occurrence of y exactly 4 times
      if (/y{4}/i.test(config.format)) {
        config.format = config.format.replace(/yyyy/gi, dateObject.yy);
      } else if (!/y{3,}/i.test(config.format)) {
        //find occurrence of y not exactly 3 times i.e 2 times
        config.format = config.format.replace(/yy/gi, dateObject.yy.toString().substring(2));
      }
    }

    //find occurrence of m at least one and not more than 3
    if (/m+/i.test(config.format) && !/m{4}/i.test(config.format)) {
      if (/m{3}/.test(config.format)) {
        //find occurrence of m exactly 3 times
        config.format = config.format.replace(/mmm/gi, months[dateObject.mm - 1].toLowerCase());
      } else if (/M{3}/.test(config.format)) {
        //find occurrence of M exactly 3 times
        config.format = config.format.replace(/MMM/gi, months[dateObject.mm].toUpperCase());
      } else if (/m{2,}/i.test(config.format)) {
        //find occurrence of m exactly 2 times
        config.format = config.format.replace(/m{2,}/gi, dateObject.mm > 9 ? dateObject.mm : '0' + dateObject.mm);
      } else {
        //find occurrence of m exactly 1 times
        config.format = config.format.replace(/m{1,}/g, dateObject.mm);
      }
    }

    return config.format;
  }

  /**
   * this function returns the custom formatted date from a valid dateString
   *
   * @this CustomDate
   *
   * @param {Date}   date      date String or date
   * @param {RegExp} [format]  regular expression for the date string
   *
   * @return {String}          formatted Date string
   *
   * @example
   *
   * // return 20 JAN, 2015
   * getDate('Tue Jan 20 2015 13:48:01');
   *
   * // return 20-01-2015
   * getDate('Tue Jan 20 2015 13:48:01',/dd-mm-yy/);
   *
   */
  getDate(date, format) {
    return this.getDateString({
      date: date,
      format: format ? format : 'dd MMM, YYYY',
    });
  }

  /**
   * this function returns the custom formatted date from a valid dateString
   *
   * @this CustomDate
   *
   * @param {Date}   date    date String or date
   * @param {RegExp} format  regular expression for the date string
   *
   * @return {String}        formatted Date string
   *
   * @example
   *
   * // return 13:48:01 PM
   * getTime('Tue Jan 20 2015 13:48:01');
   *
   * // return 13:48:01
   * getTime('Tue Jan 20 2015 13:48:01',/hh:tt:ss/);
   */
  getTime(date, format) {
    return this.getDateString({
      date: date,
      format: format ? format : 'hh:tt:ss a',
    });
  }

  /**
   * this function checks whether the date is valid or not
   * if valid return true otherwise false
   *
   * @this CustomDate
   *
   * @param {Date}   date    date String or date
   *
   * @return {Boolean}
   *
   * @example
   *
   * // return true
   * isDate('Tue Jan 20 2015 13:48:01');
   *
   * // return false
   * isDate('Tue Jan');
   */
  isDate(date) {
    if (!isNaN(new Date(date).valueOf())) {
      return true;
    } else {
      return false;
    }
  }

  /**
   * this function checks whether the inputed dates are same or not
   * if same return true otherwise false
   *
   * @this CustomDate
   *
   * @param {Date} from    date String or date
   * @param {Date} to      date String or date
   *
   * @return {Boolean}
   *
   * @example
   *
   * // return true
   * isEqual('20 Aug, 2015','20 Aug, 2015');
   *
   * // return false
   * isEqual('20 Aug, 2015','20 Aug, 2014');
   */

  isEqual(from, to) {
    let returnData = false;
    if (this.isDate(from) && this.isDate(to)) {
      from = new Date(from);
      to = new Date(to);

      if (from.getFullYear() === to.getFullYear()) {
        returnData = true;
      } else {
        returnData = false;
      }

      if (from.getMonth() === to.getMonth) {
        returnData = true;
      } else {
        returnData = false;
      }

      if (from.getDate() === to.getDate()) {
        returnData = true;
      } else {
        returnData = false;
      }
    }

    return returnData;
  }
}
module.exports = new CustomDate();
