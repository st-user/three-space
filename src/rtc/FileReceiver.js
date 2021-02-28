import { CustomEventNames } from '../utils/CustomEventNames.js';
import CommonEventDispatcher from '../utils/CommonEventDispatcher.js';
import Logger from '../utils/Logger.js';

export default class FileReceiver {

    #remoteClientId;
    #rtcConnection;
    #expectedFileSize;
    #receiveBuffer = [];
    #receivedSize = 0;
    #options = {};

    #progress;
    #chunkCountPerProgressEvent;

    constructor(remoteClientId, rtcConnection) {
        this.#remoteClientId = remoteClientId;
        this.#rtcConnection = rtcConnection;
        this.#receiveBuffer = [];
        this.#receivedSize = 0;
        this.#options = {};

        this.#progress = 0;
        this.#chunkCountPerProgressEvent = 30;
    }

    onStartRequested(data) {
        Logger.debug(`Remote peer requires to start sending file. fileSize: ${data.fileSize}`);
        this.#expectedFileSize = data.fileSize;
        this.#options = data.options;
        this.#rtcConnection.acceptFileTransfer();
        CommonEventDispatcher.dispatch(
            CustomEventNames.THREE_SPACE__ACCEPT_RECEEVING_FILE_BLOG,
            {
                clientId: this.#remoteClientId
            }
        );
    }

    onReceiveChunk(data) {

        this.#receiveBuffer.push(data);
        this.#receivedSize += data.byteLength;

        this.#progress++;

        if (this.#receivedSize === this.#expectedFileSize) {

            Logger.debug(`Finish reading the file. file size: ${this.#expectedFileSize}`);

            const blob = new Blob(this.#receiveBuffer);
            this.#receiveBuffer = [];
            CommonEventDispatcher.dispatch(
                CustomEventNames.THREE_SPACE__RECEIVE_TRANSFERRED_FILE_BLOB,
                {
                    clientId: this.#remoteClientId,
                    data: blob,
                    options: this.#options
                }
            );
        }

        if (this.#progress % this.#chunkCountPerProgressEvent === 0) {
            CommonEventDispatcher.dispatch(
                CustomEventNames.THREE_SPACE__RECEIVING_TRANSFERRED_FILE_BLOB_PROGRESS,
                {
                    progress: this.#receivedSize / this.#expectedFileSize,
                    attachedData: {
                        clientId: this.#remoteClientId
                    }
                }
            );
        }
    }
}
