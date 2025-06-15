// @ts-nocheck
import { useCallback, useState } from "preact/hooks";
import React from "react";
import useQuerySignal from "./signal/useQuerySignal";
const TestComponent = () => {
  const [enabled, setEnabled] = useState(true);
  const [refetchOnWindowFocus, setRefetchOnWindowFocus] = useState(true);
  const [refetchInterval, setRefetchInterval] = useState(false);
  const [logs, setLogs] = useState([]);

  const addLog = useCallback((message) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs((prev) => [...prev, `${timestamp}: ${message}`]);
  }, []);

  // 模擬的 queryFn
  const queryFn = useCallback(async () => {
    addLog("🔄 queryFn 執行");
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return { data: `Data at ${Date.now()}`, random: Math.random() };
  }, [addLog]);

  // 假設這是你的 useAsyncSignal
  const { refetch, Watch } = useQuerySignal({
    queryKey: ["test-data"],
    queryFn,
    enabled,
    refetchOnWindowFocus,
    refetchInterval: refetchInterval ? 3000 : false, // 3秒間隔
    onSuccess: (data) => addLog(`✅ 成功: ${JSON.stringify(data)}`),
    onError: (error) => addLog(`❌ 錯誤: ${error.message}`),
    staleTime: 0, // 2秒後過期
  });

  const clearLogs = () => setLogs([]);

  return (
    <div style={{ padding: "20px", fontFamily: "monospace" }}>
      <h2>useAsyncSignal 時機測試</h2>

      <div style={{ marginBottom: "20px" }}>
        <h3>控制選項</h3>
        <div style={{ display: "flex", gap: "15px", flexWrap: "wrap" }}>
          <label>
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
            />
            enabled
          </label>

          <label>
            <input
              type="checkbox"
              checked={refetchOnWindowFocus}
              onChange={(e) => setRefetchOnWindowFocus(e.target.checked)}
            />
            refetchOnWindowFocus
          </label>

          <label>
            <input
              type="checkbox"
              checked={refetchInterval}
              onChange={(e) => setRefetchInterval(e.target.checked)}
            />
            refetchInterval (3秒)
          </label>
        </div>
      </div>

      <div style={{ marginBottom: "20px" }}>
        <h3>手動觸發</h3>
        <button onClick={() => refetch()}>🔄 手動 refetch</button>
      </div>

      <div style={{ marginBottom: "20px" }}>
        <h3>自動觸發測試</h3>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <button
            onClick={() => {
              addLog("👁️ 模擬失去焦點");
              window.dispatchEvent(new Event("blur"));
            }}
          >
            模擬失去焦點
          </button>

          <button
            onClick={() => {
              addLog("👁️ 模擬重新聚焦");
              window.dispatchEvent(new Event("focus"));
            }}
          >
            模擬重新聚焦
          </button>

          <button
            onClick={() => {
              addLog("👁️ 模擬切換分頁 (離開)");
              Object.defineProperty(document, "visibilityState", {
                value: "hidden",
                configurable: true,
              });
              document.dispatchEvent(new Event("visibilitychange"));
            }}
          >
            模擬切換分頁 (離開)
          </button>

          <button
            onClick={() => {
              addLog("👁️ 模擬切換分頁 (回來)");
              Object.defineProperty(document, "visibilityState", {
                value: "visible",
                configurable: true,
              });
              document.dispatchEvent(new Event("visibilitychange"));
            }}
          >
            模擬切換分頁 (回來)
          </button>
        </div>
      </div>

      <Watch>
        {({ data, error, status, isLoading, isFetching }) => (
          <div style={{ marginBottom: "20px" }}>
            <h3>查詢狀態</h3>
            <div
              style={{
                padding: "10px",
                backgroundColor: "#f5f5f5",
                borderRadius: "5px",
                fontSize: "14px",
              }}
            >
              <div>
                <strong>Status:</strong> {status}
              </div>
              <div>
                <strong>Loading:</strong> {isLoading ? "是" : "否"}
              </div>
              <div>
                <strong>Fetching:</strong> {isFetching ? "是" : "否"}
              </div>
              <div>
                <strong>Data:</strong> {data ? JSON.stringify(data) : "無"}
              </div>
              <div>
                <strong>Error:</strong> {error ? error.message : "無"}
              </div>
            </div>
          </div>
        )}
      </Watch>

      <div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <h3>執行日誌</h3>
          <button onClick={clearLogs} style={{ padding: "5px 10px" }}>
            清除日誌
          </button>
        </div>
        <div
          style={{
            height: "300px",
            overflow: "auto",
            border: "1px solid #ccc",
            padding: "10px",
            backgroundColor: "#fff",
            fontSize: "12px",
          }}
        >
          {logs.map((log, index) => (
            <div key={index}>{log}</div>
          ))}
        </div>
      </div>

      <div style={{ marginTop: "20px", fontSize: "12px", color: "#666" }}>
        <h4>測試說明:</h4>
        <ul>
          <li>
            <strong>初始載入:</strong> 組件掛載時自動觸發
          </li>
          <li>
            <strong>手動 refetch:</strong> 點擊按鈕觸發
          </li>
          <li>
            <strong>視窗聚焦:</strong> 測試 focus 事件觸發 (需要
            refetchOnWindowFocus=true)
          </li>
          <li>
            <strong>分頁切換:</strong> 測試 visibilitychange 事件觸發
          </li>
          <li>
            <strong>定時刷新:</strong> 每 3 秒自動觸發 (需要
            refetchInterval=true)
          </li>
          <li>
            <strong>enabled:</strong> 控制是否啟用查詢
          </li>
        </ul>
        <p>
          <strong>注意:</strong> 真實的焦點事件需要實際切換視窗或分頁才能測試
        </p>
      </div>
    </div>
  );
};

const App = () => {
  return <TestComponent></TestComponent>;
};
export default App;
