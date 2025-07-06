# Development Guide

This guide explains how to set up and use the development tools for the PairlyCode application.

## DevTools Setup

### 1. Redux DevTools Extension

The application uses Zustand with Redux DevTools Extension for advanced debugging. To install:

#### Chrome/Edge:

1. Go to [Chrome Web Store - Redux DevTools](https://chrome.google.com/webstore/detail/redux-devtools/lmhkpmbekcpmknklioeibfkpmmfibljd)
2. Click "Add to Chrome"
3. Restart your browser

#### Firefox:

1. Go to [Firefox Add-ons - Redux DevTools](https://addons.mozilla.org/en-US/firefox/addon/reduxdevtools/)
2. Click "Add to Firefox"
3. Restart your browser

### 2. Using DevTools

#### Redux DevTools Extension:

1. Open your browser's DevTools (F12)
2. Look for the "Redux" tab
3. You'll see three stores:
   - `auth-store` - Authentication state
   - `session-store` - Session management
   - `collaborative-editor-store` - Real-time collaboration state

#### In-App DevTools:

1. Start the development server: `npm run dev`
2. Press `Ctrl+Shift+D` to toggle the in-app DevTools panel
3. Use the tabs to switch between different stores
4. View real-time state updates

## Development Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Run linting
npm run lint

# Preview production build
npm run preview
```

## State Management Debugging

### Viewing State Changes

- All state changes are logged to the Redux DevTools Extension
- You can time-travel through state changes
- View action history and state snapshots

### Debugging Real-time Collaboration

1. Open the collaborative editor
2. Use Redux DevTools to monitor:
   - Cursor updates (`addCursor`, `removeCursor`)
   - Connection status changes (`setConnectionStatus`)
   - Version updates (`updateVersion`)
   - Remote change application (`setApplyingRemoteChanges`)

### Debugging Authentication

1. Monitor auth state in Redux DevTools
2. Watch for login/logout actions
3. Check token and user data updates

## Performance Monitoring

### Store Selectors

The application uses optimized selectors to prevent unnecessary re-renders:

```typescript
// Good - only re-renders when cursors change
const cursors = useCursors();

// Good - only re-renders when connection changes
const isConnected = useConnectionStatus();

// Avoid - re-renders on any store change
const store = useCollaborativeEditorStore();
```

### Memory Leaks

- Stores automatically clean up on component unmount
- Socket connections are properly managed
- No manual cleanup required

## Troubleshooting

### DevTools Not Showing

1. Ensure you're in development mode (`NODE_ENV=development`)
2. Check that Redux DevTools Extension is installed
3. Refresh the page after installing the extension

### State Not Updating

1. Check Redux DevTools for action dispatching
2. Verify store selectors are correct
3. Ensure components are subscribed to the right store slices

### Performance Issues

1. Use specific selectors instead of full store access
2. Monitor re-render frequency in React DevTools
3. Check for unnecessary state updates in Redux DevTools

## Best Practices

1. **Use Specific Selectors** - Always use specific selectors for better performance
2. **Monitor State Changes** - Use DevTools to understand state flow
3. **Test State Logic** - Test store logic independently of React components
4. **Keep Stores Focused** - Each store should have a single responsibility
5. **Use TypeScript** - Leverage TypeScript for type safety and better DX
