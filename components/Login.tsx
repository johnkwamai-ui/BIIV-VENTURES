
import React, { useState } from 'react';
import { User } from '../types';
import { storage } from '../services/storage';

interface LoginProps {
  onLogin: (user: User) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const users = storage.getUsers();
    const user = users.find(u => u.username === username && u.passwordHash === password);

    if (user) {
      onLogin(user);
    } else {
      setError('Invalid username or password');
    }
  };

  return (
    <div className="min-h-screen bg-yellow-400 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-500">
        <div className="p-8 pb-0 text-center">
          <div className="inline-block px-4 py-2 rounded-lg bg-yellow-50 text-[#800000] font-black text-xs uppercase tracking-widest mb-4">
            Official POS Access
          </div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tighter uppercase">BIIV VENTURES LTD.</h1>
          <p className="text-gray-500 mt-2">Login to your terminal</p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-5">
          {error && (
            <div className="bg-red-50 text-red-700 p-4 rounded-xl text-sm font-bold border border-red-100 flex items-center">
              <span className="mr-2">⚠️</span> {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Username</label>
            <div className="relative">
              <span className="absolute left-3 top-3.5 text-gray-400">👤</span>
              <input
                type="text"
                className="w-full pl-10 pr-4 py-3 bg-yellow-50/50 border border-yellow-200 rounded-xl outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Password</label>
            <div className="relative">
              <span className="absolute left-3 top-3.5 text-gray-400">🔒</span>
              <input
                type="password"
                className="w-full pl-10 pr-4 py-3 bg-yellow-50/50 border border-yellow-200 rounded-xl outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-4 bg-[#800000] text-white rounded-xl font-bold text-lg hover:bg-red-900 transform transition-all active:scale-95 shadow-lg shadow-red-900/20"
          >
            SIGN IN
          </button>

          <div className="pt-6 text-center">
            <p className="text-xs text-gray-600">
              Default Admin: <strong>admin</strong> / <strong>admin123</strong>
            </p>
          </div>
        </form>
        
        <div className="bg-yellow-50 p-4 text-center border-t border-yellow-100">
          <p className="text-xs text-gray-400 font-medium">&copy; 2024 BIIV VENTURES LTD. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
