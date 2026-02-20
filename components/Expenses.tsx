
import React, { useState } from 'react';
import { Expense, User } from '../types';
import { storage } from '../services/storage';

interface ExpensesProps {
  user: User;
}

const EXPENSE_CATEGORIES: Expense['category'][] = ['Rent', 'Salaries', 'Utilities', 'Stock', 'Other'];

const Expenses: React.FC<ExpensesProps> = ({ user }) => {
  const [expenses, setExpenses] = useState<Expense[]>(storage.getExpenses());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<Expense>>({
    description: '',
    amount: 0,
    category: 'Other',
    date: Date.now()
  });

  const handleSave = () => {
    if (!formData.description || !formData.amount || formData.amount <= 0) {
      alert("Please enter a valid description and amount.");
      return;
    }

    const newExpense: Expense = {
      id: `EXP-${Date.now()}`,
      description: formData.description!,
      amount: formData.amount!,
      category: formData.category as Expense['category'],
      date: new Date(formData.date!).getTime(),
      recordedBy: user.name
    };

    const updated = [newExpense, ...expenses];
    storage.saveExpenses(updated);
    setExpenses(updated);
    setIsModalOpen(false);
    setFormData({ description: '', amount: 0, category: 'Other', date: Date.now() });
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Delete this expense record?")) {
      const updated = expenses.filter(e => e.id !== id);
      storage.saveExpenses(updated);
      setExpenses(updated);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h2 className="text-xl font-black text-gray-800 tracking-tight">Operating Expenses</h2>
          <p className="text-xs text-gray-400 font-medium">Record outgoings to track business net profit</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="px-6 py-2.5 bg-[#800000] text-white rounded-xl font-bold hover:bg-red-900 transition-all shadow-lg shadow-red-900/20">+ Add Expense</button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50/50 border-b">
            <tr>
              <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Date</th>
              <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Category</th>
              <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Description</th>
              <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Amount (KES)</th>
              <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {expenses.map(e => (
              <tr key={e.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-6 py-4 text-xs font-bold text-gray-500">{new Date(e.date).toLocaleDateString()}</td>
                <td className="px-6 py-4"><span className="px-2 py-1 rounded-md bg-red-50 text-red-700 text-[10px] font-black uppercase">{e.category}</span></td>
                <td className="px-6 py-4 text-sm font-bold text-gray-800">{e.description}</td>
                <td className="px-6 py-4 text-right font-black text-red-600">KES {e.amount.toLocaleString()}</td>
                <td className="px-6 py-4 text-right">
                  <button onClick={() => handleDelete(e.id)} className="text-gray-400 hover:text-red-500 transition-colors">🗑️</button>
                </td>
              </tr>
            ))}
            {expenses.length === 0 && (
              <tr><td colSpan={5} className="px-6 py-20 text-center text-gray-400 opacity-50 font-bold">No expense records found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 animate-in slide-in-from-bottom-4 duration-300">
            <h3 className="text-2xl font-black mb-6 text-gray-800">New Expense</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Description</label>
                <input type="text" className="w-full px-4 py-3 bg-gray-50 border rounded-xl outline-none" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="e.g. Electricity Bill Jan" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Category</label>
                  <select className="w-full px-4 py-3 bg-gray-50 border rounded-xl outline-none" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value as any})}>
                    {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Amount</label>
                  <input type="number" className="w-full px-4 py-3 bg-gray-50 border rounded-xl outline-none font-black text-[#800000]" value={formData.amount} onChange={e => setFormData({...formData, amount: Number(e.target.value)})} />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Date</label>
                <input type="date" className="w-full px-4 py-3 bg-gray-50 border rounded-xl outline-none" value={new Date(formData.date!).toISOString().split('T')[0]} onChange={e => setFormData({...formData, date: new Date(e.target.value).getTime()})} />
              </div>
            </div>
            <div className="flex gap-4 mt-8">
              <button onClick={() => setIsModalOpen(false)} className="flex-1 py-3 border rounded-xl font-bold text-gray-500 hover:bg-gray-50">Discard</button>
              <button onClick={handleSave} className="flex-1 py-3 bg-[#800000] text-white rounded-xl font-bold hover:bg-red-900 shadow-lg shadow-red-900/20">Record Expense</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Expenses;
