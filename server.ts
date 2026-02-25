import express from 'express';
import { createServer as createViteServer } from 'vite';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;

// Initialize Supabase on the server with the SECRET key
const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || ''; // This is the secret key provided by the user

if (!supabaseUrl || !supabaseKey) {
  console.error('CRITICAL: Supabase credentials missing in environment variables.');
}

const supabase = createClient(supabaseUrl, supabaseKey);

app.use(express.json());

// API Routes - Proxying requests to Supabase
app.post('/api/db/:table/select', async (req, res) => {
  const { table } = req.params;
  const { query = '*' } = req.body;
  const { data, error } = await supabase.from(table).select(query);
  if (error) return res.status(400).json(error);
  res.json(data);
});

app.post('/api/db/:table/upsert', async (req, res) => {
  const { table } = req.params;
  const { values } = req.body;
  const { data, error } = await supabase.from(table).upsert(values);
  if (error) return res.status(400).json(error);
  res.json(data);
});

app.post('/api/db/:table/insert', async (req, res) => {
  const { table } = req.params;
  const { values } = req.body;
  const { data, error } = await supabase.from(table).insert(values);
  if (error) return res.status(400).json(error);
  res.json(data);
});

app.post('/api/db/:table/delete', async (req, res) => {
  const { table } = req.params;
  const { id } = req.body;
  
  console.log(`Attempting to delete from ${table} where id=${id}`);
  
  if (!id) {
    return res.status(400).json({ error: 'Missing ID for deletion' });
  }

  const { data, error } = await supabase.from(table).delete().eq('id', id);
  
  if (error) {
    console.error(`Delete error for ${table}:`, error);
    return res.status(400).json(error);
  }
  
  console.log(`Successfully deleted from ${table}`);
  res.json({ success: true, data });
});

app.post('/api/seed', async (req, res) => {
  try {
    const dummyProducts = [
      { id: 'p1', name: 'Fresh Bread', barcode: '1001', buyingPrice: 45, price: 60, category: 'Snacks', stockQuantity: 25, unit: 'Pcs', createdAt: Date.now() },
      { id: 'p2', name: 'Milk 500ml', barcode: '1002', buyingPrice: 55, price: 70, category: 'Beverages', stockQuantity: 30, unit: 'Pcs', createdAt: Date.now() },
      { id: 'p3', name: 'Sugar 1kg', barcode: '1003', buyingPrice: 125, price: 150, category: 'General', stockQuantity: 50, unit: 'Pcs', createdAt: Date.now() },
      { id: 'p4', name: 'Ballpoint Pen', barcode: '1004', buyingPrice: 12, price: 20, category: 'Stationery', stockQuantity: 100, unit: 'Pcs', createdAt: Date.now() },
      { id: 'p5', name: 'Soda 300ml', barcode: '1005', buyingPrice: 35, price: 50, category: 'Beverages', stockQuantity: 40, unit: 'Pcs', createdAt: Date.now() },
      { id: 'p6', name: 'Bathing Soap', barcode: '1006', buyingPrice: 65, price: 80, category: 'General', stockQuantity: 25, unit: 'Pcs', createdAt: Date.now() },
      { id: 'p7', name: 'Cooking Oil 1L', barcode: '1007', buyingPrice: 210, price: 250, category: 'General', stockQuantity: 15, unit: 'Pcs', createdAt: Date.now() },
      { id: 'p8', name: 'Wheat Flour 2kg', barcode: '1008', buyingPrice: 170, price: 200, category: 'General', stockQuantity: 20, unit: 'Pcs', createdAt: Date.now() },
      { id: 'p9', name: 'Chocolate Biscuits', barcode: '1009', buyingPrice: 22, price: 35, category: 'Snacks', stockQuantity: 60, unit: 'Pcs', createdAt: Date.now() },
      { id: 'p10', name: 'Table Salt 500g', barcode: '1010', buyingPrice: 25, price: 35, category: 'General', stockQuantity: 40, unit: 'Pcs', createdAt: Date.now() },
    ];

    const dummyUsers = [
      { id: 'u1', name: 'John Doe', username: 'john', passwordHash: 'pass123', role: 'salesperson', createdAt: Date.now() },
      { id: 'u2', name: 'Jane Smith', username: 'jane', passwordHash: 'pass456', role: 'admin', createdAt: Date.now() },
    ];

    const dummyExpense = [
      { id: 'e1', description: 'Monthly Electricity Bill', amount: 2500, category: 'Utilities', date: Date.now(), recordedBy: 'Admin' }
    ];

    const { error: pErr } = await supabase.from('products').upsert(dummyProducts);
    if (pErr) throw pErr;
    
    const { error: uErr } = await supabase.from('users').upsert(dummyUsers);
    if (uErr) throw uErr;
    
    const { error: eErr } = await supabase.from('expenses').upsert(dummyExpense);
    if (eErr) throw eErr;

    res.json({ message: 'Database seeded successfully with 10 products, 2 users, and 1 expense.' });
  } catch (error: any) {
    console.error('Seeding error:', error);
    res.status(500).json({ 
      error: 'Seeding failed', 
      message: error.message || 'Unknown error',
      hint: 'Ensure you have created the tables in Supabase SQL Editor first.' 
    });
  }
});

// Vite middleware for development
if (process.env.NODE_ENV !== 'production') {
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });
  app.use(vite.middlewares);
} else {
  app.use(express.static('dist'));
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
