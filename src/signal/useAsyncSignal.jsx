// @ts-nocheck
import { useLayoutEffect, useState } from "preact/hooks";

const createQuery = () => {
  return {
    data: null,
    error: null,
    status: "idle",
    isLoading: false,
    isSuccess: false,
    isError: false,
    isFetching: false,
    dataUpdatedAt: null,
    errorUpdatedAt: null,
    failureCount: 0,
    abortController: null,
    promise: null,
    subscribers: new Set(),

    updateState: function (newState) {
      Object.assign(this, newState);
      this.isLoading = this.status === "loading";
      this.isSuccess = this.status === "success";
      this.isError = this.status === "error";

      this.subscribers.forEach((callback) => callback(this));
    },
  };
};

const MINUTES = 60 * 1000;
const queryCache = new Map();

const queryClient = {
  setQueryData(queryKey, updater) {
    const queryObject =
      queryCache.get(queryKey) ||
      (() => {
        const newQuery = createQuery(queryKey);
        queryCache.set(queryKey, newQuery);
        return newQuery;
      })();

    const newData =
      typeof updater === "function" ? updater(queryObject.data) : updater;

    queryObject.updateState({
      data: newData,
      status: "success",
      dataUpdatedAt: Date.now(),
      error: null,
      failureCount: 0,
    });
  },

  getQueryData(queryKey) {
    const queryObject = queryCache.get(queryKey);
    return queryObject ? queryObject.data : undefined;
  },

  getQuery(queryKey) {
    return queryCache.get(queryKey);
  },

  ensureQuery(queryKey) {
    if (!queryCache.has(queryKey)) {
      queryCache.set(queryKey, createQuery(queryKey));
    }
    return queryCache.get(queryKey);
  },

  removeQuery(queryKey) {
    return queryCache.delete(queryKey);
  },

  invalidateQueries(queryKey) {
    if (queryKey) {
      queryCache.delete(queryKey);
    } else {
      queryCache.clear();
    }
  },

  getCacheState(queryKey, staleTime) {
    const queryObject = queryCache.get(queryKey);
    if (!queryObject || !queryObject.dataUpdatedAt) return null;

    const isStale = Date.now() - queryObject.dataUpdatedAt > staleTime;
    return {
      data: queryObject.data,
      isStale,
      isFresh: !isStale,
      hasActiveQuery: queryObject.promise !== null,
    };
  },
};

const executeQuery = (queryObject, queryKey, queryFn) => {
  if (queryObject.abortController) {
    queryObject.abortController.abort();
  }

  queryObject.abortController = new AbortController();

  queryObject.updateState({
    status: "loading",
    isFetching: true,
    error: null,
  });

  const queryPromise = queryFn({ signal: queryObject.abortController.signal });
  queryObject.promise = queryPromise;

  queryPromise
    .then((data) => {
      queryObject.updateState({
        status: "success",
        data: data,
        error: null,
        isFetching: false,
        dataUpdatedAt: Date.now(),
        failureCount: 0,
      });
    })
    .catch((error) => {
      if (error.name === "AbortError") return;

      queryObject.updateState({
        status: "error",
        error: error,
        isFetching: false,
        errorUpdatedAt: Date.now(),
        failureCount: queryObject.failureCount + 1,
      });
    })
    .finally(() => {
      queryObject.promise = null;
    });

  return queryPromise;
};

const useAsyncSignal = ({
  queryFn,
  queryKey,
  gcTime = 5 * MINUTES,
  staleTime = 0,
  onError,
  onSuccess,
  enabled = true,
} = {}) => {
  const queryObject = queryClient.ensureQuery(queryKey);
  const refetch = () => {
    return executeQuery(queryObject, queryKey, queryFn);
  };

  const Watch = ({ children }) => {
    const [, forceUpdate] = useState({});

    useLayoutEffect(() => {
      const callback = () => forceUpdate({});
      queryObject.subscribers.add(callback);

      if (enabled) {
        const cacheState = queryClient.getCacheState(queryKey, staleTime);

        if (!cacheState || cacheState.isStale) {
          if (queryObject.promise) {
            queryObject.updateState({
              status: "loading",
              isFetching: true,
              data: cacheState?.data || null,
            });
          } else {
            if (queryFn) {
              executeQuery(queryObject, queryKey, queryFn);
            }
          }
        } else {
          queryObject.updateState({
            status: "success",
            data: cacheState.data,
            isFetching: false,
            error: null,
          });
        }
      }

      return () => {
        queryObject.subscribers.delete(callback);

        if (queryObject.subscribers.size === 0 && gcTime > 0) {
          setTimeout(() => {
            if (queryObject.subscribers.size === 0 && !queryObject.promise) {
              queryClient.removeQuery(queryKey);
            }
          }, gcTime);
        }
      };
    }, [queryKey, queryFn, enabled, staleTime, gcTime]);

    return children({
      data: queryObject.data,
      error: queryObject.error,
      status: queryObject.status,
      isLoading: queryObject.isLoading,
      isSuccess: queryObject.isSuccess,
      isError: queryObject.isError,
      isFetching: queryObject.isFetching,
      dataUpdatedAt: queryObject.dataUpdatedAt,
      errorUpdatedAt: queryObject.errorUpdatedAt,
      failureCount: queryObject.failureCount,
    });
  };

  return {
    refetch,
    Watch,
  };
};

export { queryClient };
export default useAsyncSignal;
