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
                debug: verto.options.debug ? (...args) => console.debug(this.callID, ...args) : () => {},
                info:  (...args) => console.log(this.callID, ...args),
                error: (err) => console.error(`${this.callID} ${this.options.debug ? err.stack : err.message}`)
            };
        }

        if (this.params.tag) {
            this.audioStream = document.getElementById(this.params.tag);

            if (this.params.useVideo) {
                this.videoStream = this.audioStream;
            }
        } else {
            this.logger.error(new Error('CVertoDialog: "tag" param missed'));
        }

        if (this.params.localTag) {
            this.localVideo = document.getElementById(this.params.localTag);
        }
    }

}

export { CVertoDialog };