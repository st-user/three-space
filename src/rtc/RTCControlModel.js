import CommonEventDispatcher from '../utils/CommonEventDispatcher.js';
import { CustomEventNames } from '../utils/CustomEventNames.js';
import RTCHandler from './RTCHandler.js';

export default class RTCControlModel {

    #participationModel;
    #rtcHandler;

    #hasJoined;
    #isTestSpeechPlaying;
    #selectAvatarType;
    #vrmFile;

    #localAudioGainValue;

    constructor(participationModel) {
        this.#participationModel = participationModel;
        this.#rtcHandler = new RTCHandler();
        this.#hasJoined = false;
        this.#isTestSpeechPlaying = false;
        this.#selectAvatarType = '';
        this.#localAudioGainValue = 0;
    }

    async startVoiceChat(param) {

        if (!navigator.mediaDevices) {
            alert('マイクが使用できない状態です');
            return;
        }

        if (!this.#checkIfCanStartVoiceChat()) {
            return;
        }

        this.#hasJoined = true;
        CommonEventDispatcher.dispatch(
            CustomEventNames.THREE_SPACE__VOICE_CHAT_STARTED
        );

        await this.#rtcHandler.readyConnection(
            this.#participationModel.getParticipants(),
            this.#vrmFile
        );
        this.changeLocalAudioGain(param.localAudioGain);
    }

    async endVoiceChat() {

        this.#rtcHandler.destroy();
        this.#hasJoined = false;
        this.#isTestSpeechPlaying = false;

        CommonEventDispatcher.dispatch(
            CustomEventNames.THREE_SPACE__VOICE_CHAT_ENDED
        );
    }

    async playTestSpeech() {
        this.#isTestSpeechPlaying = true;

        CommonEventDispatcher.dispatch(
            CustomEventNames.THREE_SPACE__TEST_SPEECH_STARTED
        );

        await this.#rtcHandler.playTestSpeech(this.#localAudioGainValue);

        this.#isTestSpeechPlaying =  false;
        CommonEventDispatcher.dispatch(
            CustomEventNames.THREE_SPACE__TEST_SPEECH_ENDED
        );
    }

    changeLocalAudioGain(gainValue) {
        this.#localAudioGainValue = gainValue;
        this.#rtcHandler.changeLocalAudioGain(gainValue);
    }

    changeRemoteAudioGain(gainValue) {
        this.#rtcHandler.changeRemoteAudioGain(gainValue);
    }

    changeSelectedAvatarType(value) {
        this.#selectAvatarType = value;
        CommonEventDispatcher.dispatch(
            CustomEventNames.THREE_SPACE__AVATAR_TYPE_SELECTION_CHANGED
        );
    }

    vrmFileDropped(file) {
        this.#vrmFile = file;
        CommonEventDispatcher.dispatch(
            CustomEventNames.THREE_SPACE__VRM_FILE_DROPPED
        );
    }

    getVrmFileName() {
        if (!this.#vrmFile) {
            return '';
        }
        return this.#vrmFile.name;
    }

    useUploadedFile() {
        return this.#selectAvatarType === 'uploadFile';
    }

    getSelectAvatarType() {
        return this.#selectAvatarType;
    }

    hasJoined() {
        return this.#hasJoined;
    }

    isTestSpeechPlaying() {
        return this.#isTestSpeechPlaying;
    }

    getStatusDesc(clientId) {
        return this.#rtcHandler.getStatusDesc(clientId);
    }

    isRemotePeerAvailable(clientId) {
        return this.#rtcHandler.isRemotePeerAvailable(clientId);
    }

    sendMessage(remoteClientId, messageObj) {
        return this.#rtcHandler.sendMessage(remoteClientId, messageObj);
    }

    sendMessageAll(messageObj) {
        return this.#rtcHandler.sendMessageAll(messageObj);
    }

    startFileTransfer(remoteClientId, optionMessage) {
        return this.#rtcHandler.startFileTransfer(
            remoteClientId, optionMessage
        );
    }

    setPannerState(movingRemoteClientId, object3d, firstPersonObject) {
        return this.#rtcHandler.setPannerState(
            movingRemoteClientId, object3d, firstPersonObject
        );
    }

    setPannerStateAll(eachClientObject3ds, firstPersonObject) {
        return this.#rtcHandler.setPannerStateAll(
            eachClientObject3ds, firstPersonObject
        );
    }

    #checkIfCanStartVoiceChat() {
        if (this.useUploadedFile() && !this.#vrmFile) {
            alert('VRMファイルがアップロードされていません');
            return false;
        }
        return true;
    }
}
