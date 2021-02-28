import { checkIfInputValueEmpty, checkIfInputValueMatchesRegExp, checkAll } from '../utils/InputCheck.js';
import { CustomEventNames } from '../utils/CustomEventNames.js';
import CommonEventDispatcher from '../utils/CommonEventDispatcher.js';
import Participants from './Participants.js';

const whitespaceRegExp = /^\s+$/;
const charRegExp = /[<>&"'\\]/;
const numberAndAlphaRegExp = /^[\d|a-z|A-Z]+$/;

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
            numberAndAlphaRegExp,
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

}
