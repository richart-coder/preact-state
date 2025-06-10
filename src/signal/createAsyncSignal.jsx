// @ts-nocheck
import { useLayoutEffect, useState } from "preact/hooks";
import eventBus from "../utils/eventBus";

const MINUTES = 60 * 1000;
const cache = new Map();

const createAsyncSignal = ({
  queryKey,
  gcTime = 5 * MINUTES,
  staleTime = 0,
  onError,
  onSuccess,
} = {}) => {
  const signalId = Symbol("id");
  let abortController = null;

  const signal = {
    query: (queryFn) => {
      const cached = cache.get(queryKey);
      if (cached) {
        const isStale = Date.now() - cached.last_query_at > staleTime;

        if (!isStale) {
          eventBus.pub(signalId, {
            value: cached.data,
            loading: false,
            fetching: false,
            error: null,
          });
          return;
        }

        eventBus.pub(signalId, {
          value: cached.data,
          loading: false,
          fetching: true,
          error: null,
        });
      } else {
        eventBus.pub(signalId, {
          value: null,
          loading: true,
          fetching: true,
          error: null,
        });
      }

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

          cache.set(queryKey, {
            data: value,
            last_query_at: Date.now(),
          });

          onSuccess?.(value);
        })
        .catch((error) => {
          if (error.name === "AbortError") {
            return;
          }

          eventBus.pub(signalId, {
            value: cached?.data || null,
            loading: false,
            fetching: false,
            error,
          });

          onError?.(error);
        });
    },

    invalidate: () => {
      cache.delete(queryKey);
    },

    abort: () => {
      abortController?.abort();
    },
  };

  const Watch = ({ children }) => {
    const [signalState, setSignalState] = useState(() => {
      const cached = cache.get(queryKey);
      if (cached) {
        const isStale = Date.now() - cached.last_query_at > staleTime;
        return {
          value: cached.data,
          loading: false,
          fetching: isStale,
          error: null,
        };
      }

      return {
        value: null,
        loading: true,
        fetching: true,
        error: null,
      };
    });

    useLayoutEffect(() => {
      const unSubscribe = eventBus.sub(signalId, setSignalState);

      return () => {
        unSubscribe();

        if (eventBus.events.get(signalId)?.size === 0) {
          eventBus.events.delete(signalId);

          if (gcTime > 0) {
            setTimeout(() => {
              cache.delete(queryKey);
            }, gcTime);
          }
        }
      };
    }, []);
    console.log(cache);
    return children(signalState);
  };

  return { signal, Watch };
};

export default createAsyncSignal;
