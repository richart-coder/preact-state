const debounce = (fn, timeout) => {
  let timerId;
  return (...args) => {
    clearTimeout(timerId);
    timerId = setTimeout(() => {
      fn(...args);
    }, timeout);
  };
};

export default debounce;
