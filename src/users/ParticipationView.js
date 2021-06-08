import { CustomEventNames } from '../utils/CustomEventNames.js';
import CommonEventDispatcher from '../utils/CommonEventDispatcher.js';
import DOM from '../utils/DOM.js';

const errorTemplate = msg => {
    return `<div>${msg}</div>`;
};

export default class ParticipationView {

    #participationModel;

    #$participationView;

    #$myName;
    #$spaceIdentifier;
    #$participate;

    #$generateSpaceIdentifierArea;
    #$login;
    #$logoutImmediately;
    #$logout;
    #$generateSpaceIdentifier;

    #$inputErrorArea;

    #$afterParticipationView;
    #$afterParticipationViewMyName;
    #$afterParticipationViewSpaceIdentifier;

    constructor(participationModel) {
        this.#participationModel = participationModel;

        this.#$participationView = DOM.query('#participationView');

        this.#$myName = DOM.query('#myName');
        this.#$spaceIdentifier = DOM.query('#spaceIdentifier');
        this.#$participate = DOM.query('#participate');

        this.#$generateSpaceIdentifierArea = DOM.query('#generateSpaceIdentifierArea');
        this.#$login = DOM.query('#login');
        this.#$logoutImmediately = DOM.query('#logoutImmediately');
        this.#$logout = DOM.query('#logout');
        this.#$generateSpaceIdentifier = DOM.query('#generateSpaceIdentifier');

        this.#$inputErrorArea = DOM.query('#inputErrorArea');

        this.#$afterParticipationView = DOM.query('#afterParticipationView');
        this.#$afterParticipationViewMyName = DOM.query('#afterParticipationViewMyName');
        this.#$afterParticipationViewSpaceIdentifier = DOM.query('#afterParticipationViewSpaceIdentifier');
    }

    setUpEvent() {

        DOM.keyup([ this.#$myName, this.#$spaceIdentifier ], () => {
            this.#participationModel.setInputValues(
                this.#$myName.value,
                this.#$spaceIdentifier.value
            );
        });

        DOM.click(this.#$participate, async () => {
            await this.#participationModel.doParticipate();
        });

        DOM.click(this.#$login, async () => {
            await this.#participationModel.login();
        });

        DOM.click([ this.#$logoutImmediately, this.#$logout ], async () => {
            await this.#participationModel.logout();
        });

        DOM.click(this.#$generateSpaceIdentifier, async () => {

            const spaceIdentifier = await this.#participationModel.generateSpaceIdentifier();

            if (spaceIdentifier) {
                this.#participationModel.setInputValues(
                    this.#$myName.value,
                    spaceIdentifier
                );
            } else {
                alert('参加キーの生成に失敗しました。認証情報が不正である可能性があるため、一度ログアウトし、再試行してください。');
            }
        });

        window.addEventListener('load', async () => {
            await this.#participationModel.configureAuth0Client();
            await this.#participationModel.checkAuthenticationState();
        });

        CommonEventDispatcher.on(CustomEventNames.THREE_SPACE__INPUT_MY_NAME_OR_SPACE_IDENTIFIER, () => {
            this.#render();
        });

        CommonEventDispatcher.on(CustomEventNames.THREE_SPACE__PARTICIPATION_COMPLETED, () => {
            DOM.none(this.#$participationView);
            DOM.block(this.#$afterParticipationView);
        });

        CommonEventDispatcher.on(CustomEventNames.THREE_SPACE__AUTHENTICATION_CHECKED, event => {
            const { isAuthenticated } = event.detail;
            this.#renderAccordingToAuth(isAuthenticated);
        });

        DOM.block(this.#$participationView);
        DOM.none(this.#$generateSpaceIdentifierArea);
        DOM.none(this.#$afterParticipationView);
        this.#$participate.disabled = true;
    }

    #render() {
        const errorMessages = this.#participationModel.getErrorMessages();

        if (!errorMessages || errorMessages.length === 0) {
            this.#$inputErrorArea.textContent = '';
            this.#$participate.disabled = false;

            this.#$afterParticipationViewSpaceIdentifier.textContent = this.#participationModel.getSpaceIdentifier();
            this.#$afterParticipationViewMyName.textContent = this.#participationModel.getMyName();
            this.#$afterParticipationViewMyName.setAttribute('title', this.#participationModel.getMyName());

        } else {
            this.#$inputErrorArea.innerHTML = '';
            errorMessages.forEach(msg => {
                this.#$inputErrorArea.insertAdjacentHTML(
                    'beforeend', errorTemplate(msg)
                );
            });
            this.#$participate.disabled = true;
        }

        this.#$spaceIdentifier.value = this.#participationModel.getSpaceIdentifier();
    }

    #renderAccordingToAuth(isAuthenticated) {
        DOM.block(this.#$generateSpaceIdentifierArea);

        this.#$login.disabled = isAuthenticated;
        this.#$logoutImmediately.disabled = !isAuthenticated;
        this.#$generateSpaceIdentifier.disabled = !isAuthenticated;

        if (isAuthenticated) {
            DOM.block(this.#$logout);
        } else {
            DOM.none(this.#$logout);
        }
    }
}
