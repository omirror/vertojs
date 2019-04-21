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

import { CRtc } from './CRtc.mjs';
import { CRtcCallbacks } from './CRtcCallbacks.mjs';
import { genUuid } from './Helpers.mjs';

class CVertoDialog {

    /**
     * CVertoDialog class constructor
     *
     * @constructor
     * @param {String} direction - Call direction
     * @param {CVerto} verto - CVerto object
     * @param {Object} params - Options
     */

    constructor(direction, verto, params) {
        this.params = {
            useVideo:       verto.options.useVideo,
            useStereo:      verto.options.useStereo,
            screenShare:    false,
            useCamera:      false,
            useMic:         verto.options.deviceParams.useMic,
            useSpeak:       verto.options.deviceParams.useSpeak,
            login:          verto.options.login,
            videoParams:    verto.options.videoParams,
            debug:          false,
            ...params
        };

        if (!this.params.screenShare) {
            this.params.useCamera = verto.options.deviceParams.useCamera;
        }

        this.verto       = verto;
        this.direction   = direction;
        this.lastState   = verto.enum.state.new;
        this.state       = this.lastState;
        this.callbacks   = verto.callbacks;
        this.answered    = false;
        this.attach      = params.attach      || false;
        this.screenShare = params.screenShare || false;
        this.useCamera   = this.params.useCamera;
        this.useMic      = this.params.useMic;
        this.useSpeak    = this.params.useSpeak;

        this.callID = genUuid();

        if (typeof verto.options.logger === 'object') {
            this.logger = verto.options.logger;
        } else {
            this.logger = {
                debug: verto.options.debug ? (...args) => console.debug(this.callID, this.constructor.name, ...args) : () => {},
                info:  (...args) => console.log(this.callID, this.constructor.name, ...args),
                error: (err) => console.error(`${this.callID} ${this.constructor.name} ${this.verto.options.debug ? err.stack : err.message}`)
            };
        }

        if (this.verto.options.tag) {
            this.audioStream = document.getElementById(this.verto.options.tag);
            if (this.params.useVideo) {
                this.videoStream = this.audioStream;
            }
        } else {
            this.logger.error(new Error('"tag" param missed'));
        }

        if (this.params.localTag) {
            this.localVideo = document.getElementById(this.params.localTag);
        }

        if (this.direction == verto.enum.direction.inbound) {
            if (this.params.display_direction === 'outbound') {
                this.params.remote_caller_id_name = this.params.caller_id_name;
                this.params.remote_caller_id_number = this.params.caller_id_number;
            } else {
                this.params.remote_caller_id_name = this.params.callee_id_name;
                this.params.remote_caller_id_number = this.params.callee_id_number;
            }

            if (!this.params.remote_caller_id_name) {
                this.params.remote_caller_id_name = 'Nobody';
            }

            if (!this.params.remote_caller_id_number) {
                this.params.remote_caller_id_number = 'Unknown';
            }
        } else {
            this.params.remote_caller_id_name = 'Outbound Call';
            this.params.remote_caller_id_number = this.params.destination_number;
        }

        this._rtc = new CRtc({
            verto:       this.verto,
            callbacks:   new CRtcCallbacks(this),
            localVideo:  this.screenShare ? null : this.localVideo,
            useVideo:    this.params.useVideo ? this.videoStream : null,
            useAudio:    this.audioStream,
            useStereo:   this.params.useStereo,
            videoParams: this.params.videoParams,
            audioParams: verto.options.audioParams,
            iceServers:  verto.options.iceServers,
            screenShare: this.screenShare,
            useCamera:   this.useCamera,
            useMic:      this.useMic,
            useSpeak:    this.useSpeak
        });

        if (this.direction == verto.enum.direction.inbound) {
            if (this.attach) {
                this.answer();
            } else {
                this.ring();
            }
        }
    }

    /**
     * CRtc object
     */

    get rtc() {
        return this._rtc;
    }

    /**
     * Json RPC Call
     *
     * @param {String} method - RPC Method
     * @param {Object} params - RPC Method params
     */

    /* eslint no-continue: 0 */

    sendMethod(method, options) {
        const params = { ...options };

        params.dialogParams = {};

        for (const i in this.params) {
            if (i === 'sdp' && method !== 'verto.invite' && method !== 'verto.attach') {
                continue;
            }
            params.dialogParams[i] = this.params[i];
        }
        this.verto.rpcClient.call(method, params, () => {
            this.logger.debug('sendMethod: Success');
        }, (err) => {
            this.logger.error(err);
        });
    }

    /**
     * Hangup
     *
     * @param {Object} params - Hangup params
     */

    hangup(params) {
        this.logger.debug('hangup fired');
        if (params) {
            if (params.causeCode) {
                this.causeCode = params.causeCode;
            }

            if (params.cause) {
                this.cause = params.cause;
            }
        }

        if (!this.cause && !this.causeCode) {
            this.cause = 'NORMAL_CLEARING';
        }

        if (this.state >= this.verto.enum.state.new && this.state < this.verto.enum.state.hangup) {
            this.setState(this.verto.enum.state.hangup);
        } else if (this.state < this.verto.enum.state.destroy) {
            this.setState(this.verto.enum.state.destroy);
        }
    }

    /**
     * Answer
     */

    answer(params = {}) {
        this.logger.debug('answer fired', params);
        if (this.answered) {
            return;
        }

        params.sdp = this.params.sdp;

        if (params.useVideo) {
            this.logger.debug('answer Video request received');
        }

        this.params.callee_id_name = params.callee_id_name;
        this.params.callee_id_number = params.callee_id_number;

        if (params.useCamera) {
            this.useCamera = params.useCamera;
        }

        if (params.useMic) {
            this.useMic = params.useMic;
        }

        if (params.useSpeak) {
            this.useSpeak = params.useSpeak;
        }

        //this.rtc.createAnswer(params);
        this.answered = true;
    }

    /**
     * Ring
     */

    ring() {
        this.logger.debug('ring fired. Ringing');
        this.setState(this.verto.enum.state.ringing);
    }

    /**
     * Set dialog state
     * @param {Integer} state - Dialog state code
     */

    setState(state) {
        this.logger.debug('setState', state);
        this.lastState = this.state;
        this.state = state;

        if (this.callbacks.onDialogState) {
            this.callbacks.onDialogState(this);
        }

        switch(this.state) {
        case this.verto.enum.state.hangup:
            this.logger.debug('hangup state switch', this.lastState, this.verto.enum.state.requesting, this.lastState, this.verto.enum.state.hangup);
            if (this.lastState > this.verto.enum.state.requesting && this.lastState < this.verto.enum.state.hangup) {
                this.sendMethod('verto.bye', {});
            }
            this.setState(this.verto.enum.state.destroy);
            break;
        default:
            this.logger.debug('setState default', this.state);
        }
    }

}

export { CVertoDialog };