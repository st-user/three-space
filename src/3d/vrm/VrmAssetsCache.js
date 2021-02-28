import { CustomEventNames } from '../../utils/CustomEventNames.js';
import Channel from '../../channel/Channel.js';
import Fetch from '../../utils/Fetch.js';

const WALK_ANIMATION_JSON_PATH = '.vrm/animation/walk.json';

const VRM_TYPE_MAPPING = {
    'vrm1': 0,
    'vrm2': 1
};

const LOAD_VRM_URL = '/loadVrm';

export default class VrmAvatarAssetsCache {

    #vrmBlobs;
    #globalAssets;

    constructor() {
        this.#vrmBlobs = new Map();
        this.#globalAssets = {};
    }

    loadGlobals() {
        return new Promise(resolve => {
            if (this.#isGlobalAssetsLoaded()) {
                resolve(this.#globalAssets);
            } else {
                fetch(Channel.toStaticContentsUrl(WALK_ANIMATION_JSON_PATH))
                    .then(response => response.json())
                    .then(json => {
                        this.#globalAssets.walkAnimation = json;
                        resolve(this.#globalAssets);
                    });
            }
        });
    }

    loadVrmData(type, myClientId, remoteClientId, vrmToken) {
        return new Promise(resolve => {
            if (this.#vrmBlobs.has(type)) {
                resolve(this.#vrmBlobs.get(type));
            } else {
                Fetch.fetch(Channel.toEndpointUrl(LOAD_VRM_URL), {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        clientId: myClientId,
                        vrmToken: vrmToken,
                        type: VRM_TYPE_MAPPING[type]
                    }),
                }, {
                    chunkCountPerProgressEvent: 10,
                    eventName: CustomEventNames.THREE_SPACE__RECEIVING_TRANSFERRED_FILE_BLOB_PROGRESS,
                    attachedData: {
                        clientId: remoteClientId
                    }
                })
                    .then(chunks => {

                        const blob = new Blob(chunks);
                        this.#vrmBlobs.set(type, blob);

                        resolve(blob);
                    });
            }
        });
    }

    #isGlobalAssetsLoaded() {
        return !!this.#globalAssets.walkAnimation;
    }
}
