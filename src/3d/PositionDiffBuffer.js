const TIME = 5;

export default class PositionDiffBuffer {

    static TYPE_MOVE = 0;
    static TYPE_ROTATION = 1;

    #currentPosition;
    #currentRotationY;
    #suppliableArray;

    constructor(defaultPosition, defaultRotationY) {
        this.#suppliableArray = [];
        this.#currentPosition = Object.assign({}, defaultPosition);
        this.#currentRotationY = defaultRotationY;
    }

    add(newPosition) {
        const dx = newPosition.x - this.#currentPosition.x;
        const dy = newPosition.y - this.#currentPosition.y;
        const dz = newPosition.z - this.#currentPosition.z;

        const unit_x = dx / TIME;
        const unit_y = dy / TIME;
        const unit_z = dz / TIME;

        for (let i = 0; i < TIME; i++) {
            const tx = this.#currentPosition.x + i * unit_x;
            const ty = this.#currentPosition.y + i * unit_y;
            const tz = this.#currentPosition.z + i * unit_z;
            this.#suppliableArray.push({
                type: PositionDiffBuffer.TYPE_MOVE, x: tx, y: ty, z: tz
            });
        }

        Object.assign(this.#currentPosition, newPosition);
    }

    addRotation(y) {
        const dy = y - this.#currentRotationY;

        const unit_y = dy / TIME;

        for (let i = 0; i < TIME; i++) {
            const ty = this.#currentRotationY + i * unit_y;
            this.#suppliableArray.push({
                type: PositionDiffBuffer.TYPE_ROTATION, y: ty
            });
        }

        this.#currentRotationY = y;
    }

    isEmpty() {
        return this.#suppliableArray.length === 0;
    }

    get() {
        if (0 < this.#suppliableArray.length) {
            return this.#suppliableArray.shift();
        }
        return undefined;
    }
}
