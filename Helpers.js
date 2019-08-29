"use strict";
/**
 * 2019
 *
 * Contributor(s):
 *
 * Anatoly Yuzefovich <iskhartakh@gmail.com>
 *
 * A module Helpers functions
 *
 * @module Helpers
 */
exports.__esModule = true;
/**
 * UUID Generator Helper
 *
 * @method genUuid
 * @return {String} UUID - UUID Version 4
 */
function genUuid() {
    function S4(num) {
        var ret = num.toString(16);
        if (ret.length < 4) {
            ret.padStart(4, '0');
        }
        return ret;
    }
    // @ts-ignore
    var cryptoObj = window.crypto || window.msCrypto; // IE 11
    var buf = new Uint16Array(8);
    cryptoObj.getRandomValues(buf);
    return "" + S4(buf[0]) + S4(buf[1]) + "-" + S4(buf[2]) + "-" + S4(buf[3]) + "-" + S4(buf[4]) + "-" + S4(buf[5]) + S4(buf[6]) + S4(buf[7]);
}
exports.genUuid = genUuid;
