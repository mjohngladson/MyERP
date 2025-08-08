# ERPNext Clone - Backend Integration Contracts

## API Endpoints to Implement

### 1. Authentication & User Management
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user profile
- `POST /api/auth/logout` - User logout

### 2. Dashboard APIs
- `GET /api/dashboard/stats` - Get quick stats (sales, purchases, outstanding, stock value)
- `GET /api/dashboard/transactions` - Get recent transactions
- `GET /api/dashboard/notifications` - Get user notifications
- `GET /api/dashboard/reports` - Get monthly performance data

### 3. Module APIs
- `GET /api/modules` - Get all available modules
- `GET /api/modules/{module_id}/items` - Get module sub-items

### 4. Sales Module
- `GET /api/sales/orders` - Get sales orders
- `POST /api/sales/orders` - Create sales order
- `GET /api/sales/customers` - Get customers
- `POST /api/sales/customers` - Create customer

### 5. Purchasing Module
- `GET /api/purchase/orders` - Get purchase orders
- `POST /api/purchase/orders` - Create purchase order
- `GET /api/purchase/suppliers` - Get suppliers

### 6. Stock Module
- `GET /api/stock/items` - Get inventory items
- `GET /api/stock/warehouses` - Get warehouses
- `POST /api/stock/entry` - Create stock entry

### 7. Accounts Module
- `GET /api/accounts/chart` - Get chart of accounts
- `POST /api/accounts/journal` - Create journal entry
- `GET /api/accounts/ledger` - Get general ledger

## Database Models

### User Model
```python
class User:
    id: str
    name: str
    email: str
    role: str
    avatar: Optional[str]
    created_at: datetime
    updated_at: datetime
```

### Company Model
```python
class Company:
    id: str
    name: str
    email: str
    address: str
    created_at: datetime
```

### Customer Model
```python
class Customer:
    id: str
    name: str
    email: str
    phone: str
    address: str
    company_id: str
    created_at: datetime
```

### Supplier Model
```python
class Supplier:
    id: str
    name: str
    email: str
    phone: str
    address: str
    company_id: str
    created_at: datetime
```

### Item Model
```python
class Item:
    id: str
    name: str
    description: str
    item_code: str
    unit_price: float
    stock_qty: int
    warehouse_id: str
    created_at: datetime
```

### SalesOrder Model
```python
class SalesOrder:
    id: str
    order_number: str
    customer_id: str
    total_amount: float
    status: str  # draft, submitted, delivered
    order_date: datetime
    delivery_date: datetime
    items: List[SalesOrderItem]
```

### PurchaseOrder Model
```python
class PurchaseOrder:
    id: str
    order_number: str
    supplier_id: str
    total_amount: float
    status: str  # draft, submitted, received
    order_date: datetime
    expected_date: datetime
```

### Transaction Model (Generic)
```python
class Transaction:
    id: str
    type: str  # sales_invoice, purchase_order, payment_entry, stock_entry
    reference_number: str
    party_id: str  # customer_id or supplier_id
    amount: float
    date: datetime
    status: str
```

## Mock Data to Replace

### From mockData.js - Dashboard Data
- `quickStats` → Replace with real calculations from database
- `recentTransactions` → Replace with actual Transaction records
- `notifications` → Replace with real notification system
- `monthlyReports` → Calculate from actual sales/purchase data

### From mockData.js - Module Data
- `mockModules` → Replace with dynamic module configuration
- `mockUserData` → Replace with authenticated user data

## Frontend Integration Changes

### 1. API Service Layer
Create `src/services/api.js` with:
- Axios instance with base URL
- Authentication token handling
- Error handling wrapper
- All API endpoint functions

### 2. State Management
- Remove mock data imports
- Add loading states for API calls
- Add error handling for failed requests
- Implement real-time data updates

### 3. Authentication Context
- Add AuthContext for user state management
- Handle login/logout functionality
- Protect routes based on authentication

### 4. Component Updates
- Dashboard.jsx → Use real API data
- Sidebar.jsx → Dynamic module loading
- Header.jsx → Real user data and notifications

## Backend Implementation Priority
1. User authentication & basic models
2. Dashboard APIs with real data
3. Basic CRUD for Sales module
4. Basic CRUD for Purchase module
5. Stock management basics
6. Accounts basics
7. Advanced features & reports

## Security Considerations
- JWT token authentication
- Role-based access control
- Input validation on all endpoints
- SQL injection prevention
- Rate limiting on sensitive endpoints