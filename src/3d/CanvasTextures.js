import * as THREE from 'three';

export default class CanvasTextures {

    nameTextTexture(name, avatarScale = 1, positionY = 1.58) {
        const canvasWidth = 270;
        const canvasHeight = 28;
        const $canvas = document.createElement('canvas');
        $canvas.canvasWidth = canvasWidth;
        $canvas.canvasHeight = canvasHeight;

        const ctx = $canvas.getContext('2d');

        ctx.fillStyle = 'black';
        ctx.font = `${canvasHeight}px san-serif`;
        ctx.fillText(name, 0, canvasHeight, canvasWidth);

        ctx.fillStyle = 'white';
        ctx.font = `${canvasHeight}px san-serif`;
        ctx.fillText(name, 2, canvasHeight, canvasWidth);

        const material = new THREE.SpriteMaterial({
            map: new THREE.CanvasTexture($canvas)
        });
        const sprite = new THREE.Sprite(material);
        sprite.scale.set(1 / avatarScale, 1 / avatarScale, 1 / avatarScale);
        sprite.position.y = positionY;

        return sprite;
    }
}
