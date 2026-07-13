import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar, Printer } from 'lucide-react';
import { cn, formatCurrency } from '../../lib/utils';
import { api } from '../../lib/api';
import { Card } from '../../components/Card';
import { User } from '../../types';

export const RegisterHistory = ({ user }: { user: User }) => {
  const [history, setHistory] = useState<any[]>([]);
  const [printingRegister, setPrintingRegister] = useState<any>(null);
  const [summaryData, setSummaryData] = useState<any>(null);
  
  const [cashiers, setCashiers] = useState<User[]>([]);
  const [selectedCashier, setSelectedCashier] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  const fetchHistory = () => {
    let url = '/api/cash-registers/history';
    const params = [];
    if (user.role === 'admin') {
      if (selectedCashier) params.push(`cashier_id=${selectedCashier}`);
    } else if (user.role === 'cashier') {
      params.push(`cashier_id=${user.id}`);
    }
    if (filterStartDate && filterEndDate) {
      params.push(`startDate=${filterStartDate}`);
      params.push(`endDate=${filterEndDate}`);
    }
    const queryStr = params.length > 0 ? '?' + params.join('&') : '';
    api.get(url + queryStr).then(setHistory);
  };

  useEffect(() => {
    fetchHistory();
  }, [selectedCashier, filterStartDate, filterEndDate]);

  useEffect(() => {
    if (user.role === 'admin') {
      api.get('/api/users').then((users: User[]) => {
        setCashiers(users.filter(u => u.role === 'cashier'));
      });
    }
  }, [user]);

  const handlePrint = async (register: any) => {
    setPrintingRegister(register);
    try {
      const res = await api.get('/api/cash-registers/' + register.id + '/summary');
      setSummaryData(res);
    } catch (err) {
      alert("Gagal memuat ringkasan kasir.");
      setPrintingRegister(null);
    }
  };

  const executePrint = () => {
    window.print();
  };

  return (
    <div className="p-4 md:p-8 space-y-6 md:space-y-8 w-full">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 print:hidden">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Riwayat Kasir</h1>
          <p className="text-sm md:text-base text-slate-500">Daftar riwayat sesi buka dan tutup kasir.</p>
        </div>
      </div>

      {(user.role === 'admin' || user.role === 'cashier') && (
        <div className="flex flex-wrap gap-4 items-center bg-white border border-slate-100 p-4 rounded-2xl shadow-sm print:hidden">
          {user.role === 'admin' && (
            <select 
              value={selectedCashier} 
              onChange={e => setSelectedCashier(e.target.value)}
              className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Semua Kasir</option>
              {cashiers.map(c => (
                <option key={c.id} value={c.id}>{c.username}</option>
              ))}
            </select>
          )}

          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2">
            <Calendar size={14} className="text-slate-400" />
            <input 
              type="date" 
              value={filterStartDate} 
              onChange={e => setFilterStartDate(e.target.value)} 
              className="text-xs font-bold outline-none bg-transparent"
              placeholder="Tanggal Awal"
            />
            <span className="text-slate-300 text-xs font-medium">s/d</span>
            <input 
              type="date" 
              value={filterEndDate} 
              onChange={e => setFilterEndDate(e.target.value)} 
              className="text-xs font-bold outline-none bg-transparent"
              placeholder="Tanggal Akhir"
            />
          </div>
          
          {((user.role === 'admin' && selectedCashier) || filterStartDate || filterEndDate) && (
            <button 
              onClick={() => { if (user.role === 'admin') setSelectedCashier(''); setFilterStartDate(''); setFilterEndDate(''); }}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-all"
            >
              Reset Filter
            </button>
          )}
        </div>
      )}

      <Card className="p-0 overflow-hidden print:hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Nama Kasir</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Waktu Buka</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Waktu Tutup</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Saldo Awal</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Saldo Akhir</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {history.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 text-sm font-bold text-slate-900">{item.cashier_name}</td>
                  <td className="px-6 py-4 text-sm font-medium text-slate-600">
                    {new Date(item.opened_at).toLocaleString('id-ID')}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-slate-600">
                    {item.closed_at ? new Date(item.closed_at).toLocaleString('id-ID') : '-'}
                  </td>
                  <td className="px-6 py-4 text-sm font-bold text-slate-900">
                    {formatCurrency(item.opening_balance)}
                  </td>
                  <td className="px-6 py-4 text-sm font-bold text-slate-900">
                    {item.closing_balance !== null ? formatCurrency(item.closing_balance) : '-'}
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                      item.status === 'open' ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-600"
                    )}>
                      {item.status === 'open' ? 'Buka' : 'Tutup'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => handlePrint(item)}
                      className="p-2 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-all"
                      title="Cetak Ringkasan"
                    >
                      <Printer size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <AnimatePresence>
        {printingRegister && summaryData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 print:p-0 print:bg-white print:items-start">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => { setPrintingRegister(null); setSummaryData(null); }}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm print:hidden" 
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-white w-full max-w-md rounded-3xl overflow-hidden shadow-2xl p-8 print:shadow-none print:w-full print:max-w-full print:rounded-none"
            >
              <div className="text-center mb-6 border-b-2 border-slate-900 pb-6">
                <h2 className="text-2xl font-black text-slate-900 uppercase tracking-widest">Ringkasan Kasir</h2>
                <p className="text-slate-500 mt-2">{new Date(summaryData.register.opened_at).toLocaleString('id-ID')} - {summaryData.register.closed_at ? new Date(summaryData.register.closed_at).toLocaleString('id-ID') : 'Sekarang'}</p>
              </div>

              <div className="space-y-4 mb-8">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Kasir:</span>
                  <span className="font-bold text-slate-900">{summaryData.register.cashier_name}</span>
                </div>
                <div className="flex justify-between text-sm border-b pb-4">
                  <span className="text-slate-500">Status:</span>
                  <span className="font-bold uppercase text-slate-900">{summaryData.register.status}</span>
                </div>

                {/* Receipt Formula Format */}
                <div className="bg-slate-50 border border-slate-100 p-5 rounded-2xl font-mono text-sm space-y-3 print:border print:bg-white">
                  <div className="flex justify-between border-b border-dashed border-slate-200 pb-2">
                    <span className="text-slate-500 font-bold">MODAL (SALDO AWAL)</span>
                    <span className="font-bold text-slate-800">{formatCurrency(summaryData.register.opening_balance || 0)}</span>
                  </div>
                  <div className="flex justify-between border-b border-dashed border-slate-200 pb-2">
                    <span className="text-slate-500 font-bold">TOTAL PEMASUKAN</span>
                    <span className="font-bold text-slate-800">{formatCurrency(summaryData.total_pemasukan || 0)}</span>
                  </div>
                  <div className="flex justify-between border-b border-dashed border-slate-200 pb-2">
                    <span className="text-slate-500 font-bold">TOTAL PENGELUARAN</span>
                    <span className="font-bold text-slate-800">{formatCurrency(summaryData.total_pengeluaran || 0)}</span>
                  </div>
                  <div className="flex justify-between border-b border-dashed border-slate-200 pb-2">
                    <span className="text-slate-500 font-bold">PROMO</span>
                    <span className="font-bold text-slate-800">{formatCurrency(summaryData.total_promo || 0)}</span>
                  </div>
                  <div className="flex justify-between border-b-2 border-slate-900 pb-2 text-indigo-700 print:text-slate-900">
                    <span className="font-black">TOTAL KESELURUHAN</span>
                    <span className="font-black">
                      {formatCurrency(
                        summaryData.total_keseluruhan !== undefined && summaryData.total_keseluruhan !== null
                          ? summaryData.total_keseluruhan
                          : (Number(summaryData.register.opening_balance || 0) + Number(summaryData.total_pemasukan || 0) - Number(summaryData.total_pengeluaran || 0) - (summaryData.total_promo || 0))
                      )}
                    </span>
                  </div>
                  
                  <div className="pt-2 space-y-1 text-xs font-bold text-slate-600 print:text-slate-900">
                    <div className="flex justify-between">
                      <span>#TUNAI</span>
                      <span>{formatCurrency(summaryData.total_tunai)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>#QR</span>
                      <span>{formatCurrency(summaryData.total_qris)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>#TF</span>
                      <span>{formatCurrency(summaryData.total_transfer)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between text-lg">
                  <span className="font-black text-slate-900">Saldo Seharusnya:</span>
                  <span className="font-black text-slate-900">{formatCurrency(summaryData.register.expected_balance || 0)}</span>
                </div>
                <div className="flex justify-between text-lg">
                  <span className="font-black text-slate-900">Saldo Aktual di Laci:</span>
                  <span className="font-black text-slate-900">{formatCurrency(summaryData.register.closing_balance || 0)}</span>
                </div>

                {summaryData.register.closing_balance !== null && summaryData.register.expected_balance !== null && (
                  <div className={cn(
                    "flex justify-between text-sm font-bold p-3 rounded-xl mt-4 print:border",
                    Number(summaryData.register.closing_balance) === Number(summaryData.register.expected_balance) ? "bg-emerald-50 text-emerald-600 print:text-slate-900 print:bg-white" :
                    Number(summaryData.register.closing_balance) < Number(summaryData.register.expected_balance) ? "bg-rose-50 text-rose-600 print:text-slate-900 print:bg-white" : "bg-amber-50 text-amber-600 print:text-slate-900 print:bg-white"
                  )}>
                    <span>Selisih (Minus/Lebih):</span>
                    <span>
                      {Number(summaryData.register.closing_balance) - Number(summaryData.register.expected_balance) < 0 ? '-' : '+'}
                      {formatCurrency(Math.abs(Number(summaryData.register.closing_balance) - Number(summaryData.register.expected_balance)))}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex gap-3 print:hidden">
                <button onClick={() => { setPrintingRegister(null); setSummaryData(null); }} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200">Tutup</button>
                <button onClick={executePrint} className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-indigo-200 hover:bg-indigo-700">
                  <Printer size={20} /> Cetak
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
