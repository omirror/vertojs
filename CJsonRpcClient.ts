/**
 * 2018
 *
 * Contributor(s):
 *
 * Anatoly Yuzefovich <iskhartakh@gmail.com>
 *
 * A module JSON-RPC Client lib
 *
 * @module CJsonRpcClient
 */

import { CLogger } from './CLogger';

/** Class representation a JSON RPC Client */

class CJsonRpcClient {
    private _options: { [key: string]: any };
    private _logger: CLogger;
    private _socket: any;
    private _queue: Array<string> = [];
    private _current_id: number = 1;        // the id to match request/response
    private _ws_callbacks: { [key: string]: any } = {};
    private _socketRetryCount: number = 0;
    private _socketRetryTimeout: number = 1000;
    private socketRetrying: any;

    /**
     * CJsonRpcClient class constructor
     *
     * @constructor
     * @param {Object} options - Options object
     */

    constructor(options: { [key: string]: any }) {
        this._options = Object.freeze({
            socketUrl:     NaN,
            onMessage:     NaN,           // Not requested response callback
            login:         NaN,
            passwd:        NaN,
            sessid:        NaN,
            loginParams:   NaN,
            userVariables: NaN,
            debug:         false,
            ...options
        });

        if (typeof this._options.logger === 'object') {
            this._logger = this._options.logger;
        } else {
            this._logger = new CLogger(`${this._options.sessid} CJsonRpcClient`, this._options.debug);
        }



        this._socket = this.socket;         // init connection
    }

    /**
     * Getter method for websocket
     *
     * @method socket
     * @return {Object} socket - A WebSocket object
     */

    get socket() {
        if (this._socket)
            return this._socket;

        if (this.socketRetrying) {
            clearTimeout(this.socketRetrying);
            this.socketRetrying = NaN;
        }

        this._socket           = new WebSocket(this._options.socketUrl);
        this._socket.onmessage = (event: any) => this._onWSMessage(event);
        this._socket.onopen    = () => this._onWSConnect();
        this._socket.onclose   = () => this._onWSClose();
        this._socket.onerror   = (event: any) => this._onWSError(event);

        return this._socket;
    }

    /**
     * Call verto method (response required, use notify othewise)
     *
     * @method call
     * @param {string}   method     - The method to run on JSON-RPC server.
     * @param {Object}   params     - The params object.
     * @param {function} success_cb - A callback for successful request.
     * @param {function} error_cb   - A callback for error.
     */

    call(
        method: string,
        params      = {},
        success_cb  = (e: any) => console.debug('CJsonRpcClient::call:success_cb: ', e),
        error_cb    = (e: any) => console.debug('CJsonRpcClient::call:error_cb: ', e)
    ) {
        const request = {
            jsonrpc: '2.0',
            method:  method,
            params:  params,
            id:      this._current_id++
        };
        this._wsCall(request, success_cb, error_cb);
    }

    /**
     * Notify verto method call
     *
     * @method notify
     * @param {string} method - The method to run on JSON-RPC server.
     * @param {Object} params - The params object.
     */

    notify(method: string, params: { [key: string]: any }) {
        if (this._options.sessid) {
            params.sessid = this._options.sessid;
        }

        const request = {
            jsonrpc: '2.0',
            method:  method,
            params:  params
        };

        this._wsCall(request);
    }

    /**
     * Real ws call method. Internal
     *
     * @method _wsCall
     * @param {Object}   request    - The request object.
     * @param {function} success_cb - A callback for successful request.
     * @param {function} error_cb   - A callback for error.
     */

    _wsCall(request: { [key: string]: any }, success_cb?: CallableFunction, error_cb?: CallableFunction) {
        const jsonRequest = JSON.stringify(request);

        if (this.socket.readyState != WebSocket.OPEN) {
            this._queue.push(jsonRequest);
            return;
        }

        this.socket.send(jsonRequest);

        // Setup callbacks per request. The request its Obj with 'id' field and response required
        if (request.id) {
            this._ws_callbacks[request.id] = { request: jsonRequest, requestObj: request, success_cb: success_cb, error_cb: error_cb };
        }
    }

    /**
     * OnMessage callback. Internal
     *
     * @method _onWSMessage
     * @param {Object} event - Event object
     */

    _onWSMessage(event: any) {
        const logger = this._logger.method('_onWSMessage', this._options.debug);
        logger.debug(event);
        let response;
        try {
            response = JSON.parse(event.data);
        } catch(err) {
            logger.error(err);
            return;
        }

        if (typeof response == 'object' && response.jsonrpc == '2.0' && response.id) {
            if (response.result && this._ws_callbacks[response.id]) {
                const success_cb = this._ws_callbacks[response.id].success_cb;
                delete this._ws_callbacks[response.id];
                success_cb(response.result);
                return;
            } else if(response.error && this._ws_callbacks[response.id]) {
                const error_cb = this._ws_callbacks[response.id].error_cb;
                delete this._ws_callbacks[response.id];
                error_cb(response.error);
                return;
            }
        }

        // Handler of the response with no request

        if (this._options.onMessage) {
            event.eventData = response || {};
            const reply     = this._options.onMessage(event);
            if (reply && typeof reply === 'object' && event.eventData.id) {
                const msg = {
                    jsonrpc: '2.0',
                    id:       event.eventData.id,
                    result:   reply
                };
                logger.debug('_onWSMessage: Sending Reply', msg);
                this.socket.send(JSON.stringify(msg));
            }
        }
    }

    /**
     * OnConnect callback. Internal
     *
     * @method _onWSConnect
     */

    _onWSConnect() {
        const logger = this._logger.method('_onWSConnect', this._options.debug);
        logger.debug('fired');

        this._socketRetryCount   = 0;
        this._socketRetryTimeout = 1000;

        if (this._options.onWSConnect) {
            this._options.onWSConnect(this);
        }

        if (this._queue.length) {
            logger.debug(`_onWSConnect: Sending queued requests. Queue deep ${this._queue.length}`);
        }

        // Send queued requests
        let req = this._queue.pop();
        while (req) {
            this.socket.send(req);
            req = this._queue.pop();
        }
    }

    /**
     * OnClose callback. Internal
     *
     * @method _onWSClose
     */

    _onWSClose() {
        const logger = this._logger.method('_onWSClose', this._options.debug);
        logger.debug('fired');

        this._socket = NaN;

        if (this._options.onWSClose) {
            this._options.onWSClose(this);
        }

        logger.error(new Error(`WebSocket Lost. Retry count: ${this._socketRetryCount}. Going to sleep: ${this._socketRetryTimeout} msec`));
        if (this._socketRetryTimeout < 3000 && (this._socketRetryCount % 10) == 0) {
            this._socketRetryTimeout += 1000;
        }

        this.socketRetrying = setTimeout(() => {
            logger.info('_onWSClose: WebSocket Attempting Reconnection....');
            this._socket = this.socket;
        }, this._socketRetryTimeout);

        this._socketRetryCount++;
    }

    /**
     * OnError callback. Internal
     *
     * @method _onWSError
     * @param {Object} event - Event object
     */

    _onWSError(event: any) {
        const logger = this._logger.method('_onWSError', this._options.debug);
        logger.debug(new Error(event));

        this._socket = NaN;

        if (this._options.onWSError) {
            this._options.onWSError(this, event);
        }
    }
}

export { CJsonRpcClient };
