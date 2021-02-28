import BoneRotation from './utils/BoneRotation.js';
import * as THREE from 'three';
import { VRMSchema } from '@pixiv/three-vrm';

export default class VrmWaitAnimation {

    #isPlaying;
    #boneRotations;

    constructor() {

        this.#isPlaying = false;
        const boneRotations = [];
        this.#boneRotations = boneRotations;
        /* 胴体 */
        boneRotations.push(
            new BoneRotation(
                VRMSchema.HumanoidBoneName.Spine,
                8, 0.02, 0, new THREE.Vector3(0, 1, 0)
            )
        );
        boneRotations.push(
            new BoneRotation(
                VRMSchema.HumanoidBoneName.Neck,
                3, 0.01, 0, new THREE.Vector3(0, 1, -1)
            )
        );

        /* 腕 */
        boneRotations.push(
            new BoneRotation(
                VRMSchema.HumanoidBoneName.LeftUpperArm,
                3, 0.01, 50, new THREE.Vector3(0, 0, 1)
            )
        );
        boneRotations.push(
            new BoneRotation(
                VRMSchema.HumanoidBoneName.LeftLowerArm,
                2, 0.05, 10, new THREE.Vector3(0, 1, 1)
            )
        );
        boneRotations.push(
            new BoneRotation(
                VRMSchema.HumanoidBoneName.RightUpperArm,
                3, -0.01, -50, new THREE.Vector3(0, 0, 1)
            )
        );
        boneRotations.push(
            new BoneRotation(
                VRMSchema.HumanoidBoneName.RightLowerArm,
                2, -0.05, -10, new THREE.Vector3(0, 1, 1)
            )
        );

        /* 脚 */
        boneRotations.push(
            new BoneRotation(
                VRMSchema.HumanoidBoneName.LeftUpperLeg,
                2.5, 0.01, 0, new THREE.Vector3(1, -0.1, 0)
            )
        );
        boneRotations.push(
            new BoneRotation(
                VRMSchema.HumanoidBoneName.LeftLowerLeg,
                2, -0.01, -10, new THREE.Vector3(1, 0.1, 0)
            )
        );
        boneRotations.push(
            new BoneRotation(
                VRMSchema.HumanoidBoneName.RightUpperLeg,
                2.5, -0.01, 0, new THREE.Vector3(-0.1, 1, 0)
            )
        );
        boneRotations.push(
            new BoneRotation(
                VRMSchema.HumanoidBoneName.RightLowerLeg,
                2, 0.01, 0, new THREE.Vector3(-0.1, -1, 0)
            )
        );
    }

    play() {
        if (!this.#isPlaying) {
            this.#boneRotations.forEach(
                br => br.defaultAngleHasAlreadyBeenSet = false
            );
        }
        this.#isPlaying = true;
    }

    stop() {
        this.#isPlaying = false;
    }

    updateFrame(vrmModel) {
        if (!this.#isPlaying) {
            return;
        }
        this.#boneRotations.forEach(br => br.animate(vrmModel));
    }

}
