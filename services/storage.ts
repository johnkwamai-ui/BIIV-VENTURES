import { User, Product, Sale, DeletionLog, SaleEditLog, ReturnLog, Expense, UserRole, Customer, Payment } from '../types';
import { db } from './firebase';
import { 
  collection, 
  getDocs, 
  setDoc, 
  doc, 
  deleteDoc, 
  query, 
  where, 
  writeBatch,
  getDoc
} from 'firebase/firestore';

const SESSION_KEY = 'b7_session';

const INITIAL_ADMIN: User = {
  id: 'admin-john',
  name: 'John Qiao',
  username: 'johnqiao',
  email: 'johnqiao23@gmail.com',
  passwordHash: 'wamai10204111',
  role: UserRole.ADMIN,
  createdAt: Date.now()
};

export const storage = {
  getUsers: async (): Promise<User[]> => {
    const querySnapshot = await getDocs(collection(db, 'users'));
    const data = querySnapshot.docs.map(doc => doc.data() as User);
    if (data.length === 0) {
      await setDoc(doc(db, 'users', INITIAL_ADMIN.id), INITIAL_ADMIN);
      return [INITIAL_ADMIN];
    }
    return data;
  },
  saveUsers: async (users: User[]) => {
    const batch = writeBatch(db);
    users.forEach(user => {
      const userRef = doc(db, 'users', user.id);
      batch.set(userRef, user);
    });
    await batch.commit();
  },

  getProducts: async (): Promise<Product[]> => {
    const querySnapshot = await getDocs(collection(db, 'products'));
    return querySnapshot.docs.map(doc => doc.data() as Product);
  },
  saveProducts: async (products: Product[]) => {
    const batch = writeBatch(db);
    products.forEach(product => {
      const productRef = doc(db, 'products', product.id);
      batch.set(productRef, product);
    });
    await batch.commit();
  },
  deleteProduct: async (id: string) => {
    await deleteDoc(doc(db, 'products', id));
  },

  getSales: async (): Promise<Sale[]> => {
    const querySnapshot = await getDocs(collection(db, 'sales'));
    return querySnapshot.docs.map(doc => doc.data() as Sale);
  },
  saveSales: async (sales: Sale[]) => {
    const batch = writeBatch(db);
    sales.forEach(sale => {
      const saleRef = doc(db, 'sales', sale.id);
      batch.set(saleRef, sale);
    });
    await batch.commit();
  },

  getExpenses: async (): Promise<Expense[]> => {
    const querySnapshot = await getDocs(collection(db, 'expenses'));
    return querySnapshot.docs.map(doc => doc.data() as Expense);
  },
  saveExpenses: async (expenses: Expense[]) => {
    const batch = writeBatch(db);
    expenses.forEach(expense => {
      const expenseRef = doc(db, 'expenses', expense.id);
      batch.set(expenseRef, expense);
    });
    await batch.commit();
  },

  getCustomers: async (): Promise<Customer[]> => {
    const querySnapshot = await getDocs(collection(db, 'customers'));
    return querySnapshot.docs.map(doc => doc.data() as Customer);
  },
  saveCustomers: async (customers: Customer[]) => {
    const batch = writeBatch(db);
    customers.forEach(customer => {
      const customerRef = doc(db, 'customers', customer.id);
      batch.set(customerRef, customer);
    });
    await batch.commit();
  },
  deleteCustomer: async (id: string) => {
    await deleteDoc(doc(db, 'customers', id));
  },

  getPayments: async (saleId?: string, customerId?: string): Promise<Payment[]> => {
    let q = query(collection(db, 'payments'));
    if (saleId) {
      q = query(q, where('saleId', '==', saleId));
    }
    if (customerId) {
      q = query(q, where('customerId', '==', customerId));
    }
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => doc.data() as Payment);
  },
  savePayment: async (payment: Payment) => {
    await setDoc(doc(db, 'payments', payment.id), payment);
  },

  getLogs: async (): Promise<DeletionLog[]> => {
    const querySnapshot = await getDocs(collection(db, 'deletion_logs'));
    return querySnapshot.docs.map(doc => doc.data() as DeletionLog);
  },
  saveLogs: async (logs: DeletionLog[]) => {
    const batch = writeBatch(db);
    logs.forEach(log => {
      const logRef = doc(db, 'deletion_logs', log.id);
      batch.set(logRef, log);
    });
    await batch.commit();
  },

  getEditLogs: async (): Promise<SaleEditLog[]> => {
    const querySnapshot = await getDocs(collection(db, 'sale_edit_logs'));
    return querySnapshot.docs.map(doc => doc.data() as SaleEditLog);
  },
  saveEditLogs: async (logs: SaleEditLog[]) => {
    const batch = writeBatch(db);
    logs.forEach(log => {
      const logRef = doc(db, 'sale_edit_logs', log.id);
      batch.set(logRef, log);
    });
    await batch.commit();
  },

  getReturnLogs: async (): Promise<ReturnLog[]> => {
    const querySnapshot = await getDocs(collection(db, 'return_logs'));
    return querySnapshot.docs.map(doc => doc.data() as ReturnLog);
  },
  saveReturnLogs: async (logs: ReturnLog[]) => {
    const batch = writeBatch(db);
    logs.forEach(log => {
      const logRef = doc(db, 'return_logs', log.id);
      batch.set(logRef, log);
    });
    await batch.commit();
  },

  getCurrentUser: (): User | null => {
    const data = localStorage.getItem(SESSION_KEY);
    return data ? JSON.parse(data) : null;
  },
  setCurrentUser: (user: User | null) => {
    if (user) localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    else localStorage.removeItem(SESSION_KEY);
  },

  seedDatabase: async (adminUid?: string, salesUid?: string) => {
    const dummyProducts: Product[] = [
      { id: 'p1', name: 'Godox V1 Sony', barcode: '1001', buyingPrice: 18000, price: 25000, category: 'Flashes', stockQuantity: 5, unit: 'Pcs', createdAt: Date.now() },
      { id: 'p2', name: 'Godox V1 Nikon', barcode: '1002', buyingPrice: 18000, price: 25000, category: 'Flashes', stockQuantity: 3, unit: 'Pcs', createdAt: Date.now() },
      { id: 'p3', name: 'Godox V1 Canon', barcode: '1003', buyingPrice: 18000, price: 25000, category: 'Flashes', stockQuantity: 4, unit: 'Pcs', createdAt: Date.now() },
      { id: 'p4', name: 'Godox V1pro Sony', barcode: '1004', buyingPrice: 28000, price: 35000, category: 'Flashes', stockQuantity: 2, unit: 'Pcs', createdAt: Date.now() },
      { id: 'p5', name: 'Godox V1pro Nikon', barcode: '1005', buyingPrice: 28000, price: 35000, category: 'Flashes', stockQuantity: 2, unit: 'Pcs', createdAt: Date.now() },
      { id: 'p6', name: 'Canon 50mm f/1.8', barcode: '1006', buyingPrice: 12000, price: 18000, category: 'Lenses', stockQuantity: 10, unit: 'Pcs', createdAt: Date.now() },
      { id: 'p7', name: 'Canon 85mm f/1.8', barcode: '1007', buyingPrice: 45000, price: 55000, category: 'Lenses', stockQuantity: 3, unit: 'Pcs', createdAt: Date.now() },
      { id: 'p8', name: 'Canon 70-200mm f/2.8', barcode: '1008', buyingPrice: 180000, price: 220000, category: 'Lenses', stockQuantity: 1, unit: 'Pcs', createdAt: Date.now() },
      { id: 'p9', name: 'Nikon 70-200mm f/2.8', barcode: '1009', buyingPrice: 190000, price: 235000, category: 'Lenses', stockQuantity: 2, unit: 'Pcs', createdAt: Date.now() },
      { id: 'p10', name: 'Sony 70-200mm f/2.8', barcode: '1010', buyingPrice: 210000, price: 260000, category: 'Lenses', stockQuantity: 1, unit: 'Pcs', createdAt: Date.now() },
      { id: 'p11', name: 'Sandisk 128GB SD Card', barcode: '1011', buyingPrice: 3500, price: 5500, category: 'Storage', stockQuantity: 20, unit: 'Pcs', createdAt: Date.now() },
      { id: 'p12', name: 'Sandisk 64GB SD Card', barcode: '1012', buyingPrice: 2000, price: 3500, category: 'Storage', stockQuantity: 15, unit: 'Pcs', createdAt: Date.now() },
      { id: 'p13', name: 'Sony NP-FZ100 Battery', barcode: '1013', buyingPrice: 8500, price: 12000, category: 'Batteries', stockQuantity: 8, unit: 'Pcs', createdAt: Date.now() },
      { id: 'p14', name: 'Canon LP-E6NH Battery', barcode: '1014', buyingPrice: 9000, price: 13500, category: 'Batteries', stockQuantity: 6, unit: 'Pcs', createdAt: Date.now() },
      { id: 'p15', name: 'Nikon EN-EL15c Battery', barcode: '1015', buyingPrice: 7500, price: 11000, category: 'Batteries', stockQuantity: 5, unit: 'Pcs', createdAt: Date.now() },
      { id: 'p16', name: 'DJI Ronin RS3 Mini', barcode: '1016', buyingPrice: 35000, price: 48000, category: 'Gimbals', stockQuantity: 3, unit: 'Pcs', createdAt: Date.now() },
      { id: 'p17', name: 'Rode VideoMic Pro+', barcode: '1017', buyingPrice: 25000, price: 32000, category: 'Audio', stockQuantity: 4, unit: 'Pcs', createdAt: Date.now() },
      { id: 'p18', name: 'Peak Design Slide Lite', barcode: '1018', buyingPrice: 6500, price: 9500, category: 'Accessories', stockQuantity: 10, unit: 'Pcs', createdAt: Date.now() },
      { id: 'p19', name: 'Manfrotto BeFree Tripod', barcode: '1019', buyingPrice: 18000, price: 26000, category: 'Tripods', stockQuantity: 5, unit: 'Pcs', createdAt: Date.now() },
      { id: 'p20', name: 'Lowepro ProTactic 450 AW II', barcode: '1020', buyingPrice: 22000, price: 32000, category: 'Bags', stockQuantity: 3, unit: 'Pcs', createdAt: Date.now() },
    ];

    const dummyUsers: User[] = [
      { id: adminUid || 'admin-john', name: 'John Qiao', username: 'johnqiao', email: 'johnqiao23@gmail.com', passwordHash: 'wamai10204111', role: UserRole.ADMIN, createdAt: Date.now() },
      { id: salesUid || 'john-sales', name: 'John Mukunga', username: 'john', email: 'mukungajohn@gmail.com', passwordHash: 'Mukunga1234', role: UserRole.SALESPERSON, createdAt: Date.now() },
    ];

    const dummyExpense: Expense[] = [
      { id: 'e1', description: 'Monthly Electricity Bill', amount: 2500, category: 'Utilities', date: Date.now(), recordedBy: 'Admin' }
    ];

    const batch = writeBatch(db);
    dummyProducts.forEach(p => batch.set(doc(db, 'products', p.id), p));
    dummyUsers.forEach(u => batch.set(doc(db, 'users', u.id), u));
    dummyExpense.forEach(e => batch.set(doc(db, 'expenses', e.id), e));
    await batch.commit();
    return { message: 'Database seeded successfully' };
  },

  clearDatabase: async () => {
    const collections = ['users', 'products', 'sales', 'expenses', 'customers', 'payments', 'deletion_logs', 'sale_edit_logs', 'return_logs'];
    for (const collName of collections) {
      const snapshot = await getDocs(collection(db, collName));
      const batch = writeBatch(db);
      snapshot.docs.forEach(doc => batch.delete(doc.ref));
      await batch.commit();
    }
    console.log('Database cleared successfully');
  }
};
