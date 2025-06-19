import { useLayoutEffect, useState } from "preact/hooks";
import EventBus from "../utils/EventBus";
const eventBus = new EventBus();

function useSignal(initialValue) {
  let _value = initialValue;
  const signalId = Symbol("id");

  const useSignalEffect = () => {
    const [, setState] = useState(initialValue);
    useLayoutEffect(() => {
      eventBus.on(signalId, setState);
      return () => {
        eventBus.off(signalId, setState);
        if (eventBus.getHandlers(signalId)?.size === 0) {
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

    set value(updater) {
      if (typeof updater !== "function") {
        throw new TypeError("updater must be a function");
      }
      _value = updater(_value);
      eventBus.emit(signalId, _value);
    },
    Watch,
  };
}

export default useSignal;
