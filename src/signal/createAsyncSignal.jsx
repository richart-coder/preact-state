import { useLayoutEffect, useState } from "preact/hooks";
import eventBus from "../utils/eventBus";

const createAsyncSignal = ({
  onError = (error) => {
    console.error(error);
  },
  onSuccess = (data) => {
    console.log(data);
  },
} = {}) => {
  const signalId = Symbol("id");
  let abortController = null;
  const signal = {
    query: (queryFn) => {
      abortController?.abort();

      abortController = new AbortController();
      queryFn({ signal: abortController.signal })
        .then((value) => {
          eventBus.pub(signalId, {
            value,
            loading: false,
            fetching: false,
            error: null,
          });
          onSuccess?.(value);
        })
        .catch((error) => {
          if (error.name === "AbortError") {
            return;
          }
          eventBus.pub(signalId, {
            value: null,
            loading: false,
            fetching: false,
            error,
          });
          onError?.(error);
        });
    },
  };

  const Watch = ({ children }) => {
    const [signal, setSignal] = useState({
      value: null,
      loading: true,
      fetching: true,
      error: null,
    });
    useLayoutEffect(() => {
      const unSubscribe = eventBus.sub(signalId, setSignal);
      return () => {
        unSubscribe();
        if (eventBus.events.get(signalId)?.size === 0) {
          eventBus.events.delete(signalId);
        }
      };
    }, []);
    return children(signal);
  };
  return { signal, Watch };
};

export default createAsyncSignal;
