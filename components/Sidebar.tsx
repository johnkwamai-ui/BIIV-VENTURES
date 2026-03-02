
import React from 'react';
import { UserRole } from '../types';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  role: UserRole;
  onLogout: () => void;
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, role, onLogout, isOpen, onClose }) => {
  const isAdmin = role === UserRole.ADMIN;

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊', show: true },
    { id: 'pos', label: 'Point of Sale', icon: '🛒', show: true },
    { id: 'customers', label: 'Customers', icon: '👤', show: true },
    { id: 'debt', label: 'Debt/Credit', icon: '💳', show: isAdmin },
    { id: 'inventory', label: 'Inventory', icon: '📦', show: isAdmin },
    { id: 'expenses', label: 'Expenses', icon: '💸', show: isAdmin },
    { id: 'history', label: 'Sales History', icon: '📝', show: true },
    { id: 'reports', label: 'Reports', icon: '📈', show: isAdmin },
    { id: 'users', label: 'Users', icon: '👥', show: isAdmin },
    { id: 'profile', label: 'Security', icon: '🔑', show: true },
  ];

  return (
    <aside className={`fixed md:static inset-y-0 left-0 z-30 w-64 bg-[#800000] text-white flex flex-col shrink-0 no-print transition-transform duration-300 ease-in-out ${
      isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
    }`}>
      <div className="p-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black tracking-tighter leading-tight">BIIV</h2>
          <p className="text-[10px] uppercase font-bold tracking-[0.2em] opacity-60">VENTURES LTD.</p>
        </div>
        <button 
          onClick={onClose}
          className="md:hidden p-2 text-red-200 hover:bg-red-900/50 rounded-lg"
        >
          <span className="text-2xl">✕</span>
        </button>
      </div>

      <nav className="flex-1 mt-4 px-3 space-y-1 overflow-y-auto">
        {navItems.filter(item => item.show).map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${
              activeTab === item.id 
                ? 'bg-white text-[#800000] font-bold shadow-lg' 
                : 'hover:bg-red-900/50 text-red-100'
            }`}
          >
            <span className="text-xl">{item.icon}</span>
            <span className="text-sm">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-red-900/50">
        <button 
          onClick={onLogout}
          className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl hover:bg-red-900/50 text-red-200 transition-colors"
        >
          <span className="text-xl">🚪</span>
          <span className="text-sm">Logout</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
