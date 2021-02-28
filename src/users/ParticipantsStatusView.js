import { CustomEventNames } from '../utils/CustomEventNames.js';
import CommonEventDispatcher from '../utils/CommonEventDispatcher.js';
import DOM from '../utils/DOM.js';
import JobManager from '../utils/JobManager.js';

const PARTICIPANTS_STATUS_REFLESH_INTERVAL_MILLIS = 3000;
const PARTICIPANTS_STATUS_REFLESH_JOB_NAME = 'ParticipantsStatusReflesh';

const statusLineTemplate = () => {
    return `
                <div class="participants-status__list-line">
                </div>
            `;
};

export default class ParticipantsStatusView {

    #participationModel;
    #rtcControlModel;

    #$participantsStatusView;
    #$participantsStatusList;

    constructor(participationModel, rtcControlModel) {
        this.#participationModel = participationModel;
        this.#rtcControlModel = rtcControlModel;

        this.#$participantsStatusView = DOM.query('#participantsStatusView');
        this.#$participantsStatusList = DOM.query('#participantsStatusList');
    }

    setUpEvent() {

        CommonEventDispatcher.on(CustomEventNames.THREE_SPACE__PARTICIPATION_COMPLETED, () => {
            this.#renderView();
            this.#renderParticipants();
        });

        JobManager.registerJob(PARTICIPANTS_STATUS_REFLESH_JOB_NAME, () => {

            this.#renderParticipants();

        }, PARTICIPANTS_STATUS_REFLESH_INTERVAL_MILLIS);

        DOM.none(this.#$participantsStatusView);
    }

    #renderView() {
        DOM.block(this.#$participantsStatusView);
    }

    #renderParticipants() {
        this.#$participantsStatusList.innerHTML = '';
        const statusDescs = [];
        this.#participationModel.forEachParticipant((clientId, name) => {
            let status = this.#rtcControlModel.getStatusDesc(clientId);
            if (!status) {
                status = '-';
            }
            statusDescs.push(`${name} [${status.toUpperCase()}]`);
            this.#$participantsStatusList.insertAdjacentHTML(
                'beforeend', statusLineTemplate()
            );
        });
        const $statusList = DOM.all(
            '.participants-status__list-line', this.#$participantsStatusList
        );
        for (let i = 0; i < statusDescs.length; i++) {
            $statusList[i].textContent = statusDescs[i];
        }
    }
}
