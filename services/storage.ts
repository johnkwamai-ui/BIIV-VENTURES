import { User, Product, Sale, DeletionLog, SaleEditLog, ReturnLog, Expense, UserRole, Customer, Payment } from '../types';

const SESSION_KEY = 'b7_session';

const INITIAL_ADMIN: User = {
  id: '1',
  name: 'Kahoro',
  username: 'Kahoro',
  passwordHash: 'Kahoro890',
  role: UserRole.ADMIN,
  createdAt: Date.now()
};

async function apiCall(endpoint: string, body: any) {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const error = await response.json();
    throw error;
  }
  return response.json();
}

export const storage = {
  getUsers: async (): Promise<User[]> => {
    const data = await apiCall('/api/db/users/select', {});
    if (!data || data.length === 0) {
      await apiCall('/api/db/users/insert', { values: [INITIAL_ADMIN] });
      return [INITIAL_ADMIN];
    }
    return data;
  },
  saveUsers: async (users: User[]) => {
    await apiCall('/api/db/users/upsert', { values: users });
  },

  getProducts: async (): Promise<Product[]> => {
    return apiCall('/api/db/products/select', {});
  },
  saveProducts: async (products: Product[]) => {
    await apiCall('/api/db/products/upsert', { values: products });
  },
  deleteProduct: async (id: string) => {
    await apiCall('/api/db/products/delete', { id });
  },

  getSales: async (): Promise<Sale[]> => {
    return apiCall('/api/db/sales/select', {});
  },
  saveSales: async (sales: Sale[]) => {
    await apiCall('/api/db/sales/upsert', { values: sales });
  },

  getExpenses: async (): Promise<Expense[]> => {
    return apiCall('/api/db/expenses/select', {});
  },
  saveExpenses: async (expenses: Expense[]) => {
    await apiCall('/api/db/expenses/upsert', { values: expenses });
  },

  getCustomers: async (): Promise<Customer[]> => {
    return apiCall('/api/db/customers/select', {});
  },
  saveCustomers: async (customers: Customer[]) => {
    await apiCall('/api/db/customers/upsert', { values: customers });
  },
  deleteCustomer: async (id: string) => {
    await apiCall('/api/db/customers/delete', { id });
  },

  getPayments: async (saleId?: string, customerId?: string): Promise<Payment[]> => {
    const body: any = {};
    if (saleId) body.saleId = saleId;
    if (customerId) body.customerId = customerId;
    return apiCall('/api/db/payments/select', body);
  },
  savePayment: async (payment: Payment) => {
    await apiCall('/api/db/payments/insert', { values: [payment] });
  },

  getLogs: async (): Promise<DeletionLog[]> => {
    return apiCall('/api/db/deletion_logs/select', {});
  },
  saveLogs: async (logs: DeletionLog[]) => {
    await apiCall('/api/db/deletion_logs/upsert', { values: logs });
  },

  getEditLogs: async (): Promise<SaleEditLog[]> => {
    return apiCall('/api/db/sale_edit_logs/select', {});
  },
  saveEditLogs: async (logs: SaleEditLog[]) => {
    await apiCall('/api/db/sale_edit_logs/upsert', { values: logs });
  },

  getReturnLogs: async (): Promise<ReturnLog[]> => {
    return apiCall('/api/db/return_logs/select', {});
  },
  saveReturnLogs: async (logs: ReturnLog[]) => {
    await apiCall('/api/db/return_logs/upsert', { values: logs });
  },

  getCurrentUser: (): User | null => {
    const data = localStorage.getItem(SESSION_KEY);
    return data ? JSON.parse(data) : null;
  },
  setCurrentUser: (user: User | null) => {
    if (user) localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    else localStorage.removeItem(SESSION_KEY);
  },

  seedDatabase: async () => {
    const response = await fetch('/api/seed', { method: 'POST' });
    if (!response.ok) throw new Error('Seeding failed');
    return response.json();
  }
};
