'use strict';

class CRtcCallbacks {

    /**
     * Create RTC Callbacks
     */

    constructor(dialog) {
        this.verto = dialog.verto;
        this.dialog = dialog;

        if (typeof this.verto.options.logger === 'object') {
            this.logger = this.verto.options.logger;
        } else {
            this.logger = {
                debug: this.verto.options.debug ? (...args) => console.debug(this.callID, this.constructor.name, ...args) : () => {},
                info:  (...args) => console.log(this.callID, this.constructor.name, ...args),
                error: (err) => console.error(`${this.callID} ${this.constructor.name} ${this.verto.options.debug ? err.stack : err.message}`)
            };
        }
    }

    onMessage(rtc, msg) {
        this.logger.debug(msg);
    }

    onAnswerSDP(rtc, sdp) {
        this.logger.error(new Error(`Answer sdp [${sdp}]`));
    }

    onICESDP(rtc) {
        this.logger.debug('RECV ' + rtc.type + ' SDP', rtc.mediaData.SDP);

        if (this.dialog.state === this.verto.enum.state.requesting ||
            this.dialog.state === this.verto.enum.state.answering ||
            this.dialog.state === this.verto.enum.state.active) {
            location.reload();
            return;
        }

        if (rtc.type == 'offer') {
            if (this.dialog.state === this.verto.enum.state.active) {
                this.dialog.setState(this.verto.enum.state.requesting);
                this.dialog.sendMethod('verto.attach', {
                    sdp: rtc.mediaData.SDP
                });
            } else {
                this.dialog.setState(this.verto.enum.state.requesting);

                this.dialog.sendMethod('verto.invite', {
                    sdp: rtc.mediaData.SDP
                });
            }
        } else { //answer
            this.dialog.setState(this.verto.enum.state.answering);

            this.dialog.sendMethod(this.dialog.attach ? 'verto.attach' : 'verto.answer', {
                sdp: this.dialog.rtc.mediaData.SDP
            });
        }
    }

    onICE(rtc) {
        if (rtc.type === 'offer') {
            this.logger.debug('offer candidate', rtc.mediaData.candidate);
        }
    }

    onStream(rtc, stream) {
        if (this.verto.options.permissionCallback &&
            typeof this.verto.options.permissionCallback.onGranted === 'function'){
            this.verto.options.permissionCallback.onGranted(stream);
        }
        this.logger.debug('stream started');
    }

    onError(err) {
        if (this.verto.options.permissionCallback &&
            typeof this.verto.options.permissionCallback.onDenied === 'function'){
            this.verto.options.permissionCallback.onDenied();
        }
        this.logger.error(new Error((err && err.stack) || err));
        this.dialog.hangup({ cause: 'Device or Permission Error' });
    }

}

export { CRtcCallbacks };