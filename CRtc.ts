class CRtc {
    private _audioEnabled: boolean = true;
    private _videoEnabled: boolean = true;
    private _mediaData: { SDP: number; profile: { [key: string]: any }; candidateList: Array<any> };
    private _options: { [key: string]: any };
    private _constraints: { offerToReceiveAudio: boolean; offerToReceiveVideo: boolean };

    /**
     * Create RTC
     */

    constructor(options: { [key: string]: any }) {
        this._options = {
            verto:       NaN,
            useVideo:    NaN,
            useStereo:   false,
            userData:    NaN,
            localVideo:  NaN,
            screenShare: false,
            useCamera:   'any',
            iceServers:  false,
            videoParams: {},
            audioParams: {},
            callbacks: {
                onICEComplete: () => {},
                onICE:         () => {},
                onOfferSDP:    () => {}
            },
            ...options
        };

        this._mediaData = {
            SDP:           NaN,
            profile:       {},
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
}

export { CRtc };
