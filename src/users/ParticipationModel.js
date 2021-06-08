import createAuth0Client from '@auth0/auth0-spa-js';

import Channel from '../channel/Channel.js';
import { checkIfInputValueEmpty, checkIfInputValueMatchesRegExp, checkAll } from '../utils/InputCheck.js';
import { CustomEventNames } from '../utils/CustomEventNames.js';
import CommonEventDispatcher from '../utils/CommonEventDispatcher.js';
import Participants from './Participants.js';

const whitespaceRegExp = /^\s+$/;
const charRegExp = /[<>&"'\\]/;
const numberAndAlphaHyphenRegExp = /^[\d|a-z|A-Z|\\-]+$/;

const checkName = inputValue => {
    return checkAll(inputValue, [
        checkIfInputValueEmpty(
            '名前を入力してください'
        ),
        checkIfInputValueMatchesRegExp(
            whitespaceRegExp,
            '名前は空白文字のみで入力することはできません'
        ),
        checkIfInputValueMatchesRegExp(
            charRegExp,
            '名前に「<」「>」「&」「"」「\'」「\\」を使用することはできません'
        ),
    ]);
};

const checkSpaceIdentifier = inputValue => {
    return checkAll(inputValue, [
        checkIfInputValueEmpty(
            '参加キーを入力してください'
        ),
        checkIfInputValueMatchesRegExp(
            whitespaceRegExp,
            '参加キーは空白文字のみで入力することはできません'
        ),
        checkIfInputValueMatchesRegExp(
            numberAndAlphaHyphenRegExp,
            '参加キーは半角数値,アルファベット(大文字、小文字)のみで入力してください',
            true
        ),
    ]);
};

export default class ParticipationModel {

    #myName;
    #spaceIdentifier;
    #errorMessages;

    #participants;

    #auth0;

    constructor() {
        this.#myName = '';
        this.#spaceIdentifier = '';
        this.#errorMessages = ['', ''];
    }

    setInputValues(myName, spaceIdentifier) {

        this.#setMyName(myName);
        this.#setSpaceIdentifier(spaceIdentifier);

        CommonEventDispatcher.dispatch(
            CustomEventNames.THREE_SPACE__INPUT_MY_NAME_OR_SPACE_IDENTIFIER
        );
    }

    getMyName() {
        return this.#myName;
    }

    #setMyName(inputName) {

        let error = checkName(inputName);

        this.#myName = inputName;
        this.#errorMessages[0] = error;
    }

    getSpaceIdentifier() {
        return this.#spaceIdentifier;
    }

    #setSpaceIdentifier(spaceIdentifier) {

        let error = checkSpaceIdentifier(spaceIdentifier);

        this.#spaceIdentifier = spaceIdentifier;
        this.#errorMessages[1] = error;
    }

    getParticipants() {
        return this.#participants;
    }

    forEachParticipant(handler) {
        if (!this.#participants) {
            return;
        }
        this.#participants.getTheOtherClients().forEach(client => {
            handler(client.clientId, client.name);
        });
    }

    async doParticipate() {
        const participants = new Participants(this.#myName);
        this.#participants = participants;
        await participants.participate(this.#spaceIdentifier);
        if (participants.hasParticipated()) {
            CommonEventDispatcher.dispatch(
                CustomEventNames.THREE_SPACE__PARTICIPATION_COMPLETED
            );
        } else {
            CommonEventDispatcher.dispatch(
                CustomEventNames.THREE_SPACE__PARTICIPATION_DISALLOWED
            );
        }
    }

    getErrorMessages() {
        return this.#errorMessages.filter(msg => 0 < msg.length);
    }

    async configureAuth0Client() {
        const config = await fetch(Channel.toEndpointUrl('/auth_config')).then(res => res.json());

        this.#auth0 = await createAuth0Client({
            domain: config.domain,
            client_id: config.clientId,
            audience: config.audience,
            advancedOptions: {
                defaultScope: ''
            },
            cacheLocation: 'memory',
            useRefreshTokens: false
        });
    }

    async checkAuthenticationState() {
        let isAuthenticated = await this.#auth0.isAuthenticated();
        if (!isAuthenticated) {
            const query = window.location.search;

            if (query.includes('code=') && query.includes('state=')) {

                await this.#auth0.handleRedirectCallback();
                isAuthenticated = await this.#auth0.isAuthenticated();

                if (!isAuthenticated) {
                    alert('認証処理に失敗しました。再試行してください。');
                }
                window.history.replaceState({}, document.title, '/');
            }
        }
        CommonEventDispatcher.dispatch(CustomEventNames.THREE_SPACE__AUTHENTICATION_CHECKED, {
            isAuthenticated
        });
    }

    async login() {
        await this.#auth0.loginWithRedirect({
            redirect_uri: window.location.origin
        });
    }

    logout() {
        this.#auth0.logout({
            resturnTo: window.location.origin
        });
    }

    async generateSpaceIdentifier() {
        try {
            const token = await this.#auth0.getTokenSilently();
            return await fetch(Channel.toEndpointUrl('/api/generateSpaceIdentifier'), {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }).then(res => res.json()).then(json => json.spaceIdentifier);
        
        } catch(e) {
            console.error(e);
        }
    }
}
