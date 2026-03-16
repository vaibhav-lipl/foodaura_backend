# FoodAura Delivery - Restaurant Management Dashboard

A production-ready React application for restaurant owners to manage their food delivery business. Built with React 18+, Vite, Tailwind CSS, and integrated with a RESTful API backend.

## Features

- 🔐 **Authentication** - Secure login and signup with JWT token management
- 📊 **Dashboard** - Real-time metrics, restaurant status toggle, and recent orders
- 📦 **Order Management** - View orders, update status, and track customer information
- 🍽️ **Menu Management** - Create, update, and delete menu items with categories
- 🏪 **Restaurant Profile** - Manage restaurant details, schedule, and promotional offers
- 📈 **Statistics** - Comprehensive analytics including sales, ratings, and most sold items

## Tech Stack

- **React 18+** - Modern React with hooks
- **Vite** - Fast build tool and dev server
- **React Router** - Client-side routing
- **Axios** - HTTP client for API calls
- **Context API** - State management for authentication
- **Tailwind CSS** - Utility-first CSS framework

## Getting Started

### Prerequisites

- Node.js 16+ and npm
- Backend API running on `http://localhost:3000/api` (or configure via environment variable)

### Installation

1. Clone the repository:
```bash
cd FoodAura
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file (optional, defaults to `http://localhost:3000/api`):
```bash
VITE_API_BASE_URL=http://localhost:3000/api
```

4. Start the development server:
```bash
npm run dev
```

5. Open your browser and navigate to `http://localhost:5173`

### Building for Production

```bash
npm run build
```

The production build will be in the `dist` directory.

## Project Structure

```
src/
├── api/              # API integration layer
│   ├── axios.js      # Axios instance with interceptors
│   ├── auth.api.js
│   ├── dashboard.api.js
│   ├── orders.api.js
│   ├── menu.api.js
│   ├── restaurant.api.js
│   └── statistics.api.js
├── components/       # Reusable components
│   ├── common/       # Common UI components
│   └── layout/       # Layout components (Sidebar, Header)
├── pages/            # Page components
│   ├── auth/         # Login, Signup
│   ├── dashboard/    # Dashboard
│   ├── orders/       # Order management
│   ├── menu/         # Menu management
│   ├── restaurant/   # Restaurant settings
│   └── statistics/   # Statistics and analytics
├── routes/           # Routing configuration
├── store/            # State management (AuthContext)
├── utils/            # Utility functions
└── styles/           # Global styles
```

## API Integration

The application strictly follows the API structure defined in `API_EXAMPLES.md`. All API calls are made through the centralized Axios instance with:

- Automatic JWT token injection
- 401 Unauthorized handling (auto logout)
- Error handling and user-friendly messages

## Brand Colors

- **Primary**: `#e12364` (Pink/Magenta)
- **Secondary**: `#1f2937` (Dark Gray)
- **Background**: `#f9fafb` (Light Gray)
- **Success**: `#16a34a` (Green)
- **Warning**: `#f59e0b` (Orange)
- **Danger**: `#dc2626` (Red)

## Authentication

- JWT tokens are stored in `localStorage`
- Protected routes automatically redirect to login if unauthenticated
- Token is automatically attached to all API requests

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## License

This project is part of the FoodAura Delivery System.
