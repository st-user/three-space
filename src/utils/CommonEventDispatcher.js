const CommonEventDispatcher = (() => {

    const $mainOvserver = document.createElement('div');

    const toEventName = (name, context) => !context ? name : `${name}.${context}`;

    return {

        dispatch: (_eventName, detail, context) => {
            const eventName = toEventName(_eventName, context);
            $mainOvserver.dispatchEvent(new CustomEvent(eventName, {
                detail: detail
            }));
        },

        on(_eventName, handler, context) {
            const eventName = toEventName(_eventName, context);
            $mainOvserver.addEventListener(eventName, handler);
        }
    };
})();

export default CommonEventDispatcher;
