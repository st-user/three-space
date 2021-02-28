import * as THREE from 'three';

export default class BoneRotation {

    defaultAngleHasAlreadyBeenSet;

    #boneName;

    #rotationAngleMax;
    #rotationAngleStep;
    #rotationAxis;

    #currentAngle;
    #defaultAngle;

    constructor(
        boneName,
        rotationAngleMax,
        rotationAngleStep,
        defaultAngle,
        rotationAxis) {

        this.#boneName = boneName;
        this.#rotationAngleMax = rotationAngleMax;
        this.#rotationAngleStep = rotationAngleStep;
        this.#defaultAngle = defaultAngle;
        this.#rotationAxis = rotationAxis.normalize();
        this.#currentAngle = 0;
    }

    animate(vrmModel) {

        if (!vrmModel) {
            return;
        }

        if (!this.defaultAngleHasAlreadyBeenSet) {
            this.defaultAngleHasAlreadyBeenSet = true;
            this.#rotate(this.#defaultAngle, vrmModel);
        }

        this.#currentAngle = this.#currentAngle + this.#rotationAngleStep;

        this.#rotate(this.#rotationAngleStep, vrmModel);

        if (this.#rotationAngleMax <= this.#currentAngle
                || this.#currentAngle <= -this.#rotationAngleMax) {
            this.#rotationAngleStep = -this.#rotationAngleStep;
        }
    }

    #rotate(angleToAdd, vrmModel) {

        const mesh = vrmModel.humanoid.getBoneNode(this.#boneName);

        if (!mesh || !mesh.quaternion) {
            return;
        }

        const angleRadian = angleToAdd / 360 * 2 * Math.PI;
        const _q = new THREE.Quaternion();
        _q.setFromAxisAngle(this.#rotationAxis, angleRadian);
        mesh.quaternion.multiply(_q);
    }
}
