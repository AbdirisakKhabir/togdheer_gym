'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signIn, signOut } from 'next-auth/react';
import Swal from 'sweetalert2';
import { Lock } from 'lucide-react';
import Link from 'next/link';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  // Clear any existing localStorage data on component mount
  useEffect(() => {
    const cleanupStorage = async () => {
      // Clear localStorage items
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('session-expiry');
      
      // Sign out from NextAuth to clear any existing sessions
      await signOut({ redirect: false });
    };

    cleanupStorage();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username || !password) {
      await Swal.fire({
        icon: 'error',
        title: 'Missing Fields',
        text: 'Please enter both username and password',
        timer: 2000,
        showConfirmButton: false,
      });
      return;
    }

    setIsLoading(true);

    try {
      const result = await signIn('credentials', {
        username,
        password,
        redirect: false,
      });

      console.log('Login result:', result);

      if (result?.error) {
        throw new Error(result.error === 'CredentialsSignin' 
          ? 'Invalid username or password' 
          : result.error
        );
      }

      if (result?.ok && !result.error) {
        // Set session expiry in localStorage (1 hour from now)
        const expiryTime = Date.now() + (60 * 60 * 1000); // 1 hour
        localStorage.setItem('session-expiry', expiryTime.toString());

        await Swal.fire({
          icon: 'success',
          title: 'Login Successful!',
          text: `Welcome back, ${username}!`,
          timer: 2000,
          showConfirmButton: false,
        });

        // Redirect to customers page
        window.location.href = '/customers';
      } else {
        throw new Error('Login failed');
      }

    } catch (error) {
      console.error('Login error:', error);
      await Swal.fire({
        icon: 'error',
        title: 'Login Failed',
        text: error instanceof Error ? error.message : 'Invalid username or password',
        timer: 2000,
        showConfirmButton: false,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative gradient overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-500/20 via-transparent to-transparent pointer-events-none" />
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-indigo-400/20 rounded-full blur-3xl" />
        <div className="absolute top-1/3 right-0 w-64 h-64 bg-blue-400/20 rounded-full blur-3xl" />
      </div>

      <div className="max-w-md w-full relative z-10">
        {/* Login Card - Gradient background */}
        <div className="bg-gradient-to-br from-blue-600/95 via-blue-700/95 to-indigo-800/95 backdrop-blur-xl rounded-3xl shadow-2xl shadow-black/20 border border-white/20 p-8 md:p-10">
          {/* Header with Logo */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-6">
              <div className="w-28 h-28 md:w-32 md:h-32 rounded-2xl overflow-hidden bg-white/10 border-2 border-white/30 shadow-xl flex items-center justify-center p-2 backdrop-blur-sm">
                <img
                  src="/olmbic%20eh.png"
                  alt="Olympic Gym Logo"
                  className="w-full h-full object-contain"
                />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Welcome Back</h1>
            <p className="text-blue-100">Sign in to your Olympic Gym account</p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-white mb-2">
                Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-blue-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-4 bg-white/10 border border-white/30 rounded-xl focus:ring-2 focus:ring-white/50 focus:border-white/50 transition-colors text-white placeholder-blue-200"
                  placeholder="Enter your username"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-white mb-2">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-blue-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-4 bg-white/10 border border-white/30 rounded-xl focus:ring-2 focus:ring-white/50 focus:border-white/50 transition-colors text-white placeholder-blue-200"
                  placeholder="Enter your password"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-white text-blue-700 hover:bg-blue-50 py-4 rounded-xl font-bold transition-all duration-200 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-blue-700 border-t-transparent rounded-full animate-spin"></div>
                  <span>Signing In...</span>
                </>
              ) : (
                <>
                  <span><Lock size={18} /></span>
                  <span>Sign In</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* App Info */}
        <div className="text-center mt-8">
          <p className="text-white/80 text-sm">
            Powered by{' '}
            <Link href="https://taamsolutions.net" target="_blank" className="text-white hover:text-blue-200 font-semibold transition-colors underline underline-offset-2">
              Taam Solutions
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}