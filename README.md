# Preact Signal

一個輕量級的 Preact 單點響應式狀態解決方案。

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

## 特點

- 🎯 **單點響應**：一個 Signal 單點響應
- ⚡ **精確更新**：監聽內部狀態
- 🏠 **局部作用域**：Signal 與使用邏輯緊密結合
- 🚀 **零配置**：無需 Provider 或複雜設置
- 🔄 **自動清理**：組件卸載時自動清理資源
