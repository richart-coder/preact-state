// @ts-nocheck
import { useEffect, useLayoutEffect, useState } from "preact/hooks";
import debounce from "../utils/debounce";

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
    /**
     * 檢查查詢是否過期
     * @param {number} staleTime - 過期時間（毫秒）
     * @returns {boolean} 是否過期
     */
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
    /**
     * 更新查詢狀態
     * @param {Object} newState - 新的狀態物件
     */
    updateState(newState) {
      Object.assign(this, newState);
      this.isLoading = this.status === "loading";
      this.isSuccess = this.status === "success";
      this.isError = this.status === "error";

      this.subscribers.forEach((callback) => callback());
    },
  };
};

const MINUTES = 60 * 1000;

/**
 * 查詢快取管理器
 */
const queryCache = {
  map: new Map(),
  /**
   * 獲取或創建查詢物件
   * @param {string} queryKey - 查詢鍵值
   * @returns {Object} 查詢物件
   */
  getOrCreate(queryKey) {
    if (!this.map.has(queryKey)) {
      this.map.set(queryKey, createQuery());
    }
    return this.map.get(queryKey);
  },
};

/**
 * 查詢客戶端，提供快取管理功能
 */
const queryClient = {
  /**
   * 設置查詢資料
   * @param {string} queryKey - 查詢鍵值
   * @param {*|Function} updater - 新資料或更新函數
   */
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

  /**
   * 移除查詢
   * @param {string} queryKey - 查詢鍵值
   * @returns {boolean} 是否成功移除
   */
  removeQuery(queryKey) {
    return queryCache.map.delete(queryKey);
  },

  /**
   * 使查詢失效
   * @param {string} queryKey - 查詢鍵值
   */
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

  /**
   * 獲取快取狀態
   * @param {string} queryKey - 查詢鍵值
   * @param {number} staleTime - 過期時間
   * @returns {Object|null} 快取狀態物件
   */
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

  /**
   * 確保查詢物件存在
   * @param {string} queryKey - 查詢鍵值
   * @returns {Object} 查詢物件
   */
  ensureQuery(queryKey) {
    return queryCache.getOrCreate(queryKey);
  },

  /**
   * 獲取快取統計資訊
   * @returns {Object} 統計資訊物件
   */
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

/**
 * 執行查詢操作
 * @param {Object} queryObject - 查詢物件
 * @param {Function} queryFn - 查詢函數
 * @param {Function} [onSuccess] - 成功回調
 * @param {Function} [onError] - 錯誤回調
 * @returns {Promise} 查詢 Promise
 */
const doQuery = (queryObject, queryFn, onSuccess, onError) => {
  console.log(queryObject, queryFn, onSuccess, onError);
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

/**
 * 用於非同步資料獲取的自定義 Hook
 * @param {Object} options - 配置選項
 * @param {Function} options.queryFn - 查詢函數，接收 signal 參數並返回 Promise
 * @param {string} options.queryKey - 唯一的查詢鍵值，用於快取識別
 * @param {number} [options.gcTime=300000] - 垃圾回收時間（毫秒），預設 5 分鐘
 * @param {number} [options.staleTime=0] - 資料過期時間（毫秒），預設立即過期
 * @param {number|false} [options.refetchInterval=false] - 自動重新獲取間隔（毫秒），false 表示不自動重新獲取
 * @param {boolean} [options.refetchOnWindowFocus=true] - 視窗獲得焦點時是否重新獲取
 * @param {Function} [options.onError] - 錯誤回調函數
 * @param {Function} [options.onSuccess] - 成功回調函數
 * @param {number} [options.retry=3] - 失敗重試次數
 * @param {boolean} [options.enabled=true] - 是否啟用查詢
 * @returns {Object} 包含 refetch 和 Watch 的物件
 * @returns {Function} returns.refetch - 手動重新獲取資料的函數
 * @returns {Function} returns.Watch - 監聽查詢狀態的 React 組件
 */
const useAsyncSignal = ({
  queryFn,
  queryKey,
  gcTime = 5 * MINUTES,
  staleTime = 0,
  refetchInterval = false,
  refetchOnWindowFocus = true,
  onError,
  onSuccess,
  retry = 3,
  enabled = true,
} = {}) => {
  const queryObject = queryClient.ensureQuery(queryKey);
  /**
   * 手動重新獲取資料
   * @returns {Promise} 查詢 Promise
   */
  const refetch = () => {
    return doQuery(queryObject, queryFn, onSuccess, onError);
  };
  const getFrequency = () => {
    if (typeof refetchInterval !== "number" && !refetchInterval) {
      return "low";
    }
    return refetchInterval > 0 && refetchInterval <= 5000
      ? "high"
      : refetchInterval > 5000 && refetchInterval <= 30000
      ? "medium"
      : "low";
  };
  const frequencyStrategy = {
    high: () => {
      const { data, error, isFetching, failureCount } = queryObject;
      if (data && !queryObject.isStale(staleTime)) return false;
      if (isFetching) return false;
      if (!enabled) return false;
      if (error && failureCount >= retry) return false;
      if (!queryFn) return false;
      return true;
    },
    medium: () => {
      const { data, error, isFetching, failureCount } = queryObject;
      if (!enabled || !queryFn) return false;
      if (data && !queryObject.isStale(staleTime)) return false;
      if (isFetching) return false;
      if (error && failureCount >= retry) return false;
      return true;
    },
    low: () => {
      const { data, error, isFetching, failureCount } = queryObject;
      if (!enabled) return false;
      if (!queryFn) return false;
      if (isFetching) return false;
      if (error && failureCount >= retry) return false;
      if (data && !queryObject.isStale(staleTime)) return false;
      return true;
    },
  };
  const canFetchOptimalStrategy = () => {
    const frequency = getFrequency();
    return frequencyStrategy[frequency];
  };
  const canFetch = canFetchOptimalStrategy();
  /*
   * 監聽查詢狀態的 React 組件
   * @param {Object} props - 組件屬性
   * @param {Function} props.children - 渲染函數，接收查詢狀態作為參數
   * @returns {JSX.Element} React 元素
   */
  const Watch = ({ children }) => {
    const [, forceUpdate] = useState({});

    useLayoutEffect(() => {
      const uiForceUpdater = () => {
        forceUpdate({});
      };
      queryObject.subscribers.add(uiForceUpdater);

      return () => {
        queryObject.subscribers.delete(uiForceUpdater);
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

    useLayoutEffect(() => {
      /**
       * 設置定時重新獲取
       * @param {number|false} refetchInterval - 重新獲取間隔
       * @returns {Function} 清理函數
       */
      function setupRefetchSchedule(refetchInterval) {
        if (typeof refetchInterval !== "number" && !refetchInterval)
          return () => {};

        let timerId;
        function schedule() {
          timerId = setTimeout(() => {
            if (canFetch()) {
              refetch();
            }

            schedule();
          }, refetchInterval);
        }
        schedule();

        return () => {
          clearTimeout(timerId);
        };
      }

      const cleanupRefetchSchedule = setupRefetchSchedule(refetchInterval);
      return () => {
        cleanupRefetchSchedule();
      };
    }, []);

    useLayoutEffect(() => {
      /**
       * 設置視窗焦點重新獲取
       * @returns {Function} 清理函數
       */
      const setupRefetchOnFocus = () => {
        if (!refetchOnWindowFocus) return () => {};
        const abortController = new AbortController();
        const handleFocus = () => {
          if (canFetch() && document.visibilityState === "visible") {
            refetch();
          }
        };
        const debouncedHandleFocus = debounce(handleFocus, 200);
        window.addEventListener("focus", debouncedHandleFocus, {
          signal: abortController.signal,
        });
        window.addEventListener("visibilitychange", debouncedHandleFocus, {
          signal: abortController.signal,
        });
        return () => abortController.abort();
      };
      const cleanupRefetchOnFocus = setupRefetchOnFocus();
      return () => {
        cleanupRefetchOnFocus();
      };
    }, []);

    useEffect(() => {
      if (canFetch()) {
        if (queryObject.promise) {
          const data = queryObject.data;
          Object.assign(queryObject, {
            status: data ? "success" : "loading",
            isFetching: true,
            data: data,
            error: null,
          });
        } else {
          refetch();
        }
      }
    }, [queryKey, enabled, staleTime]);

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
