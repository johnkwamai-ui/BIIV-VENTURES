
import React from 'react';
import { UserRole } from '../types';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  role: UserRole;
  onLogout: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, role, onLogout }) => {
  const isAdmin = role === UserRole.ADMIN;

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊', show: true },
    { id: 'pos', label: 'Point of Sale', icon: '🛒', show: true },
    { id: 'inventory', label: 'Inventory', icon: '📦', show: isAdmin },
    { id: 'expenses', label: 'Expenses', icon: '💸', show: isAdmin },
    { id: 'history', label: 'Sales History', icon: '📝', show: true },
    { id: 'reports', label: 'Reports', icon: '📈', show: isAdmin },
    { id: 'users', label: 'Users', icon: '👥', show: isAdmin },
    { id: 'profile', label: 'Security', icon: '🔑', show: true },
  ];

  return (
    <aside className="w-20 md:w-64 bg-[#800000] text-white flex flex-col shrink-0 no-print transition-all">
      <div className="p-4 md:p-6 text-center md:text-left">
        <h2 className="text-xl md:text-2xl font-black tracking-tighter leading-tight">BIIV</h2>
        <p className="hidden md:block text-[10px] uppercase font-bold tracking-[0.2em] opacity-60">VENTURES LTD.</p>
      </div>

      <nav className="flex-1 mt-4 px-2 md:px-3 space-y-1 overflow-y-auto">
        {navItems.filter(item => item.show).map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`w-full flex items-center md:space-x-3 px-3 md:px-4 py-3 rounded-xl transition-all ${
              activeTab === item.id 
                ? 'bg-white text-[#800000] font-bold shadow-lg' 
                : 'hover:bg-red-900/50 text-red-100'
            }`}
          >
            <span className="text-xl mx-auto md:mx-0">{item.icon}</span>
            <span className="hidden md:block text-sm">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-red-900/50">
        <button 
          onClick={onLogout}
          className="w-full flex items-center md:space-x-3 px-3 md:px-4 py-3 rounded-xl hover:bg-red-900/50 text-red-200 transition-colors"
        >
          <span className="text-xl mx-auto md:mx-0">🚪</span>
          <span className="hidden md:block text-sm">Logout</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
