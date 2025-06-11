// TestUseSignal.jsx
import { useState } from "preact/hooks";
import useAsyncSignal, { queryClient } from "./signal/useAsyncSignal";
import useSignal from "./signal/useSignal";

function TestUseSignal() {
  const [mode, setMode] = useState("local");

  // 測試 local 模式
  const localSignal = useSignal(0, "local");

  // 測試 global 模式
  const globalSignal = useSignal(10, "global");

  const currentSignal = mode === "local" ? localSignal : globalSignal;

  return (
    <div style={{ padding: "20px", border: "1px solid #ccc", margin: "10px" }}>
      <h2>useSignal 測試</h2>

      <div>
        <label>
          模式:
          <select value={mode} onChange={(e) => setMode(e.target.value)}>
            <option value="local">Local</option>
            <option value="global">Global</option>
          </select>
        </label>
      </div>

      <div style={{ margin: "10px 0" }}>
        <button onClick={() => currentSignal.value++}>增加</button>
        <button onClick={() => currentSignal.value--}>減少</button>
        <button
          onClick={() =>
            (currentSignal.value = Math.floor(Math.random() * 100))
          }
        >
          隨機值
        </button>
      </div>

      <div>
        <h3>直接讀取值: {currentSignal.value}</h3>
      </div>

      <div>
        <h3>使用 Watch 組件:</h3>
        <currentSignal.Watch>
          {() => (
            <div style={{ background: "#f0f0f0", padding: "10px" }}>
              當前值: {currentSignal.value}
            </div>
          )}
        </currentSignal.Watch>
      </div>

      <div>
        <h3>多個 Watch 組件測試:</h3>
        <currentSignal.Watch>
          {() => <div>Watch 1: {currentSignal.value}</div>}
        </currentSignal.Watch>
        <currentSignal.Watch>
          {() => <div>Watch 2: {currentSignal.value * 2}</div>}
        </currentSignal.Watch>
        <currentSignal.Watch>
          {() => (
            <div>
              Watch 3: {currentSignal.value > 5 ? "大於5" : "小於等於5"}
            </div>
          )}
        </currentSignal.Watch>
      </div>
    </div>
  );
}

// TestUseAsyncSignal.jsx
function TestUseAsyncSignal() {
  const [userId, setUserId] = useState(1);
  const [enabled, setEnabled] = useState(true);

  // 模擬 API 請求 - 增加更多變化的數據
  const fetchUser = async ({ signal }) => {
    await new Promise((resolve) => setTimeout(resolve, 1000)); // 模擬延遲

    if (Math.random() > 0.8) {
      throw new Error(`獲取用戶 ${userId} 失敗`);
    }

    // 增加更多會變化的數據，讓清除緩存效果更明顯
    const requestCount = Math.floor(Math.random() * 100) + 1;
    const status = ["active", "inactive", "pending"][
      Math.floor(Math.random() * 3)
    ];
    const randomScore = Math.floor(Math.random() * 1000);
    const colors = ["red", "blue", "green", "purple", "orange"];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];

    return {
      id: userId,
      name: `用戶 ${userId}`,
      email: `user${userId}@example.com`,
      timestamp: new Date().toLocaleTimeString(),
      requestCount, // 每次請求都不同
      status, // 隨機狀態
      score: randomScore, // 隨機分數
      favoriteColor: randomColor, // 隨機顏色
      lastLogin: new Date(
        Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000
      ).toLocaleDateString(),
      fetchId: Math.random().toString(36).substr(2, 9), // 唯一 ID 證明是新請求
      version: Date.now(), // 版本號
    };
  };

  const userQuery = useAsyncSignal({
    queryKey: `user-${userId}`,
    queryFn: fetchUser,
    enabled,
    staleTime: 10000, // 10秒內不會重新請求
    gcTime: 5000, // 5秒後清理
    onSuccess: (data) => console.log("成功獲取用戶:", data),
    onError: (error) => console.log("錯誤:", error.message),
  });

  return (
    <div style={{ padding: "20px", border: "1px solid #ccc", margin: "10px" }}>
      <h2>useAsyncSignal 測試</h2>

      <div style={{ margin: "10px 0" }}>
        <label>
          用戶 ID:
          <input
            type="number"
            value={userId}
            onChange={(e) => setUserId(Number(e.target.value))}
            min="1"
            max="10"
          />
        </label>

        <label style={{ marginLeft: "20px" }}>
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
          />
          啟用查詢
        </label>
      </div>

      <div style={{ margin: "10px 0" }}>
        <button onClick={() => userQuery.refetch()}>手動刷新</button>
        <button
          onClick={() => queryClient.invalidateQueries(`user-${userId}`)}
          style={{
            backgroundColor: "#ff6b6b",
            color: "white",
            marginLeft: "10px",
          }}
        >
          清除緩存 (會自動更新)
        </button>
        <button
          onClick={() => {
            queryClient.setQueryData(`user-${userId}`, {
              id: userId,
              name: `手動設置的用戶 ${userId}`,
              email: `manual${userId}@example.com`,
              timestamp: new Date().toLocaleTimeString(),
              requestCount: 999,
              status: "manual",
              score: 9999,
              favoriteColor: "gold",
              lastLogin: "手動設置",
              fetchId: "MANUAL-SET",
              version: "MANUAL",
            });
          }}
          style={{
            backgroundColor: "#4ecdc4",
            color: "white",
            marginLeft: "10px",
          }}
        >
          手動設置數據
        </button>
      </div>

      <userQuery.Watch>
        {({
          data,
          error,
          status,
          isLoading,
          isSuccess,
          isError,
          isFetching,
          dataUpdatedAt,
          failureCount,
        }) => (
          <div style={{ background: "#f9f9f9", padding: "15px" }}>
            <h3>查詢狀態</h3>
            <div>
              <strong>狀態:</strong> {status}
              {isLoading && " 🔄 (載入中...)"}
              {isFetching && " ⏳ (請求中...)"}
            </div>
            <div>
              <strong>是否成功:</strong> {isSuccess ? "✅" : "❌"}
            </div>
            <div>
              <strong>是否錯誤:</strong> {isError ? "❌" : "✅"}
            </div>
            <div>
              <strong>失敗次數:</strong> {failureCount}
            </div>
            {dataUpdatedAt && (
              <div>
                <strong>數據更新時間:</strong>{" "}
                {new Date(dataUpdatedAt).toLocaleTimeString()}
              </div>
            )}

            {data && (
              <div
                style={{
                  background: "#e8f5e8",
                  padding: "15px",
                  margin: "10px 0",
                  border: "1px solid #4caf50",
                  borderRadius: "5px",
                }}
              >
                <h4>用戶數據: (觀察這些值的變化)</h4>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "10px",
                  }}
                >
                  <div>
                    <strong>ID:</strong> {data.id}
                  </div>
                  <div>
                    <strong>姓名:</strong> {data.name}
                  </div>
                  <div>
                    <strong>郵件:</strong> {data.email}
                  </div>
                  <div>
                    <strong>狀態:</strong>
                    <span
                      style={{
                        padding: "2px 8px",
                        backgroundColor:
                          data.status === "active"
                            ? "#4caf50"
                            : data.status === "inactive"
                            ? "#f44336"
                            : "#ff9800",
                        color: "white",
                        borderRadius: "3px",
                        marginLeft: "5px",
                      }}
                    >
                      {data.status}
                    </span>
                  </div>
                  <div>
                    <strong>分數:</strong>
                    <span
                      style={{
                        fontSize: "18px",
                        fontWeight: "bold",
                        color: "#2196f3",
                      }}
                    >
                      {data.score}
                    </span>
                  </div>
                  <div>
                    <strong>請求次數:</strong>
                    <span
                      style={{
                        fontSize: "16px",
                        fontWeight: "bold",
                        color: "#9c27b0",
                      }}
                    >
                      {data.requestCount}
                    </span>
                  </div>
                  <div>
                    <strong>喜愛顏色:</strong>
                    <span
                      style={{
                        padding: "2px 8px",
                        backgroundColor: data.favoriteColor,
                        color: "white",
                        borderRadius: "3px",
                        marginLeft: "5px",
                      }}
                    >
                      {data.favoriteColor}
                    </span>
                  </div>
                  <div>
                    <strong>最後登入:</strong> {data.lastLogin}
                  </div>
                  <div>
                    <strong>獲取時間:</strong> {data.timestamp}
                  </div>
                  <div>
                    <strong>版本號:</strong>
                    <span
                      style={{
                        fontSize: "12px",
                        fontFamily: "monospace",
                        backgroundColor: "#f0f0f0",
                        padding: "2px 4px",
                      }}
                    >
                      {data.version}
                    </span>
                  </div>
                </div>
                <div
                  style={{
                    fontSize: "12px",
                    color: "#666",
                    marginTop: "10px",
                    textAlign: "center",
                  }}
                >
                  🔍 請求ID: <strong>{data.fetchId}</strong> (證明是新請求)
                </div>
              </div>
            )}

            {error && (
              <div
                style={{
                  background: "#ffe8e8",
                  padding: "10px",
                  margin: "10px 0",
                  border: "1px solid #f44336",
                  borderRadius: "5px",
                }}
              >
                <h4>❌ 錯誤信息:</h4>
                <div>{error.message}</div>
              </div>
            )}
          </div>
        )}
      </userQuery.Watch>

      <div style={{ marginTop: "20px" }}>
        <h3>多個組件使用相同查詢 (測試緩存):</h3>
        <userQuery.Watch>
          {({ data, isLoading, isFetching }) => (
            <div
              style={{
                background: "#fff3cd",
                padding: "10px",
                margin: "5px 0",
              }}
            >
              📋 組件 A: {isLoading ? "🔄 載入中..." : data?.name || "無數據"}
              {isFetching && !isLoading && " ⏳ 背景更新中..."}
              {data && (
                <span style={{ marginLeft: "10px", fontSize: "12px" }}>
                  (分數: {data.score})
                </span>
              )}
            </div>
          )}
        </userQuery.Watch>
        <userQuery.Watch>
          {({ data, isLoading, isFetching }) => (
            <div
              style={{
                background: "#d1ecf1",
                padding: "10px",
                margin: "5px 0",
              }}
            >
              📧 組件 B: {isLoading ? "🔄 載入中..." : data?.email || "無數據"}
              {isFetching && !isLoading && " ⏳ 背景更新中..."}
              {data && (
                <span style={{ marginLeft: "10px", fontSize: "12px" }}>
                  (請求ID: {data.fetchId})
                </span>
              )}
            </div>
          )}
        </userQuery.Watch>
        <userQuery.Watch>
          {({ data, isLoading, isFetching }) => (
            <div
              style={{
                background: "#e1f5fe",
                padding: "10px",
                margin: "5px 0",
              }}
            >
              🎨 組件 C:{" "}
              {isLoading ? "🔄 載入中..." : data?.favoriteColor || "無數據"}
              {isFetching && !isLoading && " ⏳ 背景更新中..."}
              {data && (
                <span style={{ marginLeft: "10px", fontSize: "12px" }}>
                  (狀態: {data.status})
                </span>
              )}
            </div>
          )}
        </userQuery.Watch>
      </div>

      <div
        style={{
          marginTop: "20px",
          padding: "10px",
          background: "#f0f8ff",
          borderRadius: "5px",
        }}
      >
        <h4>💡 測試說明:</h4>
        <ul style={{ fontSize: "14px" }}>
          <li>
            <strong>"手動刷新"</strong> - 直接調用 refetch，會顯示 loading 狀態
          </li>
          <li>
            <strong>"清除緩存"</strong> - 使用 invalidateQueries，會觸發背景更新
            (isFetching)
          </li>
          <li>
            <strong>"手動設置數據"</strong> - 直接設置緩存數據，不發送請求
          </li>
          <li>
            觀察各個隨機值 (分數、顏色、請求ID) 的變化來確認數據確實更新了
          </li>
        </ul>
      </div>
    </div>
  );
}

function App() {
  return (
    <div>
      <h1>🧪 Signal 測試應用</h1>
      <TestUseSignal />
      <TestUseAsyncSignal />
    </div>
  );
}

export default App;
