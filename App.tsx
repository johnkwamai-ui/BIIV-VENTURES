
import React, { useState, useEffect } from 'react';
import { User, UserRole } from './types';
import { storage } from './services/storage';
import { auth, db } from './services/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
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
import DebtManagement from './components/DebtManagement';

import { motion, AnimatePresence } from 'motion/react';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(storage.getCurrentUser());
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data() as User;
            setCurrentUser(userData);
            storage.setCurrentUser(userData);
          } else {
            setCurrentUser(null);
            storage.setCurrentUser(null);
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
          setCurrentUser(null);
          storage.setCurrentUser(null);
        }
      } else {
        setCurrentUser(null);
        storage.setCurrentUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    setCurrentUser(null);
    storage.setCurrentUser(null);
    setActiveTab('dashboard');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-yellow-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#800000]"></div>
      </div>
    );
  }

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
              case 'debt': return <DebtManagement user={currentUser} />;
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
    <div className="flex h-screen bg-yellow-100 overflow-hidden font-inter relative">
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={(tab) => {
          setActiveTab(tab);
          setIsSidebarOpen(false);
        }} 
        role={currentUser.role} 
        onLogout={handleLogout}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />
      
      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-20 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="bg-white border-b border-yellow-200 h-16 flex items-center justify-between px-4 md:px-6 shrink-0 z-10 shadow-sm">
          <div className="flex items-center">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 mr-2 md:hidden text-[#800000] hover:bg-red-50 rounded-lg"
            >
              <span className="text-2xl">☰</span>
            </button>
            <h1 className="text-lg md:text-xl font-bold text-[#800000] flex items-center truncate">
              <span className="mr-2 hidden sm:inline">⚡</span> {activeTab.replace('-', ' ').toUpperCase()}
            </h1>
          </div>
          <div className="flex items-center space-x-3 md:space-x-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold text-gray-800">{currentUser.name}</p>
              <p className="text-[10px] text-[#800000] font-bold uppercase tracking-widest">{currentUser.role}</p>
            </div>
            <div className="w-9 h-9 md:w-10 md:h-10 rounded-xl bg-[#800000] text-white flex items-center justify-center font-bold shadow-lg shadow-red-900/20">
              {currentUser.name.charAt(0)}
            </div>
          </div>
        </header>
        
        <div className="flex-1 overflow-auto p-3 md:p-6 bg-yellow-50">
          {renderContent()}
        </div>
      </main>
    </div>
  );
};

export default App;
