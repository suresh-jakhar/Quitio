# QUITIO Frontend

React + Vite frontend for the QUITIO knowledge management app.

## Setup

1. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```

2. Update `.env.local` with your API URLs:
   - `VITE_API_URL`: Backend API URL (default: http://localhost:5000)
   - `VITE_ML_API_URL`: ML Service URL (default: http://localhost:8000)

3. Dependencies are already installed (npm install was run during setup)

4. Start development server:
   ```bash
   npm run dev
   ```

The app will start on `http://localhost:5173`

## Project Structure

```
src/
├── main.jsx      - React entry point
├── App.jsx       - Root component
├── pages/        - Page components (will add later)
├── components/   - Reusable components (will add later)
└── styles/       - CSS files (will add later)
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
