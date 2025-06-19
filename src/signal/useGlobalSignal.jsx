import { useState } from "preact/hooks";
function useGlobalSignal(initialValue) {
  const [state, setState] = useState(initialValue);
  return {
    get value() {
      return state;
    },

    set value(updater) {
      if (typeof updater !== "function") {
        throw new TypeError("updater must be a function");
      }
      setState(updater);
    },
  };
}

export default useGlobalSignal;
