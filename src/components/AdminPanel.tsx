import React, { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, doc, getDocs, setDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { User, UserRole } from '../types';
import { UserPlus, Trash2, Key, Users, ShieldAlert, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';

export default function AdminPanel() {
  const [users, setUsers] = useState<User[]>([]);
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('operator');
  const [cargo, setCargo] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    // Read list of users in real time
    const usersRef = collection(db, 'users');
    const unsubscribe = onSnapshot(usersRef, (snapshot) => {
      const userList: User[] = [];
      snapshot.forEach((doc) => {
        userList.push(doc.data() as User);
      });
      setUsers(userList);
      setLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'users');
    });

    return () => unsubscribe();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const cleanUsername = username.trim().toLowerCase();
    const cleanName = name.trim();

    if (!cleanUsername || !password.trim() || !cleanName) {
      setError('Por favor, preencha todos os campos do usuário.');
      return;
    }

    // Username format check
    if (!/^[a-zA-Z0-9_\-]+$/.test(cleanUsername)) {
      setError('O nome de usuário só pode conter letras, números, hífen e sublinhado.');
      return;
    }

    setSubmitting(true);

    try {
      // Check if username is taken
      const userRef = doc(db, 'users', cleanUsername);
      const newUser: User = {
        username: cleanUsername,
        name: cleanName,
        password: password.trim(),
        role,
        cargo: cargo.trim() || (role === 'admin' ? 'Gerente Geral' : 'Apontador'),
        createdAt: new Date().toISOString()
      };

      await setDoc(userRef, newUser);
      
      setSuccess(`Usuário "${cleanName}" cadastrado com sucesso!`);
      // Reset fields
      setName('');
      setUsername('');
      setPassword('');
      setRole('operator');
      setCargo('');
    } catch (err) {
      setError('Erro ao criar usuário no banco de dados.');
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteUser = async (targetUsername: string, targetName: string) => {
    if (targetUsername === 'admin') {
      alert('Não é possível remover o administrador principal (admin).');
      return;
    }

    if (!window.confirm(`Tem certeza que deseja remover o acesso de "${targetName}"?`)) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'users', targetUsername));
      setSuccess(`Acesso de "${targetName}" removido.`);
    } catch (err) {
      setError('Erro ao excluir usuário.');
      console.error(err);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-6 font-sans grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Left Form: Create User */}
      <div className="lg:col-span-1 bg-slate-900/30 border border-slate-800/80 rounded-2xl p-6 shadow-2xl backdrop-blur-md h-fit">
        <h2 className="text-lg font-light text-white flex items-center gap-2 mb-4">
          <UserPlus className="h-5 w-5 text-blue-500" />
          Cadastrar <span className="font-bold">Usuário</span>
        </h2>
        <p className="text-xs text-slate-500 mb-6">
          Crie credenciais de acesso para operadores de campo ou gestores.
        </p>

        <form onSubmit={handleCreateUser} className="space-y-4">
          {error && (
            <div className="rounded-xl bg-red-950/40 border border-red-500/30 p-4 text-xs text-red-200 flex gap-2">
              <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="rounded-xl bg-emerald-950/40 border border-emerald-500/30 p-4 text-xs text-emerald-300 flex gap-2">
              <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>{success}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Nome Completo
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: João da Silva"
              className="block w-full px-3 py-2.5 bg-slate-950 border border-slate-850 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 placeholder-slate-700"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Nome de Usuário (Login)
            </label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Ex: joao.silva"
              className="block w-full px-3 py-2.5 bg-slate-950 border border-slate-850 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 placeholder-slate-700"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Senha de Acesso
            </label>
            <input
              type="text"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Senha do operador"
              className="block w-full px-3 py-2.5 bg-slate-950 border border-slate-850 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 placeholder-slate-700"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Cargo / Função do Usuário (Texto Livre)
            </label>
            <input
              type="text"
              required
              value={cargo}
              onChange={(e) => setCargo(e.target.value)}
              placeholder="Ex: Apontador de Campo, Engenheiro, Encarregado"
              className="block w-full px-3 py-2.5 bg-slate-950 border border-slate-850 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 placeholder-slate-700"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Permissão de Acesso (Sistema)
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              className="block w-full px-3 py-2.5 bg-slate-950 border border-slate-850 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            >
              <option value="operator">Apontador de Campo (Somente Editar)</option>
              <option value="admin">Gerente Geral (Acesso Total)</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-lg text-sm font-bold text-white bg-blue-600 hover:bg-blue-550 focus:outline-none focus:ring-2 focus:ring-blue-500/40 disabled:opacity-50 cursor-pointer transition"
          >
            {submitting ? 'Cadastrando...' : 'Cadastrar Usuário'}
          </button>
        </form>
      </div>

      {/* Right Column: User list */}
      <div className="lg:col-span-2 bg-slate-900/30 border border-slate-800/80 rounded-2xl p-6 shadow-2xl backdrop-blur-md">
        <h2 className="text-lg font-light text-white flex items-center gap-2 mb-4">
          <Users className="h-5 w-5 text-blue-500" />
          Usuários <span className="font-bold">Cadastrados</span>
        </h2>
        <p className="text-xs text-slate-500 mb-6">
          Lista de pessoas autorizadas a acessar o sistema e preencher os dados de estacas.
        </p>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <RefreshCw className="h-6 w-6 text-blue-500 animate-spin mb-3" />
            <span className="text-sm text-slate-500">Carregando usuários...</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-800">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Nome / Usuário
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Cargo / Permissão
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Senha
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {users.map((u) => (
                  <tr key={u.username} className="hover:bg-slate-900/20">
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm font-bold text-white">{u.name}</div>
                      <div className="text-xs text-slate-500">@{u.username}</div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm font-bold text-white">
                        {u.cargo || (u.role === 'admin' ? 'Gerente Geral' : 'Apontador')}
                      </div>
                      <span className={`inline-flex items-center px-2 py-0.5 mt-1 rounded-full text-[10px] font-bold border ${
                        u.role === 'admin'
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          : 'bg-blue-500/10 text-blue-450 border-blue-500/20'
                      }`}>
                        {u.role === 'admin' ? 'Acesso Gerente' : 'Acesso Apontador'}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-xs text-slate-300 font-mono">
                      <span className="flex items-center gap-1.5">
                        <Key className="h-3 w-3 text-slate-600" />
                        {u.password}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {u.username !== 'admin' ? (
                        <button
                          onClick={() => handleDeleteUser(u.username, u.name)}
                          className="text-red-400 hover:text-red-300 transition cursor-pointer"
                          title="Excluir Usuário"
                        >
                          <Trash2 className="h-4 w-4 inline" />
                        </button>
                      ) : (
                        <span className="text-xs text-slate-650 italic flex items-center justify-end gap-1 select-none">
                          <ShieldAlert className="h-3.5 w-3.5 text-slate-600" />
                          Protegido
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
