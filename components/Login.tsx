
import React, { useState } from 'react';
import { User } from '../types';
import { storage } from '../services/storage';
import { auth, db } from '../services/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

interface LoginProps {
  onLogin: (user: User) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState<boolean | null>(null);

  React.useEffect(() => {
    const checkInitialization = async () => {
      try {
        const q = await import('firebase/firestore').then(m => 
          m.getDocs(m.query(m.collection(db, 'users'), m.limit(1)))
        );
        const initialized = !q.empty;
        setIsInitialized(initialized);
        
        // Auto-initialize if not already done
        if (!initialized && !loading) {
          await handleInitialize(true);
        }
      } catch (e) {
        console.error('Error checking initialization:', e);
      }
    };
    checkInitialization();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;

      // Fetch user details from Firestore
      const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
      
      if (userDoc.exists()) {
        onLogin(userDoc.data() as User);
      } else {
        // Handle case where auth user exists but firestore doc doesn't
        // This shouldn't happen if users are created correctly
        setError('User profile not found in database.');
        await auth.signOut();
      }
    } catch (err: any) {
      if (err.code === 'auth/configuration-not-found') {
        setError('Firebase Authentication is not enabled. Please enable "Email/Password" provider in your Firebase Console.');
      } else if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError('Invalid email or password');
      } else {
        setError('Login failed: ' + (err.message || 'Please check your connection.'));
      }
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleInitialize = async (isAuto = false) => {
    if (!isAuto && !window.confirm('This will create the default Admin and Salesperson accounts. Continue?')) return;
    setLoading(true);
    setError('');
    try {
      const usersToCreate = [
        { email: 'wamai@kahoro.com', pass: 'wamai10204111', name: 'Kahoro Wamai', username: 'wamai', role: 'Admin', id: 'wamai-admin' },
        { email: 'john@kahoro.com', pass: 'Mukunga1234', name: 'John Mukunga', username: 'john', role: 'Salesperson', id: 'john-sales' }
      ];

      let adminUid = '';
      let salesUid = '';

      for (const u of usersToCreate) {
        try {
          // Create in Auth
          const cred = await import('firebase/auth').then(m => m.createUserWithEmailAndPassword(auth, u.email, u.pass));
          if (u.role === 'Admin') adminUid = cred.user.uid;
          else salesUid = cred.user.uid;
          
          // Sign out so we can create the next one or log in manually
          await auth.signOut();
        } catch (e: any) {
          if (e.code === 'auth/email-already-in-use') {
            console.log(`${u.email} already exists`);
            // We still need to find their UIDs if they exist but Firestore is empty
            // For simplicity in this POS, we assume if Auth exists, we might need to link them
            // But usually this happens when Firestore was wiped but Auth remains.
          } else {
            throw e;
          }
        }
      }

      // Now seed the database with products and the users in Firestore
      await storage.seedDatabase(adminUid, salesUid);
      
      setIsInitialized(true);
      if (!isAuto) alert('System initialized successfully! You can now log in with the provided credentials.');
    } catch (err: any) {
      if (err.code === 'auth/configuration-not-found') {
        setError('Firebase Authentication is not enabled. Please enable "Email/Password" provider in your Firebase Console.');
      } else {
        setError('Initialization failed: ' + err.message);
      }
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-yellow-400 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-500">
        <div className="p-8 pb-0 text-center">
          <div className="flex flex-col items-center gap-2 mb-4">
            <div className="inline-block px-4 py-2 rounded-lg bg-yellow-50 text-[#800000] font-black text-xs uppercase tracking-widest">
              Official POS Access
            </div>
            {isInitialized === true && (
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100 flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                System Ready
              </span>
            )}
          </div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tighter uppercase">BIIV VENTURES LTD.</h1>
          <p className="text-gray-500 mt-2">Login to your terminal</p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-5">
          {error && (
            <div className="space-y-3">
              <div className="bg-red-50 text-red-700 p-4 rounded-xl text-sm font-bold border border-red-100 flex items-center">
                <span className="mr-2">⚠️</span> {error}
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Email Address</label>
            <div className="relative">
              <span className="absolute left-3 top-3.5 text-gray-400">📧</span>
              <input
                type="email"
                className="w-full pl-10 pr-4 py-3 bg-yellow-50/50 border border-yellow-200 rounded-xl outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
            disabled={loading}
            className="w-full py-4 bg-[#800000] text-white rounded-xl font-bold text-lg hover:bg-red-900 transform transition-all active:scale-95 shadow-lg shadow-red-900/20 disabled:opacity-50"
          >
            {loading ? 'SIGNING IN...' : 'SIGN IN'}
          </button>
        </form>
        
        <div className="bg-yellow-50 p-4 text-center border-t border-yellow-100">
          <p className="text-xs text-gray-400 font-medium">&copy; 2024 BIIV VENTURES LTD. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
