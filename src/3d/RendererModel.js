import Logger from '../utils/Logger.js';
import CanvasTextures from './CanvasTextures.js';
import GltfAvatar from './GltfAvatar.js';
import VrmAvatar from './vrm/VrmAvatar.js';
import VrmAssetsCache from './vrm/VrmAssetsCache.js';

import Channel from '../channel/Channel.js';
const DEFAULT_GLTF_URL = 'gltf/simple_person_blue.glb';

export default class RendererModel {

    #avatarMap;
    #vrmAssetsCache;
    #canvasTextures;

    constructor() {
        this.#avatarMap = new Map();
        this.#vrmAssetsCache = new VrmAssetsCache;
        this.#canvasTextures = new CanvasTextures();
    }

    async createByType(participants, fromClientId, data, clock) {
        const myClientId = participants.clientId;
        const vrmToken = participants.vrmToken;
        const remoteClientName = participants.getOtherName(fromClientId);
        const type = data.type;
        const defaultPosition = data.position;

        const oldAvatar = this.#avatarMap.get(fromClientId);
        let newAvatar;
        switch(type) {
        case 'default':
            newAvatar = new GltfAvatar(
                Channel.toStaticContentsUrl(DEFAULT_GLTF_URL),
                defaultPosition,
                this.#canvasTextures.nameTextTexture(remoteClientName, 0.4, 4),
                clock
            );
            this.#avatarMap.set(fromClientId, newAvatar);
            break;
        case 'vrm1':
        case 'vrm2': {
            const vrmGlobalAssets = await this.#vrmAssetsCache.loadGlobals();
            const vrmBlob = await this.#vrmAssetsCache.loadVrmData(
                type, myClientId, fromClientId, vrmToken
            );
            newAvatar = new VrmAvatar(
                vrmGlobalAssets,
                vrmBlob,
                defaultPosition,
                this.#canvasTextures.nameTextTexture(remoteClientName),
                clock
            );
            this.#avatarMap.set(fromClientId, newAvatar);
            break;
        }
        default:
            Logger.debug(`Unexpected type : ${type}`);
            return;
        }

        return {
            oldAvatar: oldAvatar,
            newAvatar: newAvatar
        };
    }

    async createByVrmBlob(participants, fromClientId, vrmBlob, defaultPosition, clock) {
        const remoteClientName = participants.getOtherName(fromClientId);
        const oldAvatar = this.#avatarMap.get(fromClientId);
        const vrmGlobalAssets = await this.#vrmAssetsCache.loadGlobals();
        const newAvatar = new VrmAvatar(
            vrmGlobalAssets,
            vrmBlob,
            defaultPosition,
            this.#canvasTextures.nameTextTexture(remoteClientName),
            clock
        );
        this.#avatarMap.set(fromClientId, newAvatar);

        return {
            oldAvatar: oldAvatar,
            newAvatar: newAvatar
        };
    }

    getAvatarToRemove(isToBeRemoved) {
        const avatarsToRemove = [];
        const clientIdsToRemove = [];
        for (const [clientId, avatar] of this.#avatarMap) {
            if (isToBeRemoved(clientId)) {
                clientIdsToRemove.push(clientId);
                avatarsToRemove.push(avatar);
            }
        }
        clientIdsToRemove.forEach(clientId => {
            this.#avatarMap.delete(clientId);
        });
        return avatarsToRemove;
    }

    moveAvatar(fromClientId, data) {
        this.#handlAvatar(fromClientId, avatar => {
            const newPosition = data.position;
            avatar.readyNewPosition(newPosition);
            avatar.play();
        });
    }

    rotateAvatar(fromClientId, data) {
        this.#handlAvatar(fromClientId, avatar => {
            const newRotationY = data.rotation.y;
            avatar.readyNewRotation(newRotationY);
            avatar.play();
        });
    }

    mouthMoveAvator(fromClientId, isMouthOpen) {
        this.#handlAvatar(fromClientId, avatar => {
            avatar.speech(isMouthOpen);
        });
    }

    avatarStopMoving(fromClientId) {
        this.#handlAvatar(fromClientId, avatar => {
            avatar.stop();
        });
    }

    getAvatarsEntries() {
        return this.#avatarMap.entries();
    }

    getAvatar(clientId) {
        return this.#avatarMap.get(clientId);
    }

    updateAnimations() {
        this.#avatarMap.forEach(av => av.updateAnimations());
    }

    #handlAvatar(fromClientId, handler) {
        const avatar = this.#avatarMap.get(fromClientId);
        if (!avatar) {
            return;
        }
        handler(avatar);
    }
}
