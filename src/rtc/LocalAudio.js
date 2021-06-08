import AudioContextHolder from '../utils/AudioContextHolder.js';
import Channel from '../channel/Channel.js';

const TEST_SPEECH_URL = 'sound/sample_voice.mp3';

export default class LocalAudio {

    #localAudioContextHolder;

    #gainNode;

    #testSoundBuffer;
    #testGainNode;

    #localStream;

    #destination;
    #stream;

    constructor() {
        this.#localAudioContextHolder = new AudioContextHolder();
    }

    async init() {


        try {
            this.#localStream = await navigator.mediaDevices.getUserMedia({
                audio: true
            });
        } catch(e) {
            alert('マイクが使用できない状態のため、テスト音声のみ利用できます。');
            console.error(e);
        }

        const audioContext = this.#localAudioContextHolder.audioContext();
        const destination = audioContext.createMediaStreamDestination();
        this.#destination = destination;
        this.#stream = destination.stream;


        /* microphone */
        if (this.#localStream) {
            const source = audioContext.createMediaStreamSource(this.#localStream);
            const gainNode = audioContext.createGain();
            this.#gainNode = gainNode;

            source.connect(gainNode);
            gainNode.connect(destination);
        }

        this.changeGain(0);
    }

    changeGain(value) {
        this.#setGainValue(this.#gainNode, value);
        this.#setGainValue(this.#testGainNode, value);
    }

    playTestSpeech(currentGainValue) {
        let initial;
        if (!this.#testSoundBuffer) {
            initial = this.#localAudioContextHolder.fetchDecodedData(
                Channel.toStaticContentsUrl(TEST_SPEECH_URL)
            ).then(buf => {
                this.#testSoundBuffer = buf;
                return this.#testSoundBuffer;
            });
        } else {
            initial = new Promise((resolve) => resolve(this.#testSoundBuffer));
        }

        return initial.then(() => {

            const audioContext = this.#localAudioContextHolder.audioContext();
            const testSource = audioContext.createBufferSource();
            const testGainNode = audioContext.createGain();
            this.#testGainNode = testGainNode;
            this.#setGainValue(this.#testGainNode, currentGainValue);

            testSource.buffer = this.#testSoundBuffer;
            testSource.start(0);

            testSource.connect(testGainNode);
            testGainNode.connect(this.#destination);

            return testSource;

        }).then(testSource => {

            return new Promise(resolve => {
                testSource.onended = () => {
                    testSource.disconnect();
                    resolve();
                };
            });
        });
    }

    addTracks(peerConnection) {
        this.#stream.getTracks().forEach(
            track => peerConnection.addTrack(track, this.#stream)
        );
    }

    // TODO 何を破棄すれば、リソースが適切に開放されるのか精査
    destroy() {
        if (this.#localStream) {
            this.#localStream.getTracks().forEach(tr => tr.stop());
            this.#stream.getTracks().forEach(tr => tr.stop());
            this.#gainNode.disconnect();
        }

        if (this.#testGainNode) {
            this.#testGainNode.disconnect();
        }
    }

    #setGainValue(gainNode, value) {
        if (!gainNode) {
            return;
        }
        gainNode.gain.value = value / 100;
    }
}
