// Mock data for GiLi system

export const mockModules = [
  {
    id: 'reports',
    name: 'Reports',
    icon: 'TrendingUp',
    color: '#0ea5e9',
    items: ['Reports']
  },
  {
    id: 'sales',
    name: 'Sales',
    icon: 'DollarSign',
    color: '#2563eb',
    items: ['Sales Order', 'Quotation', 'Customer', 'Item', 'Sales Invoice', 'Credit Note']
  },
  {
    id: 'buying',
    name: 'Buying',
    icon: 'ShoppingCart',
    color: '#7c3aed',
    items: ['Purchase Order', 'Supplier', 'Purchase Invoice', 'Purchase Receipt', 'Debit Note']
  },
  {
    id: 'stock',
    name: 'Stock',
    icon: 'Package',
    color: '#059669',
    items: ['Item', 'Warehouse', 'Stock Entry', 'Stock Reconciliation']
  },
  {
    id: 'accounts',
    name: 'Accounts',
    icon: 'Calculator',
    color: '#dc2626',
    items: ['Chart of Accounts', 'Journal Entry', 'Payment Entry', 'General Ledger']
  },
  {
    id: 'crm',
    name: 'CRM',
    icon: 'Users',
    color: '#ea580c',
    items: ['Lead', 'Opportunity', 'Customer', 'Contact', 'Campaign']
  },
  {
    id: 'projects',
    name: 'Projects',
    icon: 'FolderOpen',
    color: '#0891b2',
    items: ['Project', 'Task', 'Timesheet', 'Project Update']
  },
  {
    id: 'manufacturing',
    name: 'Manufacturing',
    icon: 'Cog',
    color: '#7c2d12',
    items: ['BOM', 'Work Order', 'Production Plan', 'Job Card']
  },
  {
    id: 'hr',
    name: 'HR',
    icon: 'UserCheck',
    color: '#be185d',
    items: ['Employee', 'Attendance', 'Leave Application', 'Salary Slip']
  }
];

export const mockDashboardData = {
  quickStats: [
    { title: 'Sales Orders', value: '₹ 2,45,000', change: '+12%', trend: 'up' },
    { title: 'Purchase Orders', value: '₹ 1,23,500', change: '-5%', trend: 'down' },
    { title: 'Outstanding Amount', value: '₹ 45,600', change: '+8%', trend: 'up' },
    { title: 'Stock Value', value: '₹ 3,25,400', change: '+15%', trend: 'up' }
  ],
  recentTransactions: [
    { id: 1, type: 'Sales Invoice', number: 'SINV-2024-00001', customer: 'ABC Corp', amount: '₹ 25,000', date: '2024-01-15' },
    { id: 2, type: 'Purchase Order', number: 'PO-2024-00001', supplier: 'XYZ Suppliers', amount: '₹ 15,000', date: '2024-01-14' },
    { id: 3, type: 'Payment Entry', number: 'PAY-2024-00001', party: 'DEF Ltd', amount: '₹ 10,000', date: '2024-01-13' },
    { id: 4, type: 'Stock Entry', number: 'STE-2024-00001', purpose: 'Material Receipt', amount: '₹ 8,500', date: '2024-01-12' }
  ],
  notifications: [
    { id: 1, title: 'New Sales Order from ABC Corp', time: '2 hours ago', type: 'success' },
    { id: 2, title: 'Payment overdue - Invoice SINV-2024-00001', time: '4 hours ago', type: 'warning' },
    { id: 3, title: 'Stock level low for Item ABC-001', time: '6 hours ago', type: 'error' },
    { id: 4, title: 'Monthly report generated successfully', time: '1 day ago', type: 'info' }
  ],
  monthlyReports: [
    { month: 'Jan', sales: 45000, purchases: 25000, profit: 20000 },
    { month: 'Feb', sales: 52000, purchases: 28000, profit: 24000 },
    { month: 'Mar', sales: 48000, purchases: 26000, profit: 22000 },
    { month: 'Apr', sales: 58000, purchases: 32000, profit: 26000 },
    { month: 'May', sales: 62000, purchases: 35000, profit: 27000 },
    { month: 'Jun', sales: 59000, purchases: 33000, profit: 26000 }
  ]
};

export const mockUserData = {
  name: 'John Doe',
  email: 'john.doe@company.com',
  role: 'System Manager',
  avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face'
};