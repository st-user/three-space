import { CustomEventNames } from '../utils/CustomEventNames.js';
import CommonEventDispatcher from '../utils/CommonEventDispatcher.js';
import DOM from '../utils/DOM.js';

const vrmFileInfoTemplate = data => {
    return `
        <span>${data.fileName}</span>
    `;
};

export default class RTCControlView {

    #rtcControlModel;

    #$voiceChatCtrlView;

    #$joinSpace;
    #$leaveSpace;
    #$playTestSpeech;

    #$selectAvatarType;
    #$vrmDragAndDropAreaWrapper;
    #$vrmDragAndDropArea;
    #$vrmDragAndDropAreaNoFile;
    #$vrmDragAndDropAreaFileInfo;

    #$localAudioVolumeCtrl;
    #$remoteAudioVolumeCtrl;

    constructor(rtcControlModel) {

        this.#rtcControlModel = rtcControlModel;

        this.#$voiceChatCtrlView = DOM.query('#voiceChatCtrlView');

        this.#$joinSpace = DOM.query('#joinSpace');
        this.#$leaveSpace = DOM.query('#leaveSpace');
        this.#$playTestSpeech = DOM.query('#playTestSpeech');

        this.#$selectAvatarType = DOM.query('#selectAvatarType');
        this.#$vrmDragAndDropAreaWrapper = DOM.query('#vrmDragAndDropAreaWrapper');
        this.#$vrmDragAndDropArea = DOM.query('#vrmDragAndDropArea');
        this.#$vrmDragAndDropAreaNoFile = DOM.query('#vrmDragAndDropAreaNoFile');
        this.#$vrmDragAndDropAreaFileInfo = DOM.query('#vrmDragAndDropAreaFileInfo');

        this.#$localAudioVolumeCtrl = DOM.query('#localAudioVolumeCtrl');
        this.#$remoteAudioVolumeCtrl = DOM.query('#remoteAudioVolumeCtrl');
    }

    setUpEvent() {
        DOM.click(this.#$joinSpace, async () => {
            this.#rtcControlModel.startVoiceChat({
                localAudioGain: DOM.intValue(this.#$localAudioVolumeCtrl)
            });
        });

        DOM.click(this.#$leaveSpace, async () => {
            this.#rtcControlModel.endVoiceChat();
        });

        DOM.click(this.#$playTestSpeech, async () => {
            this.#rtcControlModel.playTestSpeech();
        });

        DOM.change(this.#$selectAvatarType, () => {
            this.#rtcControlModel.changeSelectedAvatarType(
                DOM.optionValue(this.#$selectAvatarType)
            );
        });

        DOM.dragover(this.#$vrmDragAndDropArea, event => {
            event.preventDefault();
        });

        DOM.drop(this.#$vrmDragAndDropArea, event => {
            event.preventDefault();

            if (this.#rtcControlModel.hasJoined()) {
                return;
            }

            const files = event.dataTransfer.files;
            if (!files || !files[0]) {
                return;
            }
            const file = files[0];
            // 現在は、参加キーを共有するもの同士は、ある程度信用できるという前提で、
            // ファイルの内容をチェックしていないが、ゆくゆくは何らかのチェックをした方が良いかもしれない
            this.#rtcControlModel.vrmFileDropped(file);
        });

        DOM.change(this.#$localAudioVolumeCtrl, async () => {
            this.#rtcControlModel.changeLocalAudioGain(
                DOM.intValue(this.#$localAudioVolumeCtrl)
            );
        });

        DOM.change(this.#$remoteAudioVolumeCtrl, async () => {
            this.#rtcControlModel.changeRemoteAudioGain(
                DOM.intValue(this.#$remoteAudioVolumeCtrl)
            );
        });


        [
            CustomEventNames.THREE_SPACE__VOICE_CHAT_STARTED,
            CustomEventNames.THREE_SPACE__TEST_SPEECH_STARTED,
            CustomEventNames.THREE_SPACE__TEST_SPEECH_ENDED,
            CustomEventNames.THREE_SPACE__VOICE_CHAT_ENDED,
        ]
            .forEach(eventName => {
                CommonEventDispatcher.on(eventName, () => {
                    this.#renderControlDisabled();
                });
            });


        CommonEventDispatcher.on(CustomEventNames.THREE_SPACE__VRM_FILE_DROPPED, () => {
            this.#renderVrmFileInfo();
        });

        CommonEventDispatcher.on(CustomEventNames.THREE_SPACE__AVATAR_TYPE_SELECTION_CHANGED, () => {
            this.#renderVrmDragAndDropArea();
        });

        CommonEventDispatcher.on(CustomEventNames.THREE_SPACE__PARTICIPATION_COMPLETED, () => {
            this.#renderView();
            this.#renderControlDisabled();
        });

        this.#rtcControlModel.changeLocalAudioGain(
            DOM.intValue(this.#$localAudioVolumeCtrl)
        );

        DOM.none(this.#$vrmDragAndDropAreaWrapper);
        this.#rtcControlModel.changeSelectedAvatarType(
            DOM.optionValue(this.#$selectAvatarType)
        );
        DOM.none(this.#$voiceChatCtrlView);
    }

    #renderView() {
        DOM.block(this.#$voiceChatCtrlView);
    }

    #renderControlDisabled() {
        this.#$joinSpace.disabled = this.#rtcControlModel.hasJoined();
        this.#$leaveSpace.disabled = !this.#rtcControlModel.hasJoined();
        this.#$playTestSpeech.disabled = !this.#rtcControlModel.hasJoined() || this.#rtcControlModel.isTestSpeechPlaying();

        this.#$selectAvatarType.disabled = this.#rtcControlModel.hasJoined();
    }

    #renderVrmDragAndDropArea() {
        if (this.#rtcControlModel.useUploadedFile()) {
            DOM.block(this.#$vrmDragAndDropAreaWrapper);
        } else {
            DOM.none(this.#$vrmDragAndDropAreaWrapper);
        }
    }

    #renderVrmFileInfo() {
        DOM.none(this.#$vrmDragAndDropAreaNoFile);
        DOM.block(this.#$vrmDragAndDropAreaFileInfo);

        this.#$vrmDragAndDropAreaFileInfo.innerHTML = '';
        this.#$vrmDragAndDropAreaFileInfo.insertAdjacentHTML(
            'beforeend', vrmFileInfoTemplate({
                fileName: this.#rtcControlModel.getVrmFileName()
            })
        );
    }

}
