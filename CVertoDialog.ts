/**
 * 2019
 *
 * Contributor(s):
 *
 * Anatoly Yuzefovich <iskhartakh@gmail.com>
 *
 * A module Verto Dialog class
 *
 * @module CVertoDialog
 */

import { CLogger }       from './CLogger';
import { CRtc }          from './CRtc';
import { CRtcCallbacks } from './CRtcCallbacks';
import { genUuid }       from './Helpers';
import { CVerto }        from './CVerto';

/** Class representation a Verto Dialog */

class CVertoDialog {
    private _params: { [key: string]: any };

    /**
     * CVertoDialog class constructor
     *
     * @constructor
     * @param {String} direction - Call direction
     * @param {CVerto} verto - CVerto object
     * @param {Object} message - Verto event message
     */

    constructor(direction: string, verto: CVerto, message: { [key: string]: any }) {
        this._params = {
            useVideo:       message.params.sdp && message.params.sdp.indexOf('m=video') > 0,
            useStereo:      message.params.sdp && message.params.sdp.indexOf('stereo=1') > 0,
            screenShare:    false,
            useCamera:      false,
            useMic:         verto.options.deviceParams.useMic,
            useSpeak:       verto.options.deviceParams.useSpeak,
            login:          verto.options.login,
            videoParams:    verto.options.videoParams,
            debug:          verto.options.debug,
            ...message.params
        };

        if (!this._params.screenShare) {
            this._params.useCamera = verto.options.deviceParams.useCamera;
        }

        this._verto       = verto;
        this._direction   = direction;
        this._lastState   = this._verto.STATE.NEW;
        this._state       = this._lastState;
        this._callbacks   = this._verto.callbacks;
        this._answered    = false;
        this._attach      = Boolean(message.params.attach);
        this._screenShare = Boolean(message.params.screenShare);
        this._useCamera   = this._params.useCamera;
        this._useMic      = this._params.useMic;
        this._useSpeak    = this._params.useSpeak;

        this._callID = this._params.callID || genUuid();

        if (typeof this._verto.options.logger === 'object') {
            this._logger = this._verto.options.logger;
        } else {
            this._logger = new CLogger(`${this._callID} CVertoDialog`);
        }

        this._logger.debug('New call');

        if (this._verto.options.tag) {
            this._audioStream = document.getElementById(this._verto.options.tag);
            if (this._params.useVideo) {
                this._videoStream = this._audioStream;
            }
        } else {
            this._logger.error(new Error('"tag" param missed'));
        }

        if (this._params.localTag) {
            this._localVideo = document.getElementById(this._params.localTag);
        }

        if (this._direction === this._verto.DIRECTION.INBOUND) {
            if (this._params.display_direction === 'outbound') {
                this._params.remote_caller_id_name = this._params.caller_id_name || 'Nobody';
                this._params.remote_caller_id_number = this._params.caller_id_number || 'Unknown';
            } else {
                this._params.remote_caller_id_name = this._params.callee_id_name || 'Nobody';
                this._params.remote_caller_id_number = this._params.callee_id_number || 'Unknown';
            }
        } else {
            this._params.remote_caller_id_name = 'Outbound Call';
            this._params.remote_caller_id_number = this._params.destination_number;
        }

        this._rtc = new CRtc({
            verto:       this._verto,
            callbacks:   new CRtcCallbacks(this),
            localVideo:  this._screenShare ? null : this.localVideo,
            useVideo:    this._params.useVideo ? this.videoStream : null,
            useAudio:    this._audioStream,
            useStereo:   this._params.useStereo,
            videoParams: this._params.videoParams,
            audioParams: this._verto.options.audioParams,
            iceServers:  this._verto.options.iceServers,
            screenShare: this._screenShare,
            useCamera:   this._useCamera,
            useMic:      this._useMic,
            useSpeak:    this._useSpeak
        });

        if (this._direction === this._verto.DIRECTION.INBOUND) {
            if (this._attach) {
                this.answer();
            } else {
                this.ring();
            }
        }
    }

    /**
     * CVerto object
     */

    get callId() {
        return this._callId;
    }

    /**
     * CVerto object
     */

    get verto() {
        return this._verto;
    }

    /**
     * Attach flag
     */

    get attach() {
        return this._attach;
    }

    /**
     * Call state
     */

    get state() {
        return this._state;
    }

    /**
     * CRtc object
     */

    get rtc() {
        return this._rtc;
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
        switch (message.method) {
        case 'verto.bye':
            this.hangup(message.params);
            break;
        case 'verto.answer':
            this.handleAnswer(message.params);
            break;
        case 'verto.media':
            this.handleMedia(message.params);
            break;
        case 'verto.display':
            this.handleDisplay(message.params);
            break;
        case 'verto.info':
            this.handleInfo(message.params);
            break;
        default:
            logger.warn('Unknown event', message);
        }
    }

    /**
     * Json RPC Call
     *
     * @param {String} method - RPC Method
     * @param {Object} params - RPC Method params
     */

    sendMethod(method, options) {
        const logger = this._logger.method('sendMethod');
        const params = { ...options };

        params.dialogParams = { ...params.dialogParams, callID: this._callID };

        this._verto.rpcClient.call(method, params, () => {
            logger.debug('success');
        }, (err) => {
            logger.error(new Error((err && err.stack) || err));
        });
    }

    /**
     * Hangup
     *
     * @param {Object} params - Hangup params
     */

    hangup(params = {}) {
        const logger = this._logger.method('hangup');
        logger.debug(params);

        this._causeCode = params.causeCode;
        this._cause = params.cause;

        if (!this._cause && !this._causeCode) {
            this._cause = 'NORMAL_CLEARING';
        }

        if (this._state >= this._verto.STATE.NEW && this._state < this._verto.STATE.HANGUP) {
            this.setState(this._verto.STATE.HANGUP);
        } else if (this._state < this._verto.STATE.DESTROY) {
            this.setState(this._verto.STATE.DESTROY);
        }
    }

    /**
     * Answer
     */

    answer(data) {
        const logger = this._logger.method('answer');
        logger.debug(data);
        const params = { ...data };

        if (this._answered) {
            return;
        }

        params.sdp = this._params.sdp;

        if (params.useVideo) {
            logger.debug('answer Video request received');
        }

        this._params.callee_id_name = params.callee_id_name;
        this._params.callee_id_number = params.callee_id_number;

        this._useCamera = params.useCamera || 'any';
        this._useMic = params.useMic || 'any';
        this._useSpeak = params.useSpeak || 'any';

        //this.rtc.createAnswer(params);
        this._answered = true;
    }

    /**
     * Ring
     */

    ring() {
        const logger = this._logger.method('ring');
        logger.debug('fired');
        this.setState(this._verto.STATE.RINGING);
    }

    /**
     * Set dialog state
     * @param {Integer} state - Dialog state code
     */

    setState(state) {
        const logger = this._logger.method('setState');
        logger.debug(state);
        this._lastState = this._state;
        this._state = state;

        if (this._callbacks.onDialogState) {
            this._callbacks.onDialogState(this);
        }

        switch(this._state) {
        case this._verto.STATE.HANGUP:
            logger.debug('hangup state switch', this._lastState, this._verto.STATE.REQUESTING, this._lastState, this._verto.STATE.HANGUP);
            if (this._lastState > this._verto.STATE.REQUESTING && this._lastState < this._verto.STATE.HANGUP) {
                this.sendMethod('verto.bye', {});
            }
            this.setState(this._verto.STATE.DESTROY);
            break;
        case this._verto.STATE.DESTROY:
            this._verto.deleteDialog(this._callID);
            if (this._params.screenShare) {
                this.rtc.stopPeer();
            } else {
                //this.rtc.stop();
            }
            break;
        default:
            logger.debug('unhandled state', this._state);
        }
    }

}

export { CVertoDialog };
