/**
 * 2019
 *
 * Contributor(s):
 *
 * Anatoly Yuzefovich <iskhartakh@gmail.com>
 *
 * A module RTC Callbacks
 *
 * @module CRtcCallbacks
 */

import { CLogger }      from './CLogger';
import { CVertoDialog } from './CVertoDialog';
import { CVerto }       from './CVerto';

/** Class representation a RTC Callbacks */

class CRtcCallbacks {
    private _verto: CVerto;
    private _dialog: CVertoDialog;
    private _logger: CLogger;

    /**
     * Create RTC Callbacks
     */

    constructor(dialog: CVertoDialog) {
        this._verto = dialog.verto;
        this._dialog = dialog;

        if (typeof this._verto.options.logger === 'object') {
            this._logger = this._verto.options.logger;
        } else {
            this._logger = new CLogger(`${this._dialog.callId} CRtcCallbacks`, this._verto.options.debug);
        }
    }

    onMessage(rtc, msg) {
        const logger = this._logger.method('onMessage', this._verto.options.debug);
        logger.debug(msg);
    }

    onAnswerSDP(rtc, sdp) {
        const logger = this._logger.method('onAnswerSDP', this._verto.options.debug);
        logger.error(new Error(`Answer sdp [${sdp}]`));
    }

    onICESDP(rtc) {
        const logger = this._logger.method('onICESDP', this._verto.options.debug);
        logger.debug('RECV ' + rtc.type + ' SDP', rtc.mediaData.SDP);

        if (this._dialog.state === this._verto.STATE.REQUESTING ||
            this._dialog.state === this._verto.STATE.ANSWERING ||
            this._dialog.state === this._verto.STATE.ACTIVE) {
            location.reload();
            return;
        }

        if (rtc.type === 'offer') {
            if (this._dialog.state === this._verto.STATE.ACTIVE) {
                this._dialog.setState(this._verto.STATE.REQUESTING);
                this._dialog.sendMethod('verto.attach', {
                    sdp: rtc.mediaData.SDP
                });
            } else {
                this._dialog.setState(this._verto.STATE.REQUESTING);

                this._dialog.sendMethod('verto.invite', {
                    sdp: rtc.mediaData.SDP
                });
            }
        } else { //answer
            this._dialog.setState(this._verto.STATE.ANSWERING);

            this._dialog.sendMethod(this._dialog.attach ? 'verto.attach' : 'verto.answer', {
                sdp: this._dialog.rtc.mediaData.SDP
            });
        }
    }

    onICE(rtc) {
        const logger = this._logger.method('onICE', this._verto.options.debug);
        logger.debug('onICE');
        if (rtc.type === 'offer') {
            logger.debug('offer candidate', rtc.mediaData.candidate);
        }
    }

    onStream(rtc, stream) {
        const logger = this._logger.method('onStream', this._verto.options.debug);
        logger.debug('onStream');
        if (this._verto.options.permissionCallback &&
            typeof this._verto.options.permissionCallback.onGranted === 'function'){
            this._verto.options.permissionCallback.onGranted(stream);
        }
        logger.debug('stream started');
    }

    onError(err) {
        const logger = this._logger.method('onError', this._verto.options.debug);
        logger.debug('onError');
        if (this._verto.options.permissionCallback &&
            typeof this._verto.options.permissionCallback.onDenied === 'function'){
            this._verto.options.permissionCallback.onDenied();
        }
        logger.error(new Error((err && err.stack) || err));
        this._dialog.hangup({ cause: 'Device or Permission Error' });
    }

}

export { CRtcCallbacks };
