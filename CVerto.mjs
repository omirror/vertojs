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
import { CLogger }        from './CLogger.mjs';
import { CVertoDialog }   from './CVertoDialog.mjs';
import { genUuid }        from './Helpers.mjs';

/** Class representation a Verto UA */

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
            deviceParams:   { useMic: 'any', useSpeak: 'any', useCamera: 'any' },
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

        this._sessid = this.options.sessid || genUuid();

        if (typeof this.options.logger === 'object') {
            this._logger = this.options.logger;
        } else {
            this._logger = new CLogger(`${this._sessid} CVerto`, this.options.debug);
        }

        this._dialogs   = {};
        this._callbacks = callbacks || {};
        this._eventSUBS = {};
        this._rpcClient = new CJsonRpcClient({
            login:          this.options.login,
            passwd:         this.options.passwd,
            socketUrl:      this.options.socketUrl,
            loginParams:    this.options.loginParams,
            userVariables:  this.options.userVariables,
            sessid:         this._sessid,
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
                    if (this._callbacks.onWSLogin) {
                        this._callbacks.onWSLogin(this, success);
                    }
                });
            },
            onWSClose: () => {
                if (this._callbacks.onWSClose) {
                    this._callbacks.onWSClose(this);
                }
                //this.purge();
            }
        });

        this._videoDevices    = [];
        this._audioInDevices  = [];
        this._audioOutDevices = [];

        this.refreshDevices();
    }

    /**
     * Call states
     */

    get STATE() {
        return {
            NEW:        0,
            REQUESTING: 1,
            TRYING:     2,
            RECOVERING: 3,
            RINGING:    4,
            ANSWERING:  5,
            EARLY:      6,
            ACTIVE:     7,
            HELD:       8,
            HANGUP:     9,
            DESTROY:    10,
            PURGE:      11
        };
    }

    /**
     * Call direction
     */

    get DIRECTION() {
        return {
            INBOUND:  0,
            OUTBOUND: 1
        };
    }

    /**
     * Message type
     */

    get MESSAGE() {
        return {
            DISPLAY:     0,
            INFO:        1,
            PVTEVENT:    2,
            CLIENTREADY: 3
        };
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
     * Verto callbacks
     */

    get callbacks() {
        return this._callbacks;
    }

    /**
     * Verto proto messages handler
     *
     * @method handleMessage
     * @param {Object} message - Message object
     */

    handleMessage(message) {
        const logger = this._logger.method('handleMessage', this.options.debug);
        logger.debug('message received', message);

        if (!message || !message.method) {
            logger.error(new Error(`Bad message: ${JSON.stringify(message)}`));
            return;
        }

        switch (message.method) {
        case 'verto.attach': // Restore exists session
            if (message.params.callID) { // is it possible to be null ?
                if (this._dialogs[message.params.callID]) {
                    this._dialogs[message.params.callID].rtc.stop();
                    delete this._dialogs[message.params.callID];
                }
                const opts = { ...message };
                if (message.params.sdp) {
                    if (message.params.sdp.indexOf('m=video') > 0) {
                        opts.params.useVideo = true;
                    }
                    if (message.params.sdp.indexOf('stereo=1') > 0) {
                        opts.params.useStereo = true;
                    }
                }
                this.dialogs[message.params.callID] =
                    new CVertoDialog(this.DIRECTION.INBOUND, this, opts);
                this.dialogs[message.params.callID].setState(this.STATE.RECOVERING);
            }
            break;
        case 'verto.invite': // Inbound call
            if (message.params.callID) {
                const opts = { ...message };
                if (message.params.sdp) {
                    if (message.params.sdp.indexOf('m=video') > 0) {
                        opts.params.wantVideo = true;
                    }
                    if (message.params.sdp.indexOf('stereo=1') > 0) {
                        opts.params.useStereo = true;
                    }
                }
                this._dialogs[message.params.callID] =
                    new CVertoDialog(this.DIRECTION.INBOUND, this, opts);
            }
            break;
        case 'verto.bye':
        case 'verto.answer':
        case 'verto.media':
        case 'verto.display':
        case 'verto.info':
            if (this._dialogs[message.params.callID]) {
                this._dialogs[message.params.callID].handleMessage(message);
            } else {
                logger.debug('No suitable dialogs was found', message);
            }
            break;
        case 'verto.punt': // its like UA termination trigger
            this.purge();
            this.logout();
            break;
        case 'verto.clientReady': // UA is ready. Due an auth for example
            if (this._callbacks.onMessage) {
                this._callbacks.onMessage(this, null, this.MESSAGE.CLIENTREADY, message.params);
            }
            logger.debug('handleMessage: Client is ready.', message.params);
            break;
        case 'verto.event': // common event
            logger.info('handleMessage: verto.event:', message);
            break;
        default:
            logger.error('handleMessage: unknown event:', message);
        }
    }

    /**
     * Remove dialog from collection.
     * Fired from dialog
     *
     * @param {String} callID - Call ID
     */

    deleteDialog(callID) {
        const logger = this._logger.method(`deleteDialog`, this.options.debug);
        logger.debug(callID);
        delete this._dialogs[callID];
    }

    //Check and get devices
    refreshDevices() {

    }

    get Devices() {}
}

export { CVerto };