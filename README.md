# PairlyCode

A realtime collaborative coding app.

## Project Structure

```
PairlyCode/
├── backend/          # NestJS API server
├── client/           # React frontend application
├── package.json      # Root package.json with common scripts
└── README.md         # This file
```

## Quick Start

### Prerequisites

- Node.js (v18 or higher)
- npm

### Installation

Install all dependencies for both backend and frontend:

```bash
npm run install:all
```

Or install them separately:

```bash
# Install root dependencies
npm install

# Install backend dependencies
cd backend && npm install

# Install frontend dependencies
cd client && npm install
```

### Development

Run both backend and frontend in development mode simultaneously:

```bash
npm run dev
```

This will start:

- Backend API server on `http://localhost:3000` (NestJS with hot reload)
- Frontend development server on `http://localhost:5173` (Vite with hot reload)
- Yjs WebSocket server on `ws://localhost:1234` (real-time collaboration)

### Individual Development Servers

If you want to run only one service:

```bash
# Backend only
npm run dev:backend

# Frontend only
npm run dev:client

# Yjs server only
npm run start:yjs
```

## Available Scripts

### Root Level Commands

| Command                 | Description                                                 |
| ----------------------- | ----------------------------------------------------------- |
| `npm run dev`           | Start backend, frontend, and Yjs server in development mode |
| `npm run dev:backend`   | Start only the backend in development mode                  |
| `npm run dev:client`    | Start only the frontend in development mode                 |
| `npm run build`         | Build both backend and frontend for production              |
| `npm run build:backend` | Build only the backend                                      |
| `npm run build:client`  | Build only the frontend                                     |
| `npm run start`         | Start both services in production mode                      |
| `npm run start:backend` | Start only the backend in production mode                   |
| `npm run start:client`  | Start only the frontend in production mode                  |
| `npm run start:yjs`     | Start only the Yjs WebSocket server                         |
| `npm run lint`          | Run linting for both backend and frontend                   |
| `npm run lint:backend`  | Run linting for backend only                                |
| `npm run lint:client`   | Run linting for frontend only                               |
| `npm run test`          | Run tests for both backend and frontend                     |
| `npm run test:backend`  | Run tests for backend only                                  |
| `npm run test:client`   | Run tests for frontend only                                 |
| `npm run install:all`   | Install dependencies for all packages                       |

### Backend Commands (from backend/ directory)

| Command               | Description                              |
| --------------------- | ---------------------------------------- |
| `npm run start:dev`   | Start development server with hot reload |
| `npm run start:debug` | Start development server with debug mode |
| `npm run start:prod`  | Start production server                  |
| `npm run build`       | Build the application                    |
| `npm run test`        | Run unit tests                           |
| `npm run test:e2e`    | Run end-to-end tests                     |
| `npm run lint`        | Run ESLint                               |
| `npm run start:yjs`   | Start Yjs WebSocket server               |

### Frontend Commands (from client/ directory)

| Command           | Description                              |
| ----------------- | ---------------------------------------- |
| `npm run dev`     | Start development server with hot reload |
| `npm run build`   | Build for production                     |
| `npm run preview` | Preview production build                 |
| `npm run lint`    | Run ESLint                               |

## Technology Stack

### Backend

- **Framework**: NestJS
- **Language**: TypeScript
- **Database**: MongoDB (Mongoose)
- **Real-time Collaboration**: Yjs + Socket.IO
- **Authentication**: JWT with Passport
- **Validation**: class-validator
- **Documentation**: Swagger/OpenAPI

### Frontend

- **Framework**: React 19
- **Language**: TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Code Editor**: Monaco
- **Real-time Collaboration**: yjs, y-monaco, socket.io-client
- **Routing**: React Router DOM
- **HTTP Client**: Axios

## Development Workflow

1. **Start Development**: Run `npm run dev` to start both services
2. **Backend Development**: The NestJS server will be available at `http://localhost:3000`
3. **Frontend Development**: The React app will be available at `http://localhost:5173`
4. **API Documentation**: Swagger docs available at `http://localhost:3000/api` (when backend is running)

## Environment Variables

### Backend (.env file in backend/ directory)

```env
MONGODB_URI=mongodb://localhost:27017/pairlycode
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=1d
PORT=3000
CORS_ORIGIN=http://localhost:5173
YJS_PORT=1234
```

### Frontend (.env file in client/ directory)

```env
VITE_API_URL=http://localhost:3000
```

## Contributing

1. Make sure both backend and frontend are running: `npm run dev`
2. Make your changes
3. Run tests: `npm run test`
4. Run linting: `npm run lint`
5. Commit your changes

## Production Deployment

1. Build both applications: `npm run build`
2. Start production servers: `npm run start`

The backend will serve the built frontend files in production mode.
