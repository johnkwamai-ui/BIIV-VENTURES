
import React, { useState } from 'react';
import { User } from '../types';
import { storage } from '../services/storage';

interface PasswordResetProps {
  user: User;
}

const PasswordReset: React.FC<PasswordResetProps> = ({ user }) => {
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [message, setMessage] = useState({ text: '', type: '' });

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // In our simplified storage, we store plain text as hash for demonstration.
    // Real apps use bcrypt compare.
    if (currentPass !== user.passwordHash) {
      setMessage({ text: 'Current password is incorrect.', type: 'error' });
      return;
    }

    if (newPass !== confirmPass) {
      setMessage({ text: 'New passwords do not match.', type: 'error' });
      return;
    }

    if (newPass.length < 4) {
      setMessage({ text: 'Password must be at least 4 characters.', type: 'error' });
      return;
    }

    try {
      const users = await storage.getUsers();
      const updatedUsers = users.map(u => 
        u.id === user.id ? { ...u, passwordHash: newPass } : u
      );
      
      await storage.saveUsers(updatedUsers);
      // Update local session as well
      storage.setCurrentUser({ ...user, passwordHash: newPass });

      setMessage({ text: 'Password updated successfully!', type: 'success' });
      setCurrentPass('');
      setNewPass('');
      setConfirmPass('');
    } catch (err) {
      setMessage({ text: 'Error updating password.', type: 'error' });
      console.error(err);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10">
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
        <h2 className="text-2xl font-bold mb-2">Change Password</h2>
        <p className="text-gray-500 mb-6">Secure your account by updating your credentials.</p>

        {message.text && (
          <div className={`p-4 rounded-lg mb-6 text-sm font-bold ${
            message.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'
          }`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleUpdate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
            <input
              type="password"
              className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-[#800000]"
              value={currentPass}
              onChange={(e) => setCurrentPass(e.target.value)}
              required
            />
          </div>
          <hr className="my-6" />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
            <input
              type="password"
              className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-[#800000]"
              value={newPass}
              onChange={(e) => setNewPass(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
            <input
              type="password"
              className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-[#800000]"
              value={confirmPass}
              onChange={(e) => setConfirmPass(e.target.value)}
              required
            />
          </div>
          <button
            type="submit"
            className="w-full py-3 bg-[#800000] text-white rounded-xl font-bold hover:bg-red-900 transition-colors mt-4"
          >
            Update Password
          </button>
        </form>
      </div>
    </div>
  );
};

export default PasswordReset;
