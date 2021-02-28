import ParticipantsStatusView from './users/ParticipantsStatusView.js';
import ParticipationModel from './users/ParticipationModel.js';
import ParticipationView from './users/ParticipationView.js';
import RendererModel from './3d/RendererModel.js';
import RendererView from './3d/RendererView.js';
import RTCControlModel from './rtc/RTCControlModel.js';
import RTCControlView from './rtc/RTCControlView.js';


export default function() {

    const participationModel = new ParticipationModel();
    const participationView = new ParticipationView(participationModel);
    participationView.setUpEvent();

    const rtcControlModel = new RTCControlModel(participationModel);
    const rtcControlView = new RTCControlView(rtcControlModel);
    rtcControlView.setUpEvent();

    const participantsStatusView = new ParticipantsStatusView(
        participationModel, rtcControlModel
    );
    participantsStatusView.setUpEvent();

    const rendererModel = new RendererModel();
    const rendererView = new RendererView(
        participationModel, rtcControlModel, rendererModel
    );
    rendererView.setUpEvent();
}
