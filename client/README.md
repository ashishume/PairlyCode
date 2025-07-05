# PairlyCode Client

A real-time collaborative pair programming application built with React, TypeScript, and WebSocket technology.

## Features

- **Real-time Collaboration**: Code together with multiple users in real-time
- **Live Cursor Tracking**: See where other participants are typing
- **Session Management**: Create and join coding sessions
- **User Authentication**: Secure login and registration
- **Modern UI**: Clean, responsive interface with Tailwind CSS
- **Monaco Editor**: Professional code editing experience

## Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Backend server running (see backend README)

## Setup

1. **Install dependencies**:

   ```bash
   npm install
   ```

2. **Configure environment**:
   Create a `.env` file in the client directory:

   ```
   VITE_API_URL=http://localhost:3000
   ```

3. **Start the development server**:

   ```bash
   npm run dev
   ```

4. **Open your browser**:
   Navigate to `http://localhost:5173`

## Usage

1. **Register/Login**: Create an account or sign in with existing credentials
2. **Create Session**: Start a new coding session with a name and description
3. **Join Session**: Select an existing session to join
4. **Code Together**: Start coding! You'll see other participants' cursors and code changes in real-time

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── CollaborativeEditor.tsx
│   ├── SessionList.tsx
│   └── CreateSessionModal.tsx
├── pages/              # Page components
│   ├── Login.tsx
│   ├── Register.tsx
│   └── PairProgramming.tsx
├── services/           # API and WebSocket services
│   ├── api.service.ts
│   └── socket.service.ts
└── App.tsx            # Main application component
```

## Technologies Used

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Styling
- **Monaco Editor** - Code editor
- **Socket.IO Client** - Real-time communication
- **React Router** - Navigation
- **Lucide React** - Icons
- **Axios** - HTTP client

## Development

- **Hot Reload**: Changes are reflected immediately in the browser
- **TypeScript**: Full type safety and IntelliSense support
- **ESLint**: Code linting and formatting
- **Tailwind**: Utility-first CSS framework

## Building for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

## Troubleshooting

- **WebSocket Connection Issues**: Ensure the backend server is running on the correct port
- **Authentication Errors**: Check that the API URL is correctly configured
- **Build Errors**: Make sure all dependencies are installed

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request
