# React Expert Skill

## Component Patterns

### Compound Components
```typescript
// Tabs.tsx
import { createContext, useContext, useState } from 'react';

const TabsContext = createContext(null);

export function Tabs({ children, defaultValue }) {
  const [value, setValue] = useState(defaultValue);
  return (
    <TabsContext.Provider value={{ value, setValue }}>
      {children}
    </TabsContext.Provider>
  );
}

export function TabsList({ children }) {
  return <div role="tablist">{children}</div>;
}

export function TabsTrigger({ value, children }) {
  const { value: selected, setValue } = useContext(TabsContext);
  return (
    <button
      role="tab"
      aria-selected={value === selected}
      onClick={() => setValue(value)}
    >
      {children}
    </button>
  );
}
```

### Render Props Pattern
```typescript
interface VirtualListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  itemHeight: number;
}

function VirtualList<T>({ items, renderItem, itemHeight }: VirtualListProps<T>) {
  // ... virtualization logic
  return <div>{visibleItems.map(renderItem)}</div>;
}
```

### Custom Hooks Pattern
```typescript
function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

// Usage
function Search() {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 300);

  useEffect(() => {
    search(debouncedQuery);
  }, [debouncedQuery]);
}
```

## State Management

### useReducer for Complex State
```typescript
type State = { count: number; history: number[] };
type Action = 
  | { type: 'increment' }
  | { type: 'decrement' }
  | { type: 'reset' };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'increment':
      return { 
        count: state.count + 1, 
        history: [...state.history, state.count + 1] 
      };
    case 'decrement':
      return { 
        count: state.count - 1, 
        history: [...state.history, state.count - 1] 
      };
    case 'reset':
      return { count: 0, history: [] };
  }
}

function Counter() {
  const [state, dispatch] = useReducer(reducer, { count: 0, history: [] });
  return (
    <div>
      <p>{state.count}</p>
      <button onClick={() => dispatch({ type: 'increment' })}>+</button>
    </div>
  );
}
```

### Context + Reducer Pattern
```typescript
// Create optimized context that splits state and dispatch
const StateContext = createContext(null);
const DispatchContext = createContext(null);

export function Provider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  return (
    <StateContext.Provider value={state}>
      <DispatchContext.Provider value={dispatch}>
        {children}
      </DispatchContext.Provider>
    </StateContext.Provider>
  );
}

// Hooks for consuming
export const useState = () => useContext(StateContext);
export const useDispatch = () => useContext(DispatchContext);
```

## Performance

### useMemo / useCallback Guidelines
```typescript
// ✅ Good: Expensive computation
const sorted = useMemo(() => 
  items.sort((a, b) => b.score - a.score),
  [items]
);

// ✅ Good: Stable reference for child props
const handleSubmit = useCallback((data: FormData) => {
  api.submit(data);
}, []);

// ❌ Bad: Premature optimization
const value = useMemo(() => a + b, [a, b]); // Simple addition
```

### Virtualization for Large Lists
```typescript
import { useVirtualizer } from '@tanstack/react-virtual';

function LargeList({ items }) {
  const parentRef = useRef(null);
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 50,
  });

  return (
    <div ref={parentRef} style={{ height: '400px', overflow: 'auto' }}>
      <div style={{ height: `${virtualizer.getTotalSize()}px` }}>
        {virtualizer.getVirtualItems().map((virtualItem) => (
          <div
            key={virtualItem.key}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: `${virtualItem.size}px`,
              transform: `translateY(${virtualItem.start}px)`,
            }}
          >
            {items[virtualItem.index]}
          </div>
        ))}
      </div>
    </div>
  );
}
```

### React.memo Strategy
```typescript
// Use for pure components receiving objects/functions
const ExpensiveComponent = React.memo(function ExpensiveComponent({ 
  data, 
  onUpdate 
}) {
  // ... expensive render
}, (prevProps, nextProps) => {
  // Custom comparison if needed
  return prevProps.data.id === nextProps.data.id;
});
```

## Refs and Imperative APIs

### useImperativeHandle
```typescript
interface CanvasRef {
  clear: () => void;
  export: () => string;
}

const Canvas = forwardRef<CanvasRef, Props>(function Canvas(props, ref) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useImperativeHandle(ref, () => ({
    clear: () => {
      const ctx = canvasRef.current?.getContext('2d');
      ctx?.clearRect(0, 0, width, height);
    },
    export: () => canvasRef.current?.toDataURL() || '',
  }));

  return <canvas ref={canvasRef} />;
});
```

## Error Boundaries
```typescript
class ErrorBoundary extends React.Component<
  { fallback: React.ReactNode; children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Error caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}
```

## Project-Specific: Noeron
- React 19 with concurrent features
- Uses Jotai for atomic state management
- Framer Motion for animations
- Custom hooks in `/hooks/` directory
- Components use forwardRef for ref forwarding
