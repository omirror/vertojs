/**
 * A module Verto lib
 * @module CVerto
 */
import { CJsonRpcClient } from './CJsonRpcClient.mjs';

class CVerto {
    /**
     * CVerto class constructor
     *
     * @constructor
     * @param {Object} options
     * @param {Object} callbacks
     */
    constructor(options, callbacks) {
        this.options = Object.assign({
            login:          null,
            passwd:         null,
            socketUrl:      null,
            videoParams:    {},
            audioParams:    {},
            loginParams:    {},
            deviceParams:   { onResCheck: null },
            userVariables:  {},
            iceServers:     false,
            ringSleep:      6000,
            sessid:         null
        }, options);

        if (!this.options.deviceParams.useMic) {
            this.options.deviceParams.useMic = 'any';
        }

        if (!this.options.deviceParams.useSpeak) {
            this.options.deviceParams.useSpeak = 'any';
        }

        this.sessid    = this.options.sessid || this.genUUID();
        this.dialogs   = {};
        this.callbacks = callbacks || {};
        this.eventSUBS = {};
        this.rpcClient = new CJsonRpcClient({
            login:          this.options.login,
            passwd:         this.options.passwd,
            socketUrl:      this.options.socketUrl,
            loginParams:    this.options.loginParams,
            userVariables:  this.options.userVariables,
            sessid:         this.sessid,
            debug:          true,
            onmessage:     (e) => this.handleMessage(e.eventData),
            onWSConnect:   (rpcClient) => {
                let params = {};
                if (this.options.login && this.options.passwd) {
                    params = {
                        login:         this.options.login,
                        passwd:        this.options.passwd,
                        loginParams:   this.options.loginParams,
                        userVariables: this.options.userVariables
                    };
                }
                rpcClient.call('login', params, (success) => {
                    if (this.callbacks.onWSLogin) {
                        this.callbacks.onWSLogin(success);
                    }
                });
            },
            onWSClose:     (rpcClient) => {
                if (this.callbacks.onWSClose) {
                    this.callbacks.onWSClose(this);
                }
                //this.purge();
            }
        });

        this.refreshDevices();
    }

    handleMessage(data) {
        console.log('CVerto message received', data);
    }

    //Check and get devices
    refreshDevices() {

    }

    get Devices() {}

    genUUID() {
        function S4(num) {
            let ret = num.toString(16);
            if (ret.length < 4) {
                ret.padStart(4, '0');
            }
            return ret;
        }
        const cryptoObj = window.crypto || window.msCrypto; // IE 11
        const buf       = new Uint16Array(8);

        cryptoObj.getRandomValues(buf);

        return `${S4(buf[0])}${S4(buf[1])}-${S4(buf[2])}-${S4(buf[3])}-${S4(buf[4])}-${S4(buf[5])}${S4(buf[6])}${S4(buf[7])}`;
    }
}

export { CVerto };