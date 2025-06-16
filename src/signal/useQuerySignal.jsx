import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from "preact/hooks";
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
      this.isLoading = this.status === "pending";
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
   * @param {string} cacheKey - 查詢鍵值
   * @returns {Object} 查詢物件
   */

  getOrCreate(cacheKey) {
    if (!this.map.has(cacheKey)) {
      this.map.set(cacheKey, createQuery());
    }
    return this.map.get(cacheKey);
  },
  get(cacheKey) {
    return this.map.get(cacheKey);
  },

  /**
   * 遍歷所有查詢
   * @param {Function} callbackFn - 回調函數，接收 [queryKey, queryObject] 參數
   */
  forEach(callbackFn) {
    for (const entry of this.map) {
      callbackFn(entry);
    }
  },
  /**
   * 對查詢快取中的所有項目執行 reduce 操作
   * @param {Function} reducer - 累積函數，接收 (accumulator, [cacheKey, queryObject]) 參數
   * @param {*} initValue - 初始累積值
   * @returns {*} 最終累積結果
   */
  reduce(reducer, initValue) {
    let acc = initValue;
    for (const entry of this.map) {
      acc = reducer(acc, entry);
    }
    return acc;
  },
};

const stringifyKey = (key) => JSON.stringify(key);

/**
 * 查詢客戶端，提供快取管理功能
 * @typedef {(string|number|boolean|null|{[key: string]: string|number|boolean|null})[]} QueryKey
 */
const queryClient = {
  /**
   * 設置查詢資料
   * @param {QueryKey} queryKey - 查詢鍵值
   * @param {*|Function} updater - 新資料或更新函數
   */
  setQueryData(queryKey, updater) {
    const cacheKey = stringifyKey(queryKey);
    const queryObject = queryCache.getOrCreate(cacheKey);

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
   * 取消查詢
   * @param {QueryKey} queryKey - 查詢鍵值
   * @param {boolean} exact - 是否精確匹配，true 為精確匹配，false 為前綴匹配
   * @returns {Promise<number>} 取消的查詢數量
   */
  async cancelQueries(queryKey, exact = false) {
    if (!queryKey) return 0;

    const cacheKey = stringifyKey(queryKey);
    return queryCache.reduce((cancelledCount, [_cacheKey, queryObject]) => {
      const isMatch = exact
        ? _cacheKey === cacheKey
        : _cacheKey.includes(cacheKey);

      if (!isMatch) return cancelledCount;

      const abortController = queryObject?.abortController;
      if (abortController && !abortController.signal.aborted) {
        abortController.abort();
        return cancelledCount + 1;
      }
      return cancelledCount;
    }, 0);
  },

  /**
   * 使查詢失效
   * @param {QueryKey} queryKey - 查詢鍵值
   * @param {boolean} exact - 是否精確匹配，true 為精確匹配，false 為前綴匹配
   * @returns {Promise<number>} 失效的查詢數量
   */
  async invalidateQueries(queryKey, exact = false) {
    if (!queryKey) return 0;

    const cacheKey = stringifyKey(queryKey);
    return queryCache.reduce((invalidatedCount, [_cacheKey, queryObject]) => {
      const isMatch = exact
        ? _cacheKey === cacheKey
        : _cacheKey.includes(cacheKey);

      if (!isMatch) return invalidatedCount;

      Object.assign(queryObject, {
        invalidatedAt: Date.now(),
      });
      return invalidatedCount + 1;
    }, 0);
  },

  /**
   * 確保查詢物件存在
   * @param {QueryKey} queryKey - 查詢鍵值
   * @returns {Object} 查詢物件
   */
  ensureQuery(queryKey) {
    const cacheKey = stringifyKey(queryKey);
    return queryCache.getOrCreate(cacheKey);
  },

  /**
   * 移除查詢
   * @param {QueryKey} queryKey - 查詢鍵值
   * @returns {boolean} 是否成功移除
   */
  removeQuery(queryKey) {
    const cacheKey = stringifyKey(queryKey);
    return queryCache.map.delete(cacheKey);
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
  if (queryObject.abortController) {
    queryObject.abortController.abort();
  }
  const data = queryObject.data;

  queryObject.updateState({
    status: data ? "success" : "pending",
    isFetching: true,
  });

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
      if (error.name === "AbortError") {
        queryObject.updateState({
          isFetching: false,
        });
        return;
      }

      queryObject.updateState({
        status: "error",
        error: error,
        isFetching: false,
        errorUpdatedAt: Date.now(),
        failureCount: queryObject.failureCount + 1,
      });

      onError?.(error);
    })
    .finally(() => {
      queryObject.abortController = null;
      queryObject.promise = null;
    });

  return queryPromise;
};

/**
 * 用於非同步資料獲取的自定義 Hook
 * @param {Object} options - 配置選項
 * @param {Function} options.queryFn - 查詢函數，接收 signal 參數並返回 Promise
 * @param {QueryKey} options.queryKey - 唯一的查詢鍵值陣列，用於快取識別和依賴追蹤（所有值必須可序列化）
 * @param {number} [options.gcTime=300000] - 垃圾回收時間（毫秒），預設 5 分鐘
 * @param {number} [options.staleTime=0] - 資料過期時間（毫秒），預設立即過期
 * @param {number|false} [options.refetchInterval=false] - 自動重新獲取間隔（毫秒），false 表示不自動重新獲取
 * @param {boolean} [options.refetchOnWindowFocus=true] - 視窗獲得焦點時是否重新獲取
 * @param {Function} [options.onError] - 錯誤回調函數
 * @param {Function} [options.onSuccess] - 成功回調函數
 * @param {number} [options.retry=3] - 失敗重試次數
 * @param {boolean} [options.enabled=true] - 是否啟用查詢
 * @returns {Object} 包含 refetch 和 Watch 的物件，其中 refetch 是手動重新獲取資料的函數，Watch 是監聽查詢狀態的 React 組件
 */
const useQuerySignal = ({
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
}) => {
  const queryObject = queryClient.ensureQuery(queryKey);

  const frequency = useMemo(() => {
    if (typeof refetchInterval !== "number" && !refetchInterval) {
      return "low";
    }
    return refetchInterval > 0 && refetchInterval <= 5000
      ? "high"
      : refetchInterval > 5000 && refetchInterval <= 30000
      ? "medium"
      : "low";
  }, [refetchInterval]);

  const frequencyStrategy = useMemo(
    () => ({
      high: () => {
        const { data, error, isFetching, failureCount } = queryObject;
        if (isFetching) return false;
        if (data && !queryObject.isStale(staleTime)) return false;
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
    }),
    [enabled, staleTime, retry]
  );

  /**
   * 手動重新獲取資料
   * @returns {Promise} 查詢 Promise
   */
  const refetch = useCallback(() => {
    const canFetch = frequencyStrategy[frequency];

    if (canFetch()) {
      return doQuery(queryObject, queryFn, onSuccess, onError);
    }
  }, [frequencyStrategy, frequency]);

  useEffect(() => {
    const init = async () => {
      await refetch();
    };
    init();
  }, []);

  useLayoutEffect(() => {
    /**
     * 設置定時重新獲取
     * @returns {Function} 清理函數
     */
    function setupRefetchSchedule() {
      if (typeof refetchInterval !== "number" && !refetchInterval)
        return () => {};

      let timerId;
      function schedule(interval) {
        timerId = setTimeout(async () => {
          await refetch();
          schedule(interval);
        }, interval);
      }
      schedule(refetchInterval);

      return () => {
        clearTimeout(timerId);
      };
    }

    const cleanupRefetchSchedule = setupRefetchSchedule();
    return () => {
      cleanupRefetchSchedule();
    };
  }, [refetchInterval]);

  useLayoutEffect(() => {
    /**
     * 設置視窗焦點重新獲取
     * @returns {Function} 清理函數
     */
    const setupRefetchOnFocus = () => {
      if (!refetchOnWindowFocus) return () => {};
      const abortController = new AbortController();
      const handleFocus = async () => {
        if (document.visibilityState === "visible") {
          await refetch();
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
  }, [refetchOnWindowFocus]);

  /**
   * 監聽查詢狀態的 React 組件
   * @param {Object} props - 組件屬性
   * @param {Function} props.children - 渲染函數，接收查詢狀態作為參數
   * @returns {JSX.Element} React 元素
   */
  const Watch = useMemo(
    () =>
      ({ children }) => {
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
                  if (
                    queryObject.subscribers.size === 0 &&
                    !queryObject.promise
                  ) {
                    queryClient.removeQuery(queryKey);
                  }
                }, gcTime);
          };
        }, []);

        return children({
          data: queryObject.data,
          error: queryObject.error,
          status: queryObject.status,
          isLoading: queryObject.isLoading,
          isSuccess: queryObject.isSuccess,
          isError: queryObject.isError,
          isFetching: queryObject.isFetching,
        });
      },
    [stringifyKey(queryKey), gcTime]
  );
  return {
    refetch,
    Watch,
  };
};

export { queryClient };
export default useQuerySignal;
