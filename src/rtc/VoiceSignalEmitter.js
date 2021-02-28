import { CustomEventNames } from '../utils/CustomEventNames.js';
import CommonEventDispatcher from '../utils/CommonEventDispatcher.js';
import Logger from '../utils/Logger.js';

export default class VoiceSignalEmitter {

    #remoteClientId;
    #analyser;
    #dataArray;
    #beforeResult;
    #strengthChecker;

    #isDestroyed;

    constructor(remoteClientId, analyser, strengthLimitHolder) {
        this.#remoteClientId = remoteClientId;
        this.#analyser = analyser;
        this.#analyser.fftSize = 2048;
        const bufferLength = this.#analyser.frequencyBinCount;
        this.#dataArray = new Uint8Array(bufferLength);
        this.#strengthChecker = d => strengthLimitHolder.value <= d;
        this.#beforeResult = 0;
        this.#isDestroyed = false;
    }

    observeSignal() {

        const signal = () => {

            if (this.#isDestroyed) {
                return;
            }

            this.#analyser.getByteTimeDomainData(this.#dataArray);
            const result = this.#measureSignal(this.#dataArray) / 128.0;

            if (this.#beforeResult === result) {
                requestAnimationFrame(signal);
                return;
            }

            Logger.trace(`Emit signal ${result} to ${this.#remoteClientId}`);

            CommonEventDispatcher.dispatch(
                CustomEventNames.THREE_SPACE__VOICE_SIGNAL_CHANGED, {
                    clientId: this.#remoteClientId,
                    signal: result
                }
            );

            this.#beforeResult = result;

            requestAnimationFrame(signal);
        };

        signal();
    }

    destroy() {
        this.#isDestroyed = true;
    }

    #measureSignal(arr) {
        const data = arr.map(d => Math.abs(d - 128)).filter(this.#strengthChecker);
        return data.reduce((a, b) => a + b, 0) / arr.length;
    };
}
