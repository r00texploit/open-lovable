# TypeScript Expert Skill

## Type Patterns

### Discriminated Unions
```typescript
type Action = 
  | { type: 'loading' }
  | { type: 'success'; data: User }
  | { type: 'error'; error: string };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'loading':
      return { ...state, status: 'loading' };
    case 'success':
      return { ...state, status: 'success', user: action.data };
    case 'error':
      return { ...state, status: 'error', message: action.error };
  }
}
```

### Branded Types
```typescript
type UserId = string & { __brand: 'UserId' };
type PostId = string & { __brand: 'PostId' };

function createUserId(id: string): UserId {
  return id as UserId;
}

// Prevents mixing up IDs
function getUser(id: UserId): User;
function getPost(id: PostId): Post;
```

### Template Literal Types
```typescript
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';
type Endpoint = `/api/${string}`;
type EventName = `on${Capitalize<string>}`;

// Usage
const validEndpoint: Endpoint = '/api/users'; // ✅
const invalidEndpoint: Endpoint = '/users'; // ❌
```

### Recursive Types
```typescript
interface TreeNode<T> {
  value: T;
  children: TreeNode<T>[];
}

interface JSONValue {
  [key: string]: 
    | string 
    | number 
    | boolean 
    | null 
    | JSONValue 
    | JSONValue[];
}
```

## Utility Types

### DeepReadonly
```typescript
type DeepReadonly<T> = {
  readonly [K in keyof T]: T[K] extends object 
    ? DeepReadonly<T[K]> 
    : T[K];
};

interface Config {
  database: { host: string; port: number };
  cache: { ttl: number };
}

type ReadonlyConfig = DeepReadonly<Config>;
```

### StrictOmit
```typescript
type StrictOmit<T, K extends keyof T> = Omit<T, K>;

// Enforces that K is actually a key of T
interface User {
  id: string;
  name: string;
  email: string;
}

type PublicUser = StrictOmit<User, 'id'>; // ✅
type BadOmit = StrictOmit<User, 'notAKey'>; // ❌
```

### Nullable and Result Types
```typescript
type Nullable<T> = T | null;
type Optional<T> = T | undefined;

type Result<T, E = Error> = 
  | { success: true; data: T }
  | { success: false; error: E };

async function fetchUser(id: string): Promise<Result<User>> {
  try {
    const user = await db.users.findById(id);
    return { success: true, data: user };
  } catch (error) {
    return { success: false, error };
  }
}
```

## Generic Patterns

### Constrained Generics
```typescript
interface HasId {
  id: string;
}

function findById<T extends HasId>(items: T[], id: string): T | undefined {
  return items.find(item => item.id === id);
}

// Multiple constraints
interface Sortable {
  sort(): void;
}
interface Printable {
  print(): void;
}

function process<T extends Sortable & Printable>(item: T): void {
  item.sort();
  item.print();
}
```

### Infer Pattern
```typescript
type ReturnType<T> = T extends (...args: any[]) => infer R ? R : never;
type Parameters<T> = T extends (...args: infer P) => any ? P : never;

// Usage
async function fetchData(): Promise<Data> { /* ... */ }

type FetchDataReturn = ReturnType<typeof fetchData>; // Promise<Data>
```

### Generic Components
```typescript
interface ListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  keyExtractor: (item: T) => string;
}

function List<T>({ items, renderItem, keyExtractor }: ListProps<T>) {
  return (
    <ul>
      {items.map((item, index) => (
        <li key={keyExtractor(item)}>
          {renderItem(item, index)}
        </li>
      ))}
    </ul>
  );
}

// Usage
<List 
  items={users} 
  renderItem={(user) => <UserCard user={user} />}
  keyExtractor={(user) => user.id}
/>
```

## Type Guards

### User-Defined Type Guards
```typescript
interface Cat {
  type: 'cat';
  meow(): void;
}

interface Dog {
  type: 'dog';
  bark(): void;
}

type Animal = Cat | Dog;

function isCat(animal: Animal): animal is Cat {
  return animal.type === 'cat';
}

function makeSound(animal: Animal) {
  if (isCat(animal)) {
    animal.meow();
  } else {
    animal.bark();
  }
}
```

### Assertion Functions
```typescript
function assertDefined<T>(value: T | undefined | null): asserts value is T {
  if (value === undefined || value === null) {
    throw new Error('Value must be defined');
  }
}

function processUser(user?: User) {
  assertDefined(user);
  // user is now User (not User | undefined)
  return user.name;
}
```

## Advanced Patterns

### Declaration Merging
```typescript
// Extend third-party types
declare module 'some-library' {
  interface Config {
    customOption: boolean;
  }
}

// Extend Express
declare global {
  namespace Express {
    interface Request {
      user?: User;
      sessionId: string;
    }
  }
}
```

### Mapped Types with Key Remapping
```typescript
type Getters<T> = {
  [K in keyof T as `get${Capitalize<string & K>}`]: () => T[K];
};

interface Person {
  name: string;
  age: number;
}

type PersonGetters = Getters<Person>;
// { getName: () => string; getAge: () => number }
```

### Conditional Types
```typescript
type NonNullable<T> = T extends null | undefined ? never : T;

type Flatten<T> = T extends Array<infer U> ? U : T;

type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};
```

## Project-Specific: Noeron
- Uses strict TypeScript configuration
- Custom type definitions in `/types/` directory
- Zod for runtime validation with inferred types
- Prisma types for database models
- Global type augmentations in `global.d.ts`
