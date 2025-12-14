'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { APP_VERSION } from '@/lib/version';

export default function LoginForm() {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const router = useRouter();

  // Vérifier si un utilisateur est déjà connecté
  useEffect(() => {
    const savedUser = localStorage.getItem('test1_user');
    if (savedUser) {
      try {
        const user = JSON.parse(savedUser);
        if (user.username) {
          // Auto-login avec l'utilisateur sauvegardé
          router.push('/game');
          return;
        }
      } catch (e) {
        localStorage.removeItem('test1_user');
      }
    }
    setChecking(false);
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Opération échouée');
      }

      if (isLogin) {
        // Sauvegarder l'utilisateur dans localStorage
        localStorage.setItem('test1_user', JSON.stringify({
          username,
          id: data.userId || username,
          loginTime: Date.now(),
        }));
        router.push('/game');
      } else {
        setSuccess('✨ Compte créé avec succès ! Connectez-vous.');
        setIsLogin(true);
        setPassword('');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Écran de chargement pendant la vérification
  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center animate-slide-up">
          <div className="text-6xl mb-4 animate-float">🎮</div>
          <h1 className="font-title text-3xl text-white">TEST 1</h1>
          <p className="text-gray-400 mt-2">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-pink-600/10 rounded-full blur-3xl" />
      </div>

      {/* Main card */}
      <div className="glass-strong p-8 w-full max-w-md animate-slide-up relative z-10">
        {/* Logo / Title */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-4 animate-float">🎮</div>
          <h1 className="font-title text-4xl font-bold bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            TEST 1
          </h1>
          <p className="text-gray-400 mt-2 text-sm">Jeu tactique isométrique</p>
          <span className="inline-block mt-2 px-2 py-0.5 bg-purple-600/30 rounded text-xs text-purple-300 font-mono">
            v{APP_VERSION}
          </span>
        </div>

        {/* Toggle Login/Register */}
        <div className="flex mb-6 bg-black/30 rounded-xl p-1">
          <button
            onClick={() => { setIsLogin(true); setError(''); setSuccess(''); }}
            className={`flex-1 py-2 rounded-lg font-title text-sm transition-all ${
              isLogin 
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Connexion
          </button>
          <button
            onClick={() => { setIsLogin(false); setError(''); setSuccess(''); }}
            className={`flex-1 py-2 rounded-lg font-title text-sm transition-all ${
              !isLogin 
                ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Inscription
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              👤 Nom d'utilisateur
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              placeholder="Entrez votre pseudo"
              className="input-cyber"
              autoComplete="username"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              🔒 Mot de passe
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              className="input-cyber"
              autoComplete={isLogin ? "current-password" : "new-password"}
            />
          </div>

          {/* Messages */}
          {error && (
            <div className="bg-red-500/20 border border-red-500/50 text-red-300 px-4 py-3 rounded-xl text-sm animate-slide-up">
              ❌ {error}
            </div>
          )}
          
          {success && (
            <div className="bg-green-500/20 border border-green-500/50 text-green-300 px-4 py-3 rounded-xl text-sm animate-slide-up">
              {success}
            </div>
          )}

          {/* Submit button */}
          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary w-full text-lg py-4"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Chargement...
              </span>
            ) : isLogin ? (
              '🚀 Jouer'
            ) : (
              '✨ Créer mon compte'
            )}
          </button>
        </form>

        {/* Footer info */}
        <p className="text-center text-gray-500 text-xs mt-6">
          {isLogin 
            ? 'Votre session sera mémorisée' 
            : 'Créez un compte pour sauvegarder vos stats'}
        </p>
      </div>
    </div>
  );
}
