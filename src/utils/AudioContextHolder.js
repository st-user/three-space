export default class AudioContextHolder {

    #audioContext;

    fetchDecodedData(url) {
        return fetch(url)
            .then(response => response.arrayBuffer())
            .then(arrayBuffer => this.decodeAudioData(arrayBuffer, this.#audioContext));
    }

    decodeAudioData(buffer) {
        this.#loadContext();
        return new Promise((resolve, reject) => {
            this.#audioContext.decodeAudioData(buffer, _buffer => {
                resolve(_buffer);
            }, reject);
        });
    }

    audioContext() {
        this.#loadContext();
        return this.#audioContext;
    }

    #loadContext() {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!this.#audioContext) {
            this.#audioContext = new AudioContext();
        }
    }
}
