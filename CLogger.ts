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
    private _label: string;
    private _debug: boolean = true;

    /**
     * Create a logger
     *
     * @param {String} [label=default] - Prepend log messages text
     * @param {String} [debug=true] - Debug level enable flag
     */

    constructor(label = 'default', debug = true) {
        this._label = label;
        this._debug = debug;
    }

    public debug(...msg: any[]) {
        if (this._debug) {
            console.log(this._label, ...msg);
        }
    }

    public warn(...msg: any[]) {
        console.warn(this._label, ...msg);
    }

    public info(...msg: any[]) {
        console.info(this._label, ...msg);
    }

    public error(...msg: any[]) {
        console.error(this._label, ...msg);
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
     * @param {String}  method - Method name or what we need to label
     * @param {Boolean} debug  - Debug flag
     * @return {CLogger} new CLogger instance with new label
     */

    method(method: string, debug: boolean) {
        return new CLogger(`${this.label}:${method}`, debug);
    }

    /**
     * Create new logger instance
     *
     * @param {String} [label=default] - Prepend log messages text
     * @param {String} [debug=true]    - Debug level enable flag
     * @return {CLogger} new CLogger instance with new label
     */

    new(label = 'default', debug = true) {
        return new CLogger(label, debug);
    }
}

export { CLogger };
