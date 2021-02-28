import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { VRM } from '@pixiv/three-vrm';
import { VRMSchema } from '@pixiv/three-vrm';
import { VRMUtils } from '@pixiv/three-vrm';
import * as THREE from 'three';
import Logger from '../../utils/Logger.js';
import PositionDiffBuffer from '../PositionDiffBuffer.js';
import VrmBlinkAnimation from './VrmBlinkAnimation.js';
import VrmWaitAnimation from './VrmWaitAnimation.js';
import VrmWalkAnimation from './VrmWalkAnimation.js';


const mouthBlendShapeNameMap = {
    'mouth_A': VRMSchema.BlendShapePresetName.A,
    'mouth_I': VRMSchema.BlendShapePresetName.I,
    'mouth_U': VRMSchema.BlendShapePresetName.U,
    'mouth_E': VRMSchema.BlendShapePresetName.E,
    'mouth_O': VRMSchema.BlendShapePresetName.O,
};

export default class VrmAvatar {

    #clock;
    #sceneObject;
    #defaultQuaternions;

    #isPlaying;

    #walkAnimation;
    #waitAnimation;

    #vrmModel;

    #frameCounter;
    #positionDiffBuffer;
    #positionBeforeLoaded;
    #rotationYBeforeLoaded;

    #handlersOnMove;

    constructor(vrmGlobalAssets, vrmBlob, defaultPosition, nameTextTexture, clock) {

        const group = new THREE.Group();
        group.position.set(
            defaultPosition.x, 0, defaultPosition.z
        );
        group.add(nameTextTexture);

        this.#sceneObject = group;
        this.#clock = clock;
        this.#defaultQuaternions = new Map();
        this.#walkAnimation = new VrmWalkAnimation(
            vrmGlobalAssets.walkAnimation
        );
        this.#waitAnimation = new VrmWaitAnimation();
        this.#frameCounter = 0;
        this.#positionDiffBuffer = new PositionDiffBuffer(defaultPosition, 0);
        this.#handlersOnMove = [];

        const objectURL = URL.createObjectURL(vrmBlob);
        const loader = new GLTFLoader();

        // TODO たまに発生するエラーの発生原因を調査
        // THREE.GLTFLoader: Unsupported asset. glTF versions >=2.0 are supported.
        loader.load(objectURL, (gltf) => {

            VRMUtils.removeUnnecessaryJoints(gltf.scene);
            VRM.from(gltf).then(vrm => {

                group.add(vrm.scene);
                this.#vrmModel = vrm;


                for (const [name, value] of Object.entries(VRMSchema.HumanoidBoneName)) {
                    const mesh = vrm.humanoid.getBoneNode(value);
                    if (!mesh || !mesh.quaternion) {
                        continue;
                    }
                    this.#defaultQuaternions.set(name, mesh.quaternion.clone());
                }
                new VrmBlinkAnimation().setAnimation(this.#vrmModel);

                if (this.#positionBeforeLoaded) {
                    this.#sceneObject.position.set(
                        this.#positionBeforeLoaded.x, 0, this.#positionBeforeLoaded.z
                    );
                }

                if (this.#rotationYBeforeLoaded) {
                    this.#sceneObject.rotation.y = this.#rotationYBeforeLoaded;
                }

                this.#handlersOnMove.forEach(handler => handler());

            });
        },
        () => {  /* do nothing */ },
        error => {
            Logger.error(error);
            alert('VRMのロードに失敗しました。画面をリロードし再度やり直してください。');
            location.replace('./');
        });


    }

    getSceneObject() {
        return this.#sceneObject;
    }

    readyNewPosition(newPosition) {
        if (!this.#vrmModel) {
            this.#positionBeforeLoaded = newPosition;
        } else {
            this.#positionDiffBuffer.add(newPosition);
        }
    }

    readyNewRotation(newRotationY) {
        if (!this.#vrmModel) {
            this.#rotationYBeforeLoaded = newRotationY;
        } else {
            this.#positionDiffBuffer.addRotation(newRotationY);
        }
    }

    play() {
        this.#isPlaying = true;
        this.#waitAnimation.stop();
        this.#walkAnimation.play();
    }

    stop() {
        this.#isPlaying = false;
    }

    speech(isMouthOpen) {
        if (!this.#vrmModel) {
            return;
        }
        Object.values(mouthBlendShapeNameMap).forEach(_name => {
            this.#vrmModel.blendShapeProxy.setValue(_name, 0);
        });
        if (isMouthOpen) {
            /* TODO 母音などを判断したlipsyncは未実装 */
            this.#vrmModel.blendShapeProxy.setValue(VRMSchema.BlendShapePresetName.A, 0.2);
            this.#vrmModel.blendShapeProxy.setValue(VRMSchema.BlendShapePresetName.U, 0.2);
        }
    }

    updateAnimations() {

        this.#frameCounter++;
        if (this.#frameCounter === 1000) {
            this.#frameCounter = 0;
        }


        if (this.#vrmModel) {

            this.#movePosition();

            if (this.#frameCounter % 2 === 0) {
                this.#walkAnimation.updateFrame(this.#vrmModel);
            }

            this.#waitAnimation.updateFrame(this.#vrmModel);
            this.#vrmModel.update(this.#clock.getDelta());
        }
    }

    onmove(handler) {
        this.#handlersOnMove.push(handler);
    }

    #movePosition() {

        const newPos = this.#positionDiffBuffer.get();
        if (newPos) {
            switch(newPos.type) {
            case PositionDiffBuffer.TYPE_MOVE:
                this.#sceneObject.position.set(
                    newPos.x, 0, newPos.z
                );
                break;
            case PositionDiffBuffer.TYPE_ROTATION:
                this.#sceneObject.rotation.y = newPos.y;
                break;
            default:
                Logger.debug(`Unexpected type: ${newPos.type}`);
            }

            if (this.#frameCounter % 20 === 0) {
                this.#handlersOnMove.forEach(handler => handler());
            }
        }

        const isWalking = this.#walkAnimation.isPlaying();
        if (!this.#isPlaying && this.#positionDiffBuffer.isEmpty()) {
            this.#walkAnimation.stop();
            this.#waitAnimation.play();

            if (isWalking) {
                this.#revertVrmBoneQuaternions();
                this.#handlersOnMove.forEach(handler => handler());
                Logger.trace('revertVrmBoneQuaternions');
            }
        }
    };

    #revertVrmBoneQuaternions() {

        if (!this.#vrmModel) {
            return;
        }

        for (const [name, value] of Object.entries(VRMSchema.HumanoidBoneName)) {
            const mesh = this.#vrmModel.humanoid.getBoneNode(value);
            if (!mesh || !mesh.quaternion) {
                continue;
            }
            const q = this.#defaultQuaternions.get(name);
            mesh.quaternion.set(q.x, q.y, q.z, q.w);
            mesh.updateMatrix();
        }
    };

}
