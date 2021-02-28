import Channel from '../channel/Channel.js';
import Logger from '../utils/Logger.js';

const PARTICIPATE_URL = '/participate';

export default class Participants {

    myName;
    clientId;
    vrmToken;
    iceServerInfo;

    #pmToken;
    #theOtherClients;
    #managementChannel;

    #hasParticipated;

    constructor(myName) {
        this.myName = myName;
        this.#theOtherClients = new Map();
        this.#hasParticipated = false;
    }

    async participate(spaceIdentifier) {
        await fetch(Channel.toEndpointUrl(PARTICIPATE_URL), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                myName: this.myName,
                spaceIdentifier: spaceIdentifier
            }),
        })
            .then(response => response.json())
            .then(json => {
                this.clientId = json.clientId;
                this.vrmToken = json.tokens.vrmToken;
                this.iceServerInfo = json.iceServerInfo;
                this.#pmToken = json.tokens.pmToken;
                this.#resetAllClients(json.theOtherClients);
                this.#startParticipantsManagement();
                this.#hasParticipated = true;
            }).
            catch(() => {
                alert('参加に失敗しました。参加キーが不正である可能性があります。');
            });
    }

    exist() {
        return 0 < this.#theOtherClients.size;
    }

    hasParticipated() {
        return this.#hasParticipated;
    }

    getChannel() {
        return this.#managementChannel;
    }

    getTheOtherClientIds() {
        return Array.from(this.#theOtherClients.keys());
    }

    getOtherName(clientId) {
        const name = this.#theOtherClients.get(clientId);
        if (!name) {
            return '';
        }
        return name;
    }

    getTheOtherClients() {
        let ret = [];
        for (const entry of this.#theOtherClients) {
            ret.push({
                clientId: entry[0],
                name: entry[1]
            });
        }
        return ret;
    }

    #startParticipantsManagement() {
        this.#managementChannel = Channel.forParticipantsManagement({
            clientId: this.clientId,
            t: this.#pmToken
        });
        this.#managementChannel.onopen(() => {
            this.#managementChannel.send({
                cmd: 'requestParticipantsManagement',
                clientId: this.clientId
            });
        });
        this.#managementChannel.onclose(() => {
            alert('サーバーとの接続が切断されました。画面をリロードして再度参加してください。');
        });
        this.#managementChannel.onmessage(messageObj => {

            switch (messageObj.cmd) {
            case 'newOpen':
                this.#resetAllClients(messageObj.allClients);
                break;
            case 'refleshClients':
                this.#resetAllClients(messageObj.allClients);
                break;
            case 'ping':
                Logger.trace('Receive ping message.');
                this.#managementChannel.send({
                    cmd: 'pong'
                });
                break;
            default:
                Logger.debug(`Not handlable command : ${messageObj.cmd}`);
                return;
            }
        });
    }

    #resetAllClients(allClients) {
        if (!allClients) {
            return;
        }
        this.#theOtherClients.clear();
        allClients.forEach(client => {
            if (this.clientId === client.clientId) {
                return;
            }
            this.#theOtherClients.set(client.clientId, client.name);
        });
    }
}
