
import React, { useState, useEffect } from 'react';
import { Product } from '../types';
import { storage } from '../services/storage';

const CATEGORIES = ['General', 'Electronics', 'Stationery', 'Beverages', 'Services', 'Snacks', 'Other'];
const UNITS = ['Pcs', 'Kg', 'Ltr', 'Box', 'Set', 'Hrs'];

const Inventory: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const p = await storage.getProducts();
        setProducts(p);
      } catch (err) {
        console.error('Error fetching products:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  const [formData, setFormData] = useState({
    name: '',
    barcode: '',
    buyingPrice: 0,
    price: 0,
    category: 'General',
    stockQuantity: 0,
    unit: 'Pcs'
  });

  const handleOpenModal = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        name: product.name,
        barcode: product.barcode,
        buyingPrice: product.buyingPrice || 0,
        price: product.price,
        category: product.category || 'General',
        stockQuantity: product.stockQuantity,
        unit: product.unit || 'Pcs'
      });
    } else {
      setEditingProduct(null);
      setFormData({ name: '', barcode: '', buyingPrice: 0, price: 0, category: 'General', stockQuantity: 0, unit: 'Pcs' });
    }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.barcode || formData.price < 0) {
      alert("Please fill all required fields correctly.");
      return;
    }

    try {
      let updatedList: Product[];
      if (editingProduct) {
        updatedList = products.map(p => p.id === editingProduct.id ? { ...p, ...formData } : p);
      } else {
        const newProduct: Product = {
          id: `PROD-${Date.now()}`,
          ...formData,
          createdAt: Date.now()
        };
        updatedList = [...products, newProduct];
      }

      await storage.saveProducts(updatedList);
      setProducts(updatedList);
      setIsModalOpen(false);
    } catch (err) {
      alert('Error saving product. Please check your connection.');
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure? This will permanently remove the product.")) {
      try {
        await storage.deleteProduct(id);
        const updated = products.filter(p => p.id !== id);
        setProducts(updated);
      } catch (err: any) {
        alert(`Error deleting product: ${err.message || 'Unknown error'}`);
        console.error(err);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#800000]"></div>
      </div>
    );
  }

  const downloadCSV = () => {
    const headers = ['Barcode', 'Name', 'Category', 'Buying Price', 'Selling Price', 'Stock', 'Unit'];
    const rows = products.map(p => [p.barcode, p.name, p.category, p.buyingPrice, p.price, p.stockQuantity, p.unit]);
    const content = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "inventory_report.csv");
    link.click();
  };

  const filtered = products.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) || p.barcode.includes(search)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
        <div className="relative w-full md:w-96">
          <input
            type="text"
            placeholder="Quick search products..."
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-[#800000] focus:bg-white transition-all"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <span className="absolute left-3 top-3 text-gray-400">🔍</span>
        </div>
        <div className="flex w-full md:w-auto space-x-2">
          <button onClick={downloadCSV} className="flex-1 md:w-auto px-4 py-2.5 border border-gray-200 text-gray-600 rounded-xl font-bold hover:bg-gray-50">CSV Export</button>
          <button onClick={() => handleOpenModal()} className="flex-1 md:w-auto px-6 py-2.5 bg-[#800000] text-white rounded-xl font-bold hover:bg-red-900 transition-all shadow-lg shadow-red-900/20">+ Add Stock</button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50/50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Product Details</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Category</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Cost (KES)</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Selling (KES)</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Stock</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(p => (
                <tr key={p.id} className="hover:bg-gray-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <p className="font-bold text-gray-800 group-hover:text-[#800000] transition-colors">{p.name}</p>
                    <p className="text-[10px] font-mono text-gray-400">#{p.barcode}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs bg-gray-100 px-2 py-1 rounded-md font-bold text-gray-600">{p.category}</span>
                  </td>
                  <td className="px-6 py-4 text-right text-gray-500 font-medium">KES {p.buyingPrice.toLocaleString()}</td>
                  <td className="px-6 py-4 text-right font-black text-[#800000]">KES {p.price.toLocaleString()}</td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex flex-col items-center">
                      <span className={`px-3 py-0.5 rounded-full text-[10px] font-black ${
                        p.stockQuantity < 10 ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'
                      }`}>
                        {p.stockQuantity} {p.unit}
                      </span>
                      {p.stockQuantity === 0 && <span className="text-[8px] text-red-500 font-bold uppercase mt-1">Out of stock</span>}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right space-x-3">
                    <button onClick={() => handleOpenModal(p)} className="text-blue-600 hover:underline text-xs font-bold">Edit</button>
                    <button onClick={() => handleDelete(p.id)} className="text-red-500 hover:underline text-xs font-bold">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full p-8 animate-in zoom-in duration-200">
            <h3 className="text-2xl font-black mb-6 text-gray-800">{editingProduct ? 'Update Inventory' : 'Add New Item'}</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Product Name</label>
                <input type="text" className="w-full px-4 py-2 bg-gray-50 border rounded-xl outline-none focus:ring-2 focus:ring-[#800000]" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Barcode / SKU</label>
                <input type="text" className="w-full px-4 py-2 bg-gray-50 border rounded-xl outline-none focus:ring-2 focus:ring-[#800000]" value={formData.barcode} onChange={e => setFormData({...formData, barcode: e.target.value})} />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Category</label>
                <select className="w-full px-4 py-2 bg-gray-50 border rounded-xl outline-none focus:ring-2 focus:ring-[#800000]" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Unit</label>
                <select className="w-full px-4 py-2 bg-gray-50 border rounded-xl outline-none focus:ring-2 focus:ring-[#800000]" value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value})}>
                  {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Current Stock</label>
                <input type="number" className="w-full px-4 py-2 bg-gray-50 border rounded-xl outline-none focus:ring-2 focus:ring-[#800000]" value={formData.stockQuantity} onChange={e => setFormData({...formData, stockQuantity: Number(e.target.value)})} />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Buying Cost (KES)</label>
                <input type="number" className="w-full px-4 py-2 bg-gray-50 border rounded-xl outline-none focus:ring-2 focus:ring-[#800000]" value={formData.buyingPrice} onChange={e => setFormData({...formData, buyingPrice: Number(e.target.value)})} />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Selling Price (KES)</label>
                <input type="number" className="w-full px-4 py-2 bg-[#800000]/5 border border-[#800000]/20 text-[#800000] font-black rounded-xl outline-none focus:ring-2 focus:ring-[#800000]" value={formData.price} onChange={e => setFormData({...formData, price: Number(e.target.value)})} />
              </div>
            </div>
            <div className="flex gap-4 mt-10">
              <button onClick={() => setIsModalOpen(false)} className="flex-1 py-3 border border-gray-200 rounded-xl font-bold text-gray-500 hover:bg-gray-50">Discard</button>
              <button onClick={handleSave} className="flex-1 py-3 bg-[#800000] text-white rounded-xl font-bold hover:bg-red-900 shadow-lg shadow-red-900/20">Save Product</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;
