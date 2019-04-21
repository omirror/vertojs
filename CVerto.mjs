/**
 * 2019
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
import { CVertoDialog }   from './CVertoDialog.mjs';
import { genUuid }        from './Helpers.mjs';

class CVerto {

    /**
     * CVerto class constructor
     *
     * @constructor
     * @param {Object} options
     * @param {Object} callbacks
     */

    constructor(options, callbacks) {
        this._options = Object.freeze({
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

        /*
         * @todo FSRTC to implemetation
         * if (this.options.deviceParams.useCamera) {
         *   FSRTC.getValidRes(this.options.deviceParams.useCamera, this.options.deviceParams.onResCheck);
         * }
         */

        if (!this.options.deviceParams.useMic) {
            this.options.deviceParams.useMic = 'any';
        }

        if (!this.options.deviceParams.useSpeak) {
            this.options.deviceParams.useSpeak = 'any';
        }

        this.sessid = this.options.sessid || genUuid();

        if (typeof this.options.logger === 'object') {
            this.logger = this.options.logger;
        } else {
            this.logger = {
                debug: this.options.debug ? (...args) => console.debug(this.sessid, this.constructor.name, ...args) : () => {},
                info:  (...args) => console.log(this.sessid, this.constructor.name, ...args),
                error: (err) => console.error(`${this.sessid} ${this.constructor.name} ${this.options.debug ? err.stack : err.message}`)
            };
        }

        this.dialogs   = {};
        this.callbacks = callbacks || {};
        this.eventSUBS = {};
        this._rpcClient = new CJsonRpcClient({
            login:          this.options.login,
            passwd:         this.options.passwd,
            socketUrl:      this.options.socketUrl,
            loginParams:    this.options.loginParams,
            userVariables:  this.options.userVariables,
            sessid:         this.sessid,
            debug:          this.options.debug,
            logger:         this.options.logger,
            onMessage: (e) => this.handleMessage(e.eventData),
            onWSConnect: (rpcClient) => {
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
            onWSClose: () => {
                if (this.callbacks.onWSClose) {
                    this.callbacks.onWSClose(this);
                }
                //this.purge();
            }
        });

        this.videoDevices    = [];
        this.audioInDevices  = [];
        this.audioOutDevices = [];

        this._enum = {
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

        Object.freeze(this._enum);

        this.refreshDevices();
    }

    /**
     * Constants
     */

    get enum() {
        return this._enum;
    }

    /**
     * CJsonRpcClient object
     */

    get rpcClient() {
        return this._rpcClient;
    }

    /**
     * Verto options
     */

    get options() {
        return this._options;
    }

    /**
     * Verto proto messages handler
     *
     * @method handleMessage
     * @param {Object} message - Message object
     */

    handleMessage(message) {
        const data = { ...message };
        this.logger.debug('handleMessage: message received', data);

        if (!data || !data.method) {
            this.logger.error(new Error(`handleMessage: Bad data: ${JSON.stringify(data)}`));
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
        default:
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
                this.logger.debug('handleMessage: Invalid method or non-existant call referece.', dialog, data.method);
                break;
            }
        } else if (data.params.callID) {
            switch (data.method) {
            case 'verto.attach':
                data.params.attach = true;
                if (data.params.sdp) {
                    if (data.params.sdp.indexOf('m=video') > 0) {
                        data.params.useVideo = true;
                    }
                    if (data.params.sdp.indexOf('stereo=1') > 0) {
                        data.params.useStereo = true;
                    }
                }
                this.dialogs[data.params.callID] =
                    new CVertoDialog(this.enum.direction.inbound, this, data.params);
                this.dialogs[data.params.callID].setState(this.enum.state.recovering);
                break;
            case 'verto.invite':
                if (data.params.sdp) {
                    if (data.params.sdp.indexOf('m=video') > 0) {
                        data.params.wantVideo = true;
                    }
                    if (data.params.sdp.indexOf('stereo=1') > 0) {
                        data.params.useStereo = true;
                    }
                }
                this.dialogs[data.params.callID] =
                    new CVertoDialog(this.enum.direction.inbound, this, data.params);
                break;
            default:

                // @todo wants to determinate what exactly reason

                this.logger.debug('handleMessage: Invalid method or non-existant call referece.', data.method);
                break;
            }

        }

        if (data.params.callID) {
            return { method: data.method };
        }

        switch (data.method) {
        case 'verto.punt':
            this.purge();
            this.logout();
            break;
        case 'verto.event': {
            let key  = NaN;
            let list = NaN;

            if (data.params) {
                if (data.params.eventChannel) {
                    key = data.params.eventChannel;
                    list = this.eventSUBS[key] || this.eventSUBS[key.split('.')[0]];
                }
            }

            if (!list && key === this.sessid) {
                if (this.callbacks.onMessage) {
                    this.callbacks.onMessage(this, null, this.enum.message.pvtEvent, data.params);
                }
            } else if (!list && this.dialogs[key]) {
                this.dialogs[key].sendMessage(this.enum.message.pvtEvent, data.params);
            } else if (!list) {
                this.logger.debug(`handleMessage: UNSUBBED or invalid Event [${key}] Ignored`);
            } else {
                for (const i in list) {
                    const sub = list[i];

                    if (!sub || !sub.ready) {
                        this.logger.error(new Error(`handleMessage: invalid Event for [${key}] Ignored`));
                    } else if (sub && sub.handler) {
                        sub.handler(this, data.params, sub.userData);
                    } else if (this.callbacks.onEvent) {
                        this.callbacks.onEvent(this, data.params, sub ? sub.userData : undefined);
                    } else {
                        this.logger.info('handleMessage: Event:', data.params);
                    }
                }
            }

            break;
        }
        case 'verto.info':
            if (this.callbacks.onMessage) {
                this.callbacks.onMessage(this, null, this.enum.message.info, data.params.msg);
            }
            this.logger.debug(`handleMessage: Message from: ${data.params.msg.from}`, data.params.msg.body);
            break;

        case 'verto.clientReady':
            if (this.callbacks.onMessage) {
                this.callbacks.onMessage(this, null, this.enum.message.clientReady, data.params);
            }
            this.logger.debug('handleMessage: Client is ready.', data.params);
            break;

        default:

            // @todo wants to determinate what exactly reason

            this.logger.debug(`handleMessage: Invalid method or non-existant call referece. ${data.method}`);
            break;
        }

    }

    //Check and get devices
    refreshDevices() {

    }

    get Devices() {}
}

export { CVerto };