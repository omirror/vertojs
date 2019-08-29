var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var CRtc = /** @class */ (function () {
    /**
     * Create RTC
     */
    function CRtc(options) {
        this._audioEnabled = true;
        this._videoEnabled = true;
        this._options = __assign({ verto: NaN, useVideo: NaN, useStereo: false, userData: NaN, localVideo: NaN, screenShare: false, useCamera: 'any', iceServers: false, videoParams: {}, audioParams: {}, callbacks: {
                onICEComplete: function () { },
                onICE: function () { },
                onOfferSDP: function () { }
            } }, options);
        this._mediaData = {
            SDP: NaN,
            profile: {},
            candidateList: []
        };
        this._constraints = {
            offerToReceiveAudio: this._options.useSpeak === 'none',
            offerToReceiveVideo: Boolean(this._options.useVideo)
        };
        if (this._options.useVideo && typeof this._options.useVideo.style === 'object') {
            this._options.useVideo.style.display = 'none';
        }
    }
    return CRtc;
}());
export { CRtc };
//# sourceMappingURL=CRtc.js.map