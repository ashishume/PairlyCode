# Zustand Stores

This directory contains all the Zustand stores used for state management in the PairlyCode application.

## Stores Overview

### 1. Auth Store (`authStore.ts`)

Manages user authentication state including:

- User data (id, firstName, lastName, email)
- Authentication token
- Authentication status
- Loading and error states

**Key Actions:**

- `login(user, token)` - Handles user login and stores data in localStorage
- `logout()` - Clears authentication data and localStorage
- `setUser(user)` - Updates user data
- `setToken(token)` - Updates authentication token

**Selectors:**

- `useUser()` - Get current user data
- `useToken()` - Get authentication token
- `useIsAuthenticated()` - Check if user is authenticated
- `useAuthLoading()` - Get loading state
- `useAuthError()` - Get error state

### 2. Session Store (`sessionStore.ts`)

Manages session-related state including:

- Current active session
- List of all sessions
- Loading and error states

**Key Actions:**

- `setCurrentSession(session)` - Set the active session
- `setSessions(sessions)` - Update the sessions list
- `addSession(session)` - Add a new session
- `updateSession(sessionId, updates)` - Update session data
- `removeSession(sessionId)` - Remove a session

**Selectors:**

- `useCurrentSession()` - Get current active session
- `useSessions()` - Get all sessions
- `useSessionLoading()` - Get loading state
- `useSessionError()` - Get error state

### 3. Collaborative Editor Store (`collaborativeEditorStore.ts`)

Manages real-time collaboration state including:

- Session connection status
- Remote cursors
- Code version management
- Pending changes
- Participant management

**Key Actions:**

- `setSessionId(id)` - Set current session ID
- `setConnectionStatus(connected)` - Update connection status
- `addCursor(cursor)` - Add or update remote cursor
- `removeCursor(userId)` - Remove remote cursor
- `setApplyingRemoteChanges(applying)` - Control remote change application
- `updateVersion(version)` - Update code version

**Selectors:**

- `useCursors()` - Get all remote cursors
- `useConnectionStatus()` - Get connection status
- `useVersion()` - Get current code version
- `useCurrentUserId()` - Get current user ID
- `useParticipants()` - Get session participants
- `useIsApplyingRemoteChanges()` - Check if applying remote changes
- `usePendingChanges()` - Get pending changes
- `useLastSentVersion()` - Get last sent version

## Usage Examples

### Basic Store Usage

```typescript
import { useAuthStore, useUser } from "../stores";

function MyComponent() {
  const { login, logout } = useAuthStore();
  const user = useUser();

  // Use store actions and state
}
```

### Using Selectors for Performance

```typescript
import { useCursors, useConnectionStatus } from "../stores";

function CursorOverlay() {
  const cursors = useCursors(); // Only re-renders when cursors change
  const isConnected = useConnectionStatus(); // Only re-renders when connection changes

  return (
    <div>
      {cursors.map((cursor) => (
        <CursorIndicator key={cursor.userId} cursor={cursor} />
      ))}
    </div>
  );
}
```

### Store Initialization

The auth store is automatically initialized from localStorage using the `useAuthInit` hook in the main App component.

## Benefits of This Implementation

1. **Centralized State Management** - All related state is managed in dedicated stores
2. **Performance Optimized** - Selective subscriptions prevent unnecessary re-renders
3. **Type Safety** - Full TypeScript support with proper interfaces
4. **Easy Testing** - Stores can be tested independently of React components
5. **Developer Experience** - Built-in DevTools support and minimal boilerplate
6. **Real-time Collaboration** - Optimized for fast updates and minimal latency

## Migration from Previous State Management

The previous implementation used:

- Multiple `useState` hooks scattered across components
- `useRef` for mutable state that didn't trigger re-renders
- Complex `useEffect` dependencies causing stale closures
- Local state that couldn't be shared between components

The new Zustand implementation:

- Centralizes all related state in dedicated stores
- Provides clean actions for state updates
- Uses selectors for optimal performance
- Eliminates complex dependency arrays
- Enables easy state sharing between components
