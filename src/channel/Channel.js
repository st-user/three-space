import Logger from '../utils/Logger.js';

const ENDPOINT_PORT = location.port;


const WS_SCHEME = location.protocol.indexOf('https') < 0 ? 'ws' : 'wss';
const HOST_NAME = location.hostname;
const ENDPOINT_URL = `${location.protocol}//${HOST_NAME}:${ENDPOINT_PORT}`;
const WS_ENDPOINT_URL = `${WS_SCHEME}://${HOST_NAME}:${ENDPOINT_PORT}`;
const PATH_PRTICIPANTS_MANAGEMENT = '/manage';

let channelCount = 0;
export default class Channel {

    #path;
    #websocket;
    #signalingMessageHandler;

    #channelIndex;

    #handlers;

    static forParticipantsManagement(query) {
        return new Channel(PATH_PRTICIPANTS_MANAGEMENT, query);
    }

    static toStaticContentsUrl(path) {
        return `${path}?q=${window.APP_VERSION}`;
    }

    static toEndpointUrl(path) {
        return ENDPOINT_URL + path;
    }

    constructor(path, query) {
        // TODO socket.io
        this.#path = path;
        this.#handlers = new Map();
        this.resetSocket(query);
    }

    resetSocket(query) {

        const queryString = Object.entries(query).map(entry => {
            return `${entry[0]}=${entry[1]}`;
        }).join('&');

        this.#websocket = new WebSocket(`${WS_ENDPOINT_URL}${this.#path}?${queryString}`);

        const doHandlers = (eventName, event) => {
            const hs = this.#handlers.get(eventName);
            if (hs) {
                for (const h of hs) {
                    h.call(this.#websocket, event);
                }
            }
        };

        this.#websocket.onopen = event => doHandlers('open', event);
        this.#websocket.onmessage = event => doHandlers('message', event);
        this.#websocket.onclose = event => doHandlers('close', event);
        this.#setHandler('message', event => {
            if (this.#signalingMessageHandler) {
                this.#signalingMessageHandler(event);
            }
        });

        this.#channelIndex = channelCount;
        channelCount++;
    }

    send(message) {
        Logger.trace(`Channel ${this.#channelIndex}`);
        Logger.trace(message);
        this.#websocket.send(JSON.stringify(message));
    }

    sendSignalingMessage(message) {
        Logger.trace(`Channel ${this.#channelIndex}`);
        Logger.trace(message);
        message.webRtcSignaling = true;
        this.#websocket.send(JSON.stringify(message));
    }

    onopen(handler) {
        this.#setHandler('open', () => {
            Logger.trace(`Channel open ${this.#channelIndex}`);
            handler();
        });
    }

    onclose(handler) {
        this.#setHandler('close', () => {
            Logger.trace(`Channel close ${this.#channelIndex}`);
            handler();
        });
    }

    onmessage(handler) {
        this.#setHandler('message', event => {
            const messageObj = JSON.parse(event.data);
            Logger.trace(`Channel message ${this.#channelIndex}`);
            if (!messageObj.webRtcSignaling) {
                Logger.trace(messageObj);
                handler(messageObj);
            }
        });
    }

    onSignalingMessage(handler) {

        if (this.#signalingMessageHandler) {
            throw `Duplicate signling message handler. ${handler}`;
        }

        this.#signalingMessageHandler = event => {
            const messageObj = JSON.parse(event.data);
            if (!messageObj.webRtcSignaling) {
                return;
            }
            Logger.trace(messageObj);
            handler(messageObj);
        };
    }

    removeSignalingMessageHandler() {
        this.#signalingMessageHandler = undefined;
    }

    #setHandler(eventName, handler) {
        let hs = this.#handlers.get(eventName);
        if (!hs) {
            hs = [];
            this.#handlers.set(eventName, hs);
        }
        hs.push(handler);
    }
}
