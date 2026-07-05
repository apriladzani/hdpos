import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { UserPlus, Edit, Trash2, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { api } from '../../lib/api';
import { Card } from '../../components/Card';
import { User } from '../../types';

export const UsersAdmin = ({ user }: { user: User }) => {
  const [usersList, setUsersList] = useState<User[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'admin' | 'cashier' | 'gudang'>('cashier');
  const [errorMsg, setErrorMsg] = useState('');

  const fetchUsers = () => {
    api.get('/api/users').then(setUsersList);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleOpenAdd = () => {
    setEditingUser(null);
    setUsername('');
    setEmail('');
    setPassword('');
    setRole('cashier');
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (u: User) => {
    setEditingUser(u);
    setUsername(u.username);
    setEmail(u.email || '');
    setPassword('');
    setRole(u.role);
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      if (editingUser) {
        await api.put(`/api/users/${editingUser.id}`, {
          username,
          email,
          password: password.trim() ? password : undefined,
          role
        });
      } else {
        if (!password) {
          setErrorMsg('Kata sandi wajib diisi untuk pengguna baru.');
          return;
        }
        await api.post('/api/users', {
          username,
          email,
          password,
          role
        });
      }
      setIsModalOpen(false);
      fetchUsers();
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal menyimpan data pengguna.');
    }
  };

  const handleDelete = async (id: number, uName: string) => {
    if (uName === 'admin') {
      alert('Tidak dapat menghapus user default admin.');
      return;
    }
    if (confirm(`Apakah Anda yakin ingin menghapus pengguna "${uName}"?`)) {
      try {
        await api.delete(`/api/users/${id}`);
        fetchUsers();
      } catch (err: any) {
        alert(err.message || 'Gagal menghapus pengguna.');
      }
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-6 md:space-y-8 pb-20 w-full">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Kelola Pengguna</h1>
          <p className="text-sm md:text-base text-slate-500">Kelola akun kasir, admin, dan gudang untuk sistem Anda.</p>
        </div>
        <button 
          onClick={handleOpenAdd}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-100 transition-all"
        >
          <UserPlus size={16} /> Tambah Pengguna
        </button>
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[600px]">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Nama Pengguna</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Email</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Role / Hak Akses</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {usersList.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 font-bold text-slate-900 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold uppercase text-xs">
                      {u.username.charAt(0)}
                    </div>
                    {u.username}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500">{u.email || '-'}</td>
                  <td className="px-6 py-4 text-sm">
                    <span className={cn(
                      "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider",
                      u.role === 'admin' && "bg-rose-50 text-rose-600",
                      u.role === 'cashier' && "bg-indigo-50 text-indigo-600",
                      u.role === 'gudang' && "bg-amber-50 text-amber-600"
                    )}>
                      {u.role === 'admin' ? 'Admin' : u.role === 'gudang' ? 'Gudang' : 'Kasir'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <button 
                      onClick={() => handleOpenEdit(u)}
                      className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                      title="Edit"
                    >
                      <Edit size={16} />
                    </button>
                    {u.username !== 'admin' && (
                      <button 
                        onClick={() => handleDelete(u.id, u.username)}
                        className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                        title="Hapus"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {usersList.length === 0 && (
                <tr>
                  <td colSpan={4} className="text-center py-10 text-slate-400">
                    Tidak ada pengguna terdaftar.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* CRUD User Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl relative z-10 border border-slate-100"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-slate-900">
                  {editingUser ? 'Edit Pengguna' : 'Tambah Pengguna Baru'}
                </h3>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 hover:bg-slate-100 rounded-xl text-slate-400"
                >
                  <X size={20} />
                </button>
              </div>

              {errorMsg && (
                <div className="mb-4 p-3 bg-rose-50 text-rose-600 rounded-xl text-xs font-bold">
                  {errorMsg}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">
                    Nama Pengguna
                  </label>
                  <input 
                    required 
                    type="text" 
                    value={username} 
                    onChange={e => setUsername(e.target.value)} 
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                    placeholder="Masukkan nama pengguna" 
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">
                    Email Pengguna
                  </label>
                  <input 
                    type="email" 
                    value={email} 
                    onChange={e => setEmail(e.target.value)} 
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                    placeholder="nama@email.com (opsional)" 
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">
                    Kata Sandi {editingUser && <span className="text-[10px] text-slate-400 capitalize">(kosongkan jika tidak diganti)</span>}
                  </label>
                  <input 
                    required={!editingUser} 
                    type="password" 
                    value={password} 
                    onChange={e => setPassword(e.target.value)} 
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                    placeholder={editingUser ? "Masukkan sandi baru" : "Masukkan kata sandi"} 
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">
                    Role / Hak Akses
                  </label>
                  <select 
                    value={role} 
                    onChange={e => setRole(e.target.value as any)} 
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                  >
                    <option value="cashier">Kasir</option>
                    <option value="admin">Admin</option>
                    <option value="gudang">Gudang</option>
                  </select>
                </div>

                <div className="pt-4 flex gap-3">
                  <button 
                    type="button" 
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold transition-all"
                  >
                    Batal
                  </button>
                  <button 
                    type="submit" 
                    className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-100 transition-all"
                  >
                    {editingUser ? 'Perbarui' : 'Simpan'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
