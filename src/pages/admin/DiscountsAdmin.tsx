import React, { useState, useEffect } from 'react';
import { Trash2 } from 'lucide-react';
import { formatCurrency } from '../../lib/utils';
import { api } from '../../lib/api';
import { Card } from '../../components/Card';
import { User } from '../../types';

export const DiscountsAdmin = ({ user }: { user: User }) => {
  const [discounts, setDiscounts] = useState<any[]>([]);
  const [name, setName] = useState('');
  const [type, setType] = useState<'percent'|'fixed'>('percent');
  const [value, setValue] = useState('');

  const fetchDiscounts = () => {
    api.get('/api/discounts').then(setDiscounts);
  };

  useEffect(() => {
    fetchDiscounts();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.post('/api/discounts', { name, type, value: Number(value) });
    setName('');
    setValue('');
    fetchDiscounts();
  };

  const handleDelete = async (id: number) => {
    if(confirm('Hapus diskon ini?')) {
      await api.delete(`/api/discounts/${id}`);
      fetchDiscounts();
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-6 md:space-y-8 w-full">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Daftar Diskon</h1>
        <p className="text-sm md:text-base text-slate-500">Kelola diskon yang tersedia untuk kasir.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-1">
          <form onSubmit={handleAdd} className="space-y-4">
            <h3 className="font-bold text-lg mb-4">Tambah Diskon Baru</h3>
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Nama Diskon</label>
              <input required value={name} onChange={e => setName(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl" placeholder="Misal: Promo Akhir Tahun" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Tipe</label>
              <select value={type} onChange={e => setType(e.target.value as any)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl">
                <option value="percent">Persentase (%)</option>
                <option value="fixed">Nominal (Rp)</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Nilai</label>
              <input required type="number" value={value} onChange={e => setValue(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl" placeholder="Misal: 10 atau 50000" />
            </div>
            <button type="submit" className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-100">Simpan Diskon</button>
          </form>
        </Card>

        <Card className="md:col-span-2 p-0 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Nama</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Nilai</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {discounts.map(d => (
                <tr key={d.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 font-bold text-slate-900">{d.name}</td>
                  <td className="px-6 py-4 font-bold text-slate-600">
                    {d.type === 'percent' ? `${d.value}%` : formatCurrency(d.value)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => handleDelete(d.id)} className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg"><Trash2 size={16} /></button>
                  </td>
                </tr>
              ))}
              {discounts.length === 0 && <tr><td colSpan={3} className="text-center py-6 text-slate-400">Belum ada diskon</td></tr>}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  );
};
