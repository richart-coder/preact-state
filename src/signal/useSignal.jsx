import { useLayoutEffect, useState } from "preact/hooks";
import eventBus from "../utils/eventBus";

/**
 * @template T
 * @typedef {Object} SignalObject
 * @property {T | null} value - 當前狀態值
 * @property {(prevState: T | null) => T} value - 設定新的狀態值
 * @property {JSX.Element} Watch - 監聽組件，用於自動重新渲染
 */

/**
 * 建立一個本地 Signal，使用 eventBus 進行跨組件狀態同步
 * @template T
 * @param {T | null} initialValue - 初始值
 * @returns {SignalObject<T>} 包含 value getter/setter 和 Watch 組件的 Signal 物件
 */
function useSignal(initialValue) {
  let _value = initialValue;
  const signalId = Symbol("id");

  /**
   * 內部 Hook，用於訂閱 Signal 變化並觸發組件重新渲染
   * @private
   */
  const useSignalEffect = () => {
    const [, setState] = useState(initialValue);
    useLayoutEffect(() => {
      const unSubscribe = eventBus.sub(signalId, setState);
      return () => {
        unSubscribe();
        if (eventBus.events.get(signalId)?.size === 0) {
          _value = null;
        }
      };
    }, []);
  };

  /**
   * Watch 組件 - 包裹需要響應 Signal 變化的內容
   * @param {Object} props
   * @param {Function} props.children - 渲染函數，返回任意內容
   * @returns {*} 渲染結果
   */
  const Watch = ({ children }) => {
    useSignalEffect();
    return children();
  };

  return {
    get value() {
      return _value;
    },

    set value(updater) {
      if (typeof updater !== "function") {
        throw new Error("updater must be a function");
      }
      _value = updater(_value);
      eventBus.pub(signalId, _value);
    },
    Watch,
  };
}

export default useSignal;
