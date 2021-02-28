import Logger from '../utils/Logger.js';

const ENDPOINT_PORT = location.port;


const WS_SCHEME = location.protocol.indexOf('https') < 0 ? 'ws' : 'wss';
const HOST_NAME = location.hostname;
const ENDPOINT_URL = `${location.protocol}//${HOST_NAME}:${ENDPOINT_PORT}`;
const WS_ENDPOINT_URL = `${WS_SCHEME}://${HOST_NAME}:${ENDPOINT_PORT}`;
const PATH_PRTICIPANTS_MANAGEMENT = '/manage';

export default class Channel {

    #websocket;
    #signalingMessageHandler;

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

        const queryString = Object.entries(query).map(entry => {
            return `${entry[0]}=${entry[1]}`;
        }).join('&');

        this.#websocket = new WebSocket(`${WS_ENDPOINT_URL}${path}?${queryString}`);
    }

    send(message) {
        Logger.trace(message);
        this.#websocket.send(JSON.stringify(message));
    }

    sendSignalingMessage(message) {
        Logger.trace(message);
        message.webRtcSignaling = true;
        this.#websocket.send(JSON.stringify(message));
    }

    onopen(handler) {
        this.#websocket.addEventListener('open', () => {
            handler();
        });
    }

    onclose(handler) {
        this.#websocket.addEventListener('close', () => {
            handler();
        });
    }

    onmessage(handler) {
        this.#websocket.addEventListener('message', event => {
            const messageObj = JSON.parse(event.data);
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

        this.#websocket.addEventListener('message', this.#signalingMessageHandler);
    }

    removeSignalingMessageHandler() {
        this.#websocket.removeEventListener('message', this.#signalingMessageHandler);
        this.#signalingMessageHandler = undefined;
    }

    close() {
        this.#websocket.close();
    }
}
