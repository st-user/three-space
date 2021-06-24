import Logger from '../utils/Logger.js';
import { CustomEventNames } from '../utils/CustomEventNames.js';
import CommonEventDispatcher from '../utils/CommonEventDispatcher.js';
import PannerHandler from './PannerHandler.js';
import VoiceSignalEmitter from './VoiceSignalEmitter.js';


const FILE_TRANSFER_DATA_CHANNEL_ID = 10;

export default class RTCConnection {

    #myClientId;
    #remoteClientId;
    #iceServers;

    #signalingChannel;
    #remoteAudioContextHolder;
    #currentGainValue;

    #gainNode;
    #pannerHandler;
    #voiceSignalEmitter;

    #peerConnection;

    #fileTransferDataChannel;
    #realTimeDataChannel;
    #remoteStream;

    #realTimeDataMessageHandlers;
    #fileTransferMessageHandlers;

    constructor(myClientId, remoteClientId, iceServerInfo, signalingChannel, remoteAudioContextHolder) {
        this.#myClientId = myClientId;
        this.#remoteClientId = remoteClientId;
        this.#signalingChannel = signalingChannel;
        this.#remoteAudioContextHolder = remoteAudioContextHolder;
        this.#realTimeDataMessageHandlers = [];
        this.#fileTransferMessageHandlers = [];

        if (iceServerInfo) {
            this.#iceServers = iceServerInfo.iceServers;
        }
    }

    initConnection(localAudio, remoteAudioGainValue) {
        this.#currentGainValue = remoteAudioGainValue;

        this.#peerConnection = new RTCPeerConnection({
            iceServers: this.#iceServers
        });
        this.#peerConnection.addEventListener('icecandidate', event => {
            if (event.candidate) {
                this.#signalingChannel.sendSignalingMessage({
                    messageType: 'icecandidate',
                    from: this.#myClientId,
                    to: this.#remoteClientId,
                    rtcIceCandidateInit: event.candidate.toJSON()
                });
            }
        });

        this.#peerConnection.addEventListener('addstream', async event => {
            this.#peerConnection.getReceivers().forEach(r => {

                r.track.onunmute = () => {

                    const remoteAuidoContext = this.#remoteAudioContextHolder.audioContext();
                    const stream = event.stream;
                    // TODO disconnectの際のGCのタイミング
                    const audio = new Audio();
                    audio.srcObject = stream;
                    const gainNode = remoteAuidoContext.createGain();
                    this.#gainNode = gainNode;
                    const panner = remoteAuidoContext.createPanner();
                    this.#pannerHandler = new PannerHandler(panner);



                    audio.onloadedmetadata = () => {
                        const source = remoteAuidoContext.createMediaStreamSource(audio.srcObject);

                        const frequencyAnalyser = remoteAuidoContext.createAnalyser();
                        this.#voiceSignalEmitter = new VoiceSignalEmitter(
                            this.#remoteClientId, frequencyAnalyser
                        );
                        source.connect(frequencyAnalyser);
                        this.#voiceSignalEmitter.observeSignal();

                        audio.play();
                        audio.muted = true;
                        source.connect(panner);
                        panner.connect(gainNode);
                        gainNode.connect(remoteAuidoContext.destination);

                    };

                    this.changeGain(this.#currentGainValue);
                };
            });

        });

        localAudio.addTracks(this.#peerConnection);
    }

    createOffer() {

        this.#realTimeDataChannel = this.#peerConnection.createDataChannel('RealTimeDataChannel');
        this.#setUpFileTransferDataChannel();

        this.#setRealTimeDataMessageHandlers();
        this.#onRealTimeDataChannelOpen();

        this.#peerConnection.createOffer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: false })
            .then(offer => {
                this.#peerConnection.setLocalDescription(offer)
                    .then(() => {
                        this.#signalingChannel.sendSignalingMessage({
                            messageType: 'offer',
                            from: this.#myClientId,
                            to: this.#remoteClientId,
                            offer: offer.toJSON()
                        });
                    });
            });
    }

    handleAnswer(answer) {
        this.#peerConnection.setRemoteDescription(
            new RTCSessionDescription(answer)
        );
    }

    handleICECandidate(rtcIceCandidateInit) {
        const candidate = new RTCIceCandidate(rtcIceCandidateInit);
        this.#peerConnection.addIceCandidate(candidate);
    }

    createAnswer(offer) {

        this.#peerConnection.ondatachannel = event => {
            this.#realTimeDataChannel = event.channel;
            this.#setRealTimeDataMessageHandlers();
            this.#onRealTimeDataChannelOpen();
        };
        this.#setUpFileTransferDataChannel();

        this.#peerConnection.setRemoteDescription(new RTCSessionDescription(offer))
            .then(() => this.#peerConnection.createAnswer())
            .then(answer => {
                this.#peerConnection.setLocalDescription(answer)
                    .then(() => {
                        this.#signalingChannel.sendSignalingMessage({
                            messageType: 'answer',
                            from: this.#myClientId,
                            to: this.#remoteClientId,
                            answer: answer.toJSON()
                        });
                    });
            });
    }

    //connectionStateが取りうる値について
    //https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/connectionState
    //https://developer.mozilla.org/ja/docs/Web/API/RTCDataChannel
    needsOffer() {
        const state = this.#peerConnection.connectionState;
        return state === 'new'
                || state === 'disconnected'
                || state === 'failed'
                || state === 'closed'
                || this.getRealTimeDataChannelState() === 'closing'
                || this.getRealTimeDataChannelState() === 'closed';
    }

    shouldDestroy() {
        return this.#peerConnection.connectionState === 'connected'
                && this.#peerConnection.iceConnectionState === 'disconnected';
    }

    getConnectionState() {
        if (!this.#peerConnection) {
            return '';
        }
        return this.#peerConnection.connectionState;
    }

    getRealTimeDataChannelState() {
        if (!this.#realTimeDataChannel) {
            return '';
        }
        return this.#realTimeDataChannel.readyState;
    }

    changeGain(value) {
        this.#currentGainValue = value;
        this.#setGainValue(this.#gainNode, value);
    }

    sendMessage(messageObj) {
        if (!this.#realTimeDataChannel || this.#realTimeDataChannel.readyState !== 'open') {
            Logger.debug('Data channel is not opened. Discards the message.');
            Logger.debug(messageObj);
            return;
        }
        try {
            this.#realTimeDataChannel.send(JSON.stringify(messageObj));
        } catch(e) {
            // TODO fall back処理
        }
    }

    //参考:
    //https://github.com/webrtc/samples/blob/gh-pages/src/content/datachannel/filetransfer/js/main.js
    startFileTransfer(vrmFile, optionMessage) {
        this.#fileTransferDataChannel.send(JSON.stringify({
            cmd: 'start',
            fileSize: vrmFile.size,
            options: optionMessage
        }));
    }

    acceptFileTransfer() {
        this.#fileTransferDataChannel.send(JSON.stringify({
            cmd: 'accept'
        }));
    }

    sendFileChunk(chunk) {
        this.#fileTransferDataChannel.send(chunk);
    }

    onmessage(handler) {
        if (!this.#realTimeDataChannel) {
            Logger.debug(`Data channel does't exit. Reserves the handler. ${this.#myClientId}`);
            this.#realTimeDataMessageHandlers.push(handler);
        } else {
            Logger.debug(`Data channel exits. Add the hander. ${this.#myClientId}`);
            this.#realTimeDataChannel.addEventListener('message', handler);
        }
    }

    onFileTransferMessage(handler) {
        if (!this.#fileTransferDataChannel) {
            Logger.debug(`File transfer channel does't exit. Reserves the handler. ${this.#myClientId}`);
            this.#fileTransferMessageHandlers.push(handler);
        } else {
            Logger.debug(`File transfer channel exits. Add the hander. ${this.#myClientId}`);
            this.#fileTransferDataChannel.addEventListener('message', handler);
        }
    }

    onIceCandidateStateChange(handler) {
        this.#peerConnection.addEventListener('iceconnectionstatechange', () => {
            Logger.debug(`ICE connection state changes. ${this.#peerConnection.iceConnectionState}`);
            handler();
        });
    }

    // TODO 何を破棄すれば、リソースが適切に開放されるのか精査
    destroy() {
        if (this.#peerConnection) {
            this.#peerConnection.close();
        }
        if (this.#gainNode) {
            this.#gainNode.disconnect();
        }
        if (this.#voiceSignalEmitter) {
            this.#voiceSignalEmitter.destroy();
        }
    }

    setPannerState(obj, firstPersonObject) {
        if (!this.#pannerHandler) {
            return;
        }
        this.#pannerHandler.setPannerState(obj, firstPersonObject);
    }

    #setUpFileTransferDataChannel() {
        //参考:
        // https://stackoverflow.com/questions/43788872/how-are-data-channels-negotiated-between-two-peers-with-webrtc
        this.#fileTransferDataChannel = this.#peerConnection.createDataChannel('FileTransferDataChannel', {
            negotiated: true, id: FILE_TRANSFER_DATA_CHANNEL_ID
        });
        this.#fileTransferDataChannel.onopen = () => {
            CommonEventDispatcher.dispatch(
                CustomEventNames.THREE_SPACE__FILE_TRANSFER_DATA_CHANNEL_CONNECTION_ESTABLISHED,
                {
                    clientId: this.#remoteClientId
                }
            );
        };
        this.#setFileTransferMessageHandlers();
    }

    #onRealTimeDataChannelOpen() {
        this.#realTimeDataChannel.onopen = () => {
            CommonEventDispatcher.dispatch(
                CustomEventNames.THREE_SPACE__REAL_TIME_DATA_CHANNEL_CONNECTION_ESTABLISHED,
                {
                    clientId: this.#remoteClientId
                }
            );
        };
    }

    #setRealTimeDataMessageHandlers() {
        while(0 < this.#realTimeDataMessageHandlers.length) {
            Logger.debug(`Add the reserved handlers. ${this.#myClientId}`);
            const handler = this.#realTimeDataMessageHandlers.shift();
            this.#realTimeDataChannel.addEventListener('message', event => {
                handler(this.#remoteClientId, JSON.parse(event.data));
            });
        }
    }

    #setFileTransferMessageHandlers() {
        while(0 < this.#fileTransferMessageHandlers.length) {
            Logger.debug(`Add the reserved handlers. ${this.#myClientId}`);
            const handler = this.#fileTransferMessageHandlers.shift();
            this.#fileTransferDataChannel.addEventListener('message', event => {
                handler(this.#remoteClientId, event.data);
            });
        }
    }


    #setGainValue(gainNode, value) {
        if (!gainNode) {
            return;
        }
        gainNode.gain.value = value / 100;
    }
}
