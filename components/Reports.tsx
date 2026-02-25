
import React, { useMemo, useState, useEffect } from 'react';
import { storage } from '../services/storage';
import { Sale, Expense } from '../types';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

const Reports: React.FC = () => {
  const [startDate, setStartDate] = useState(new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [allSales, setAllSales] = useState<Sale[]>([]);
  const [allExpenses, setAllExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [s, e] = await Promise.all([
          storage.getSales(),
          storage.getExpenses()
        ]);
        setAllSales(s);
        setAllExpenses(e);
      } catch (err) {
        console.error('Error fetching report data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filteredData = useMemo(() => {
    const start = new Date(startDate).setHours(0, 0, 0, 0);
    const end = new Date(endDate).setHours(23, 59, 59, 999);
    
    const sales = allSales.filter(s => s.createdAt >= start && s.createdAt <= end && s.status !== 'returned');
    const expenses = allExpenses.filter(e => e.date >= start && e.date <= end);
    
    return { sales, expenses };
  }, [allSales, allExpenses, startDate, endDate]);

  const financials = useMemo(() => {
    const { sales, expenses } = filteredData;
    
    const revenue = sales.reduce((acc, s) => acc + s.totalAmount, 0);
    const cogs = sales.reduce((acc, s) => {
      const saleCost = s.items.reduce((iAcc, item) => iAcc + (item.buyingPrice * item.quantity), 0);
      return acc + saleCost;
    }, 0);
    
    const grossProfit = revenue - cogs;
    const totalExpenses = expenses.reduce((acc, e) => acc + e.amount, 0);
    const netProfit = grossProfit - totalExpenses;
    const totalDebt = sales.reduce((acc, s) => acc + (s.balance > 0 ? s.balance : 0), 0);

    const productMap: Record<string, { name: string; qty: number; revenue: number; profit: number }> = {};
    sales.forEach(s => {
      s.items.forEach(item => {
        if (!productMap[item.productId]) productMap[item.productId] = { name: item.productName, qty: 0, revenue: 0, profit: 0 };
        productMap[item.productId].qty += item.quantity;
        productMap[item.productId].revenue += (item.price * item.quantity);
        productMap[item.productId].profit += ((item.price - item.buyingPrice) * item.quantity);
      });
    });

    return { 
      revenue, cogs, grossProfit, totalExpenses, netProfit, totalDebt,
      topProducts: Object.values(productMap).sort((a,b) => b.revenue - a.revenue).slice(0, 10)
    };
  }, [filteredData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#800000]"></div>
      </div>
    );
  }

  const downloadSalesCSV = () => {
    const headers = ['Sale ID', 'Date', 'Customer', 'Items', 'Total', 'Paid', 'Debt', 'Method'];
    const rows = filteredData.sales.map(s => [
      s.id, new Date(s.createdAt).toLocaleDateString(), 
      s.customerName || 'Walk-in', 
      s.items.map(i => `${i.productName} (x${i.quantity})`).join(";"), 
      s.totalAmount, s.amountPaid, s.balance, s.paymentMethod
    ]);
    const content = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `sales_report_${startDate}_to_${endDate}.csv`;
    link.click();
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-700">
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-gray-800 tracking-tight">Business Financials</h2>
          <p className="text-xs text-gray-400 font-medium">Performance analysis for the selected period</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <input type="date" className="text-xs p-2.5 border rounded-xl outline-none" value={startDate} onChange={e => setStartDate(e.target.value)} />
          <input type="date" className="text-xs p-2.5 border rounded-xl outline-none" value={endDate} onChange={e => setEndDate(e.target.value)} />
          <button onClick={downloadSalesCSV} className="p-2.5 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 transition-colors">📥 Export</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Revenue</p>
          <p className="text-2xl font-black text-blue-600">KES {financials.revenue.toLocaleString()}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Gross Profit</p>
          <p className="text-2xl font-black text-green-600">KES {financials.grossProfit.toLocaleString()}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Expenses</p>
          <p className="text-2xl font-black text-red-500">KES {financials.totalExpenses.toLocaleString()}</p>
        </div>
        <div className="bg-[#800000] p-6 rounded-2xl shadow-xl shadow-red-900/20 text-white">
          <p className="text-[10px] font-black text-white/60 uppercase tracking-widest mb-1">Net Profit</p>
          <p className="text-2xl font-black">KES {financials.netProfit.toLocaleString()}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <h3 className="text-lg font-black mb-4">Top Performance Products</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-[10px] font-black text-gray-400 uppercase">Product</th>
                  <th className="px-4 py-3 text-[10px] font-black text-gray-400 uppercase text-center">Qty</th>
                  <th className="px-4 py-3 text-[10px] font-black text-gray-400 uppercase text-right">Rev</th>
                  <th className="px-4 py-3 text-[10px] font-black text-gray-400 uppercase text-right">Profit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {financials.topProducts.map((p, i) => (
                  <tr key={i} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-bold text-gray-700 truncate max-w-[150px]">{p.name}</td>
                    <td className="px-4 py-3 text-center text-gray-500">{p.qty}</td>
                    <td className="px-4 py-3 text-right font-bold">K{p.revenue.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right font-black text-green-600">K{p.profit.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-96 min-h-[400px]">
          <h3 className="text-lg font-black mb-4">Financial Health</h3>
          <div className="space-y-6 mt-6">
            <div className="flex flex-col">
              <div className="flex justify-between text-xs font-bold mb-2"><span>Profit Margin</span><span className="text-green-600">{((financials.netProfit / (financials.revenue || 1)) * 100).toFixed(1)}%</span></div>
              <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden"><div className="bg-green-500 h-full" style={{width: `${Math.min(100, (financials.netProfit / (financials.revenue || 1)) * 100)}%`}}></div></div>
            </div>
            <div className="flex flex-col">
              <div className="flex justify-between text-xs font-bold mb-2"><span>Expense Ratio</span><span className="text-red-500">{((financials.totalExpenses / (financials.revenue || 1)) * 100).toFixed(1)}%</span></div>
              <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden"><div className="bg-red-500 h-full" style={{width: `${Math.min(100, (financials.totalExpenses / (financials.revenue || 1)) * 100)}%`}}></div></div>
            </div>
            <div className="flex flex-col">
              <div className="flex justify-between text-xs font-bold mb-2"><span>Outstanding Debt</span><span className="text-amber-600">{((financials.totalDebt / (financials.revenue || 1)) * 100).toFixed(1)}% of Revenue</span></div>
              <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden"><div className="bg-amber-500 h-full" style={{width: `${Math.min(100, (financials.totalDebt / (financials.revenue || 1)) * 100)}%`}}></div></div>
            </div>
          </div>
          <div className="mt-10 p-5 bg-[#800000]/5 rounded-2xl border border-[#800000]/10">
            <p className="text-[10px] font-black text-[#800000] uppercase tracking-widest mb-2">Summary Insight</p>
            <p className="text-sm text-gray-700 leading-relaxed italic">"For every KES 100 you earned this month, KES {((financials.netProfit / (financials.revenue || 1)) * 100).toFixed(2)} was kept as net profit after accounting for stock costs and business expenses."</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;
