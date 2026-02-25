
import React, { useState, useEffect } from 'react';
import { User, UserRole } from './types';
import { storage } from './services/storage';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Sidebar from './components/Sidebar';
import Inventory from './components/Inventory';
import POS from './components/POS';
import UsersManagement from './components/UsersManagement';
import SalesHistory from './components/SalesHistory';
import Reports from './components/Reports';
import PasswordReset from './components/PasswordReset';
import Expenses from './components/Expenses';
import Customers from './components/Customers';

import { motion, AnimatePresence } from 'motion/react';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(storage.getCurrentUser());
  const [activeTab, setActiveTab] = useState<string>('dashboard');

  useEffect(() => {
    storage.setCurrentUser(currentUser);
  }, [currentUser]);

  const handleLogout = () => {
    setCurrentUser(null);
    setActiveTab('dashboard');
  };

  if (!currentUser) return <Login onLogin={setCurrentUser} />;

  const renderContent = () => {
    return (
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className="h-full"
        >
          {(() => {
            switch (activeTab) {
              case 'dashboard': return <Dashboard user={currentUser} />;
              case 'pos': return <POS user={currentUser} />;
              case 'inventory': return <Inventory />;
              case 'history': return <SalesHistory user={currentUser} />;
              case 'expenses': return <Expenses user={currentUser} />;
              case 'customers': return <Customers />;
              case 'reports': return <Reports />;
              case 'users': return <UsersManagement />;
              case 'profile': return <PasswordReset user={currentUser} />;
              default: return <Dashboard user={currentUser} />;
            }
          })()}
        </motion.div>
      </AnimatePresence>
    );
  };

  return (
    <div className="flex h-screen bg-yellow-100 overflow-hidden font-inter">
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        role={currentUser.role} 
        onLogout={handleLogout} 
      />
      
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="bg-white border-b border-yellow-200 h-16 flex items-center justify-between px-6 shrink-0 z-10 shadow-sm">
          <h1 className="text-xl font-bold text-[#800000] flex items-center">
            <span className="mr-2">⚡</span> {activeTab.replace('-', ' ').toUpperCase()}
          </h1>
          <div className="flex items-center space-x-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold text-gray-800">{currentUser.name}</p>
              <p className="text-[10px] text-[#800000] font-bold uppercase tracking-widest">{currentUser.role}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-[#800000] text-white flex items-center justify-center font-bold shadow-lg shadow-red-900/20">
              {currentUser.name.charAt(0)}
            </div>
          </div>
        </header>
        
        <div className="flex-1 overflow-auto p-4 md:p-6 bg-yellow-50">
          {renderContent()}
        </div>
      </main>
    </div>
  );
};

export default App;
