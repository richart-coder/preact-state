# Preact State

一個輕量級的 Preact 狀態管理解決方案，提供精確的組件更新控制。

## 特點

- 🎯 精確的組件更新控制
- 🚀 輕量級實現
- 🔄 發布-訂閱模式
- 🎨 簡潔的 API
- 💪 與 Preact 完美整合

## 安裝

```bash
npm install preact-state
# 或
yarn add preact-state
```

## 快速開始

```jsx
import { createState } from "preact-state";

const Counter = () => {
  const { state, WithState } = createState(0);

  return (
    <div>
      <WithState>{(state) => <h1>{state}</h1>}</WithState>
      <button onClick={() => state.value++}>+1</button>
    </div>
  );
};
```

## 核心概念

### createState

`createState` 函數創建一個新的狀態實例，返回 `state` 和 `WithState` 組件。

```jsx
const { state, WithState } = createState(initialValue);
```

### state

`state` 是一個包含 getter/setter 的物件：

```jsx
// 讀取狀態
console.log(state.value);

// 更新狀態
state.value = newValue;
```

### WithState

`WithState` 是一個用於渲染的組件，它會訂閱狀態更新：

```jsx
<WithState>{(state) => <div>{state}</div>}</WithState>
```

## 進階用法

### 多個狀態

```jsx
const Counter = () => {
  const { state: count, WithState: WithCount } = createState(0);
  const { state: step, WithState: WithStep } = createState(1);

  return (
    <div>
      <WithCount>{(count) => <h1>{count}</h1>}</WithCount>
      <WithStep>{(step) => <h2>Step: {step}</h2>}</WithStep>
      <button onClick={() => (count.value += step.value)}>+{step.value}</button>
    </div>
  );
};
```

### 複雜狀態

```jsx
const { state, WithState } = createState({
  count: 0,
  step: 1,
});

// 更新部分狀態
state.value = { ...state.value, count: state.value.count + 1 };
```

## 與 useState 的對比

| 特性     | createState | useState     |
| -------- | ----------- | ------------ |
| 更新粒度 | 組件級別    | 整個組件樹   |
| 重新渲染 | 精確控制    | 全部重新渲染 |
| 狀態共享 | 可選        | 需要額外實現 |
| 使用方式 | 更靈活      | 更簡單       |

## 性能優化

- 只有使用 `WithState` 的組件會收到更新
- 避免不必要的重新渲染
- 自動清理未使用的狀態

## 開發

```bash
# 安裝依賴
npm install

# 啟動開發服務器
npm run dev

# 構建
npm run build
```

## 相關項目

- [Preact](https://preactjs.com/)
- [React](https://reactjs.org/)
- [Preact Signals](https://preactjs.com/guide/v10/signals/) - 更優雅細粒度的狀態管理解決方案
