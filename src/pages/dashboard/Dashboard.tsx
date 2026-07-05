import React, { useState, useEffect } from 'react';
import { Download, Calendar, TrendingUp, TrendingDown, CreditCard, Package, AlertCircle } from 'lucide-react';
import * as XLSX from 'xlsx';
import {
  ResponsiveContainer,
  AreaChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Area
} from 'recharts';
import { cn, formatCurrency, getLocalDateString } from '../../lib/utils';
import { api } from '../../lib/api';
import { Card } from '../../components/Card';
import { StatCard } from '../../components/StatCard';
import { User } from '../../types';

export const Dashboard = ({ user }: { user: User }) => {
  const [cashiers, setCashiers] = useState<User[]>([]);
  const [selectedCashierId, setSelectedCashierId] = useState<string>('');
  const [categories, setCategories] = useState<any[]>([]);
  const [activeCategory, setActiveCategory] = useState<number | 'all'>('all');

  // Mode selection: 'overall' | 'cashier'
  const [mode, setMode] = useState<'overall' | 'cashier'>('overall');

  const defaultEnd = new Date();
  const defaultStart = new Date();
  if (user.role === 'cashier' || user.role === 'gudang') {
    defaultStart.setDate(defaultEnd.getDate() - 7);
  } else {
    defaultStart.setDate(1); // Default to start of month
  }

  const [startDate, setStartDate] = useState(getLocalDateString(defaultStart));
  const [endDate, setEndDate] = useState(getLocalDateString(defaultEnd));
  const [performance, setPerformance] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user.role === 'admin') {
      api.get('/api/users').then((users: User[]) => {
        setCashiers(users.filter(u => u.role === 'cashier'));
      });
    }
    if (user.role === 'gudang') {
      api.get('/api/material-categories').then(setCategories).catch(console.error);
    } else {
      api.get('/api/categories').then(setCategories).catch(console.error);
    }
  }, [user]);

  const fetchPerformance = async () => {
    setLoading(true);
    try {
      let url = user.role === 'gudang'
        ? `/api/reports/warehouse-performance?startDate=${startDate}&endDate=${endDate}`
        : `/api/reports/sales-performance?startDate=${startDate}&endDate=${endDate}`;

      if (user.role === 'cashier') {
        url += `&user_id=${user.id}`;
      } else if (mode === 'cashier' && selectedCashierId) {
        url += `&user_id=${selectedCashierId}`;
      }
      const data = await api.get(url);
      setPerformance(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPerformance();
  }, [startDate, endDate, mode, selectedCashierId]);

  const setQuickFilter = (type: string) => {
    const end = new Date();
    let start = new Date();

    switch (type) {
      case 'today':
        break;
      case 'week':
        start.setDate(end.getDate() - 7);
        break;
      case 'month':
        start.setMonth(end.getMonth() - 1);
        break;
      case 'year':
        start.setFullYear(end.getFullYear() - 1);
        break;
    }

    setStartDate(getLocalDateString(start));
    setEndDate(getLocalDateString(end));
  };

  const handleExport = () => {
    if (!performance) return;
    const activeCashierName = mode === 'cashier' && selectedCashierId
      ? cashiers.find(c => c.id === Number(selectedCashierId))?.username || 'Kasir'
      : 'Keseluruhan';

    if (user.role === 'gudang') {
      const wsData = [
        ['Laporan Performa Pergudangan HDPOS'],
        ['Periode', `${startDate} s/d ${endDate}`],
        [],
        ['Ringkasan Eksekutif'],
        ['Total Pembelian Vendor', performance.totalPurchases],
        ['Total Pengadaan', performance.purchaseCount],
        ['Total Jenis Barang', performance.totalMaterials],
        ['Barang Rendah Stok (<10)', performance.lowStockCount],
        [],
        ['Daftar Pengeluaran Bahan Baku'],
        ['No', 'Nama Bahan', 'Unit Keluar', 'Estimasi Nilai'],
      ];

      performance.bestSellers.forEach((item: any, idx: number) => {
        wsData.push([idx + 1, item.name, item.totalSold, item.revenue]);
      });

      wsData.push([], ['Tren Pembelian Harian'], ['Tanggal', 'Jumlah Pembelian']);
      performance.chartData.forEach((item: any) => {
        wsData.push([item.date, item.total]);
      });

      const ws = XLSX.utils.aoa_to_sheet(wsData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Laporan Pergudangan");
      XLSX.writeFile(wb, `Laporan_Pergudangan_${startDate}_${endDate}.xlsx`);
    } else {
      const wsData = [
        ['Laporan Performa Penjualan HDPOS'],
        ['Tipe Laporan', mode === 'overall' ? 'Performa Keseluruhan' : `Performa Kasir: ${activeCashierName}`],
        ['Periode', `${startDate} s/d ${endDate}`],
        [],
        ['Ringkasan Eksekutif'],
        ['Total Penjualan', performance.totalSales],
        ['Total Transaksi', performance.transactionCount],
        ['Rata-rata Pesanan', performance.averageOrderValue],
        [],
        ['Daftar Produk Terjual'],
        ['No', 'Nama Produk', 'Unit Terjual', 'Pendapatan'],
      ];

      performance.bestSellers.forEach((item: any, idx: number) => {
        wsData.push([idx + 1, item.name, item.totalSold, item.revenue]);
      });

      wsData.push([], ['Tren Penjualan Harian'], ['Tanggal', 'Jumlah Penjualan']);
      performance.chartData.forEach((item: any) => {
        wsData.push([item.date, item.total]);
      });

      const ws = XLSX.utils.aoa_to_sheet(wsData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Laporan Performa");
      XLSX.writeFile(wb, `Laporan_Performa_${mode}_${startDate}_${endDate}.xlsx`);
    }
  };

  const filteredBestSellers = performance?.bestSellers
    ? (user.role === 'gudang'
        ? (activeCategory === 'all'
            ? performance.bestSellers
            : performance.bestSellers.filter((p: any) => p.category_id === activeCategory))
        : performance.bestSellers)
    : [];

  return (
    <div className="p-4 md:p-8 space-y-6 md:space-y-8 overflow-y-auto h-full pb-20 w-full">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">
            {user.role === 'gudang' ? 'Dasbor Gudang' : 'Dashboard Performa'}
          </h1>
          <p className="text-sm md:text-base text-slate-500">
            {user.role === 'gudang'
              ? 'Kelola stok, pantau pengadaan vendor, dan cek laporan gudang.'
              : 'Selamat datang kembali di ringkasan bisnis Anda.'}
          </p>
        </div>
        <div className="flex flex-wrap gap-3 w-full md:w-auto">
          {user.role === 'admin' && (
            <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                onClick={() => setMode('overall')}
                className={cn("px-4 py-2 text-xs font-bold rounded-lg transition-all", mode === 'overall' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-900")}
              >
                Keseluruhan
              </button>
              <button
                onClick={() => setMode('cashier')}
                className={cn("px-4 py-2 text-xs font-bold rounded-lg transition-all", mode === 'cashier' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-900")}
              >
                Per Kasir
              </button>
            </div>
          )}

          <button
            onClick={handleExport}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all shadow-sm"
          >
            <Download size={16} /> Ekspor Laporan
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-4 items-center justify-between bg-white border border-slate-100 p-4 rounded-2xl shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          {user.role === 'admin' && mode === 'cashier' && (
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

          <div className="flex bg-slate-50 border border-slate-200 rounded-xl p-1">
            {[
              { id: 'today', label: 'Hari Ini' },
              { id: 'week', label: 'Minggu Ini' },
              { id: 'month', label: 'Bulan Ini' },
              { id: 'year', label: 'Tahun Ini' }
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setQuickFilter(f.id)}
                className="px-3 py-1.5 text-xs font-bold rounded-lg hover:bg-white/50 text-slate-600 hover:text-slate-955 transition-all"
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2">
          <Calendar size={14} className="text-slate-400" />
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="text-xs font-bold outline-none bg-transparent"
          />
          <span className="text-slate-300 text-xs">s/d</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="text-xs font-bold outline-none bg-transparent"
          />
        </div>
      </div>

      {loading && !performance ? (
        <div className="p-8 text-center text-slate-400 text-sm">Memuat performa...</div>
      ) : performance ? (
        <div className="space-y-6">
          {user.role === 'gudang' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard
                label="Total Pemasukan Stok"
                value={formatCurrency(performance.totalIncome || 0)}
                icon={TrendingUp}
                color="bg-emerald-500"
              />
              <StatCard
                label="Total Pembelian Vendor"
                value={formatCurrency(performance.totalPurchases || 0)}
                icon={TrendingDown}
                color="bg-rose-500"
              />
              <StatCard
                label="Total Jenis Barang"
                value={`${performance.totalMaterials || 0} Barang`}
                icon={Package}
                color="bg-indigo-600"
              />
              <StatCard
                label="Stok Menipis (<10)"
                value={`${performance.lowStockCount || 0} Barang`}
                icon={AlertCircle}
                color="bg-amber-500"
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <StatCard
                label="Total Penjualan"
                value={formatCurrency(Number(performance.openingBalance || 0) + Number(performance.totalSales || 0))}
                icon={TrendingUp}
                color="bg-indigo-600"
              />
              <StatCard
                label="Total Pengeluaran"
                value={formatCurrency(Number(performance.totalExpenses || 0) + Number(performance.totalPromo || 0))}
                icon={TrendingDown}
                color="bg-rose-500"
              />
              <StatCard
                label="Transaksi"
                value={performance.transactionCount}
                icon={CreditCard}
                color="bg-emerald-500"
              />
            </div>
          )}

          <div className={cn("grid grid-cols-1 gap-6", (user.role === 'cashier' || user.role === 'gudang') ? "lg:grid-cols-2" : "lg:grid-cols-1")}>
            <Card>
              <h3 className="text-lg font-bold mb-6">
                {user.role === 'gudang' ? 'Produk' : 'Produk Terjual'}
              </h3>

              {user.role === 'gudang' && (
                <div className="flex gap-2 overflow-x-auto pb-4 no-scrollbar mb-4">
                  <button
                    onClick={() => setActiveCategory('all')}
                    className={cn(
                      "px-3 py-1.5 rounded-lg border text-xs font-bold transition-all shrink-0",
                      activeCategory === 'all'
                        ? "bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-100"
                        : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
                    )}
                  >
                    Semua
                  </button>
                  {categories.map((c: any) => (
                    <button
                      key={c.id}
                      onClick={() => setActiveCategory(c.id)}
                      className={cn(
                        "px-3 py-1.5 rounded-lg border text-xs font-bold transition-all shrink-0",
                        activeCategory === c.id
                          ? "bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-100"
                          : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
                      )}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              )}

              <div className="space-y-6">
                {filteredBestSellers.map((product: any, i: number) => (
                  <div key={i} className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center font-bold text-slate-400">
                      {i + 1}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-slate-900">{product.name}</p>
                      <p className="text-xs text-slate-500">{product.totalSold} unit terjual</p>
                    </div>
                    <p className="text-sm font-bold text-indigo-600">
                      {formatCurrency(product.revenue)}
                    </p>
                  </div>
                ))}
                {filteredBestSellers.length === 0 && (
                  <div className="text-center py-10 text-slate-400">
                    Tidak ada data untuk periode ini.
                  </div>
                )}
              </div>
            </Card>

            {user.role === 'cashier' && performance.cashierStocks && (
              <Card className="flex flex-col h-full">
                <h3 className="text-lg font-bold mb-6">Stok Harian Kasir</h3>
                <div className="space-y-6 overflow-y-auto max-h-[450px] pr-2">
                  {performance.cashierStocks.map((dayRecord: any, dayIdx: number) => (
                    <div key={dayIdx} className="space-y-3 border-b border-slate-100 pb-4 last:border-0 last:pb-0">
                      <div className="flex justify-between items-center bg-slate-50 px-3 py-2 rounded-xl">
                        <span className="text-xs font-bold text-slate-700">{dayRecord.date}</span>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="border-b border-slate-100 text-slate-400 font-bold text-[10px] uppercase tracking-wider">
                              <th className="pb-2">Bahan</th>
                              <th className="pb-2 text-center">Awal</th>
                              <th className="pb-2 text-center">Jual</th>
                              <th className="pb-2 text-center">Retur</th>
                              <th className="pb-2 text-center">Akhir</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {dayRecord.items.map((stock: any, idx: number) => (
                              <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                <td className="py-2.5 font-bold text-slate-800">{stock.material_name}</td>
                                <td className="py-2.5 text-center font-bold text-slate-500">{stock.stock_awal}</td>
                                <td className="py-2.5 text-center font-bold text-amber-600">{stock.terjual}</td>
                                <td className="py-2.5 text-center font-bold text-rose-500">{stock.retur}</td>
                                <td className="py-2.5 text-center font-bold text-indigo-600">{stock.stock_akhir}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                  {performance.cashierStocks.length === 0 && (
                    <div className="text-center py-10 text-slate-400">
                      Belum ada data stok harian.
                    </div>
                  )}
                </div>
              </Card>
            )}

            {user.role === 'gudang' && performance.warehouseStocks && (
              <Card className="flex flex-col h-full">
                <h3 className="text-lg font-bold mb-6">Stok Harian Gudang</h3>
                <div className="space-y-6 overflow-y-auto max-h-[450px] pr-2">
                  {performance.warehouseStocks.map((dayRecord: any, dayIdx: number) => (
                    <div key={dayIdx} className="space-y-3 border-b border-slate-100 pb-4 last:border-0 last:pb-0">
                      <div className="flex justify-between items-center bg-slate-50 px-3 py-2 rounded-xl">
                        <span className="text-xs font-bold text-slate-700">{dayRecord.date}</span>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="border-b border-slate-100 text-slate-400 font-bold text-[10px] uppercase tracking-wider">
                              <th className="pb-2">Bahan</th>
                              <th className="pb-2 text-center">Awal</th>
                              <th className="pb-2 text-center">Keluar</th>
                              <th className="pb-2 text-center">Retur</th>
                              <th className="pb-2 text-center">Akhir</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {dayRecord.items.map((stock: any, idx: number) => (
                              <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                <td className="py-2.5 font-bold text-slate-800">{stock.material_name}</td>
                                <td className="py-2.5 text-center font-bold text-slate-500">{stock.stock_awal}</td>
                                <td className="py-2.5 text-center font-bold text-amber-600">{stock.terjual}</td>
                                <td className="py-2.5 text-center font-bold text-rose-500">{stock.retur}</td>
                                <td className="py-2.5 text-center font-bold text-indigo-600">{stock.stock_akhir}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                  {performance.warehouseStocks.length === 0 && (
                    <div className="text-center py-10 text-slate-400">
                      Belum ada data stok harian.
                    </div>
                  )}
                </div>
              </Card>
            )}
          </div>

          <Card className="w-full">
            <h3 className="text-lg font-bold mb-6">
              {user.role === 'gudang' ? 'Tren Keuangan Gudang (Arus Kas)' : 'Tren Penjualan'}
            </h3>
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={performance.chartData}>
                  <defs>
                    <linearGradient id="colorPerfDashboard" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1} />
                      <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.1} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.1} />
                      <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="date"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#64748b', fontSize: 12 }}
                    tickFormatter={(tick) => {
                      try {
                        const d = new Date(tick);
                        if (isNaN(d.getTime())) return tick;
                        const year = d.getFullYear();
                        const month = String(d.getMonth() + 1).padStart(2, '0');
                        const day = String(d.getDate()).padStart(2, '0');
                        return `${year}-${month}-${day}`;
                      } catch (e) {
                        return tick;
                      }
                    }}
                  />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} tickFormatter={(v) => `Rp${v / 1000}k`} />
                  <Tooltip
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    formatter={(v: number) => formatCurrency(v)}
                  />
                  {user.role === 'gudang' ? (
                    <>
                      <Area type="monotone" dataKey="income" name="Pemasukan" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorIncome)" />
                      <Area type="monotone" dataKey="expense" name="Pengeluaran" stroke="#f43f5e" strokeWidth={3} fillOpacity={1} fill="url(#colorExpense)" />
                    </>
                  ) : (
                    <Area type="monotone" dataKey="total" name="Penjualan" stroke="#4f46e5" strokeWidth={3} fillOpacity={1} fill="url(#colorPerfDashboard)" />
                  )}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      ) : null}
    </div>
  );
};
