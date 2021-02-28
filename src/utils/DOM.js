const on  = (element, eventName, handler) => {
    if (Array.isArray(element)) {
        element.forEach(e => e.addEventListener(eventName, handler));
    } else {
        element.addEventListener(eventName, handler);
    }
};

let isWindowKeyupEventPrevented = false;
let isWindowKeydownEventPrevented = false;

export default class DOM {

    static query(selector, dom) {
        if (!dom) {
            dom = document;
        }
        return dom.querySelector(selector);
    }

    static all(selector, dom) {
        if (!dom) {
            dom = document;
        }
        return dom.querySelectorAll(selector);
    }

    static click(element, handler) {
        on(element, 'click', handler);
    }

    static change(element, handler) {
        on(element, 'change', handler);
    }

    static keyup(element, handler) {
        on(element, 'keyup', handler);
    }

    static dragover(element, handler) {
        on(element, 'dragover', handler);
    }

    static drop(element, handler) {
        on(element, 'drop', handler);
    }

    static windowKeyupIfNotPrevented(handler) {
        window.addEventListener('keyup', event => {
            if (isWindowKeyupEventPrevented) {
                return;
            }
            handler(event);
        });
    }

    static windowKeydownIfNotPrevented(handler) {
        window.addEventListener('keydown', event => {
            if (isWindowKeydownEventPrevented) {
                return;
            }
            handler(event);
        });
    }

    static intValue(element) {
        if (!element || !element.value) {
            return 0;
        }
        return parseInt(element.value, 10);
    }

    static none(element) {
        element.style.display = 'none';
    }

    static block(element) {
        element.style.display = 'block';
    }

    static optionValue(selectElement) {
        const selectedIndex = selectElement.selectedIndex;
        return selectElement.options[selectedIndex].value;
    }
}
