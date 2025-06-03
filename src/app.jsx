import { useState } from "preact/hooks";
import "./app.css";
import createState from "./createState";
const CounterWithState = () => {
  const { state, WithState } = createState(0);
  const increment = () => {
    state.value = state.value + 1;
  };
  const decrement = () => {
    state.value = state.value - 1;
  };
  console.log("render", "CounterWithState");
  return (
    <div>
      <WithState>{(state) => <h1>{state}</h1>}</WithState>
      <button onClick={increment}>+1</button>
      <button onClick={decrement}>-1</button>
    </div>
  );
};
const Counter = () => {
  const [state, setState] = useState(0);

  const increment = () => {
    setState(state + 1);
  };
  const decrement = () => {
    setState(state - 1);
  };
  console.log("render", "Counter");
  return (
    <div>
      <h1>{state}</h1>
      <button onClick={increment}>+1</button>
      <button onClick={decrement}>-1</button>
    </div>
  );
};
export function App() {
  return (
    <>
      <CounterWithState />
      <Counter />
    </>
  );
}
