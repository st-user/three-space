import Logger from '../utils/Logger.js';
import * as THREE from 'three';

export default class PannerHandler {

    #panner;
    #sensitivity; /* 小さいほど、距離が離れた場合に急激に音量が減衰するようになる */

    constructor(panner, sensitivity = 20){
        this.#panner = panner;
        this.#sensitivity = sensitivity;
        this.#panner.coneInnerAngle = 60;
        this.#panner.coneOuterAngle = 120;
        this.#panner.coneOuterGain = 0.6;
    }

    setPannerState(obj, firstPersonObject) {
        if (!this.#panner || !obj || !obj.quaternion) {
            return;
        }

        const lookAtVector = firstPersonObject.getLookAtVector();
        Logger.trace(lookAtVector);
        const personPosition = firstPersonObject.getPosition();
        Logger.trace(personPosition);

        this.#setPannerOrientation(obj, lookAtVector);
        this.#setPannerPosition(obj, lookAtVector, personPosition);
    }

    #setPannerPosition(obj, lookAtVector, personPosition) {

        /*
         * カメラの位置を原点(0, 0, 0)、進行方向(look at vector)を(0, 0, -1)
         * と見立てた場合の、音源の位置を計算する
         */

        obj.updateMatrixWorld();
        const temp = new THREE.Vector3();
        temp.setFromMatrixPosition(obj.matrixWorld);
        Logger.trace('----- start -------');
        Logger.trace(temp);

        const center = personPosition;
        center.negate();
        Logger.trace(center);

        temp.add(center);
        Logger.trace(temp);

        // (0, 0, -1)をlook at vectorに回転するための回転行列の逆行列
        const m = new THREE.Matrix3();
        m.set(
            -lookAtVector.z, 0, lookAtVector.x,
            0,0,0,
            -lookAtVector.x, 0, -lookAtVector.z
        );
        temp.applyMatrix3(m);
        Logger.trace(temp);

        this.#panner.setPosition(
            this.#applyMultiplyer(temp.x),
            this.#applyMultiplyer(temp.y),
            this.#applyMultiplyer(temp.z)
        );
    }

    #setPannerOrientation(obj, lookAtVector) {

        obj.updateMatrixWorld();
        const orientationVector = new THREE.Vector3(0, 0, -1);
        orientationVector.applyQuaternion(obj.quaternion);
        Logger.trace(orientationVector);

        const m = new THREE.Matrix3();
        m.set(
            -lookAtVector.z, 0, lookAtVector.x,
            0,0,0,
            -lookAtVector.x, 0, -lookAtVector.z
        );
        orientationVector.applyMatrix3(m);
        Logger.trace(orientationVector);

        this.#panner.setOrientation(
            orientationVector.x,
            orientationVector.y,
            orientationVector.z
        );
    }

    #applyMultiplyer(value) {
        const mul = Math.pow(value / this.#sensitivity, 2);
        return value * mul;
    }

}
