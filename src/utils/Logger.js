
const isFunction = functionToCheck => {
    return functionToCheck && {}.toString.call(functionToCheck) === '[object Function]';
};

window.__three_space_config = !window.__three_space_config ? {} : window.__three_space_config;
window.__three_space_config.logLevel = 2;

const LOG_LEVEL = {
    TRACE: 0,
    DEBUG: 1,
    INFO: 2,
    WARN: 3,
    ERROR: 4,
};

const isLogLevelUnder = level => {
    return window.__three_space_config.logLevel <= level;
};

// TODO console.logなどと同じように引数を渡せるようにする
export default class Logger {

    static debug(message) {
        if (isLogLevelUnder(LOG_LEVEL.DEBUG)) {
            const _message = isFunction(message) ? message() : message;
            console.log(_message);
        }
    }

    static trace(message) {
        if (isLogLevelUnder(LOG_LEVEL.TRACE)) {
            const _message = isFunction(message) ? message() : message;
            console.log(_message);
        }
    }

    static error(message) {
        if (isLogLevelUnder(LOG_LEVEL.ERROR)) {
            const _message = isFunction(message) ? message() : message;
            console.error(_message);
        }
    }
}
