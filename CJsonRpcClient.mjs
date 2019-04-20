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

class CJsonRpcClient {

    /**
     * CJsonRpcClient class constructor
     *
     * @constructor
     * @param {Object} options - Options object
     */

    constructor(options) {
        this.options = Object.freeze({
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

        if (typeof this.options.logger === 'object') {
            this.logger = this.options.logger;
        } else {
            this.logger = {
                debug: this.options.debug ? (...args) => console.debug(this.options.sessid, ...args) : () => {},
                info:  (...args) => console.log(this.options.sessid, ...args),
                error: (err) => console.error(`${this.options.sessid}: ${this.options.debug ? err.stack : err.message}`)
            };
        }
        this.m_socket           = NaN;
        this.queue              = [];
        this._current_id        = 1;        // the id to match request/response
        this._ws_callbacks      = {};
        this.socketRetryCount   = 0;
        this.socketRetryTimeout = 1000;

        this.socket;                        // init connection
    }

    /**
     * Getter method for websocket
     *
     * @method socket
     * @return {Object} socket - A WebSocket object
     */

    get socket() {
        if (this.m_socket)
            return this.m_socket;

        if (this.socketRetrying) {
            clearTimeout(this.socketRetrying);
            this.socketRetrying = NaN;
        }

        this.m_socket           = new WebSocket(this.options.socketUrl);
        this.m_socket.onmessage = (event) => this._onWSMessage(event);
        this.m_socket.onopen    = (event) => this._onWSConnect(event);
        this.m_socket.onclose   = (event) => this._onWSClose(event);
        this.m_socket.onerror   = (event) => this._onWSError(event);

        return this.m_socket;
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
        method,
        params      = {},
        success_cb  = (e) => console.debug('CJsonRpcClient::call:success_cb: ', e),
        error_cb    = (e) => console.debug('CJsonRpcClient::call:error_cb: ', e)
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
     * @param {string}   method - The method to run on JSON-RPC server.
     * @param {Object}   params - The params object.
     */

    notify(method, params) {
        if (this.options.sessid) {
            params.sessid = this.options.sessid;
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

    _wsCall(request, success_cb, error_cb) {
        const jsonRequest = JSON.stringify(request);

        if (this.socket.readyState != WebSocket.OPEN) {
            this.queue.push(jsonRequest);
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

    _onWSMessage(event) {
        this.logger.debug('CJsonRpcClient::_onWSMessage', event);
        let response;
        try {
            response = JSON.parse(event.data);
        } catch(err) {
            this.logger.error(err);
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
        if (this.options.onMessage) {
            event.eventData = response || {};
            const reply     = this.options.onMessage(event);
            if (reply && typeof reply === 'object' && event.eventData.id) {
                const msg = {
                    jsonrpc: '2.0',
                    id:       event.eventData.id,
                    result:   reply
                };
                this.logger.debug('CJsonRpcClient::_onWSMessage: Sending Reply', msg);
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
        this.logger.debug('CJsonRpcClient::_onWSConnect');

        this.socketRetryCount   = 0;
        this.socketRetryTimeout = 1000;

        if (this.options.onWSConnect) {
            this.options.onWSConnect(this);
        }

        if (this.queue.length) {
            this.logger.debug(`CJsonRpcClient::_onWSConnect: Sending queued requests. Queue deep ${this.queue.length}`);
        }

        // Send queued requests
        let req = this.queue.pop();
        while (req) {
            this.socket.send(req);
            req = this.queue.pop();
        }
    }

    /**
     * OnClose callback. Internal
     *
     * @method _onWSClose
     */

    _onWSClose() {
        this.logger.debug('CJsonRpcClient::_onWSClose');

        this.m_socket = NaN;

        if (this.options.onWSClose) {
            this.options.onWSClose(this);
        }

        this.logger.error(new Error(`WebSocket Lost. Retry count:  ${this.socketRetryCount}. Going to sleep: ${this.socketRetryTimeout} msec`));
        if (this.socketRetryTimeout < 3000 && (this.socketRetryCount % 10) == 0) {
            this.socketRetryTimeout += 1000;
        }

        this.socketRetrying = setTimeout(() => {
            this.logger.info('CJsonRpcClient::_onWSClose: WebSocket Attempting Reconnection....');
            this.socket;
        }, this.socketRetryTimeout);

        this.socketRetryCount++;
    }

    /**
     * OnError callback. Internal
     *
     * @method _onWSError
     * @param {Object} event - Event object
     */

    _onWSError(event) {
        this.logger.debug('CJsonRpcClient::_onWSError', event);

        this.m_socket = NaN;

        if (this.options.onWSError) {
            this.options.onWSError(this, event);
        }
    }
}

export { CJsonRpcClient };