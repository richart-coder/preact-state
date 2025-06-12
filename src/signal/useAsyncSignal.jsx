// @ts-nocheck
import { useEffect, useLayoutEffect, useState } from "preact/hooks";

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
    invalidatedAt: null,
    subscribers: new Set(),
    isStale(staleTime) {
      if (!this.dataUpdatedAt) return true;

      if (this.invalidatedAt && this.invalidatedAt > this.dataUpdatedAt) {
        return true;
      }

      if (Date.now() - this.dataUpdatedAt > staleTime) {
        return true;
      }

      return false;
    },
    updateState: function (newState) {
      Object.assign(this, newState);
      this.isLoading = this.status === "loading";
      this.isSuccess = this.status === "success";
      this.isError = this.status === "error";

      this.subscribers.forEach((callback) => callback());
    },
  };
};

const MINUTES = 60 * 1000;

const queryCache = {
  map: new Map(),
  getOrCreate(queryKey) {
    if (!this.map.has(queryKey)) {
      this.map.set(queryKey, createQuery());
    }
    return this.map.get(queryKey);
  },
};

const queryClient = {
  setQueryData(queryKey, updater) {
    const queryObject = queryCache.getOrCreate(queryKey);

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

  removeQuery(queryKey) {
    return queryCache.map.delete(queryKey);
  },

  invalidateQueries(queryKey) {
    if (queryKey) {
      const queryObject = queryCache.map.get(queryKey);

      if (queryObject) {
        queryObject.updateState({
          invalidatedAt: Date.now(),
        });
      }
    }
  },

  getCacheState(queryKey, staleTime) {
    const queryObject = queryCache.map.get(queryKey);
    if (!queryObject) return null;

    const isStale = queryObject.isStale(staleTime);

    return {
      data: queryObject.data,
      isStale,
      isFresh: !isStale,
      hasActiveQuery: queryObject.promise !== null,
    };
  },
  ensureQuery(queryKey) {
    return queryCache.getOrCreate(queryKey);
  },
  getStats() {
    const stats = {};
    for (const [key, query] of queryCache.map.entries()) {
      stats[key] = {
        subscribersCount: query.subscribers.size,
        status: query.status,
        hasData: query.data !== null,
        dataUpdatedAt: query.dataUpdatedAt,
      };
    }
    return stats;
  },
};

const doQuery = (queryObject, queryFn, onSuccess, onError) => {
  if (queryObject.abortController) {
    queryObject.abortController.abort();
  }

  const data = queryObject?.data;
  if (!data) {
    queryObject.updateState({
      status: "loading",
      isFetching: true,
    });
  } else {
    queryObject.updateState({
      isFetching: true,
    });
  }

  queryObject.abortController = new AbortController();

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
        invalidatedAt: null,
      });
      onSuccess?.(data);
    })
    .catch((error) => {
      if (error.name === "AbortError") return;
      Object.assign(queryObject, {
        isFetching: false,
        errorUpdatedAt: Date.now(),
        failureCount: queryObject.failureCount + 1,
      });

      if (!data) {
        queryObject.updateState({
          status: "error",
          error: error,
        });
      } else {
        queryObject.updateState({
          data: data,
        });
      }

      onError?.(error);
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
    return doQuery(queryObject, queryFn, onSuccess, onError);
  };

  const Watch = ({ children }) => {
    const [, forceUpdate] = useState({});

    useLayoutEffect(() => {
      const callback = () => {
        forceUpdate({});
      };
      queryObject.subscribers.add(callback);

      return () => {
        queryObject.subscribers.delete(callback);
        if (queryObject.subscribers.size > 0) return;

        gcTime == 0
          ? queryClient.removeQuery(queryKey)
          : setTimeout(() => {
              if (queryObject.subscribers.size === 0 && !queryObject.promise) {
                queryClient.removeQuery(queryKey);
              }
            }, gcTime);
      };
    }, []);

    useEffect(() => {
      if (enabled) {
        const cacheState = queryClient.getCacheState(queryKey, staleTime);

        if (cacheState.isStale) {
          if (cacheState.hasActiveQuery) {
            const data = cacheState?.data;
            Object.assign(queryObject, {
              status: data ? "success" : "loading",
              isFetching: true,
              data: data,
              error: null,
            });
          } else {
            if (queryFn) {
              doQuery(queryObject, queryFn, onSuccess, onError);
            }
          }
        }
      }
    }, [enabled, queryKey, staleTime, queryObject.invalidatedAt]);

    return children({
      data: queryObject.data,
      error: queryObject.error,
      status: queryObject.status,
      isLoading: queryObject.isLoading,
      isSuccess: queryObject.isSuccess,
      isError: queryObject.isError,
      isFetching: queryObject.isFetching,
    });
  };

  return {
    refetch,
    Watch,
  };
};

export { queryClient };
export default useAsyncSignal;
