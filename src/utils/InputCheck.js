const checkIfInputValueEmpty = errorMsg => {
    return inputValue => !inputValue ? errorMsg : '';
};

const checkIfInputValueMatchesRegExp = (regExp, errorMsg, invert) => {
    return inputValue => {
        let result;
        if (!invert) {
            result = regExp.test(inputValue);
        } else {
            result = !regExp.test(inputValue);
        }
        return result ? errorMsg : '';
    };
};

const checkAll = (inputValue, checkers) => {
    let error = '';
    checkers.forEach(ch => error = error || ch(inputValue));
    return error;
};

export {
    checkIfInputValueEmpty,
    checkIfInputValueMatchesRegExp,
    checkAll
};
