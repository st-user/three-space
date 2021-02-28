import CommonEventDispatcher from '../utils/CommonEventDispatcher.js';
import Logger from './Logger.js';

export default class Fetch {

    static async fetch(url, fetchOptions, progressEventConfig) {
        const response = await fetch(url, fetchOptions);
        const reader = response.body.getReader();

        const contentLength = response.headers.get('Content-Length');

        let receivedLength = 0;
        const chunks = [];

        while(true) { // eslint-disable-line no-constant-condition
            const { done, value } = await reader.read();

            if (done) {
                break;
            }

            chunks.push(value);
            receivedLength += value.length;

            Logger.trace(`Receive ${receivedLength}/${contentLength}`);

            if (progressEventConfig) {
                const chunkCountPerProgressEvent = progressEventConfig.chunkCountPerProgressEvent;

                if (chunks.length % chunkCountPerProgressEvent === 0) {

                    const eventName = progressEventConfig.eventName;
                    const attachedData = progressEventConfig.attachedData;

                    CommonEventDispatcher.dispatch(
                        eventName,
                        {
                            progress: receivedLength / contentLength,
                            attachedData: attachedData
                        }
                    );
                }
            }
        }

        return chunks;
    }


}
