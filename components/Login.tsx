
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
  const [missingConfig, setMissingConfig] = useState<string[]>([]);

  React.useEffect(() => {
    const required = [
      'VITE_FIREBASE_API_KEY',
      'VITE_FIREBASE_AUTH_DOMAIN',
      'VITE_FIREBASE_PROJECT_ID'
    ];
    const missing = required.filter(v => !import.meta.env[v]);
    if (missing.length > 0) {
      setMissingConfig(missing);
      setError('Firebase configuration is missing. Please check your environment variables.');
    }

    const checkInitialization = async () => {
      try {
        const q = await import('firebase/firestore').then(m => 
          m.getDocs(m.query(m.collection(db, 'users'), m.limit(1)))
        );
        const initialized = !q.empty;
        setIsInitialized(initialized);
        
        // Auto-initialize if not already done
        if (!initialized && !loading && missingConfig.length === 0) {
          await handleInitialize(true);
        }
      } catch (e: any) {
        console.error('Error checking initialization:', e);
        if (e.message?.includes('Database \'(default)\' not found')) {
          setError('Firestore database not found. Please create a "Cloud Firestore" database in your Firebase Console.');
        } else if (e.code === 'permission-denied') {
          setError('Permission denied accessing Firestore. Please check your security rules.');
        } else {
          setError('System check failed: ' + (e.message || 'Connection error'));
        }
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
      if (err.code === 'auth/configuration-not-found' || err.code === 'auth/operation-not-allowed') {
        setError('Firebase Authentication is not fully configured. Please enable the "Email/Password" provider in your Firebase Console (Authentication > Sign-in method).');
      } else if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError('Invalid email or password. If this is a new deployment, please wait a moment for the system to initialize.');
      } else if (err.code === 'auth/network-request-failed') {
        setError('Network error. Please check your internet connection and Firebase configuration.');
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
          
          await auth.signOut();
        } catch (e: any) {
          if (e.code === 'auth/email-already-in-use') {
            console.log(`${u.email} already exists in Auth, attempting to link...`);
            // Try to sign in to get the UID
            try {
              const cred = await import('firebase/auth').then(m => m.signInWithEmailAndPassword(auth, u.email, u.pass));
              if (u.role === 'Admin') adminUid = cred.user.uid;
              else salesUid = cred.user.uid;
              await auth.signOut();
            } catch (signInErr) {
              console.error(`Could not get UID for existing user ${u.email}:`, signInErr);
            }
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
      if (err.code === 'auth/configuration-not-found' || err.code === 'auth/operation-not-allowed') {
        setError('Firebase Authentication is not fully configured. Please enable the "Email/Password" provider in your Firebase Console (Authentication > Sign-in method).');
      } else if (err.code === 'auth/network-request-failed') {
        setError('Network error during initialization. Please check your connection.');
      } else {
        setError('Initialization failed: ' + (err.message || 'Unknown error'));
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
              <div className="bg-red-50 text-red-700 p-4 rounded-xl text-sm font-bold border border-red-100 flex flex-col gap-2">
                <div className="flex items-center">
                  <span className="mr-2">⚠️</span> {error}
                </div>
                {error.includes('configuration-not-found') || error.includes('operation-not-allowed') ? (
                  <div className="mt-2 p-3 bg-white/50 rounded-lg border border-red-200 text-xs font-normal">
                    <p className="font-bold mb-1">To fix this:</p>
                    <ol className="list-decimal ml-4 space-y-1">
                      <li>Go to <a href="https://console.firebase.google.com" target="_blank" className="underline text-blue-600">Firebase Console</a></li>
                      <li>Select your project</li>
                      <li>Go to <strong>Authentication</strong> &gt; <strong>Sign-in method</strong></li>
                      <li>Click <strong>Add new provider</strong> and select <strong>Email/Password</strong></li>
                      <li>Enable it and click <strong>Save</strong></li>
                      <li>Refresh this page</li>
                    </ol>
                  </div>
                ) : error.includes('database not found') ? (
                  <div className="mt-2 p-3 bg-white/50 rounded-lg border border-red-200 text-xs font-normal">
                    <p className="font-bold mb-1">To fix this:</p>
                    <ol className="list-decimal ml-4 space-y-1">
                      <li>Go to <a href="https://console.firebase.google.com" target="_blank" className="underline text-blue-600">Firebase Console</a></li>
                      <li>Select your project</li>
                      <li>Go to <strong>Firestore Database</strong></li>
                      <li>Click <strong>Create database</strong></li>
                      <li>Follow the prompts (choose a location and start in <strong>test mode</strong> for now)</li>
                      <li>Refresh this page</li>
                    </ol>
                  </div>
                ) : missingConfig.length > 0 ? (
                  <div className="mt-2 p-3 bg-white/50 rounded-lg border border-red-200 text-xs font-normal">
                    <p className="font-bold mb-1">Missing variables in Vercel:</p>
                    <ul className="list-disc ml-4 space-y-1">
                      {missingConfig.map(v => <li key={v} className="font-mono">{v}</li>)}
                    </ul>
                    <p className="mt-2">Ensure these are added to your Vercel Project Settings &gt; Environment Variables.</p>
                  </div>
                ) : null}
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
            disabled={loading || missingConfig.length > 0}
            className="w-full py-4 bg-[#800000] text-white rounded-xl font-bold text-lg hover:bg-red-900 transform transition-all active:scale-95 shadow-lg shadow-red-900/20 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading && (
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
            )}
            {loading ? 'PROCESSING...' : 'SIGN IN'}
          </button>

          {!isInitialized && loading && missingConfig.length === 0 && (
            <p className="text-center text-[10px] font-bold text-yellow-600 animate-pulse uppercase tracking-widest">
              Initializing system for first-time use...
            </p>
          )}

          {!isInitialized && !loading && missingConfig.length === 0 && (
            <button
              type="button"
              onClick={() => handleInitialize(false)}
              className="w-full py-2 text-xs font-bold text-gray-400 hover:text-gray-600 transition-colors"
            >
              System not ready? Click to initialize manually
            </button>
          )}
        </form>
        
        <div className="bg-yellow-50 p-4 text-center border-t border-yellow-100">
          <div className="mb-4 p-3 bg-white/50 rounded-xl border border-yellow-200 text-[10px] text-gray-500 text-left">
            <p className="font-bold uppercase mb-1 text-gray-600">Default Credentials:</p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="font-bold text-gray-700">Admin:</p>
                <p>wamai@kahoro.com</p>
                <p>wamai10204111</p>
              </div>
              <div>
                <p className="font-bold text-gray-700">Sales:</p>
                <p>john@kahoro.com</p>
                <p>Mukunga1234</p>
              </div>
            </div>
          </div>
          <p className="text-xs text-gray-400 font-medium">&copy; 2024 BIIV VENTURES LTD. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
