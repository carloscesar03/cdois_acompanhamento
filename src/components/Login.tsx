import React, { useState } from 'react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { User, UserRole } from '../types';
import { KeyRound, User as UserIcon, AlertTriangle, Eye, EyeOff } from 'lucide-react';

interface LoginProps {
  onLogin: (user: User) => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Por favor, preencha todos os campos.');
      return;
    }

    setLoading(true);
    setError(null);

    const cleanUsername = username.trim().toLowerCase();

    try {
      // 1. Check if user exists in the Firestore database
      const userDocRef = doc(db, 'users', cleanUsername);
      let userSnap;
      try {
        userSnap = await getDoc(userDocRef);
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, `users/${cleanUsername}`);
      }

      if (userSnap && userSnap.exists()) {
        const userData = userSnap.data() as User;
        if (userData.password === password) {
          // Success
          onLogin({
            username: userData.username,
            name: userData.name,
            role: userData.role,
            cargo: userData.cargo,
            createdAt: userData.createdAt,
          });
        } else {
          setError('Senha incorreta. Verifique os dados e tente novamente.');
        }
      } else {
        // If no user exists AT ALL in the users collection, allow fallback for first-time setup
        if (cleanUsername === 'admin' && password === 'admin') {
          // First time seeding
          const defaultAdmin: User = {
            username: 'admin',
            password: 'admin',
            name: 'Carlos César (Admin)',
            role: 'admin' as UserRole,
            cargo: 'Gerente Geral',
            createdAt: new Date().toISOString()
          };

          try {
            await setDoc(userDocRef, defaultAdmin);
          } catch (err) {
            handleFirestoreError(err, OperationType.WRITE, `users/${cleanUsername}`);
          }

          onLogin({
            username: defaultAdmin.username,
            name: defaultAdmin.name,
            role: defaultAdmin.role,
            cargo: defaultAdmin.cargo,
            createdAt: defaultAdmin.createdAt,
          });
        } else {
          setError('Usuário não encontrado. Peça para o gerente criar sua conta.');
        }
      }
    } catch (err: any) {
      console.error("Login database error:", err);
      setError('Erro ao conectar com o banco de dados. Verifique sua conexão de internet.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center bg-[#0F1115] px-4 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* CDois Oliveira Brand Mockup Logo */}
        <div className="flex justify-center mb-6">
          <div className="relative flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 shadow-xl shadow-blue-500/10">
            <span className="text-white text-3xl font-extrabold tracking-wider">C2</span>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-lg bg-emerald-500 border-4 border-[#0F1115]"></div>
          </div>
        </div>

        <h2 className="text-center text-3xl font-light text-white tracking-tight">
          CDois <span className="font-bold">Oliveira</span>
        </h2>
        <p className="mt-2 text-center text-sm text-slate-400 font-medium">
          Acompanhamento de Obras Rodoviárias
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-slate-900/40 backdrop-blur-md py-8 px-4 shadow-2xl rounded-2xl sm:px-10 border border-slate-800">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="rounded-lg bg-red-950/50 p-4 border border-red-500/30">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <AlertTriangle className="h-5 w-5 text-red-400" aria-hidden="true" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-200">{error}</h3>
                  </div>
                </div>
              </div>
            )}

            <div>
              <label htmlFor="username" className="block text-sm font-semibold text-slate-400">
                Usuário / Login
              </label>
              <div className="mt-2 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <UserIcon className="h-5 w-5 text-slate-500" aria-hidden="true" />
                </div>
                <input
                  type="text"
                  name="username"
                  id="username"
                  autoComplete="username"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 text-white bg-slate-950 border border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent text-base placeholder-slate-600"
                  placeholder="Nome de usuário"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-slate-400">
                Senha
              </label>
              <div className="mt-2 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <KeyRound className="h-5 w-5 text-slate-500" aria-hidden="true" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  id="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-10 py-3 text-white bg-slate-950 border border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent text-base placeholder-slate-600"
                  placeholder="Sua senha"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-white"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-3.5 px-4 border border-transparent rounded-xl shadow-lg text-base font-bold text-white bg-blue-600 hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition duration-200"
              >
                {loading ? 'Acessando...' : 'Entrar no Sistema'}
              </button>
            </div>
          </form>

          {/* Quick instructions for first use */}
          <div className="mt-6 pt-6 border-t border-slate-800/60 text-center">
            <span className="text-xs text-slate-500">
              Primeiro acesso? Use o usuário <strong className="text-blue-400">admin</strong> e senha <strong className="text-blue-400">admin</strong> para iniciar.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
