/**
 * 2019
 *
 * Contributor(s):
 *
 * Anatoly Yuzefovich <iskhartakh@gmail.com>
 *
 * A module Verto lib
 *
 * @module CLogger
 */
var __spreadArrays = (this && this.__spreadArrays) || function () {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
    return r;
};
/** Class representation a logger */
var CLogger = /** @class */ (function () {
    /**
     * Create a logger
     *
     * @param {String} [label=default] - Prepend log messages text
     * @param {String} [debug=true] - Debug level enable flag
     */
    function CLogger(label, debug) {
        if (label === void 0) { label = 'default'; }
        if (debug === void 0) { debug = true; }
        this._debug = true;
        this._label = label;
        this._debug = debug;
    }
    CLogger.prototype.debug = function () {
        var msg = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            msg[_i] = arguments[_i];
        }
        if (this._debug) {
            console.log.apply(console, __spreadArrays([this._label], msg));
        }
    };
    CLogger.prototype.warn = function () {
        var msg = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            msg[_i] = arguments[_i];
        }
        console.warn.apply(console, __spreadArrays([this._label], msg));
    };
    CLogger.prototype.info = function () {
        var msg = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            msg[_i] = arguments[_i];
        }
        console.info.apply(console, __spreadArrays([this._label], msg));
    };
    CLogger.prototype.error = function () {
        var msg = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            msg[_i] = arguments[_i];
        }
        console.error.apply(console, __spreadArrays([this._label], msg));
    };
    Object.defineProperty(CLogger.prototype, "label", {
        /** Get instance label */
        get: function () {
            return this._label;
        },
        /** Set instance label */
        set: function (label) {
            this._label = label;
        },
        enumerable: true,
        configurable: true
    });
    /**
     * Add method label to original label and return new instance of CLogger
     *
     * @param {String}  method - Method name or what we need to label
     * @param {Boolean} debug  - Debug flag
     * @return {CLogger} new CLogger instance with new label
     */
    CLogger.prototype.method = function (method, debug) {
        return new CLogger(this.label + ":" + method, debug);
    };
    /**
     * Create new logger instance
     *
     * @param {String} [label=default] - Prepend log messages text
     * @param {String} [debug=true]    - Debug level enable flag
     * @return {CLogger} new CLogger instance with new label
     */
    CLogger.prototype.new = function (label, debug) {
        if (label === void 0) { label = 'default'; }
        if (debug === void 0) { debug = true; }
        return new CLogger(label, debug);
    };
    return CLogger;
}());
export { CLogger };
//# sourceMappingURL=CLogger.js.map