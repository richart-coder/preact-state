import { useState } from "preact/hooks";

/**
 * @template T
 * @typedef {Object} SignalObject
 * @property {T | null} value - 當前狀態值（getter/setter）
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
    /**
     * 取得或設定當前的狀態值
     * @type {T}
     */
    get value() {
      return state;
    },
    /**
     * 設定新的狀態值，必須傳入函數
     * @param {(prevState: T) => T} updater - 更新函數
     */
    set value(updater) {
      setState(updater);
    },
  };
}

export default useGlobalSignal;
