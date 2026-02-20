
import { User, Product, Sale, DeletionLog, SaleEditLog, ReturnLog, Expense, UserRole } from '../types';

const STORAGE_KEYS = {
  USERS: 'b7_users',
  PRODUCTS: 'b7_products',
  SALES: 'b7_sales',
  LOGS: 'b7_logs',
  EDIT_LOGS: 'b7_edit_logs',
  RETURN_LOGS: 'b7_return_logs',
  EXPENSES: 'b7_expenses',
  SESSION: 'b7_session'
};

const INITIAL_ADMIN: User = {
  id: '1',
  name: 'System Admin',
  username: 'admin',
  passwordHash: 'admin123',
  role: UserRole.ADMIN,
  createdAt: Date.now()
};

export const storage = {
  getUsers: (): User[] => {
    const data = localStorage.getItem(STORAGE_KEYS.USERS);
    if (!data) {
      const initial = [INITIAL_ADMIN];
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(initial));
      return initial;
    }
    return JSON.parse(data);
  },
  saveUsers: (users: User[]) => localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users)),

  getProducts: (): Product[] => {
    const data = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
    return data ? JSON.parse(data) : [];
  },
  saveProducts: (products: Product[]) => localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products)),

  getSales: (): Sale[] => {
    const data = localStorage.getItem(STORAGE_KEYS.SALES);
    return data ? JSON.parse(data) : [];
  },
  saveSales: (sales: Sale[]) => localStorage.setItem(STORAGE_KEYS.SALES, JSON.stringify(sales)),

  getExpenses: (): Expense[] => {
    const data = localStorage.getItem(STORAGE_KEYS.EXPENSES);
    return data ? JSON.parse(data) : [];
  },
  saveExpenses: (expenses: Expense[]) => localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(expenses)),

  getLogs: (): DeletionLog[] => {
    const data = localStorage.getItem(STORAGE_KEYS.LOGS);
    return data ? JSON.parse(data) : [];
  },
  saveLogs: (logs: DeletionLog[]) => localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(logs)),

  getEditLogs: (): SaleEditLog[] => {
    const data = localStorage.getItem(STORAGE_KEYS.EDIT_LOGS);
    return data ? JSON.parse(data) : [];
  },
  saveEditLogs: (logs: SaleEditLog[]) => localStorage.setItem(STORAGE_KEYS.EDIT_LOGS, JSON.stringify(logs)),

  getReturnLogs: (): ReturnLog[] => {
    const data = localStorage.getItem(STORAGE_KEYS.RETURN_LOGS);
    return data ? JSON.parse(data) : [];
  },
  saveReturnLogs: (logs: ReturnLog[]) => localStorage.setItem(STORAGE_KEYS.RETURN_LOGS, JSON.stringify(logs)),

  getCurrentUser: (): User | null => {
    const data = localStorage.getItem(STORAGE_KEYS.SESSION);
    return data ? JSON.parse(data) : null;
  },
  setCurrentUser: (user: User | null) => {
    if (user) localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(user));
    else localStorage.removeItem(STORAGE_KEYS.SESSION);
  }
};
