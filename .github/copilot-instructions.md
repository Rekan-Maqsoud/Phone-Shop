# Copilot Instructions for Phone Shop Management System

## Architecture Overview

This is an **Electron + React + Vite desktop application** for phone shop management with cloud backup capabilities.

### Core Tech Stack
- **Frontend**: React 18 + Tailwind CSS + React Router DOM
- **Desktop**: Electron with IPC (main.cjs + preload.js)
- **Database**: SQLite with better-sqlite3 (modular design in `database/modules/`)
- **Cloud**: Appwrite for authentication and backups
- **Build**: Vite with Electron Builder

### Dual-Mode Architecture
The app has two primary interfaces:
- **Cashier Mode** (`/cashier`): Point-of-sale operations, product lookup, cart management
- **Admin Mode** (`/admin`): Inventory management, reports, settings, debt tracking

## Critical Patterns

### 1. State Management Architecture
- **DataContext** (`src/contexts/DataContext.jsx`): Centralized data fetching and caching for all entities (products, sales, debts, etc.)
- **useAdmin hook** (`src/components/useAdmin.js`): Admin-specific UI state and business logic
- **Context Providers**: Theme, Locale, Sound, BackupProgress contexts wrap the app

```jsx
// Always use DataContext for data operations, not direct API calls
const { products, sales, refreshProducts } = useData();
```

### 2. Electron IPC Pattern
- **Main Process** (`src/main.cjs`): Database operations, file system access, cloud backup scheduling
- **Preload Script** (`src/preload.js`): Secure IPC bridge exposing `window.api`
- **Renderer**: React components call `window.api.methodName()`

```javascript
// Always check API availability before calling
if (window.api?.getProducts) {
  const products = await window.api.getProducts();
}
```

### 3. Database Module Pattern
Database operations are split into focused modules in `database/modules/`:
- `products.cjs`, `accessories.cjs`, `sales.cjs`, `debts.cjs`, etc.
- Each module exports functions that take `(db, ...params)`
- Main database module (`database/index.cjs`) orchestrates all modules

### 4. Multi-Currency System
- Products stored in native currency (USD/IQD)
- Sales can be in different currency with exchange rates stored per sale
- Currency conversion logic in `utils/exchangeRates.js`

### 5. Sound System Integration
- Comprehensive audio feedback system in `src/utils/sounds.js`
- All UI actions should trigger appropriate sounds: modal open/close, success, error, warnings
- Sound settings stored in localStorage with user preferences

## Key Development Workflows

### Running the App
```bash
npm run dev        # Starts Vite dev server + Electron concurrently
npm run build      # Production build
npm run make       # Build Electron distributables
```

### State Update Pattern
**CRITICAL**: Avoid infinite re-renders by using proper dependencies in hooks
```jsx
// ✅ Good - memoized with proper dependencies
const lowStockProducts = useMemo(() => 
  products.filter(p => p.stock < threshold && !p.archived), 
  [products, threshold]
);

// ❌ Bad - will cause infinite re-renders
const [data, setData] = useState([]);
useEffect(() => {
  fetchData().then(setData);
}, [data]); // Wrong dependency
```

### API Ready Pattern
DataContext implements sophisticated API readiness checking for production environments:
```jsx
// Enhanced polling with better error handling for production
const checkApiReady = () => {
  if (window.api && 
      typeof window.api.getProducts === 'function' &&
      typeof window.api.getSales === 'function') {
    setApiReady(true);
    return true;
  }
  return false;
};
```

### Modal Management
- Use `AdminModals` component for centralized modal rendering
- State managed in useAdmin hook: `admin.setShowProductModal(true)`
- Always play appropriate sounds: `playModalOpenSound()`, `playModalCloseSound()`

### Toast Notifications
```jsx
// Unified toast system with auto-dismiss
admin.setToast(message, type = 'info', duration = 3000);
```

## File Organization

### Component Categories
- **Pages**: `src/pages/` - Route-level components (Admin.jsx, Cashier.jsx)
- **Sections**: `src/components/*Section.jsx` - Feature-specific UI sections
- **Modals**: `src/components/*Modal.jsx` - Reusable modal components
- **Utils**: `src/utils/` - Pure functions (sounds, exchange rates, charts, icons)

### Database Architecture
- **Factory Pattern**: `database/index.cjs` exports factory function taking dbPath
- **Module System**: Each entity has dedicated module in `database/modules/`
- **Consistent API**: `getEntityName()`, `addEntityName(data)`, `updateEntityName(data)`, `deleteEntityName(id)`

## Cloud Backup Integration

### Appwrite Configuration
Environment variables in `.env`:
```env
VITE_APPWRITE_ENDPOINT=https://fra.cloud.appwrite.io/v1
VITE_APPWRITE_PROJECT_ID=your-project-id
# Fallback values used if not set
```

### CloudBackupService Pattern
- Initialized in main process (`src/main.cjs`)
- Auto-backup scheduling with user settings
- Background processing to avoid UI blocking

## Multi-Currency & Dashboard Systems

### Currency Handling
- `EXCHANGE_RATES` constant in `utils/exchangeRates.js`
- Conversion functions handle USD/IQD operations
- Sales store exchange rate at time of transaction

### Dashboard Components
- `MultiCurrencyDashboard` implements debounced data fetching
- Chart.js integration with shared utilities in `utils/chartUtils.js`
- Memoized calculations to prevent performance issues

## Security & Data Flow

### Context Isolation
- Renderer process cannot directly access Node.js APIs
- All database operations go through secure IPC channel
- User authentication for cloud features only

### Secret Admin Console
- Browser console commands for authorized admins only
- `public/secret-admin-console.js` - Balance adjustment tools
- Security check: only works in admin panel context

## Common Pitfalls to Avoid

1. **Don't** fetch data directly in components - use DataContext
2. **Don't** create new database connections - use the singleton pattern
3. **Don't** forget to refresh related data after updates (e.g., refresh sales after debt payment)
4. **Don't** block UI during cloud operations - use background processing
5. **Don't** skip sound feedback - users expect audio cues for actions
6. **Don't** use direct effects without debouncing in data-heavy components

## Debug Tools

### Secret Admin Commands
Access via browser console in admin mode:
```javascript
__showSecretCommands()     // Show available commands
__getShopBalances()       // Check current balances
__setShopBalance(currency, amount)  // Adjust shop balance
```

### Development & Diagnostic Files
- `SECRET_ADMIN_COMMANDS.md` - Documentation for console commands
- `public/production-diagnostics.js` - Production debugging tools
- `public/route-debugger.js` - Route navigation debugging
