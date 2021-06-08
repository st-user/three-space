import { CustomEventNames } from '../utils/CustomEventNames.js';
import AudioContextHolder from '../utils/AudioContextHolder.js';
import CommonEventDispatcher from '../utils/CommonEventDispatcher.js';
import FileReceiver from './FileReceiver.js';
import FileTransferer from './FileTransferer.js';
import JobManager from '../utils/JobManager.js';
import LocalAudio from './LocalAudio.js';
import Logger from '../utils/Logger.js';
import RTCConnection from './RTCConnection.js';

const CONNECTION_CHECK_INTERVAL_MILLIS = 3000;
const CONNECTION_CHECK_JOB_NAME = 'RTCConnectionCheck';

export default class RTCHandler {

    #remoteAudioContextHolder;
    #rtcConnectionByClientId;
    #localAudio;
    #remoteAudioGainValue;

    #vrmToSend;

    #participants;
    #signalingChannel;

    constructor() {
        this.#remoteAudioContextHolder = new AudioContextHolder();
        this.#rtcConnectionByClientId = new Map();
        this.#localAudio = new LocalAudio();
        this.#remoteAudioGainValue = 100;
    }

    async readyConnection(participants, vrmToSend) {
        this.#participants = participants;
        const signalingChannel = participants.getChannel();
        this.#signalingChannel = signalingChannel;

        await this.#localAudio.init();
        signalingChannel.onSignalingMessage(async messageObj => {

            const fromClientId = messageObj.from;

            if (messageObj.messageType === 'offer') {
                this.#handleOffer(fromClientId, messageObj.offer);
            }

            if (messageObj.messageType === 'answer') {
                this.#handleAnswer(
                    fromClientId, messageObj.answer
                );
            }

            if (messageObj.messageType === 'icecandidate') {
                this.#handleICECandidate(
                    fromClientId, messageObj.rtcIceCandidateInit
                );
            }
        });

        this.#vrmToSend = vrmToSend;

        JobManager.registerJob(CONNECTION_CHECK_JOB_NAME, () => {
            const theOtherClientIds = participants.getTheOtherClientIds();
            theOtherClientIds.forEach(remoteClientId => {

                // TODO newが継続しているケースでofferが出続けることを抑止する
                const rtcConnection = this.#newConnectionIfClientUnavailable(remoteClientId);
                if (!rtcConnection.needsOffer()) {
                    return;
                }

                rtcConnection.createOffer();
            });

        }, CONNECTION_CHECK_INTERVAL_MILLIS);

    }

    playTestSpeech(localAudioGainValue) {
        return this.#localAudio.playTestSpeech(localAudioGainValue);
    }

    changeLocalAudioGain(gainValue) {
        this.#localAudio.changeGain(gainValue);
    }

    changeRemoteAudioGain(gainValue) {
        this.#remoteAudioGainValue = gainValue;
        this.#rtcConnectionByClientId.forEach(conn => {
            conn.changeGain(gainValue);
        });
    }

    destroy() {
        this.#rtcConnectionByClientId.forEach(conn => conn.destroy());
        this.#rtcConnectionByClientId.clear();
        this.#localAudio.destroy();
        JobManager.stopJob(CONNECTION_CHECK_JOB_NAME);
        this.#signalingChannel.removeSignalingMessageHandler();
    }

    getStatusDesc(clientId) {
        const conn = this.#rtcConnectionByClientId.get(clientId);
        if (!conn) {
            return '';
        }
        return `${conn.getConnectionState()}/${conn.getRealTimeDataChannelState()}`;
    }

    sendMessage(remoteClientId, messageObj) {
        const rtcConnection = this.#rtcConnectionByClientId.get(remoteClientId);
        if (!rtcConnection) {
            Logger.debug(`Discards thie message because connection does't exit. ${remoteClientId}`);
            Logger.debug(messageObj);
            return;
        }
        rtcConnection.sendMessage(messageObj);
    }

    startFileTransfer(remoteClientId, optionMessage) {
        const rtcConnection = this.#rtcConnectionByClientId.get(remoteClientId);
        if (!rtcConnection) {
            Logger.debug(`Can not start transfering file because connection does't exit. ${remoteClientId}`);
            Logger.debug(optionMessage);
            return;
        }
        rtcConnection.startFileTransfer(this.#vrmToSend, optionMessage);
    }

    sendMessageAll(messageObj) {
        this.#rtcConnectionByClientId.forEach(conn => {
            conn.sendMessage(messageObj);
        });
    }

    isRemotePeerAvailable(clientId) {
        // TODO どのような状態を利用可能とするのか精査。
        const conn = this.#rtcConnectionByClientId.get(clientId);
        if (!conn) {
            return false;
        }
        return !conn.needsOffer();
    }

    setPannerState(movingRemoteClientId, object3d, firstPersonObject) {
        this.#handleRTCConnetion(movingRemoteClientId, conn => {
            conn.setPannerState(object3d.getSceneObject(), firstPersonObject);
        });
    }

    setPannerStateAll(eachClientObject3ds, firstPersonObject) {
        for (const [remoteClientId, object3d] of eachClientObject3ds) {
            this.setPannerState(remoteClientId, object3d, firstPersonObject);
        }
    }

    #handleOffer(fromClientId, offer) {
        const rtcConnection = this.#newConnectionIfClientUnavailable(fromClientId);
        Logger.debug(`handle offer ${rtcConnection} : ${fromClientId} : ${offer}`);
        rtcConnection.createAnswer(offer);
    }

    // TODO [fromClientId] or [remoteClientId]で統一する
    #newConnectionIfClientUnavailable(targetClientId) {
        const oldRtcConnection = this.#rtcConnectionByClientId.get(targetClientId);
        if (oldRtcConnection) {
            Logger.debug(`oldRtcConnection : ${targetClientId} : ${oldRtcConnection.getConnectionState()}`);
        }
        if (!oldRtcConnection || oldRtcConnection.needsOffer()) {
            if (oldRtcConnection) {
                oldRtcConnection.destroy();
            }
            const rtcConnection = new RTCConnection(
                this.#participants.clientId,
                targetClientId,
                this.#participants.iceServerInfo,                
                this.#signalingChannel,
                this.#remoteAudioContextHolder
            );

            rtcConnection.initConnection(
                this.#localAudio,
                this.#remoteAudioGainValue
            );

            rtcConnection.onmessage((clientId, messageObj) => {
                CommonEventDispatcher.dispatch(
                    CustomEventNames.THREE_SPACE__RECEIVE_REAL_TIME_DATA,
                    {
                        clientId: clientId,
                        data: messageObj
                    }
                );
            });
            this.#prepareToReceiveTransferredFile(targetClientId, rtcConnection);

            rtcConnection.onIceCandidateStateChange(() => {
                if(rtcConnection.shouldDestroy()) {
                    rtcConnection.destroy();
                    this.#rtcConnectionByClientId.delete(targetClientId);
                }
            });

            this.#rtcConnectionByClientId.set(targetClientId, rtcConnection);
            return rtcConnection;
        }
        return oldRtcConnection;
    }

    #prepareToReceiveTransferredFile(remoteClientId, rtcConnection) {

        const fileReceiver = new FileReceiver(remoteClientId, rtcConnection);

        rtcConnection.onFileTransferMessage((clientId, data) => {
            if (typeof data === 'string') {

                const metaData = JSON.parse(data);
                if (metaData.cmd === 'start') {
                    fileReceiver.onStartRequested(metaData);
                }

                if (metaData.cmd === 'accept') {
                    const transferer = new FileTransferer(this.#vrmToSend, rtcConnection);
                    transferer.startTransfer();
                }

            } else {
                fileReceiver.onReceiveChunk(data);
            }

        });
    }

    #handleAnswer(fromClientId, answer) {
        Logger.debug(`handle answer ${fromClientId} : ${answer}`);
        this.#handleRTCConnetion(fromClientId,
            conn => conn.handleAnswer(answer)
        );
    }

    #handleICECandidate(fromClientId, rtcIceCandidateInit) {
        Logger.debug(`handle ICECandidate ${fromClientId} : ${rtcIceCandidateInit}`);
        this.#handleRTCConnetion(fromClientId,
            conn => conn.handleICECandidate(rtcIceCandidateInit)
        );
    }

    #handleRTCConnetion(clientId, handler) {
        const rtcConnection = this.#rtcConnectionByClientId.get(clientId);
        if (!rtcConnection) {
            return;
        }
        handler(rtcConnection);
    }
}
