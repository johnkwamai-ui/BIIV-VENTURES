
import React, { useMemo, useState, useEffect } from 'react';
import { User, UserRole, Sale, Product, Expense } from '../types';
import { storage } from '../services/storage';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface DashboardProps {
  user: User;
}

const Dashboard: React.FC<DashboardProps> = ({ user }) => {
  const [sales, setSales] = useState<Sale[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [s, p, e] = await Promise.all([
          storage.getSales(),
          storage.getProducts(),
          storage.getExpenses()
        ]);
        setSales(s);
        setProducts(p);
        setExpenses(e);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const isAdmin = user.role === UserRole.ADMIN;

  const today = new Date().setHours(0, 0, 0, 0);
  const activeTodaySales = sales.filter(s => s.createdAt >= today && s.status !== 'returned');
  
  const chartData = useMemo(() => {
    const last7Days = [...Array(7)].map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return d.setHours(0, 0, 0, 0);
    });

    return last7Days.map(date => {
      const daySales = sales.filter(s => {
        const sd = new Date(s.createdAt).setHours(0, 0, 0, 0);
        return sd === date && s.status !== 'returned';
      });
      return {
        name: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }),
        revenue: daySales.reduce((acc, s) => acc + s.totalAmount, 0)
      };
    });
  }, [sales]);

  const totalRevenue = activeTodaySales.reduce((a, b) => a + b.totalAmount, 0);
  const totalDebt = activeTodaySales.reduce((a, b) => a + (b.balance > 0 ? b.balance : 0), 0);
  
  const stats = [
    { label: "Today's Revenue", value: `KES ${totalRevenue.toLocaleString()}`, icon: "💰", color: "bg-green-100 text-green-700" },
    { label: "New Debts", value: `KES ${totalDebt.toLocaleString()}`, icon: "📉", color: "bg-red-100 text-red-700" },
    { label: "Low Stock Items", value: products.filter(p => p.stockQuantity < 10).length.toString(), icon: "⚠️", color: "bg-amber-100 text-amber-700" },
    { label: "Total Stock Value", value: `KES ${products.reduce((a, b) => a + (b.price * b.stockQuantity), 0).toLocaleString()}`, icon: "📦", color: "bg-purple-100 text-purple-700" },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#800000]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center space-x-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${stat.color} shadow-inner`}>
              {stat.icon}
            </div>
            <div>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{stat.label}</p>
              <p className="text-xl font-black text-gray-800">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold mb-6 flex items-center justify-between">
            <span>Weekly Revenue Trend</span>
            <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full font-bold">+ {((chartData[6].revenue / (chartData[5].revenue || 1) - 1) * 100).toFixed(1)}% vs yesterday</span>
          </h3>
          <div className="h-72 min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#800000" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#800000" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#999'}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#999'}} tickFormatter={v => `K${v/1000}k`} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                  formatter={(v: any) => [`KES ${v.toLocaleString()}`, 'Revenue']}
                />
                <Area type="monotone" dataKey="revenue" stroke="#800000" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold mb-4">Stock Overview</h3>
          <div className="space-y-4">
            {products.sort((a,b) => a.stockQuantity - b.stockQuantity).slice(0, 6).map(p => (
              <div key={p.id} className="flex items-center justify-between group">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold truncate group-hover:text-[#800000] transition-colors">{p.name}</p>
                  <p className="text-[10px] text-gray-400 font-medium">CAT: {p.category || 'General'}</p>
                </div>
                <div className="text-right ml-4">
                  <span className={`px-2 py-1 rounded text-[10px] font-black ${
                    p.stockQuantity <= 5 ? 'bg-red-50 text-red-600' : 'bg-gray-50 text-gray-600'
                  }`}>
                    {p.stockQuantity} {p.unit || 'pcs'}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <button className="w-full mt-6 py-2 text-xs font-bold text-[#800000] hover:bg-red-50 rounded-lg transition-colors">
            Manage Full Inventory
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
