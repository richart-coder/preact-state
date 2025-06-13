# useSignal

一個輕量級的 Preact 單點響應式狀態解決方案。

## 特點

- 🎯 **單點響應**：一個 Signal 單點響應
- ⚡ **精確更新**：監聽內部狀態
- 🏠 **局部作用域**：Signal 與使用邏輯緊密結合
- 🚀 **零配置**：無需 Provider 或複雜設置
- 🔄 **自動清理**：組件卸載時自動清理資源

## 核心理念

**單點 Signal** - 每個 Signal 只能有一個響應點，提供精確的局部更新控制。

```jsx
import createSignal from "preact-signal";

const { signal, Watch } = createSignal(0);

return (
  <div>
    <ExpensiveComponent /> {/* 永遠不會重新渲染 */}
    <Watch>{() => <h1>{signal.value}</h1>}</Watch>
    <button onClick={() => signal.value++}>+</button>
  </div>
);
```

## 快速開始

```jsx
const Counter = () => {
  const { signal, Watch } = createSignal(0);

  return (
    <div>
      <Watch>
        {() => (
          <div>
            <h1>計數: {signal.value}</h1>
            <p>雙倍: {signal.value * 2}</p>
          </div>
        )}
      </Watch>
      <button onClick={() => signal.value++}>+</button>
      <button onClick={() => signal.value--}>-</button>
      <button
        onClick={() => {
          signal.value = 0;
        }}
      >
        -
      </button>
    </div>
  );
};
```

## API

### createSignal(initialValue)

創建一個單點 Signal 實例。

```jsx
const { signal, Watch } = createSignal(initialValue);
```

### signal.value

讀取和設置值：

```jsx
// 讀取
const current = signal.value;

// 設置
signal.value = newValue;

// 函數式更新
signal.value = (prev) => prev + 1;
```

### Watch

響應式渲染組件（每個 Signal 只能有一個）：

```jsx
// 滿足所有更新場景
<Watch>{() => <div>{signal.value}</div>}</Watch>
<Watch>{() => <Counter count={signal.value}></Counter>}</Watch>
<Counter>
  <Watch>{() => signal.value * 2}</Watch>
</Counter>
```

# useAsyncSignal

一個基於 Preact 的輕量級非同步資料獲取 Hook，提供智能快取和響應式更新。

## 特點

- 🎯 **精確更新** - 只更新需要的 UI 部分
- 🚀 **智能快取** - 自動管理查詢快取和過期檢查
- 🔄 **自動重新獲取** - 支援定時和焦點重新獲取
- 🛡️ **錯誤處理** - 內建重試機制和錯誤狀態

## 快速開始

```jsx
import useAsyncSignal from "use-async-signal";

const UserProfile = ({ userId }) => {
  const { Watch, refetch } = useAsyncSignal({
    queryKey: `user-${userId}`,
    queryFn: async ({ signal }) => {
      const response = await fetch(`/api/users/${userId}`, { signal });
      return response.json();
    },
  });

  return (
    <div>
      <Watch>
        {({ data, isLoading, isError, error }) => {
          if (isLoading) return <div>載入中...</div>;
          if (isError) return <div>錯誤: {error.message}</div>;
          return <h1>{data.name}</h1>;
        }}
      </Watch>
      <button onClick={refetch}>重新載入</button>
    </div>
  );
};
```

## API

### useAsyncSignal(options)

**主要選項：**

- `queryFn` - 查詢函數（必須）
- `queryKey` - 唯一識別鍵（必須）
- `staleTime` - 資料過期時間，預設 0
- `refetchInterval` - 自動重新獲取間隔，預設 false
- `refetchOnWindowFocus` - 視窗焦點重新獲取，預設 true
- `enabled` - 是否啟用查詢，預設 true
- `retry` - 重試次數，預設 3

**回傳值：**

- `Watch` - 響應式渲染組件
- `refetch` - 手動重新獲取函數

### Watch 組件狀態

```jsx
<Watch>
  {({ data, error, status, isLoading, isSuccess, isError, isFetching }) => (
    // 您的 UI
  )}
</Watch>
```

### queryClient

```jsx
import { queryClient } from "use-async-signal";

// 手動設置資料
queryClient.setQueryData("key", data);

// 使查詢失效
queryClient.invalidateQueries("key");

// 移除查詢
queryClient.removeQuery("key");
```

## 使用場景

- [x] 用戶資料獲取
- [ ] 列表分頁查詢
- [ ] 即時資料更新
- [ ] 條件性查詢
- [ ] 樂觀更新
