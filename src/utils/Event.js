export default class Event {

    static throttle(func, delay, forceClearEvent) {
        let timer;

        if (forceClearEvent) {
            forceClearEvent.element.addEventListener(
                forceClearEvent.eventName,
                () => {
                    clearTimeout(timer);
                    timer = undefined;
                }
            );
        }

        return event => {

            if (timer) {
                return;
            }

            timer = setTimeout(() => {

                func(event);

                timer = undefined;

            }, delay);

        };
    }
}
