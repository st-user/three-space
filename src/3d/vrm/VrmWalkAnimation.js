import Logger from '../../utils/Logger.js';
import { VRMSchema } from '@pixiv/three-vrm';


const ANIM_COUNT = 34;
const ANIM_START_COUNT = 2;

export default class VrmWalkAnimation {

    #isPlaying;
    #animationJsonArray;
    #currentJsonIndex;

    constructor(animationJsonArray) {
        this.#animationJsonArray = animationJsonArray;
        this.#isPlaying = false;
        this.#currentJsonIndex = ANIM_START_COUNT;
    }

    isPlaying() {
        return !!this.#isPlaying;
    }

    play() {
        this.#isPlaying = true;
    }

    stop() {
        this.#isPlaying = false;
    }

    updateFrame(vrmModel) {
        if (!this.#isPlaying) {
            return;
        }

        const animation = this.#getCurrentAnimation();

        for (const ani of animation) {
            const humanoidBoneName = VRMSchema.HumanoidBoneName[ani.humanoidBoneName];
            if (ani.rot.length != 4 || !humanoidBoneName) {
                Logger.trace(`${ani.humanoidBoneName} not exist.`);
                continue;
            }
            const mesh = vrmModel.humanoid.getBoneNode(humanoidBoneName);

            if (!mesh || !mesh.quaternion) {
                return;
            }

            mesh.quaternion.set(-ani.rot[0], -ani.rot[1], ani.rot[2], ani.rot[3]);
        }

    }

    #getCurrentAnimation() {
        if (this.#currentJsonIndex === (ANIM_COUNT + 1)) {
            this.#currentJsonIndex = ANIM_START_COUNT;
        }
        const ret = this.#animationJsonArray[this.#currentJsonIndex - 1];
        this.#currentJsonIndex++;
        return ret;
    }
}
