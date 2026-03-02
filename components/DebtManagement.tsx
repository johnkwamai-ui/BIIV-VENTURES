
import React, { useState, useEffect, useMemo } from 'react';
import { Customer, Sale, Payment, User } from '../types';
import { storage } from '../services/storage';
import { motion, AnimatePresence } from 'motion/react';

interface DebtManagementProps {
  user: User;
}

const DebtManagement: React.FC<DebtManagementProps> = ({ user }) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentRef, setPaymentRef] = useState('');
  const [activeTab, setActiveTab] = useState<'summary' | 'aging' | 'statement'>('summary');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [c, s, p] = await Promise.all([
        storage.getCustomers(),
        storage.getSales(),
        storage.getPayments()
      ]);
      setCustomers(c);
      setSales(s);
      setPayments(p);
    } catch (err) {
      console.error('Error fetching debt data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRecordPayment = async () => {
    if (!selectedCustomer || paymentAmount <= 0) return;

    try {
      // Find unpaid/partial sales for this customer
      const customerSales = sales
        .filter(s => s.customerId === selectedCustomer.id && (s.status === 'partial' || s.status === 'unpaid'))
        .sort((a, b) => a.createdAt - b.createdAt);

      let remainingPayment = paymentAmount;
      const updatedSales = [...sales];
      const newPayments: Payment[] = [];

      for (const sale of customerSales) {
        if (remainingPayment <= 0) break;

        const amountToApply = Math.min(remainingPayment, sale.balance);
        const newPayment: Payment = {
          id: `PAY-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          saleId: sale.id,
          customerId: selectedCustomer.id,
          amount: amountToApply,
          paymentMode: sale.paymentMethod, // Default to original mode or let user choose
          receivedBy: user.id,
          receivedByName: user.name,
          paidAt: Date.now()
        };

        newPayments.push(newPayment);
        
        // Update sale in local state
        const saleIdx = updatedSales.findIndex(s => s.id === sale.id);
        if (saleIdx !== -1) {
          const s = updatedSales[saleIdx];
          s.amountPaid += amountToApply;
          s.balance -= amountToApply;
          s.status = s.balance <= 0 ? 'paid' : 'partial';
        }

        remainingPayment -= amountToApply;
      }

      // Save all updates
      await Promise.all([
        ...newPayments.map(p => storage.savePayment(p)),
        storage.saveSales(updatedSales),
        storage.saveCustomers(customers.map(c => 
          c.id === selectedCustomer.id ? { ...c, debt: Math.max(0, c.debt - paymentAmount) } : c
        ))
      ]);

      await fetchData();
      setShowPaymentModal(false);
      setPaymentAmount(0);
      setPaymentRef('');
      alert('Payment recorded successfully');
    } catch (err) {
      alert('Error recording payment');
      console.error(err);
    }
  };

  const customerStatement = useMemo(() => {
    if (!selectedCustomer) return [];
    
    const customerSales = sales.filter(s => s.customerId === selectedCustomer.id);
    const customerPayments = payments.filter(p => p.customerId === selectedCustomer.id);

    const entries = [
      ...customerSales.map(s => ({ type: 'SALE', date: s.createdAt, amount: s.totalAmount, id: s.id, ref: s.id })),
      ...customerPayments.map(p => ({ type: 'PAYMENT', date: p.paidAt, amount: -p.amount, id: p.id, ref: p.saleId }))
    ].sort((a, b) => a.date - b.date);

    let runningBalance = 0;
    return entries.map(e => {
      runningBalance += e.amount;
      return { ...e, balance: runningBalance };
    });
  }, [selectedCustomer, sales, payments]);

  const agingReport = useMemo(() => {
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    
    const report = {
      current: 0, // 0-30
      thirty: 0,  // 31-60
      sixty: 0,   // 61-90
      ninety: 0   // 90+
    };

    sales.filter(s => s.balance > 0).forEach(s => {
      const ageDays = (now - s.createdAt) / dayMs;
      if (ageDays <= 30) report.current += s.balance;
      else if (ageDays <= 60) report.thirty += s.balance;
      else if (ageDays <= 90) report.sixty += s.balance;
      else report.ninety += s.balance;
    });

    return report;
  }, [sales]);

  if (loading) return <div className="p-10 text-center">Loading Debt Data...</div>;

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Receivables</p>
          <p className="text-2xl font-black text-[#800000]">KES {customers.reduce((acc, c) => acc + c.debt, 0).toLocaleString()}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Overdue (30+ Days)</p>
          <p className="text-2xl font-black text-orange-600">KES {(agingReport.thirty + agingReport.sixty + agingReport.ninety).toLocaleString()}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Critical (90+ Days)</p>
          <p className="text-2xl font-black text-red-600">KES {agingReport.ninety.toLocaleString()}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Recovery (This Month)</p>
          <p className="text-2xl font-black text-green-600">
            KES {payments.filter(p => {
              const d = new Date(p.paidAt);
              const now = new Date();
              return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
            }).reduce((acc, p) => acc + p.amount, 0).toLocaleString()}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-4 border-b border-gray-100">
        <button onClick={() => setActiveTab('summary')} className={`pb-2 px-4 text-sm font-bold transition-all ${activeTab === 'summary' ? 'border-b-2 border-[#800000] text-[#800000]' : 'text-gray-400'}`}>Customer Summary</button>
        <button onClick={() => setActiveTab('aging')} className={`pb-2 px-4 text-sm font-bold transition-all ${activeTab === 'aging' ? 'border-b-2 border-[#800000] text-[#800000]' : 'text-gray-400'}`}>Aging Report</button>
        {selectedCustomer && <button onClick={() => setActiveTab('statement')} className={`pb-2 px-4 text-sm font-bold transition-all ${activeTab === 'statement' ? 'border-b-2 border-[#800000] text-[#800000]' : 'text-gray-400'}`}>Statement: {selectedCustomer.name}</button>}
      </div>

      {activeTab === 'summary' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[600px]">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase">Customer</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase text-right">Total Debt</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase text-center">Status</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {customers.filter(c => c.debt > 0).map(c => (
                  <tr key={c.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4" onClick={() => { setSelectedCustomer(c); setActiveTab('statement'); }} style={{ cursor: 'pointer' }}>
                      <p className="font-bold text-gray-800">{c.name}</p>
                      <p className="text-[10px] text-gray-400">{c.phone}</p>
                    </td>
                    <td className="px-6 py-4 text-right font-black text-red-600">KES {c.debt.toLocaleString()}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-2 py-1 rounded-full text-[8px] font-black uppercase ${c.debt > 5000 ? 'bg-red-100 text-red-600' : 'bg-yellow-100 text-yellow-600'}`}>
                        {c.debt > 5000 ? 'High Risk' : 'Active'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-3">
                      <button 
                        onClick={() => { setSelectedCustomer(c); setActiveTab('statement'); }}
                        className="text-blue-600 hover:underline text-xs font-bold"
                      >View Statement</button>
                      <button 
                        onClick={() => { setSelectedCustomer(c); setShowPaymentModal(true); }}
                        className="text-[#800000] hover:underline text-xs font-bold"
                      >Record Payment</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'aging' && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[
            { label: '0-30 Days', amount: agingReport.current, color: 'text-green-600' },
            { label: '31-60 Days', amount: agingReport.thirty, color: 'text-yellow-600' },
            { label: '61-90 Days', amount: agingReport.sixty, color: 'text-orange-600' },
            { label: '90+ Days', amount: agingReport.ninety, color: 'text-red-600' }
          ].map(bucket => (
            <div key={bucket.label} className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 text-center">
              <p className="text-[10px] font-black text-gray-400 uppercase mb-2">{bucket.label}</p>
              <p className={`text-3xl font-black ${bucket.color}`}>KES {bucket.amount.toLocaleString()}</p>
              <div className="mt-4 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div 
                  className={`h-full ${bucket.color.replace('text', 'bg')}`} 
                  style={{ width: `${(bucket.amount / (customers.reduce((acc, c) => acc + c.debt, 0) || 1)) * 100}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'statement' && selectedCustomer && (
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 bg-gray-50 border-b flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h3 className="text-lg font-black text-gray-800">Customer Statement</h3>
              <p className="text-xs text-gray-500">{selectedCustomer.name} | {selectedCustomer.phone}</p>
            </div>
            <div className="text-left md:text-right">
              <p className="text-[10px] font-black text-gray-400 uppercase">Current Balance</p>
              <p className="text-xl font-black text-red-600">KES {selectedCustomer.debt.toLocaleString()}</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[600px]">
              <thead className="bg-white border-b">
                <tr>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase">Date</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase">Description</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase text-right">Amount</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase text-right">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {customerStatement.map((entry, idx) => (
                  <tr key={idx} className="text-xs">
                    <td className="px-6 py-3 text-gray-500">{new Date(entry.date).toLocaleDateString()}</td>
                    <td className="px-6 py-3">
                      <span className={`font-bold ${entry.type === 'SALE' ? 'text-gray-800' : 'text-green-600'}`}>
                        {entry.type === 'SALE' ? 'Invoice' : 'Payment Received'}
                      </span>
                      <p className="text-[10px] text-gray-400">Ref: {entry.ref}</p>
                    </td>
                    <td className={`px-6 py-3 text-right font-bold ${entry.amount > 0 ? 'text-red-500' : 'text-green-600'}`}>
                      {entry.amount > 0 ? '+' : ''}{entry.amount.toLocaleString()}
                    </td>
                    <td className="px-6 py-3 text-right font-black text-gray-800">KES {entry.balance.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-6 bg-gray-50 flex justify-end">
             <button onClick={() => window.print()} className="w-full md:w-auto px-6 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold hover:bg-gray-100">🖨️ Print Statement</button>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      <AnimatePresence>
        {showPaymentModal && selectedCustomer && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8"
            >
              <h3 className="text-2xl font-black mb-2 text-gray-800">Record Debt Payment</h3>
              <p className="text-sm text-gray-500 mb-6">Customer: <span className="font-bold text-gray-800">{selectedCustomer.name}</span></p>
              
              <div className="space-y-4">
                <div className="bg-red-50 p-4 rounded-2xl border border-red-100">
                  <p className="text-[10px] font-black text-red-400 uppercase">Current Outstanding</p>
                  <p className="text-xl font-black text-red-600">KES {selectedCustomer.debt.toLocaleString()}</p>
                </div>
                
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Payment Amount (KES)</label>
                  <input 
                    type="number" 
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-[#800000] font-black text-lg" 
                    value={paymentAmount}
                    onChange={e => setPaymentAmount(Number(e.target.value))}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Reference / Note</label>
                  <input 
                    type="text" 
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-[#800000]" 
                    value={paymentRef}
                    onChange={e => setPaymentRef(e.target.value)}
                    placeholder="e.g. M-Pesa Ref or Check No."
                  />
                </div>
              </div>

              <div className="flex gap-4 mt-10">
                <button onClick={() => setShowPaymentModal(false)} className="flex-1 py-3 border border-gray-200 rounded-xl font-bold text-gray-500 hover:bg-gray-50">Cancel</button>
                <button 
                  onClick={handleRecordPayment}
                  disabled={paymentAmount <= 0 || paymentAmount > selectedCustomer.debt}
                  className="flex-1 py-3 bg-[#800000] text-white rounded-xl font-bold hover:bg-red-900 shadow-lg shadow-red-900/20 disabled:opacity-50"
                >Confirm Payment</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DebtManagement;
