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

function createState(initialState) {
  const stateId = Symbol("state");
  let _state = initialState;
  const state = {
    get value() {
      return _state;
    },
    set value(state) {
      _state = state;
      eventBus.pub(stateId, state);
    },
  };

  const WithState = ({ children }) => {
    const [, setState] = useState(initialState);
    useLayoutEffect(() => {
      const unSubscribe = eventBus.sub(stateId, setState);
      return () => {
        unSubscribe();
        if (eventBus.events.get(stateId)?.size === 0) {
          _state = null;
        }
      };
    }, []);

    return children();
  };
  return {
    WithState,
    state,
  };
}

export default createState;
