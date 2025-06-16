import { useState } from "preact/hooks";

/**
 * @template T
 * @typedef {Object} SignalObject
 * @property {T | null} value - 當前狀態值
 * @property {(prevState: T | null) => T} value - 設定新的狀態值
 */

/**
 * 建立一個全域狀態 Signal，使用 Preact 的 useState 進行狀態管理
 *
 * @template T
 * @param {T} initialValue - 初始值
 * @returns {SignalObject<T>} 包含 value getter/setter 的 Signal 物件
 */
function useGlobalSignal(initialValue) {
  const [state, setState] = useState(initialValue);
  return {
    get value() {
      return state;
    },

    set value(updater) {
      if (typeof updater !== "function") {
        throw new Error("updater must be a function");
      }
      setState(updater);
    },
  };
}

export default useGlobalSignal;
