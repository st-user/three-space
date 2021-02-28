import Logger from '../utils/Logger.js';

export default class FileTransferer {

    #file;
    #rtcConnection;

    constructor(file, rtcConnection) {
        this.#file = file;
        this.#rtcConnection = rtcConnection;
    }

    startTransfer() {

        Logger.debug('Remote peer accept my file so start sending the file.');

        const chunkSize = 16384;
        const fileReader = new FileReader();
        let offset = 0;

        fileReader.addEventListener('error', error => {
            Logger.error(`Encounter an error on reading file. ${offset}`);
            Logger.error(error);
            alert('アップロードされたファイル読み込み中にエラーが発生しました。画面をリロードし再度やり直してください。');
            location.replace('./');
        });
        fileReader.addEventListener('abort', event => {
            Logger.debug(`File reading aborted. ${offset}`);
            Logger.debug(event);
        });

        fileReader.addEventListener('load', event => {

            this.#rtcConnection.sendFileChunk(event.target.result);
            offset += event.target.result.byteLength;
            Logger.trace(`FileRead.onload. current offset: ${offset} ${!this.#file}`);

            if (offset < this.#file.size) {
                readSlice(offset);
            }
        });
        const readSlice = o => {
            const slice = this.#file.slice(offset, o + chunkSize);
            fileReader.readAsArrayBuffer(slice);
        };
        readSlice(0);
    }
}
