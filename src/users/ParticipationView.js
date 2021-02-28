import { CustomEventNames } from '../utils/CustomEventNames.js';
import CommonEventDispatcher from '../utils/CommonEventDispatcher.js';
import DOM from '../utils/DOM.js';

const errorTemplate = msg => {
    return `<div>${msg}</div>`;
};

export default class ParticipationView {

    #participationModel;

    #$participationView;
    #$afterParticipationView;
    #$afterParticipationViewMyName;

    #$myName;
    #$spaceIdentifier;
    #$participate;
    #$inputErrorArea;

    constructor(participationModel) {
        this.#participationModel = participationModel;

        this.#$participationView = DOM.query('#participationView');
        this.#$afterParticipationView = DOM.query('#afterParticipationView');
        this.#$afterParticipationViewMyName = DOM.query('#afterParticipationViewMyName');

        this.#$myName = DOM.query('#myName');
        this.#$spaceIdentifier = DOM.query('#spaceIdentifier');
        this.#$participate = DOM.query('#participate');
        this.#$inputErrorArea = DOM.query('#inputErrorArea');
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

        CommonEventDispatcher.on(CustomEventNames.THREE_SPACE__INPUT_MY_NAME_OR_SPACE_IDENTIFIER, () => {
            this.#renderErrorMessage();
        });

        CommonEventDispatcher.on(CustomEventNames.THREE_SPACE__PARTICIPATION_COMPLETED, () => {
            DOM.none(this.#$participationView);
            DOM.block(this.#$afterParticipationView);
            this.#$afterParticipationViewMyName.textContent = this.#participationModel.getMyName();
        });

        DOM.block(this.#$participationView);
        DOM.none(this.#$afterParticipationView);
        this.#$participate.disabled = true;
    }

    #renderErrorMessage() {
        const errorMessages = this.#participationModel.getErrorMessages();

        if (!errorMessages || errorMessages.length === 0) {
            this.#$inputErrorArea.textContent = '';
            this.#$participate.disabled = false;
        } else {
            this.#$inputErrorArea.innerHTML = '';
            errorMessages.forEach(msg => {
                this.#$inputErrorArea.insertAdjacentHTML(
                    'beforeend', errorTemplate(msg)
                );
            });
            this.#$participate.disabled = true;
        }
    }
}
