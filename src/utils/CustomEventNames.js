const createNames = () => {
    const names = {
        set: (key, value) => {
            Object.keys(names).forEach(existingKey => {
                if (existingKey === key) {
                    throw `CustomEventNamesのキーが重複しています : ${key}`;
                }
            });
            Object.values(names).forEach(existingValue => {
                if (existingValue === value) {
                    throw `CustomEventNamesの値が重複しています : ${value}`;
                }
            });
            names[key] = value;
            return names;
        }
    };
    return names;
};

const CustomEventNames = createNames();
const CustomEventContextNames = createNames();

CustomEventNames
    .set('THREE_SPACE__INPUT_MY_NAME_OR_SPACE_IDENTIFIER', 'three-space/input-my-name-or-space-indentifier')
    .set('THREE_SPACE__PARTICIPATION_COMPLETED', 'three-space/participation-completed')
    .set('THREE_SPACE__PARTICIPATION_DISALLOWED', 'three-space/participation-disallowed')
    .set('THREE_SPACE__AUTHENTICATION_CHECKED', 'three-space/authentication-checked')
    .set('THREE_SPACE__VOICE_CHAT_STARTED', 'three-space/voice-chat-started')
    .set('THREE_SPACE__TEST_SPEECH_STARTED', 'three-space/test-speech-started')
    .set('THREE_SPACE__TEST_SPEECH_ENDED', 'three-space/test-speech-ended')
    .set('THREE_SPACE__VOICE_CHAT_ENDED', 'three-space/voice-chat-ended')
    .set('THREE_SPACE__AVATAR_TYPE_SELECTION_CHANGED', 'three-space/avatar-type-selection-changed')
    .set('THREE_SPACE__VRM_FILE_DROPPED', 'three-space/vrm-file-dropped')
    .set('THREE_SPACE__RECEIVE_REAL_TIME_DATA', 'three-space/receive-real-time-data')
    .set('THREE_SPACE__REAL_TIME_DATA_CHANNEL_CONNECTION_ESTABLISHED', 'three-space/real-time-data-channel-connection-established')
    .set('THREE_SPACE__FILE_TRANSFER_DATA_CHANNEL_CONNECTION_ESTABLISHED', 'three-space/file-transfer-data-channel-connection-established')
    .set('THREE_SPACE__RECEIVE_TRANSFERRED_FILE_BLOB', 'three-space/receive-transferred-file-blob')
    .set('THREE_SPACE__RECEIVING_TRANSFERRED_FILE_BLOB_PROGRESS', 'three-space/receiving-transferred-file-blob-progress')
    .set('THREE_SPACE__ACCEPT_RECEEVING_FILE_BLOG', 'three-space/accept-receiving-file-blob')
    .set('THREE_SPACE__VOICE_SIGNAL_CHANGED', 'three-space/voice-signal-changed')

;

CustomEventContextNames
    .set('START', 'start')

;


export { CustomEventNames, CustomEventContextNames };
