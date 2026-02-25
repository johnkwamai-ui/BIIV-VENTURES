
import React, { useState, useEffect } from 'react';
import { Customer } from '../types';
import { storage } from '../services/storage';

const Customers: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [search, setSearch] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    debt: 0
  });

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const data = await storage.getCustomers();
      setCustomers(data);
    } catch (err) {
      console.error('Error fetching customers:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (customer?: Customer) => {
    if (customer) {
      setEditingCustomer(customer);
      setFormData({
        name: customer.name,
        phone: customer.phone,
        email: customer.email || '',
        address: customer.address || '',
        debt: customer.debt
      });
    } else {
      setEditingCustomer(null);
      setFormData({ name: '', phone: '', email: '', address: '', debt: 0 });
    }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.phone) {
      alert('Name and Phone are required');
      return;
    }

    try {
      let updatedList: Customer[];
      if (editingCustomer) {
        updatedList = customers.map(c => c.id === editingCustomer.id ? { ...c, ...formData } : c);
      } else {
        const newCustomer: Customer = {
          id: `CUST-${Date.now()}`,
          ...formData,
          createdAt: Date.now()
        };
        updatedList = [...customers, newCustomer];
      }

      await storage.saveCustomers(updatedList);
      setCustomers(updatedList);
      setIsModalOpen(false);
    } catch (err) {
      alert('Error saving customer');
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this customer?')) {
      try {
        await storage.deleteCustomer(id);
        setCustomers(customers.filter(c => c.id !== id));
      } catch (err) {
        alert('Error deleting customer');
      }
    }
  };

  const filtered = customers.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    c.phone.includes(search)
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#800000]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
        <div className="relative w-full md:w-96">
          <input
            type="text"
            placeholder="Search customers by name or phone..."
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-[#800000] focus:bg-white transition-all"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <span className="absolute left-3 top-3 text-gray-400">🔍</span>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="w-full md:w-auto px-6 py-2.5 bg-[#800000] text-white rounded-xl font-bold hover:bg-red-900 transition-all shadow-lg shadow-red-900/20"
        >
          + Add Customer
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(customer => (
          <div key={customer.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-all group">
            <div className="flex justify-between items-start mb-4">
              <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center text-xl">
                👤
              </div>
              <div className="flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => handleOpenModal(customer)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg">✏️</button>
                <button onClick={() => handleDelete(customer.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg">🗑️</button>
              </div>
            </div>
            <h3 className="text-lg font-black text-gray-800 truncate">{customer.name}</h3>
            <p className="text-sm text-gray-500 font-medium mb-4">{customer.phone}</p>
            
            <div className="space-y-2 pt-4 border-t border-gray-50">
              <div className="flex justify-between text-xs">
                <span className="text-gray-400 font-bold uppercase">Outstanding Debt</span>
                <span className={`font-black ${customer.debt > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  KES {customer.debt.toLocaleString()}
                </span>
              </div>
              {customer.email && (
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400 font-bold uppercase">Email</span>
                  <span className="text-gray-600 truncate max-w-[150px]">{customer.email}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 animate-in zoom-in duration-200">
            <h3 className="text-2xl font-black mb-6 text-gray-800">{editingCustomer ? 'Edit Customer' : 'New Customer'}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 tracking-widest">Full Name</label>
                <input 
                  type="text" 
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-[#800000]" 
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})} 
                  placeholder="e.g. John Kamau"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 tracking-widest">Phone Number</label>
                <input 
                  type="text" 
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-[#800000]" 
                  value={formData.phone} 
                  onChange={e => setFormData({...formData, phone: e.target.value})} 
                  placeholder="e.g. 0712345678"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 tracking-widest">Email (Optional)</label>
                <input 
                  type="email" 
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-[#800000]" 
                  value={formData.email} 
                  onChange={e => setFormData({...formData, email: e.target.value})} 
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 tracking-widest">Address</label>
                <input 
                  type="text" 
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-[#800000]" 
                  value={formData.address} 
                  onChange={e => setFormData({...formData, address: e.target.value})} 
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 tracking-widest">Initial Debt (KES)</label>
                <input 
                  type="number" 
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-[#800000]" 
                  value={formData.debt} 
                  onChange={e => setFormData({...formData, debt: Number(e.target.value)})} 
                />
              </div>
            </div>
            <div className="flex gap-4 mt-10">
              <button onClick={() => setIsModalOpen(false)} className="flex-1 py-3 border border-gray-100 rounded-xl font-bold text-gray-500 hover:bg-gray-50">Cancel</button>
              <button onClick={handleSave} className="flex-1 py-3 bg-[#800000] text-white rounded-xl font-bold hover:bg-red-900 shadow-lg shadow-red-900/20">Save Customer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Customers;
