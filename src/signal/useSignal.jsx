import { useLayoutEffect, useState } from "preact/hooks";
import eventBus from "../utils/eventBus";

function useSignal(initialValue, mode = "local") {
  if (mode === "global") {
    const [state, setState] = useState(initialValue);
    return {
      get value() {
        return state;
      },
      set value(newValue) {
        setState(newValue);
      },
    };
  }
  let _value = initialValue;
  const signalId = Symbol("id");
  const useSignalEffect = () => {
    const [, setState] = useState(initialValue);
    useLayoutEffect(() => {
      const unSubscribe = eventBus.sub(signalId, setState);
      return () => {
        unSubscribe();
        if (eventBus.events.get(signalId)?.size === 0) {
          _value = null;
        }
      };
    }, []);
  };

  const Watch = ({ children }) => {
    useSignalEffect();
    return children();
  };

  return {
    get value() {
      return _value;
    },
    set value(newValue) {
      _value = newValue;
      eventBus.pub(signalId, newValue);
    },
    Watch,
  };
}

export default useSignal;
