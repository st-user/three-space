import { CustomEventNames } from '../utils/CustomEventNames.js';
import * as THREE from 'three';
import AnimationConst from './AnimationConst.js';
import CameraHandler from './CameraHandler.js';
import CommonEventDispatcher from '../utils/CommonEventDispatcher.js';
import DOM from '../utils/DOM.js';
import Event from '../utils/Event.js';
import JobManager from '../utils/JobManager.js';
import Logger from '../utils/Logger.js';

const DEFAULT_WIDTH = 960;
const DEFAULT_HEIGHT = 540;
const DEFAULT_AVATAR_POSITION = { x: 20, y: 1.53, z: 20 };

const SCENE_CHECK_INTERVAL_MILLIS = 3000;
const SCENE_CHECK_JOB_NAME = 'SceneCheck';

const AVATAR_RENDERING_STATUS = {
    STARTED: 0,
    FINISHED: 1,
    PROGRESS: 2
};
const INFROMATION_CLEAR_TIMEOUT_MILLIS = 5000;
const REQUEST_ANIMATION_FRAME_RETRY_INTERVAL_MILLIS = 3000;
const REQUEST_ANIMATION_FRAME_RETRY_MAX_COUNT = 20;

export default class RendererView {

    #participationModel;
    #rtcControlModel;
    #rendererModel;

    #$information;
    #informationClearTimer;

    #clock;
    #renderer;
    #scene;
    #cameraHandler;

    #currentWidth;
    #currentHeight;

    constructor(participationModel, rtcControlModel, rendererModel) {

        this.#participationModel = participationModel;
        this.#rtcControlModel = rtcControlModel;
        this.#rendererModel = rendererModel;

        this.#$information = DOM.query('#information');

        this.#currentWidth = DEFAULT_WIDTH;
        this.#currentHeight = DEFAULT_HEIGHT;

        const $canvas = DOM.query('#myCanvas');
        $canvas.width = this.#currentWidth;
        $canvas.height = this.#currentHeight;

        this.#clock = new THREE.Clock();

        this.#renderer = new THREE.WebGLRenderer({
            canvas: $canvas
        });

        this.#renderer.setSize(this.#currentWidth, this.#currentHeight);
        this.#renderer.setPixelRatio(window.devicePixelRatio);

        this.#scene = new THREE.Scene();
        const createLight = (x, y, z) => {
            const light = new THREE.DirectionalLight(0xffffff);
            //light.intensity = 2;
            light.position.set(x, y, z);
            return light;
        };

        this.#scene.add(createLight(1, 1, 1));

        const gridHelper = new THREE.GridHelper(1000, 1000);
        const axes = new THREE.AxisHelper(1000);
        this.#scene.add(gridHelper);
        this.#scene.add(axes);

        this.#cameraHandler = new CameraHandler();

        this.#onResize();
    }

    setUpEvent() {
        window.addEventListener('resize', () => this.#onResize());
        DOM.windowKeydownIfNotPrevented(Event.throttle(
            event => this.#onKeydown(event),
            AnimationConst.KEYDOWN_EVENT_THROTTLING_MILLIS,
            { element: window, eventName: 'keyup' }
        ));
        DOM.windowKeyupIfNotPrevented(() => this.#onKeyup());


        CommonEventDispatcher.on(CustomEventNames.THREE_SPACE__VOICE_CHAT_STARTED, () => {
            this.#initCamera();
        });

        CommonEventDispatcher.on(CustomEventNames.THREE_SPACE__REAL_TIME_DATA_CHANNEL_CONNECTION_ESTABLISHED, event => {
            const remoteClientId = event.detail.clientId;
            if (!this.#rtcControlModel.useUploadedFile()) {
                this.#showAvatar(remoteClientId);
            }
        });

        CommonEventDispatcher.on(CustomEventNames.THREE_SPACE__FILE_TRANSFER_DATA_CHANNEL_CONNECTION_ESTABLISHED, event => {
            const remoteClientId = event.detail.clientId;
            if (this.#rtcControlModel.useUploadedFile()) {
                this.#showAvatarOfUploadedFile(remoteClientId);
            }
        });

        CommonEventDispatcher.on(CustomEventNames.THREE_SPACE__VOICE_CHAT_ENDED, () => {
            this.#removeAvatar();
        });

        CommonEventDispatcher.on(CustomEventNames.THREE_SPACE__RECEIVE_REAL_TIME_DATA, async event => {
            const messageObj = event.detail;
            this.#receiveMessage(messageObj);
        });

        CommonEventDispatcher.on(CustomEventNames.THREE_SPACE__RECEIVE_TRANSFERRED_FILE_BLOB, async event => {
            const remoteClientId = event.detail.clientId;
            const vrmBlob = event.detail.data;
            const position = event.detail.options.position;
            this.#receiveVrmData(remoteClientId, vrmBlob, position);
        });

        CommonEventDispatcher.on(CustomEventNames.THREE_SPACE__ACCEPT_RECEEVING_FILE_BLOG, () => {
            const remoteClientId = event.detail.clientId;
            this.#showAvatarRenderingStatusInformation(
                remoteClientId, AVATAR_RENDERING_STATUS.STARTED
            );
        });

        CommonEventDispatcher.on(CustomEventNames.THREE_SPACE__RECEIVING_TRANSFERRED_FILE_BLOB_PROGRESS, () => {
            const progress = event.detail.progress;
            const remoteClientId = event.detail.attachedData.clientId;
            this.#showAvatarRenderingStatusInformation(
                remoteClientId, AVATAR_RENDERING_STATUS.PROGRESS, progress
            );
        });

        CommonEventDispatcher.on(CustomEventNames.THREE_SPACE__VOICE_SIGNAL_CHANGED, event => {
            const messageObj = event.detail;
            this.#voiceSignalChanged(messageObj);
        });

        JobManager.registerJob(SCENE_CHECK_JOB_NAME, () => {

            this.#refleshScene();

        }, SCENE_CHECK_INTERVAL_MILLIS);

        this.#doRequestAnimationFrame();
    }

    #doRequestAnimationFrame() {
        let retryTotalCount = 0;
        const tick = () => {

            try {
                if (this.#cameraHandler.isPresent()) {
                    this.#renderer.render(
                        this.#scene, this.#cameraHandler.getCamera()
                    );
                    this.#rendererModel.updateAnimations();
                }
            } catch(e) {
                Logger.error(`Encountered an error during playing an animation frame. retryCount:${retryTotalCount}`);
                Logger.error(e);
                if (REQUEST_ANIMATION_FRAME_RETRY_MAX_COUNT < retryTotalCount) {
                    alert('3Dの描画が実行できません。画面をリロードし再度やり直してください。');
                    location.replace('./');
                }
                setTimeout(
                    () => requestAnimationFrame(tick),
                    REQUEST_ANIMATION_FRAME_RETRY_INTERVAL_MILLIS
                );
                retryTotalCount++;
                return;
            }
            retryTotalCount = 0;

            requestAnimationFrame(tick);
        };
        tick();
    }

    #onKeyup() {
        if (this.#cameraHandler.isPresent()) {
            const beforeMoving = this.#cameraHandler.moving;
            this.#cameraHandler.moving = false;
            if (beforeMoving) {
                this.#rtcControlModel.sendMessageAll({
                    cmd: 'stopMoving'
                });
            }
        }
    }

    #onKeydown(event) {
        if (!this.#cameraHandler.isPresent()) {
            return;
        }
        switch (event.key) {
        case 'Down': // IE/Edge specific value
        case 'ArrowDown':
            this.#cameraHandler.forward(-0.1);
            this.#sendWorldPosition();
            this.#setPannerStateAll();
            break;
        case 'Up': // IE/Edge specific valu
        case 'ArrowUp':
            this.#cameraHandler.forward(0.1);
            this.#sendWorldPosition();
            this.#setPannerStateAll();
            break;
        case 'Left': // IE/Edge specific value
        case 'ArrowLeft':
            this.#cameraHandler.rotateY(0.08);
            this.#sendRotation();
            this.#setPannerStateAll();
            break;
        case 'Right': // IE/Edge specific value
        case 'ArrowRight':
            this.#cameraHandler.rotateY(-0.08);
            this.#sendRotation();
            this.#setPannerStateAll();
            break;
        default:
            return; // Quit when this doesn't handle the key event.
        }
    }

    async #receiveMessage(messageObj) {
        const fromClientId = messageObj.clientId;
        const data = messageObj.data;

        // TODO model-view, ビジネスロジックモジュールの依存関係がカオスになってきているので整理したい....
        switch (data.cmd) {
        case 'showAvatar': {
            this.#showAvatarRenderingStatusInformation(
                fromClientId, AVATAR_RENDERING_STATUS.STARTED
            );

            const participants = this.#participationModel.getParticipants();
            const avatars = await this.#rendererModel.createByType(
                participants, fromClientId, data, this.#clock
            );
            this.#setUpAvatarObject(fromClientId, avatars);
            break;
        }
        case 'move':
            this.#rendererModel.moveAvatar(fromClientId, data);
            break;
        case 'rotate':
            this.#rendererModel.rotateAvatar(fromClientId, data);
            break;
        case 'stopMoving':
            this.#rendererModel.avatarStopMoving(fromClientId);
            break;
        default:
            Logger.debug(`Unexpected command : ${data.cmd}`);
            return;
        }

    }

    async #receiveVrmData(fromClientId, vrmBlob, defaultPosition) {
        const avatars = await this.#rendererModel.createByVrmBlob(
            this.#participationModel.getParticipants(),
            fromClientId, vrmBlob, defaultPosition, this.#clock
        );
        this.#setUpAvatarObject(fromClientId, avatars);
    }

    #setUpAvatarObject(fromClientId, avatars) {
        if (avatars.oldAvatar) {
            this.#scene.remove(avatars.oldAvatar.getSceneObject());
        }
        if (avatars.newAvatar) {
            // 画面のイベント発火のタイミングと、移動完了のタイミングがかなりずれる場合もあるので、
            // 座標移動時の適当なタイミングごとに、pannerを更新するようにする
            avatars.newAvatar.onmove(() => {
                this.#setPannerState(fromClientId);
            });
            this.#scene.add(avatars.newAvatar.getSceneObject());
        }
        this.#setPannerState(fromClientId);

        this.#showAvatarRenderingStatusInformation(
            fromClientId, AVATAR_RENDERING_STATUS.FINISHED
        );
    }

    // TODO information表示は、単独の別Viewに切り出す
    #showAvatarRenderingStatusInformation(remoteClientId, status, data) {
        clearTimeout(this.#informationClearTimer);
        const participants = this.#participationModel.getParticipants();
        const name = participants.getOtherName(remoteClientId);
        if (status === AVATAR_RENDERING_STATUS.STARTED) {
            this.#$information.textContent = `${name}のアバターの表示処理を開始しました。`;
        }
        if (status === AVATAR_RENDERING_STATUS.FINISHED) {
            this.#$information.textContent = `${name}のアバターの表示処理がもうすぐ完了します。`;
        }
        if (status === AVATAR_RENDERING_STATUS.PROGRESS) {
            const progressPct = Math.round(data * 100, 2);
            this.#$information.textContent = `${name}のアバターのファイルを受信中(${progressPct}%)`;
        }
        this.#informationClearTimer = setTimeout(() => {
            this.#$information.textContent = '';
        }, INFROMATION_CLEAR_TIMEOUT_MILLIS);
    }

    #voiceSignalChanged(messageObj) {
        const remoteClientId = messageObj.clientId;
        const mouthOpen = 0 < messageObj.signal;
        this.#rendererModel.mouthMoveAvator(remoteClientId, mouthOpen);
    }

    #initCamera() {
        this.#cameraHandler.init();
        this.#cameraHandler.setSize(this.#currentWidth, this.#currentHeight);
        this.#cameraHandler.setDefaultPosition(
            DEFAULT_AVATAR_POSITION.x,
            DEFAULT_AVATAR_POSITION.y,
            DEFAULT_AVATAR_POSITION.z
        );
    }

    #showAvatar(remoteClientId) {
        const target = this.#cameraHandler.getWorldPosition();
        const type = this.#rtcControlModel.getSelectAvatarType();
        this.#rtcControlModel.sendMessage(remoteClientId, {
            cmd: 'showAvatar',
            type: type,
            position: {
                x: target.x,
                y: target.y,
                z: target.z
            }
        });
    }

    #showAvatarOfUploadedFile(remoteClientId) {
        const target = this.#cameraHandler.getWorldPosition();
        this.#rtcControlModel.startFileTransfer(remoteClientId, {
            position: {
                x: target.x,
                y: target.y,
                z: target.z
            }
        });
    }

    #removeAvatar() {
        this.#cameraHandler.destroy();
    }

    #sendWorldPosition() {
        const target = this.#cameraHandler.getWorldPosition();
        this.#rtcControlModel.sendMessageAll({
            cmd: 'move',
            position: {
                x: target.x,
                y: target.y,
                z: target.z
            }
        });
    }

    #sendRotation() {
        const y = this.#cameraHandler.getCamera().rotation.y;
        this.#rtcControlModel.sendMessageAll({
            cmd: 'rotate',
            rotation: {
                y: y
            }
        });
    }

    #refleshScene() {
        const avatarToRemove = this.#rendererModel.getAvatarToRemove(
            clientId => !this.#rtcControlModel.isRemotePeerAvailable(clientId)
        );
        avatarToRemove.forEach(avatar => {
            this.#scene.remove(avatar.getSceneObject());
        });
    }

    #setPannerState(remoteClientId) {
        const avatar = this.#rendererModel.getAvatar(remoteClientId);
        if (!this.#cameraHandler.isPresent() || !avatar) {
            return;
        }
        this.#rtcControlModel.setPannerState(
            remoteClientId, avatar, this.#cameraHandler
        );
    }

    #setPannerStateAll() {
        // TODO pannerNodeの仕組みをよく理解すれば、処理量を減らせるかもしれない。
        // 自分が動いた時には、自分に関する情報のみを更新すれば事足りるようにすることができるか
        if (!this.#cameraHandler.isPresent()) {
            return;
        }
        this.#rtcControlModel.setPannerStateAll(
            this.#rendererModel.getAvatarsEntries(), this.#cameraHandler
        );
    }

    #onResize() {
        this.#currentWidth = window.innerWidth;
        this.#currentHeight = window.innerHeight - 360;

        this.#renderer.setPixelRatio(window.devicePixelRatio);
        this.#renderer.setSize(this.#currentWidth, this.#currentHeight);

        this.#cameraHandler.setSize(this.#currentWidth, this.#currentHeight);
    }
}
