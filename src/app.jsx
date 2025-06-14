import { useState } from "preact/hooks";
import React, { useCallback } from "react";
import useAsyncSignal from "./signal/useAsyncSignal";

// 測試用的靜態 queryFn
const testQueryFn = async () => {
  console.log("⚡ queryFn 執行");
  await new Promise((resolve) => setTimeout(resolve, 1000));
  return { message: "成功獲取數據", timestamp: Date.now() };
};

// 無限 Request 測試組件
const InfiniteRequestTest = () => {
  console.log("🏠 InfiniteRequestTest 重新渲染");

  const [requestCount, setRequestCount] = useState(0);

  // 使用 useCallback 避免 queryFn 變化
  const queryFn = useCallback(async () => {
    setRequestCount((prev) => prev + 1);
    return testQueryFn();
  }, []);

  const { Watch } = useAsyncSignal({
    queryKey: "infinite-test",
    queryFn,
    enabled: true,
    staleTime: 2000, // 立即過期
    refetchInterval: 600000,
    onSuccess: (data) => console.log("✅ 成功:", data),
    onError: (error) => console.log("❌ 錯誤:", error),
  });

  return (
    <div style={{ padding: "20px", fontFamily: "monospace" }}>
      <h2 style={{ color: "#e74c3c" }}>⚠️ 無限 Request 測試</h2>

      <div
        style={{
          padding: "15px",
          backgroundColor: "#fff3cd",
          border: "1px solid #ffeaa7",
          borderRadius: "5px",
          marginBottom: "20px",
        }}
      >
        <strong>警告：</strong>這個測試可能會產生無限 Request！
        <br />
        請觀察 Console 輸出和 Request 計數器。
      </div>

      <div style={{ marginBottom: "20px" }}>
        <div
          style={{
            fontSize: "24px",
            fontWeight: "bold",
            color: requestCount > 10 ? "#e74c3c" : "#27ae60",
          }}
        >
          Request 計數: {requestCount}
        </div>
        {requestCount > 10 && (
          <div style={{ color: "#e74c3c", fontWeight: "bold" }}>
            🚨 可能出現無限循環！
          </div>
        )}
      </div>

      <Watch>
        {({ data, error, status, isLoading, isFetching }) => (
          <div
            style={{
              padding: "15px",
              backgroundColor: "#f8f9fa",
              borderRadius: "5px",
              border: "1px solid #dee2e6",
            }}
          >
            <h3>查詢狀態</h3>
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
        )}
      </Watch>

      <div style={{ marginTop: "20px", fontSize: "12px", color: "#666" }}>
        <h4>觀察要點：</h4>
        <ul>
          <li>Console 中是否有持續的 "🚀 doQuery 執行" 輸出</li>
          <li>Request 計數是否持續增加</li>
          <li>"🔄 useAsyncSignal 重新執行" 是否只出現一次</li>
          <li>"👁️ Watch 組件重新渲染" 是否持續出現</li>
          <li>"📊 useEffect 觸發" 的頻率和內容</li>
        </ul>
      </div>
    </div>
  );
};

const App = () => {
  return <InfiniteRequestTest></InfiniteRequestTest>;
};
export default App;
