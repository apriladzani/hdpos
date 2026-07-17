import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Trash2, 
  Calendar, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Wallet, 
  CreditCard, 
  AlertCircle,
  Percent
} from 'lucide-react';
import { cn, formatCurrency, getLocalDateString, formatTransactionDate } from '../../lib/utils';
import { api } from '../../lib/api';
import { Card } from '../../components/Card';
import { User, CashFlowItem } from '../../types';

export const CashFlow = ({ user, mode }: { user: User; mode?: 'cashflow' | 'expenses' }) => {
  const [items, setItems] = useState<CashFlowItem[]>([]);
  const [expenseItems, setExpenseItems] = useState<any[]>([]);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isExpenseItemModalOpen, setIsExpenseItemModalOpen] = useState(false);
  const [cancellingItem, setCancellingItem] = useState<CashFlowItem | null>(null);

  const [selectedExpenseItem, setSelectedExpenseItem] = useState('');
  const [expQty, setExpQty] = useState(1);
  const [expPrice, setExpPrice] = useState('');
  const [expPaymentMethod, setExpPaymentMethod] = useState<'cash' | 'transfer'>('cash');
  const [newExpenseItemName, setNewExpenseItemName] = useState('');
  const [newExpenseItemPrice, setNewExpenseItemPrice] = useState('');

  // Admin Specific States
  const [cashflowTab, setCashflowTab] = useState<'report' | 'settings'>('report');
  const [cashiers, setCashiers] = useState<User[]>([]);
  const [selectedCashierId, setSelectedCashierId] = useState('');
  const [filterType, setFilterType] = useState<'day' | 'month' | 'range'>(() => {
    return user.role === 'cashier' ? 'range' : 'day';
  });
  const [filterDate, setFilterDate] = useState(getLocalDateString());
  const [filterMonthYear, setFilterMonthYear] = useState(getLocalDateString().substring(0, 7)); // YYYY-MM
  const [filterStartDate, setFilterStartDate] = useState(() => {
    if (user.role === 'cashier') {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      return getLocalDateString(d);
    }
    return '';
  });
  const [filterEndDate, setFilterEndDate] = useState(() => {
    if (user.role === 'cashier') {
      return getLocalDateString(new Date());
    }
    return '';
  });

  const fetchData = () => {
    if (user.role === 'gudang') {
      let url = `/api/reports/warehouse-cash-flow?`;
      if (filterType === 'day') {
        url += `date=${filterDate}`;
      } else if (filterType === 'month') {
        const [year, month] = filterMonthYear.split('-');
        url += `month=${month}&year=${year}`;
      } else if (filterType === 'range') {
        if (filterStartDate && filterEndDate) {
          url += `startDate=${filterStartDate}&endDate=${filterEndDate}`;
        }
      }
      api.get(url).then(setItems);
    } else if (user.role === 'admin') {
      let url = `/api/reports/cash-flow-admin?`;
      if (selectedCashierId) {
        url += `user_id=${selectedCashierId}&`;
      }
      if (filterType === 'day') {
        url += `date=${filterDate}`;
      } else if (filterType === 'month') {
        const [year, month] = filterMonthYear.split('-');
        url += `month=${month}&year=${year}`;
      } else if (filterType === 'range') {
        if (filterStartDate && filterEndDate) {
          url += `startDate=${filterStartDate}&endDate=${filterEndDate}`;
        }
      }
      api.get(url).then(setItems);
    } else if (user.role === 'cashier') {
      let url = `/api/reports/cash-flow-admin?user_id=${user.id}&`;
      if (filterType === 'day') {
        url += `date=${filterDate}`;
      } else if (filterType === 'month') {
        const [year, month] = filterMonthYear.split('-');
        url += `month=${month}&year=${year}`;
      } else if (filterType === 'range') {
        if (filterStartDate && filterEndDate) {
          url += `startDate=${filterStartDate}&endDate=${filterEndDate}`;
        }
      }
      api.get(url).then(setItems);
    } else {
      api.get('/api/reports/cash-flow').then(setItems);
    }
  };

  const fetchExpenseItems = () => {
    api.get('/api/expense-items').then(setExpenseItems);
  };

  useEffect(() => {
    if (user.role === 'admin') {
      api.get('/api/users').then((data: User[]) => {
        const list = data.filter(u => u.role === 'cashier');
        setCashiers(list);
        if (list.length > 0) {
          setSelectedCashierId(list[0].id.toString());
        }
      });
    }
    fetchExpenseItems();
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [selectedCashierId, filterType, filterDate, filterMonthYear, filterStartDate, filterEndDate]);

  const totalIncome = items.filter(i => i.type === 'income').reduce((sum, i) => sum + Number(i.amount), 0);
  const totalExpense = items.filter(i => i.type === 'expense').reduce((sum, i) => sum + Number(i.amount), 0);
  const totalLoss = items.filter(i => i.type === 'loss').reduce((sum, i) => sum + Number(i.amount), 0);
  
  const totalIncomeCash = items.filter(i => i.type === 'income' && i.payment_method === 'cash').reduce((sum, i) => sum + Number(i.amount), 0);
  const expenseCash = items.filter(i => i.type === 'expense' && i.payment_method === 'cash').reduce((sum, i) => sum + Number(i.amount), 0);
  const expenseTransfer = items.filter(i => i.type === 'expense' && i.payment_method === 'transfer').reduce((sum, i) => sum + Number(i.amount), 0);
  
  const totalTunai = totalIncomeCash - expenseCash;
  const totalQRIS = items.filter(i => i.type === 'income' && i.payment_method === 'qris').reduce((sum, i) => sum + Number(i.amount), 0);
  const totalTransfer = items.filter(i => i.type === 'income' && i.payment_method === 'transfer').reduce((sum, i) => sum + Number(i.amount), 0);
  const balance = totalIncome - totalExpense - totalLoss;

  const totalDiscountExpense = items
    .filter(i => i.type === 'expense' && (i.description.startsWith('Diskon Produk:') || i.description.startsWith('Diskon Penjualan')))
    .reduce((sum, i) => sum + Number(i.amount), 0);

  const handleExpenseItemChange = (itemId: string) => {
    setSelectedExpenseItem(itemId);
    const item = expenseItems.find(i => i.id === Number(itemId));
    if (item) {
      setExpPrice(String(item.price || 0));
    } else {
      setExpPrice('');
    }
  };

  const handleAddExpense = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedExpenseItem) return alert('Pilih barang pengeluaran!');
    const selItem = expenseItems.find(x => x.id.toString() === selectedExpenseItem);
    const calculatedAmount = Number(expPrice) * expQty;

    await api.post('/api/expenses', {
      expense_item_id: selectedExpenseItem,
      description: `${selItem?.name || 'Pengeluaran'} x ${expQty} @ ${formatCurrency(Number(expPrice))} (${expPaymentMethod === 'transfer' ? 'Transfer' : 'Cash'})`,
      amount: calculatedAmount,
      quantity: expQty,
      price: Number(expPrice),
      discount: 0,
      user_id: user.id,
      payment_method: expPaymentMethod
    });
    
    setIsExpenseModalOpen(false);
    setSelectedExpenseItem('');
    setExpQty(1);
    setExpPrice('');
    setExpPaymentMethod('cash');
    fetchData();
  };

  const handleAddExpenseItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExpenseItemName) return;
    await api.post('/api/expense-items', { 
      name: newExpenseItemName,
      price: Number(newExpenseItemPrice) || 0
    });
    setNewExpenseItemName('');
    setNewExpenseItemPrice('');
    setIsExpenseItemModalOpen(false);
    fetchExpenseItems();
  };

  const handleDeleteExpenseItem = async (id: number) => {
    if (!confirm('Apakah Anda yakin ingin menghapus barang pengeluaran ini?')) return;
    try {
      await api.delete(`/api/expense-items/${id}`);
      fetchExpenseItems();
    } catch (e: any) {
      alert(e.message || 'Gagal menghapus barang pengeluaran.');
    }
  };

  const handleCancelItem = async () => {
    if (!cancellingItem) return;
    try {
      if (cancellingItem.type === 'income') {
        await api.delete(`/api/transactions/${cancellingItem.id}`);
      } else {
        await api.delete(`/api/expenses/${cancellingItem.id}`);
      }
      setCancellingItem(null);
      fetchData();
    } catch (error) {
      console.error("Failed to cancel item:", error);
      alert("Gagal membatalkan item.");
    }
  };

  const setQuickFilter = (daysOffset: number) => {
    const d = new Date();
    d.setDate(d.getDate() + daysOffset);
    setFilterType('day');
    setFilterDate(getLocalDateString(d));
  };

  return (
    <div className="p-4 md:p-8 space-y-6 md:space-y-8 overflow-y-auto h-full pb-20 w-full">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">
            {mode === 'expenses' ? 'Pengeluaran' : 'Arus Kas'}
          </h1>
          <p className="text-sm md:text-base text-slate-500">
            {mode === 'expenses' 
              ? 'Catat dan pantau pengeluaran Anda.' 
              : user.role === 'admin' 
              ? 'Kelola pengaturan barang pengeluaran dan pantau arus kas kasir.' 
              : 'Pantau pemasukan dan pengeluaran Anda.'}
          </p>
        </div>

        {user.role === 'admin' ? (
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 w-full md:w-auto">
            <button 
              onClick={() => setCashflowTab('report')} 
              className={cn("flex-1 md:flex-none px-4 py-2 text-xs font-bold rounded-lg transition-all", cashflowTab === 'report' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-900")}
            >
              Laporan Arus Kas
            </button>
            <button 
              onClick={() => setCashflowTab('settings')} 
              className={cn("flex-1 md:flex-none px-4 py-2 text-xs font-bold rounded-lg transition-all", cashflowTab === 'settings' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-900")}
            >
              Pengaturan Barang Pengeluaran
            </button>
          </div>
        ) : user.role === 'cashier' && mode === 'expenses' ? (
          <button 
            onClick={() => setIsExpenseModalOpen(true)}
            className="w-full md:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-rose-500 text-white rounded-xl font-bold shadow-lg shadow-rose-200 hover:bg-rose-600 transition-all"
          >
            <Plus size={20} /> Catat Pengeluaran
          </button>
        ) : null}
      </div>

      {user.role === 'admin' && cashflowTab === 'settings' ? (
        <Card className="p-6 space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold text-slate-900">Daftar Barang Pengeluaran</h3>
            <button 
              onClick={() => setIsExpenseItemModalOpen(true)}
              className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold text-xs shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all"
            >
              + Tambah Barang
            </button>
          </div>
          <div className="overflow-x-auto rounded-xl border border-slate-100">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Nama Barang</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Harga Satuan Default</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {expenseItems.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-8 text-center text-slate-400 text-sm">Belum ada barang pengeluaran.</td>
                  </tr>
                ) : (
                  expenseItems.map(item => (
                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 text-sm font-bold text-slate-900">{item.name}</td>
                      <td className="px-6 py-4 text-sm font-medium text-slate-600">{formatCurrency(item.price)}</td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => handleDeleteExpenseItem(item.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                          title="Hapus Barang"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <>
          {(user.role === 'admin' || user.role === 'gudang' || user.role === 'cashier') && (
            <div className="flex flex-wrap gap-4 items-center justify-between bg-white border border-slate-100 p-4 rounded-2xl shadow-sm">
              <div className="flex flex-wrap items-center gap-3">
                {user.role === 'admin' && (
                  <select 
                    value={selectedCashierId} 
                    onChange={e => setSelectedCashierId(e.target.value)}
                    className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Pilih Akun Kasir...</option>
                    {cashiers.map(c => (
                      <option key={c.id} value={c.id}>{c.username}</option>
                    ))}
                  </select>
                )}

                {user.role !== 'cashier' && (
                  <>
                    <select 
                      value={filterType} 
                      onChange={e => setFilterType(e.target.value as any)}
                      className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="day">Filter Harian</option>
                      <option value="month">Filter Bulanan</option>
                      <option value="range">Rentang Tanggal</option>
                    </select>

                    <div className="flex bg-slate-50 border border-slate-200 rounded-xl p-1">
                      <button onClick={() => setQuickFilter(0)} className="px-3 py-1.5 text-xs font-bold rounded-lg hover:bg-white/50 text-slate-600 hover:text-slate-955 transition-all">Hari Ini</button>
                      <button onClick={() => setQuickFilter(1)} className="px-3 py-1.5 text-xs font-bold rounded-lg hover:bg-white/50 text-slate-600 hover:text-slate-955 transition-all">Hari Esok</button>
                    </div>
                  </>
                )}
              </div>

              <div className="flex items-center gap-2">
                {filterType === 'day' && (
                  <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2">
                    <Calendar size={14} className="text-slate-400" />
                    <input 
                      type="date" 
                      value={filterDate} 
                      onChange={e => setFilterDate(e.target.value)} 
                      className="text-xs font-bold outline-none bg-transparent"
                    />
                  </div>
                )}
                {filterType === 'month' && (
                  <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2">
                    <Calendar size={14} className="text-slate-400" />
                    <input 
                      type="month" 
                      value={filterMonthYear} 
                      onChange={e => setFilterMonthYear(e.target.value)} 
                      className="text-xs font-bold outline-none bg-transparent"
                    />
                  </div>
                )}
                {filterType === 'range' && (
                  <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2">
                    <Calendar size={14} className="text-slate-400" />
                    <input 
                      type="date" 
                      value={filterStartDate} 
                      onChange={e => setFilterStartDate(e.target.value)} 
                      className="text-xs font-bold outline-none bg-transparent"
                    />
                    <span className="text-slate-300 text-xs">s/d</span>
                    <input 
                      type="date" 
                      value={filterEndDate} 
                      onChange={e => setFilterEndDate(e.target.value)} 
                      className="text-xs font-bold outline-none bg-transparent"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {mode === 'expenses' ? (
              <>
                <Card className="bg-rose-100 border-rose-200 p-4">
                  <div className="flex items-center gap-2 text-rose-800 mb-2">
                    <ArrowDownLeft size={16} />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Total Pengeluaran</span>
                  </div>
                  <h3 className="text-lg font-black text-rose-900">{formatCurrency(totalExpense)}</h3>
                </Card>
                <Card className="bg-rose-50 border-rose-100 p-4">
                  <div className="flex items-center gap-2 text-rose-600 mb-2">
                    <ArrowDownLeft size={16} />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Pengeluaran Cash</span>
                  </div>
                  <h3 className="text-lg font-black text-rose-700">{formatCurrency(expenseCash)}</h3>
                </Card>
                <Card className="bg-rose-50 border-rose-100 p-4">
                  <div className="flex items-center gap-2 text-rose-600 mb-2">
                    <ArrowDownLeft size={16} />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Pengeluaran Transfer</span>
                  </div>
                  <h3 className="text-lg font-black text-rose-700">{formatCurrency(expenseTransfer)}</h3>
                </Card>
                <Card className="bg-amber-50 border-amber-100 p-4">
                  <div className="flex items-center gap-2 text-amber-600 mb-2">
                    <Percent size={16} />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Pengeluaran Diskon</span>
                  </div>
                  <h3 className="text-lg font-black text-amber-700">{formatCurrency(totalDiscountExpense)}</h3>
                </Card>
              </>
            ) : (
              <>
                <Card className="bg-emerald-50 border-emerald-100 p-4">
                  <div className="flex items-center gap-2 text-emerald-600 mb-2">
                    <ArrowUpRight size={16} />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Pemasukan</span>
                  </div>
                  <h3 className="text-lg font-black text-emerald-700">{formatCurrency(totalIncome)}</h3>
                </Card>
                {user.role !== 'cashier' && (
                  <>
                    <Card className="bg-rose-50 border-rose-100 p-4">
                      <div className="flex items-center gap-2 text-rose-600 mb-2">
                        <ArrowDownLeft size={16} />
                        <span className="text-[10px] font-bold uppercase tracking-wider">Pengeluaran Cash</span>
                      </div>
                      <h3 className="text-lg font-black text-rose-700">{formatCurrency(expenseCash)}</h3>
                    </Card>
                    <Card className="bg-rose-50 border-rose-100 p-4">
                      <div className="flex items-center gap-2 text-rose-600 mb-2">
                        <ArrowDownLeft size={16} />
                        <span className="text-[10px] font-bold uppercase tracking-wider">Pengeluaran Transfer</span>
                      </div>
                      <h3 className="text-lg font-black text-rose-700">{formatCurrency(expenseTransfer)}</h3>
                    </Card>
                  </>
                )}
                <Card className="bg-rose-100 border-rose-200 p-4">
                  <div className="flex items-center gap-2 text-rose-800 mb-2">
                    <ArrowDownLeft size={16} />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Total Pengeluaran</span>
                  </div>
                  <h3 className="text-lg font-black text-rose-900">{formatCurrency(totalExpense)}</h3>
                </Card>
                {user.role === 'cashier' && (
                  <Card className="bg-amber-50 border-amber-100 p-4">
                    <div className="flex items-center gap-2 text-amber-600 mb-2">
                      <Percent size={16} />
                      <span className="text-[10px] font-bold uppercase tracking-wider">Total Diskon</span>
                    </div>
                    <h3 className="text-lg font-black text-amber-700">{formatCurrency(totalDiscountExpense)}</h3>
                  </Card>
                )}
              </>
            )}
            {user.role === 'gudang' && (
              <Card className="bg-amber-50 border-amber-100 p-4">
                <div className="flex items-center gap-2 text-amber-600 mb-2">
                  <AlertCircle size={16} />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Total Kerugian</span>
                </div>
                <h3 className="text-lg font-black text-amber-700">{formatCurrency(totalLoss)}</h3>
              </Card>
            )}
            {mode !== 'expenses' && (
              <>
                <Card className="bg-indigo-600 border-indigo-700 p-4">
                  <div className="flex items-center gap-2 text-indigo-100 mb-2">
                    <Wallet size={16} />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Saldo Bersih</span>
                  </div>
                  <h3 className="text-lg font-black text-white">{formatCurrency(balance)}</h3>
                </Card>
                <Card className="bg-blue-50 border-blue-100 p-4">
                  <div className="flex items-center gap-2 text-blue-600 mb-2">
                    <Wallet size={16} />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Total Tunai</span>
                  </div>
                  <h3 className="text-lg font-black text-blue-700">{formatCurrency(totalTunai)}</h3>
                </Card>
                <Card className="bg-fuchsia-50 border-fuchsia-100 p-4">
                  <div className="flex items-center gap-2 text-fuchsia-600 mb-2">
                    <CreditCard size={16} />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Total QRIS</span>
                  </div>
                  <h3 className="text-lg font-black text-fuchsia-700">{formatCurrency(totalQRIS)}</h3>
                </Card>
                <Card className="bg-amber-50 border-amber-100 p-4">
                  <div className="flex items-center gap-2 text-amber-600 mb-2">
                    <ArrowUpRight size={16} />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Total Transfer</span>
                  </div>
                  <h3 className="text-lg font-black text-amber-700">{formatCurrency(totalTransfer)}</h3>
                </Card>
              </>
            )}
          </div>

          <Card className="p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Tanggal</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Deskripsi</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Tipe</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Metode</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Jumlah</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(() => {
                    const displayedItems = items.filter(item => mode === 'expenses' ? item.type === 'expense' : true);
                    if (displayedItems.length === 0) {
                      return (
                        <tr>
                          <td colSpan={6} className="px-6 py-8 text-center text-slate-400 text-sm">
                            {mode === 'expenses' ? 'Tidak ada transaksi pengeluaran ditemukan.' : 'Tidak ada transaksi arus kas ditemukan.'}
                          </td>
                        </tr>
                      );
                    }
                    return displayedItems.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 text-sm font-medium text-slate-600">
                          {formatTransactionDate(item.date)}
                        </td>
                        <td className="px-6 py-4 text-sm font-bold text-slate-900">{item.description}</td>
                        <td className="px-6 py-4">
                          <span className={cn(
                            "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                            item.type === 'income'
                              ? "bg-emerald-100 text-emerald-600"
                              : item.type === 'loss'
                                ? "bg-amber-100 text-amber-600"
                                : "bg-rose-100 text-rose-600"
                          )}>
                            {item.type === 'income' ? 'Pemasukan' : item.type === 'loss' ? 'Kerugian' : 'Pengeluaran'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {item.payment_method && (
                            <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-[10px] font-bold uppercase tracking-wider">
                              {item.payment_method === 'cash' ? 'Tunai' : item.payment_method}
                            </span>
                          )}
                        </td>
                        <td className={cn(
                          "px-6 py-4 text-sm font-bold text-right",
                          item.type === 'income' ? "text-emerald-600" : "text-rose-600"
                        )}>
                          {item.type === 'income' ? '+' : '-'}{formatCurrency(item.amount)}
                        </td>
                        <td className="px-6 py-4 text-right">
                          {user.role !== 'cashier' && (
                            <button 
                              onClick={() => setCancellingItem(item)}
                              className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                              title={item.type === 'income' ? "Batalkan Pesanan" : "Hapus Pengeluaran"}
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </td>
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      <AnimatePresence>
        {cancellingItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setCancellingItem(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" 
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-white w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl p-8 space-y-6 text-center"
            >
              <div className="w-16 h-16 bg-rose-100 text-rose-500 rounded-full flex items-center justify-center mx-auto">
                <AlertCircle size={32} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">
                  {cancellingItem.type === 'income' ? 'Batalkan Pesanan?' : 'Hapus Pengeluaran?'}
                </h3>
                <p className="text-slate-500 mt-2">
                  {cancellingItem.type === 'income' 
                    ? 'Tindakan ini akan menghapus transaksi dan mengembalikan stok barang.' 
                    : 'Tindakan ini akan menghapus catatan pengeluaran secara permanen.'}
                </p>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setCancellingItem(null)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-all">Batal</button>
                <button onClick={handleCancelItem} className="flex-1 py-3 bg-rose-500 text-white rounded-xl font-bold shadow-lg shadow-rose-200 hover:bg-rose-600 transition-all">
                  {cancellingItem.type === 'income' ? 'Ya, Batalkan' : 'Ya, Hapus'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isExpenseModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setIsExpenseModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" 
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-white w-full max-w-md rounded-3xl overflow-hidden shadow-2xl"
            >
              <form onSubmit={handleAddExpense} className="p-8 space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-2xl font-bold text-slate-900">Catat Pengeluaran</h3>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Barang Pengeluaran</label>
                  <select required value={selectedExpenseItem} onChange={e => handleExpenseItemChange(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500">
                     <option value="">Pilih barang...</option>
                     {expenseItems.map(item => (
                       <option key={item.id} value={item.id}>{item.name}</option>
                     ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Kuantitas</label>
                    <input type="number" required min="1" value={expQty} onChange={e => setExpQty(Number(e.target.value))} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Harga Satuan</label>
                    <input type="number" required value={expPrice} onChange={e => setExpPrice(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Metode Pembayaran</label>
                  <select value={expPaymentMethod} onChange={e => setExpPaymentMethod(e.target.value as any)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500">
                    <option value="cash">Tunai (Cash)</option>
                    <option value="transfer">Transfer</option>
                  </select>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl flex justify-between items-center border border-slate-100">
                  <span className="font-bold text-slate-600">Total Pengeluaran</span>
                  <span className="text-xl font-black text-rose-600">
                    {formatCurrency(Number(expPrice) * expQty)}
                  </span>
                </div>
                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => setIsExpenseModalOpen(false)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-all">Batal</button>
                  <button type="submit" className="flex-1 py-3 bg-rose-500 text-white rounded-xl font-bold shadow-lg shadow-rose-200 hover:bg-rose-600 transition-all">Simpan Pengeluaran</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isExpenseItemModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsExpenseItemModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" 
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-white w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl z-10"
            >
              <form onSubmit={handleAddExpenseItem} className="p-6 space-y-6">
                <h3 className="text-xl font-bold text-slate-900">Tambah Daftar Barang</h3>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Nama Barang</label>
                  <input required autoFocus value={newExpenseItemName} onChange={e => setNewExpenseItemName(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Misal: Air Galon" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Harga Satuan (Rp)</label>
                  <input required type="number" value={newExpenseItemPrice} onChange={e => setNewExpenseItemPrice(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Misal: 18000" />
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setIsExpenseItemModalOpen(false)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-all">Batal</button>
                  <button type="submit" className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all">Simpan</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
