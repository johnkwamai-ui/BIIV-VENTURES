
export enum UserRole {
  ADMIN = 'admin',
  SALESPERSON = 'salesperson'
}

export interface User {
  id: string;
  name: string;
  username: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  createdAt: number;
}

export interface Product {
  id: string;
  name: string;
  barcode: string;
  buyingPrice: number; // For COGS/Profit calculation
  price: number; // Selling price
  category: string;
  stockQuantity: number;
  unit: string; // e.g., Pcs, Kg, Ltr
  createdAt: number;
}

export enum PaymentMethod {
  CASH = 'Cash',
  MPESA = 'M-Pesa',
  BANK = 'Bank'
}

export interface SaleItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  buyingPrice: number; // Snapshot at time of sale
}

export interface Sale {
  id: string;
  userId: string;
  userName: string;
  customerId?: string; // Link to customer
  customerName?: string;
  customerPhone?: string;
  subtotal: number;
  discount: number;
  totalAmount: number;
  amountPaid: number; // Total amount paid across all payment records
  balance: number; // Current balance due
  paymentMethod: PaymentMethod; // Initial payment method
  items: SaleItem[];
  status: 'completed' | 'returned' | 'partial' | 'unpaid' | 'paid';
  createdAt: number;
}

export interface Payment {
  id: string;
  saleId: string;
  customerId: string;
  amount: number;
  paymentMode: PaymentMethod;
  reference?: string;
  receivedBy: string; // User ID
  receivedByName: string;
  paidAt: number;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  debt: number;
  createdAt: number;
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  category: 'Rent' | 'Salaries' | 'Utilities' | 'Stock' | 'Other';
  date: number;
  recordedBy: string;
}

export interface DeletionLog {
  id: string;
  saleId: string;
  deletedBy: string;
  deletedByName: string;
  timestamp: number;
}

export interface SaleEditLog {
  id: string;
  saleId: string;
  editedBy: string;
  editedByName: string;
  timestamp: number;
  changes: string;
}

export interface ReturnLog {
  id: string;
  saleId: string;
  returnedBy: string;
  returnedByName: string;
  timestamp: number;
}
