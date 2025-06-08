import { useLayoutEffect, useState } from "preact/hooks";
const eventBus = {
  events: new Map(),

  sub(event, callback) {
    if (!this.events.has(event)) {
      this.events.set(event, new Set());
    }
    this.events.get(event).add(callback);

    return () => {
      this.events.get(event)?.delete(callback);
    };
  },

  pub(event, data) {
    const callbacks = this.events.get(event);
    if (callbacks) {
      callbacks.forEach((callback) => callback(data));
    }
  },
};

function createSignal(initialValue) {
  const signalId = Symbol("id");
  let _value = initialValue;
  const signal = {
    get value() {
      return _value;
    },
    set value(newValue) {
      _value = typeof newValue === "function" ? newValue(_value) : newValue;
      eventBus.pub(signalId, newValue);
    },
  };

  const Watch = ({ children }) => {
    const [, setValue] = useState(initialValue);
    useLayoutEffect(() => {
      const unSubscribe = eventBus.sub(signalId, setValue);
      return () => {
        unSubscribe();
        if (eventBus.events.get(signalId)?.size === 0) {
          _value = null;
        }
      };
    }, []);

    return children();
  };

  return {
    Watch,
    signal,
  };
}

export default createSignal;
