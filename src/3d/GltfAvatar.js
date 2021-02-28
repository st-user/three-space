import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

export default class GltfAvatar {

    #clock;
    #sceneObject;
    #animationMixer;
    #clip;
    #isPlaying;
    #handlersOnMove;

    constructor(url, defaultPosition, nameTextTexture, clock) {

        const loader = new GLTFLoader();
        const group = new THREE.Group();
        group.position.set(
            defaultPosition.x, 0, defaultPosition.z
        );
        group.scale.set(0.4, 0.4, 0.4);
        group.add(nameTextTexture);

        loader.load(url, data => {
            const person = data.scene;
            const animations = data.animations;
            person.rotation.y += Math.PI;
            group.add(person);

            const mixer = new THREE.AnimationMixer(person);

            this.#animationMixer = mixer;
            this.#clip = mixer.clipAction(animations[0]);
        });

        this.#isPlaying = false;
        this.#sceneObject = group;
        this.#clock = clock;
        this.#handlersOnMove = [];
    }

    readyNewPosition(newPosition) {
        this.#sceneObject.position.set(
            newPosition.x, 0, newPosition.z
        );
        this.#handlersOnMove.forEach(handler => handler());
    }

    readyNewRotation(newRotationY) {
        this.#sceneObject.rotation.y = newRotationY;
        this.#handlersOnMove.forEach(handler => handler());
    }

    getSceneObject() {
        return this.#sceneObject;
    }

    play() {
        if (!this.#isPlaying && this.#clip) {
            this.#clip.reset().play();
            this.#isPlaying = true;
        }
    }

    stop() {
        if (this.#isPlaying && this.#clip) {
            this.#clip.stop();
            this.#isPlaying = false;
        }
    }

    speech() { /*口パクはなし*/ }

    onmove(handler) {
        this.#handlersOnMove.push(handler);
    }

    updateAnimations() {
        if (this.#animationMixer) {
            this.#animationMixer.update(this.#clock.getDelta());
        }
    }

}
