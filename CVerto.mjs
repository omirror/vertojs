/**
 * 2018
 *
 * Contributor(s):
 *
 * Anatoly Yuzefovich <iskhartakh@gmail.com>
 *
 * A module Verto lib
 *
 * @module CVerto
 */
import { CJsonRpcClient } from './CJsonRpcClient.mjs';
import { CVertoDialog } from './CVertoDialog.mjs';

class CVerto {
    /**
     * CVerto class constructor
     *
     * @constructor
     * @param {Object} options
     * @param {Object} callbacks
     */
    constructor(options, callbacks) {
        this.options = Object.freeze({
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
            sessid:         null,
            debug:          false,
            ...options
        });

        /* @todo FSRTC to implemetation
        if (this.options.deviceParams.useCamera) {
            FSRTC.getValidRes(this.options.deviceParams.useCamera, this.options.deviceParams.onResCheck);
        }*/

        if (!this.options.deviceParams.useMic) {
            this.options.deviceParams.useMic = 'any';
        }

        if (!this.options.deviceParams.useSpeak) {
            this.options.deviceParams.useSpeak = 'any';
        }

        this.sessid = this.options.sessid || this.genUUID();

        if (typeof(this.options.logger) === 'object') {
            this.logger = this.options.logger;
        } else {
            this.logger = {
                debug: this.options.debug ? (msg) => console.debug(`${this.sessid}: DEBUG:${msg}`) : () => {},
                info:  (msg) => console.log(`${this.sessid}: INFO:${msg}`),
                error: (err) => console.error(`${this.sessid}: ${this.options.debug ? err.stack : err.message}`)
            };
        }

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
            debug:          this.options.debug,
            logger:         this.options.logger,
            onmessage:      (e) => this.handleMessage(e.eventData),
            onWSConnect:    (rpcClient) => {
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
                        this.callbacks.onWSLogin(this, success);
                    }
                });
            },
            onWSClose:      (rpcClient) => {
                if (this.callbacks.onWSClose) {
                    this.callbacks.onWSClose(this);
                }
                //this.purge();
            }
        });

        this.videoDevices    = [];
        this.audioInDevices  = [];
        this.audioOutDevices = [];

        this.enum = {
            state: {
                new:         0,
                requesting:  1,
                trying:      2,
                recovering:  3,
                ringing:     4,
                answering:   5,
                early:       6,
                active:      7,
                held:        8,
                hangup:      9,
                destroy:     10,
                purge:       11
            },
            direction: {
                inbound:     0,
                outbound:    1
            },
            message: {
                display:     0,
                info:        1,
                pvtEvent:    2,
                clientReady: 3
            }
        };

        Object.freeze(this.enum);

        this.refreshDevices();
    }

    /**
     * Verto proto messages handler
     *
     * @method handleMessage
     * @param {Object} data - Message object
     */

    handleMessage(data) {
        this.logger.debug(`CVerto::handleMessage: message received ${JSON.stringify(data)}`);

        if (!data || !data.method) {
            this.logger.error(new Error(`CVerto::handleMessage: Bad data: ${data}`));
            return;
        }

        let dialog = data.params.callID ? this.dialogs[data.params.callID] : null;

        switch (data.method) {
        case 'verto.attach':
            if (dialog) {
                delete dialog.verto.dialogs[dialog.callID];
                dialog.rtc.stop();
            }
            break;
        case 'verto.bye':
        }

        if (data.method === 'verto.attach' && dialog) {
            delete dialog.verto.dialogs[dialog.callID];
            dialog.rtc.stop();
            dialog = null;
        }

        if (dialog) {
            switch (data.method) {
            case 'verto.bye':
                dialog.hangup(data.params);
                break;
            case 'verto.answer':
                dialog.handleAnswer(data.params);
                break;
            case 'verto.media':
                dialog.handleMedia(data.params);
                break;
            case 'verto.display':
                dialog.handleDisplay(data.params);
                break;
            case 'verto.info':
                dialog.handleInfo(data.params);
                break;
            default:
                this.logger.debug(`CVerto::handleMessage: Invalid method or non-existant call referece. ${dialog}, ${data.method}`);
                break;
            }
        } else if (data.params.callID) {
            switch (data.method) {
            case 'verto.attach':
                data.params.attach = true;

                if (data.params.sdp && data.params.sdp.indexOf('m=video') > 0) {
                    data.params.useVideo = true;
                }

                if (data.params.sdp && data.params.sdp.indexOf('stereo=1') > 0) {
                    data.params.useStereo = true;
                }

                this.dialogs[dialog.callID] =
                    new CVertoDialog(this.enum.direction.inbound, this, data.params);
                this.dialogs[dialog.callID].setState(this.enum.state.recovering);

                break;
            case 'verto.invite':

                if (data.params.sdp && data.params.sdp.indexOf('m=video') > 0) {
                    data.params.wantVideo = true;
                }

                if (data.params.sdp && data.params.sdp.indexOf('stereo=1') > 0) {
                    data.params.useStereo = true;
                }

                this.dialogs[dialog.callID] =
                    new CVertoDialog(this.enum.direction.inbound, this, data.params);
                break;
            default:
                this.logger.debug(`CVerto::handleMessage: Invalid method or non-existant call referece. ${data.method}`);
                break;
            }

        }

        if (data.params.callID) {
            return {
                method: data.method
            };
        }

        switch (data.method) {
        case 'verto.punt':
            this.purge();
            this.logout();
            break;
        case 'verto.event': {
            let list = null;
            let key  = null;

            if (data.params) {
                key = data.params.eventChannel;
            }

            if (key) {
                list = this.eventSUBS[key];
                if (!list) {
                    list = this.eventSUBS[key.split('.')[0]];
                }
            }

            if (!list && key && key === this.sessid) {
                if (this.callbacks.onMessage) {
                    this.callbacks.onMessage(this, null, this.enum.message.pvtEvent, data.params);
                }
            } else if (!list && key && this.dialogs[key]) {
                this.dialogs[key].sendMessage(this.enum.message.pvtEvent, data.params);
            } else if (!list) {
                this.logger.debug(`CVerto::handleMessage: UNSUBBED or invalid Event ${key} Ignored`);
            } else {
                for (const i in list) {
                    const sub = list[i];

                    if (!sub || !sub.ready) {
                        this.logger.error(new Error(`CVerto::handleMessage: invalid Event for ${key} Ignored`));
                    } else if (sub.handler) {
                        sub.handler(this, data.params, sub.userData);
                    } else if (this.callbacks.onEvent) {
                        this.callbacks.onEvent(this, data.params, sub.userData);
                    } else {
                        this.logger.info(`CVerto::handleMessage: Event: ${JSON.strinfigy(data.params)}`);
                    }
                }
            }

            break;
        }
        case 'verto.info':
            if (this.callbacks.onMessage) {
                this.callbacks.onMessage(this, null, this.enum.message.info, data.params.msg);
            }

            this.logger.debug(`CVerto::handleMessage: Message from: ${data.params.msg.from}, ${data.params.msg.body}`);

            break;

        case 'verto.clientReady':
            if (this.callbacks.onMessage) {
                this.callbacks.onMessage(this, null, this.enum.message.clientReady, data.params);
            }

            this.logger.debug(`CVerto::handleMessage: Client is ready. ${JSON.stringify(data.params)}`);

            break;

        default:
            this.logger.debug(`CVerto::handleMessage: Invalid method or non-existant call referece. ${data.method}`);
            break;
        }

    }

    //Check and get devices
    refreshDevices() {

    }

    get Devices() {}

    /**
     * UUID Generator Helper
     *
     * @method genUUID
     * @return {String} UUID - UUID Version 4
     */

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