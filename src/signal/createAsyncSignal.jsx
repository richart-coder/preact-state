// @ts-nocheck
import { useLayoutEffect, useState } from "preact/hooks";
import eventBus from "../utils/eventBus";

const MINUTES = 60 * 1000;
const cache = new Map();
const activeQueries = new Map();

const getCacheState = (queryKey, staleTime) => {
  const cached = cache.get(queryKey);
  if (!cached) return null;

  const isStale = Date.now() - cached.last_query_at > staleTime;
  return {
    data: cached.data,
    isStale,
    isFresh: !isStale,
  };
};

const updateCache = (queryKey, value) => {
  cache.set(queryKey, {
    data: value,
    last_query_at: Date.now(),
  });
};

const cleanupActiveQuery = (queryKey) => {
  activeQueries.delete(queryKey);
};

const createAsyncSignal = ({
  queryKey,
  gcTime = 5 * MINUTES,
  staleTime = 0,
  onError,
  onSuccess,
} = {}) => {
  const signalId = Symbol("id");
  let abortController = null;

  const updateState = (state) => {
    eventBus.pub(signalId, state);
  };

  const handleQuerySuccess = (value) => {
    cleanupActiveQuery(queryKey);

    updateState({
      value,
      loading: false,
      fetching: false,
      error: null,
    });

    updateCache(queryKey, value);
    onSuccess?.(value);
  };

  const handleQueryError = (error) => {
    cleanupActiveQuery(queryKey);

    if (error.name === "AbortError") {
      return;
    }

    const cached = cache.get(queryKey);
    updateState({
      value: cached?.data || null,
      loading: false,
      fetching: false,
      error,
    });

    onError?.(error);
  };

  const subscribeToExistingQuery = (existingQuery) => {
    existingQuery.then(handleQuerySuccess).catch(handleQueryError);
  };

  const executeNewQuery = (queryFn) => {
    abortController?.abort();
    abortController = new AbortController();

    const queryPromise = queryFn({ signal: abortController.signal });
    activeQueries.set(queryKey, queryPromise);

    queryPromise.then(handleQuerySuccess).catch(handleQueryError);
  };

  const signal = {
    query: (queryFn) => {
      if (activeQueries.has(queryKey)) {
        const cacheState = getCacheState(queryKey, staleTime);
        updateState({
          value: cacheState?.data || null,
          loading: !cacheState,
          fetching: true,
          error: null,
        });

        subscribeToExistingQuery(activeQueries.get(queryKey));
        return;
      }

      const cacheState = getCacheState(queryKey, staleTime);

      if (cacheState?.isFresh) {
        updateState({
          value: cacheState.data,
          loading: false,
          fetching: false,
          error: null,
        });
        return;
      }

      if (cacheState) {
        updateState({
          value: cacheState.data,
          loading: false,
          fetching: true,
          error: null,
        });
      } else {
        updateState({
          value: null,
          loading: true,
          fetching: true,
          error: null,
        });
      }

      executeNewQuery(queryFn);
    },

    invalidate: () => {
      cache.delete(queryKey);
    },
  };

  const Watch = ({ children }) => {
    const [signalState, setSignalState] = useState(() => {
      const cacheState = getCacheState(queryKey, staleTime);

      if (cacheState) {
        return {
          value: cacheState.data,
          loading: false,
          fetching: cacheState.isStale || activeQueries.has(queryKey),
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
              if (!activeQueries.has(queryKey)) {
                cache.delete(queryKey);
              }
            }, gcTime);
          }
        }
      };
    }, []);

    return children(signalState);
  };

  return { signal, Watch };
};

export default createAsyncSignal;
