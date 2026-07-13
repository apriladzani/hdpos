import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar, Printer } from 'lucide-react';
import { cn, formatCurrency } from '../../lib/utils';
import { api } from '../../lib/api';
import { Card } from '../../components/Card';
import { ReceiptModal } from '../../components/ReceiptModal';
import { User, Transaction } from '../../types';

export const HistoryPage = ({ user }: { user: User }) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [selectedReceipt, setSelectedReceipt] = useState<any>(null);
  
  const [selectedCashier, setSelectedCashier] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [cashiers, setCashiers] = useState<User[]>([]);

  useEffect(() => {
    if (user.role === 'admin') {
      api.get('/api/users').then((users: User[]) => {
        setCashiers(users.filter(u => u.role === 'cashier'));
      });
    }
  }, [user]);

  const fetchHistory = () => {
    let txUrl = '/api/transactions';
    let sessUrl = '/api/cash-registers/history';
    const txParams = [];
    const sessParams = [];
    
    if (user.role === 'admin') {
      if (selectedCashier) {
        txParams.push(`user_id=${selectedCashier}`);
        sessParams.push(`cashier_id=${selectedCashier}`);
      }
      if (filterStartDate && filterEndDate) {
        txParams.push(`startDate=${filterStartDate}`);
        txParams.push(`endDate=${filterEndDate}`);
        sessParams.push(`startDate=${filterStartDate}`);
        sessParams.push(`endDate=${filterEndDate}`);
      }
    } else if (user.role === 'cashier') {
      txParams.push(`user_id=${user.id}`);
      sessParams.push(`cashier_id=${user.id}`);
      if (filterStartDate && filterEndDate) {
        txParams.push(`startDate=${filterStartDate}`);
        txParams.push(`endDate=${filterEndDate}`);
        sessParams.push(`startDate=${filterStartDate}`);
        sessParams.push(`endDate=${filterEndDate}`);
      }
    }
    
    const txQuery = txParams.length > 0 ? '?' + txParams.join('&') : '';
    const sessQuery = sessParams.length > 0 ? '?' + sessParams.join('&') : '';
    
    Promise.all([
      api.get(txUrl + txQuery),
      api.get(sessUrl + sessQuery)
    ]).then(([txs, sess]) => {
      setTransactions(txs);
      setSessions(sess);
    });
  };

  useEffect(() => {
    fetchHistory();
  }, [selectedCashier, filterStartDate, filterEndDate]);

  const handlePrint = async (id: number) => {
    const fullTransaction = await api.get(`/api/transactions/${id}`);
    setSelectedReceipt(fullTransaction);
  };

  const groupedData = sessions.map(session => {
    const openTime = new Date(session.opened_at).getTime();
    const closeTime = session.closed_at ? new Date(session.closed_at).getTime() : new Date().getTime() + 100000000;
    
    const sessionTxs = transactions.filter(t => {
      const txTime = new Date(t.created_at).getTime();
      return txTime >= openTime && txTime <= closeTime;
    });

    return {
      session,
      transactions: sessionTxs
    };
  });

  const unassignedTxs = transactions.filter(t => {
    const txTime = new Date(t.created_at).getTime();
    return !sessions.some(s => {
      const openTime = new Date(s.opened_at).getTime();
      const closeTime = s.closed_at ? new Date(s.closed_at).getTime() : new Date().getTime() + 100000000;
      return txTime >= openTime && txTime <= closeTime;
    });
  });

  if (unassignedTxs.length > 0) {
    groupedData.push({
      session: { 
        id: 'unassigned', 
        cashier_name: 'Tanpa Sesi Kasir', 
        opened_at: unassignedTxs[unassignedTxs.length-1]?.created_at || new Date(), 
        closed_at: unassignedTxs[0]?.created_at || new Date() 
      },
      transactions: unassignedTxs
    });
  }

  return (
    <div className="p-4 md:p-8 space-y-6 md:space-y-8 overflow-y-auto h-full pb-20 w-full">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Riwayat Transaksi</h1>
          <p className="text-sm md:text-base text-slate-500">Daftar transaksi berdasarkan sesi kasir.</p>
        </div>
      </div>

      {(user.role === 'admin' || user.role === 'cashier') && (
        <div className="flex flex-wrap gap-4 items-center bg-white border border-slate-100 p-4 rounded-2xl shadow-sm">
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

      <div className="space-y-8 pb-10">
        {groupedData.map((group, idx) => (
          <div key={idx} className="space-y-4">
            <div className="bg-slate-100 p-4 rounded-2xl flex flex-col md:flex-row md:items-center justify-between border border-slate-200">
              <div>
                <h3 className="font-bold text-slate-900 text-lg">{group.session.cashier_name}</h3>
                <p className="text-sm text-slate-500 font-medium">
                  {new Date(group.session.opened_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })} | {new Date(group.session.opened_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} - {group.session.closed_at ? new Date(group.session.closed_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : 'Sekarang'}
                </p>
              </div>
              <div className="mt-2 md:mt-0 px-4 py-2 bg-white rounded-xl shadow-sm text-sm font-bold text-slate-700 flex justify-between md:block">
                <span className="md:hidden">Total Transaksi: </span>
                {group.transactions.length} Transaksi
              </div>
            </div>

            {group.transactions.length > 0 ? (
              <Card className="p-0 overflow-hidden border-t-4 border-t-indigo-500">
                <div className="overflow-x-auto">
                  <table className="w-full text-left min-w-[600px]">
                    <thead className="bg-slate-50 border-b border-slate-100">
                      <tr>
                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">ID Pesanan</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Jam</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Metode</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Total</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {group.transactions.map((t: any) => (
                        <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4 font-bold text-slate-900">#ORD-{1000 + t.id}</td>
                          <td className="px-6 py-4 text-sm text-slate-500">{new Date(t.created_at).toLocaleTimeString('id-ID')}</td>
                          <td className="px-6 py-4">
                            <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-black uppercase tracking-widest">
                              {t.payment_method}
                            </span>
                          </td>
                          <td className="px-6 py-4 font-bold text-slate-900 text-right">
                            {formatCurrency(t.total_amount)}
                            {t.discount_type !== 'none' && (
                              <div className="text-[10px] text-rose-500 font-medium">
                                Diskon: {t.discount_type === 'percent' ? `${t.discount_value}%` : formatCurrency(t.discount_value)}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <button 
                              onClick={() => handlePrint(t.id)}
                              className="p-2 text-slate-400 hover:text-indigo-600 transition-colors"
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
            ) : (
              <p className="text-center text-slate-400 text-sm py-4">Tidak ada transaksi pada sesi ini.</p>
            )}
          </div>
        ))}
      </div>

      <AnimatePresence>
        {selectedReceipt && (
          <ReceiptModal 
            transaction={selectedReceipt} 
            onClose={() => setSelectedReceipt(null)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
};
