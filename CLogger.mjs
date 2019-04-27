'use strict';

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

/** Class representation a logger */

class CLogger {

    /**
     * Create a logger
     *
     * @param {String} [label=default] - Prepend log messages text
     * @param {String} [debug=true] - Debug level enable flag
     * @param {String} [delimeter=' '] - Separator
     */

    constructor(label = 'default', debug = true) {
        this._label = label;
        for (const severity of ['debug', 'warn', 'info', 'error']) {
            Object.defineProperty(this, severity, {
                value: (...msg) => {
                    if (severity === 'debug' && !debug) {
                        return;
                    }
                    return console[severity](this.label, ...msg);
                }
            });
        }
    }

    /** Get instance label */

    get label() {
        return this._label;
    }

    /** Set instance label */

    set label(label) {
        this._label = label;
    }

    /**
     * Add method label to original label and return new instance of CLogger
     *
     * @param {String} method - Method name or what we need to label
     * @return {CLogger} new CLogger instance with new label
     */

    method(method, debug) {
        return new CLogger(`${this.label}:${method}`, debug);
    }

    /**
     * Create new logger instance
     *
     * @param {String} [label=default] - Prepend log messages text
     * @param {String} [debug=true] - Debug level enable flag
     * @param {String} [delimeter=' '] - Separator
     * @return {CLogger} new CLogger instance with new label
     */

    new(label = 'default', debug = true, delimeter = ' ') {
        return new CLogger(label, debug, delimeter);
    }
}

export { CLogger };
