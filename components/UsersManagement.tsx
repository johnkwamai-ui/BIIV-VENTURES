
import React, { useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { storage } from '../services/storage';
import { db, firebaseConfig } from '../services/firebase';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';

const UsersManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const u = await storage.getUsers();
        setUsers(u);
      } catch (err) {
        console.error('Error fetching users:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  const [formData, setFormData] = useState({
    name: '',
    username: '',
    email: '',
    password: '',
    role: UserRole.SALESPERSON
  });

  const handleOpenModal = (user?: User) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        name: user.name,
        username: user.username,
        email: user.email,
        password: '', // Don't show existing hash
        role: user.role
      });
    } else {
      setEditingUser(null);
      setFormData({ name: '', username: '', email: '', password: '', role: UserRole.SALESPERSON });
    }
    setIsModalOpen(true);
  };

  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!formData.name || !formData.username || !formData.email || (!editingUser && !formData.password)) {
      alert("Please fill all fields.");
      return;
    }

    setSaving(true);
    try {
      let updatedList: User[];
      if (editingUser) {
        // For editing, we only update Firestore. 
        // Firebase Auth email/password update is more complex (requires re-auth)
        updatedList = users.map(u => 
          u.id === editingUser.id ? { 
            ...u, 
            name: formData.name, 
            username: formData.username, 
            email: formData.email,
            role: formData.role,
            passwordHash: formData.password || u.passwordHash
          } : u
        );
        await storage.saveUsers(updatedList);
      } else {
        // Create in Firebase Auth using a secondary app to avoid signing out the current admin
        const secondaryApp = initializeApp(firebaseConfig, 'Secondary');
        const secondaryAuth = getAuth(secondaryApp);
        
        const userCredential = await createUserWithEmailAndPassword(secondaryAuth, formData.email, formData.password);
        const firebaseUser = userCredential.user;

        const newUser: User = {
          id: firebaseUser.uid,
          name: formData.name,
          username: formData.username,
          email: formData.email,
          passwordHash: formData.password,
          role: formData.role,
          createdAt: Date.now()
        };
        updatedList = [...users, newUser];
        await storage.saveUsers(updatedList);
        
        // Cleanup secondary app
        await deleteApp(secondaryApp);
      }

      setUsers(updatedList);
      setIsModalOpen(false);
    } catch (err: any) {
      if (err.code === 'auth/configuration-not-found') {
        alert('Firebase Authentication is not enabled. Please enable "Email/Password" provider in your Firebase Console.');
      } else {
        alert('Error saving user: ' + err.message);
      }
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (id === '1') {
      alert("Cannot delete primary admin account.");
      return;
    }
    if (window.confirm("Are you sure you want to delete this user?")) {
      try {
        const updated = users.filter(u => u.id !== id);
        await storage.saveUsers(updated);
        setUsers(updated);
      } catch (err) {
        alert('Error deleting user.');
        console.error(err);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#800000]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold">System Users</h3>
        <button
          onClick={() => handleOpenModal()}
          className="px-6 py-2 bg-[#800000] text-white rounded-lg font-bold hover:bg-red-900 transition-colors"
        >
          + Add New Staff
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {users.map(u => (
          <div key={u.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center text-center">
            <div className="w-20 h-20 rounded-full bg-gray-100 text-[#800000] flex items-center justify-center text-3xl font-bold mb-4">
              {u.name.charAt(0)}
            </div>
            <h4 className="font-bold text-lg">{u.name}</h4>
            <p className="text-gray-500 text-sm">@{u.username}</p>
            <p className="text-gray-400 text-xs">{u.email}</p>
            <span className={`mt-2 px-3 py-1 rounded-full text-xs font-bold uppercase ${
              u.role === UserRole.ADMIN ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
            }`}>
              {u.role}
            </span>
            <div className="mt-6 flex space-x-3 w-full">
              <button 
                onClick={() => handleOpenModal(u)}
                className="flex-1 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-semibold hover:bg-gray-100"
              >Edit</button>
              <button 
                onClick={() => handleDelete(u.id)}
                className="flex-1 py-2 bg-red-50 text-red-600 border border-red-100 rounded-lg text-sm font-semibold hover:bg-red-100"
              >Delete</button>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold mb-6">{editingUser ? 'Edit User' : 'Add Staff Member'}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <input
                  type="text"
                  className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-[#800000]"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                <input
                  type="text"
                  className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-[#800000]"
                  value={formData.username}
                  onChange={(e) => setFormData({...formData, username: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                <input
                  type="email"
                  className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-[#800000]"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {editingUser ? 'New Password (leave blank to keep current)' : 'Initial Password'}
                </label>
                <input
                  type="password"
                  className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-[#800000]"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">System Role</label>
                <select
                  className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-[#800000]"
                  value={formData.role}
                  onChange={(e) => setFormData({...formData, role: e.target.value as UserRole})}
                >
                  <option value={UserRole.SALESPERSON}>Salesperson</option>
                  <option value={UserRole.ADMIN}>Administrator</option>
                </select>
              </div>
              <div className="flex gap-4 mt-8">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2 border border-gray-300 rounded-lg font-bold text-gray-600 hover:bg-gray-50"
                >Cancel</button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 py-2 bg-[#800000] text-white rounded-lg font-bold hover:bg-red-900 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save User'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersManagement;
