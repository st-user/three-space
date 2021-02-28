import { VRMSchema } from '@pixiv/three-vrm';

export default class VrmBlinkAnimation {

    #currentBlinkRatio = 0;
    #blinkRatioStep = 2;
    #isAnimationCompleted = true;

    constructor() {
        this.#currentBlinkRatio = 0;
        this.#blinkRatioStep = 2;
        this.#isAnimationCompleted = true;
    }


    setAnimation(vrmModel) {
        const setUpdateFrame = () => {

            if (vrmModel) {
                this.#blink(vrmModel);
            }

            setTimeout(setUpdateFrame, 3000 + Math.random() * 3000);
        };
        setUpdateFrame();
    }

    #blink(vrmModel) {
        let isAnimationCompleted = true;
        const updateFrame = () => {

            if (this.#currentBlinkRatio <= 0) {
                if (isAnimationCompleted) {
                    this.#blinkRatioStep = 2;
                    isAnimationCompleted = false;
                } else {
                    return;
                }
            }

            vrmModel.blendShapeProxy.setValue(VRMSchema.BlendShapePresetName.BlinkL, this.#currentBlinkRatio / 10);
            vrmModel.blendShapeProxy.setValue(VRMSchema.BlendShapePresetName.BlinkR, this.#currentBlinkRatio / 10);

            if (10 <= this.#currentBlinkRatio && 0 < this.#blinkRatioStep) {
                this.#blinkRatioStep = -this.#blinkRatioStep;
            }
            this.#currentBlinkRatio += this.#blinkRatioStep;

            requestAnimationFrame(updateFrame);
        };
        updateFrame();
    }
}
