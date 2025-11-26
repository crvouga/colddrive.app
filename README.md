# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

## Google OAuth Authentication

This application uses Google OAuth for authentication. Users must be logged in to access the app.

### Required Environment Variables

Add the following environment variables to your `.env` file or deployment environment:

```bash
# Google OAuth Configuration
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Optional: Customize redirect URI (defaults to /api/auth/callback)
GOOGLE_REDIRECT_URI=/api/auth/callback

# Optional: Base URL for OAuth redirects (auto-detected in production)
BASE_URL=http://localhost:5173

# Session Configuration
SESSION_SECRET=your-random-session-secret-here

# Database Connection
POSTGRES_URL=postgres://user:password@host:port/database
```

### Setting up Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API
4. Go to "Credentials" and create an OAuth 2.0 Client ID
5. Add authorized redirect URIs:
   - `http://localhost:5173/api/auth/callback` (for local development)
   - `https://your-domain.com/api/auth/callback` (for production)
6. Copy the Client ID and Client Secret to your environment variables

### Graceful Degradation

If Google OAuth is not configured, the application will show a message indicating that authentication is not yet set up, preventing the app from crashing.

## Database Migrations

This project uses [dbmate](https://github.com/amacneil/dbmate) for managing PostgreSQL database migrations.

### Installation

Install dbmate using one of the following methods:

**macOS (Homebrew):**
```bash
brew install dbmate
```

**npm (global):**
```bash
npm install -g dbmate
```

**Or use npx (no installation needed):**
The helper scripts will work if dbmate is installed globally, or you can use `npx dbmate` directly.

### Local Development with Docker

A Docker Compose file is included for easy local PostgreSQL setup:

1. Start the PostgreSQL database:
   ```bash
   docker compose up -d
   ```

2. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

3. The `.env` file is pre-configured for the Docker setup. For local development, use:
   ```
   DATABASE_URL=postgres://colddrive:colddrive@localhost:5432/colddrive?sslmode=disable
   ```
   
   Note: `?sslmode=disable` is required for local Docker PostgreSQL as SSL is not enabled by default.

4. Stop the database when done:
   ```bash
   docker compose down
   ```

   To also remove the data volume:
   ```bash
   docker compose down -v
   ```

### Configuration

For production or custom setups, set your `DATABASE_URL` in `.env`:
```
DATABASE_URL=postgres://user:password@host:port/database
```

### Migration Commands

The following npm scripts are available for managing migrations:

- `npm run db:new <name>` - Create a new migration file
- `npm run db:up` - Run pending migrations
- `npm run db:down` - Rollback the last migration
- `npm run db:reset` - Drop database, recreate, and run all migrations
- `npm run db:status` - Show migration status
- `npm run db:create` - Create the database (if it doesn't exist)

### Migration Files

Migration files are stored in `db/migrations/` and follow the naming pattern: `YYYYMMDDHHMMSS_description.sql`

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is enabled on this template. See [this documentation](https://react.dev/learn/react-compiler) for more information.

Note: This will impact Vite dev & build performances.

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
