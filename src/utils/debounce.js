const debounce = (fn, timeout) => {
  let timerId;
  return function (...args) {
    const ctx = this;
    clearTimeout(timerId);
    timerId = setTimeout(() => {
      fn.apply(ctx, args);
    }, timeout);
  };
};

export default debounce;
