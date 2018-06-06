/**
 * 2018
 *
 * Contributor(s):
 *
 * Anatoly Yuzefovich <iskhartakh@gmail.com>
 *
 * A module Verto Dialog class
 *
 * @module CVertoDialog
 */
class CVertoDialog {
    /**
     * CVertoDialog class constructor
     *
     * @constructor
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
            ...params };

        if (!this.params.screenShare) {
            this.params.useCamera = verto.options.deviceParams.useCamera;
        }

        this.verto       = verto;
        this.direction   = direction;
        this.lastState   = null;
        this.state       = this.lastState = verto.enum.state.new;
        this.callbacks   = verto.callbacks;
        this.answered    = false;
        this.attach      = params.attach      || false;
        this.screenShare = params.screenShare || false;
        this.useCamera   = this.params.useCamera;
        this.useMic      = this.params.useMic;
        this.useSpeak    = this.params.useSpeak;
    }

}

export { CVertoDialog };