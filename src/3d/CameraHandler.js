import * as THREE from 'three';

export default class CameraHandler {

    moving;
    #camera;
    #worldPositionTarget; // create once an reuse it

    constructor() {
        this.#worldPositionTarget = new THREE.Vector3();
    }

    getCamera() {
        return this.#camera;
    }

    isPresent() {
        return !!this.#camera;
    }

    destroy() {
        this.#camera = undefined;
    }

    setSize(width, height) {
        if (this.isPresent()) {
            this.#camera.aspect = width / height;
            this.#camera.updateProjectionMatrix();
        }
    }

    init() {
        this.#camera = new THREE.PerspectiveCamera(45);
        this.moving = false;
    }

    setDefaultPosition(x, y, z) {
        this.#camera.position.set(x, y, z);
        this.#camera.lookAt(new THREE.Vector3(x, y, 0));
    }

    forward(deltaMul) {
        const lookAtVector = this.getLookAtVector();
        this.#camera.position.x += (lookAtVector.x * deltaMul);
        this.#camera.position.y += (lookAtVector.y * deltaMul);
        this.#camera.position.z += (lookAtVector.z * deltaMul);
        this.moving = true;
    }

    rotateY(delta) {
        this.#camera.rotation.y += delta;
        this.moving = true;
    }

    stopMoving() {
        this.moving = false;
    }

    getLookAtVector() {
        const lookAtVector = new THREE.Vector3(0, 0, -1);
        lookAtVector.applyQuaternion(this.#camera.quaternion);
        return lookAtVector;
    }

    getPosition() {
        const position = new THREE.Vector3();
        position.set(
            this.#camera.position.x, this.#camera.position.y, this.#camera.position.z
        );
        return position;
    }

    getWorldPosition() {
        this.#camera.getWorldPosition(this.#worldPositionTarget);
        return this.#worldPositionTarget;
    }

}
