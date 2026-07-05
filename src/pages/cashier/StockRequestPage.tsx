import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, Trash2, Calendar, Save } from 'lucide-react';
import { cn, formatCurrency } from '../../lib/utils';
import { api } from '../../lib/api';
import { Card } from '../../components/Card';
import { User, InventoryMaterial } from '../../types';

export const StockRequestPage = ({
  user,
  activeRegister,
  setActiveTab,
  mode
}: {
  user: User;
  activeRegister?: any;
  setActiveTab: (tab: string) => void;
  mode?: 'input' | 'request';
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'input' | 'request'>(mode || 'input');

  useEffect(() => {
    if (mode) {
      setActiveSubTab(mode);
    }
  }, [mode]);
  const [materials, setMaterials] = useState<InventoryMaterial[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [categories, setCategories] = useState<any[]>([]);
  const [activeCategory, setActiveCategory] = useState<number | 'all'>('all');
  const [selectedMaterialId, setSelectedMaterialId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [paymentMethodSR, setPaymentMethodSR] = useState<'cash' | 'transfer'>('cash');

  // State for cashier stock request drafts
  const [requestDraft, setRequestDraft] = useState<{
    material_id: number;
    name: string;
    quantity: number;
    unit: string;
    price: number;
    total_price: number;
    payment_method: 'cash' | 'transfer';
  }[]>([]);

  // State for cashier stock inputs
  const [stockInputs, setStockInputs] = useState<{
    [materialId: number]: {
      stock_awal: number;
      masuk: number;
      terpakai: number;
      terbuang: number;
      sisa_stock?: number;
    }
  }>({});
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const mats = await api.get(`/api/inventory-materials?user_id=${user.id}`);
      setMaterials(mats);

      let reqUrl = `/api/stock-requests?user_id=${user.id}`;
      if (filterStartDate) {
        reqUrl += `&startDate=${filterStartDate}`;
      }
      if (filterEndDate) {
        reqUrl += `&endDate=${filterEndDate}`;
      }
      const reqs = await api.get(reqUrl);
      setRequests(reqs);

      const cats = await api.get('/api/material-categories');
      setCategories(cats);

      if (activeRegister) {
        const savedStocks = await api.get(`/api/cashier-stocks?cash_register_id=${activeRegister.id}`);
        const inputsMap: any = {};

        // Populate existing inputs from DB if any
        if (savedStocks && savedStocks.length > 0) {
          savedStocks.forEach((item: any) => {
            inputsMap[item.material_id] = {
              stock_awal: item.stock_awal,
              masuk: item.masuk,
              terpakai: item.terpakai,
              terbuang: item.terbuang,
              sisa_stock: item.sisa_stock
            };
          });
        } else {
          // Initialize with current material stock as stock_awal
          mats.forEach((m: any) => {
            inputsMap[m.id] = {
              stock_awal: m.stock,
              masuk: 0,
              terpakai: 0,
              terbuang: 0,
              sisa_stock: m.stock
            };
          });
        }
        setStockInputs(inputsMap);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeRegister, filterStartDate, filterEndDate]);

  const getMaterialPriority = (name: string): number => {
    const n = name.toLowerCase();
    if (n.includes('ayam mentah')) return 1;
    if (n === 'kulit mentah' || n === 'kulit') return 2;
    if (n === 'beras') return 3;
    if (n.includes('ayam pb') || n.includes('goreng ayam pb') || n.includes('ayam goreng pb') || n === 'pb') return 4;
    if (n.includes('ayam pk') || n.includes('goreng ayam pk') || n.includes('ayam goreng pk') || n === 'pk') return 5;
    if (n === 'goreng kulit') return 6;
    if (n === 'nasi') return 7;
    if (n.includes('oil') || n.includes('chili')) return 8;
    if (n.includes('geprek')) return 9;
    return 100;
  };

  const getDisplayName = (name: string): string => {
    const n = name.toLowerCase();
    if (n === 'ayam pb') return 'Goreng Ayam PB';
    if (n === 'ayam pk') return 'Goreng Ayam PK';
    if (n === 'saus oil') return 'S. Chili oil';
    if (n === 'saus geprek') return 'S. Geprek';
    if (n === 'kulit') return 'Kulit Mentah';
    return name;
  };

  const sortedMaterials = [...materials].sort((a, b) => {
    return getMaterialPriority(a.name) - getMaterialPriority(b.name);
  });

  const filteredMaterials = sortedMaterials.filter(material => {
    return activeCategory === 'all' || material.category_id === activeCategory;
  });

  const handleInputChange = (materialId: number, field: string, val: number) => {
    setStockInputs(prev => ({
      ...prev,
      [materialId]: {
        ...prev[materialId],
        [field]: val
      }
    }));
  };

  const handleSaveStock = async () => {
    if (!activeRegister) return;
    setSubmitting(true);
    try {
      const items = materials.map(m => {
        const input = stockInputs[m.id] || { stock_awal: m.stock, masuk: 0, terpakai: 0, terbuang: 0, sisa_stock: m.stock };

        const stock_awal = Number(input.stock_awal || 0);
        const terpakai = Number(input.terpakai || 0); // terjual
        const terbuang = Number(input.terbuang || 0); // retur
        const masuk = 0; // no masuk column in this view
        const sisa_stock = stock_awal - terpakai - terbuang;

        return {
          material_id: m.id,
          stock_awal,
          masuk,
          terpakai,
          terbuang,
          sisa_stock
        };
      });

      await api.post('/api/cashier-stocks', {
        cash_register_id: activeRegister.id,
        user_id: user.id,
        items
      });
      alert('Stok harian kasir berhasil disimpan!');
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Gagal menyimpan stok');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddToDraft = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMaterialId || !quantity) return;
    const matId = Number(selectedMaterialId);
    const qty = Number(quantity);
    if (qty <= 0) {
      alert('Kuantitas harus lebih besar dari 0');
      return;
    }
    const material = materials.find(m => m.id === matId);
    if (!material) return;

    const itemPrice = material.price || 0;

    setRequestDraft(prev => {
      const existingIdx = prev.findIndex(item => item.material_id === matId && item.payment_method === paymentMethodSR);
      if (existingIdx > -1) {
        const updated = [...prev];
        updated[existingIdx].quantity += qty;
        updated[existingIdx].total_price = updated[existingIdx].quantity * itemPrice;
        return updated;
      }
      return [...prev, {
        material_id: matId,
        name: material.name,
        quantity: qty,
        unit: material.unit,
        price: itemPrice,
        total_price: qty * itemPrice,
        payment_method: paymentMethodSR
      }];
    });

    setSelectedMaterialId('');
    setQuantity('');
  };

  const handleRemoveFromDraft = (index: number) => {
    setRequestDraft(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmitAllRequests = async () => {
    if (requestDraft.length === 0) return;
    setSubmitting(true);
    try {
      const payload = {
        user_id: user.id,
        items: requestDraft.map(item => ({
          material_id: item.material_id,
          quantity: item.quantity,
          price: item.price,
          total_price: item.total_price,
          payment_method: item.payment_method
        }))
      };
      await api.post('/api/stock-requests', payload);
      alert('Semua permintaan stok berhasil dikirim!');
      setRequestDraft([]);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Gagal mengirim permintaan stok');
    } finally {
      setSubmitting(false);
    }
  };

  const title = mode === 'request' ? 'Outlet Request' : 'Stok Barang';
  const subtitle = mode === 'request'
    ? 'Ajukan permintaan stok baru.'
    : mode === 'input'
    ? 'Isi stok harian Anda.'
    : 'Isi stok harian Anda dan ajukan permintaan stok baru.';

  return (
    <div className="p-4 md:p-8 space-y-6 md:space-y-8 w-full">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900">{title}</h1>
        <p className="text-sm md:text-base text-slate-500">{subtitle}</p>
      </div>

      {/* Navigation sub-tabs */}
      {!mode && (
        <div className="flex bg-slate-100 p-1.5 rounded-2xl w-full max-w-md border border-slate-200 shadow-sm">
          <button
            onClick={() => setActiveSubTab('input')}
            className={cn(
              "flex-1 py-3 text-xs md:text-sm font-bold rounded-xl transition-all whitespace-nowrap",
              activeSubTab === 'input' ? "bg-white text-indigo-600 shadow-md" : "text-slate-500 hover:text-slate-800"
            )}
          >
            Input Stok
          </button>
          <button
            onClick={() => setActiveSubTab('request')}
            className={cn(
              "flex-1 py-3 text-xs md:text-sm font-bold rounded-xl transition-all whitespace-nowrap",
              activeSubTab === 'request' ? "bg-white text-indigo-600 shadow-md" : "text-slate-500 hover:text-slate-800"
            )}
          >
            Outlet Request
          </button>
        </div>
      )}

      {activeSubTab === 'input' && (
        <>
          {!activeRegister ? (
            <Card className="flex flex-col items-center justify-center p-12 text-center border-dashed border-2 border-slate-200 bg-slate-50/50">
              <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-500 mb-4 shadow-sm">
                <AlertCircle size={32} />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">Kasir Belum Dibuka</h3>
              <p className="text-slate-500 text-sm max-w-sm mb-6">Anda harus membuka sesi kasir terlebih dahulu untuk dapat menginputkan stok harian.</p>
              <button
                onClick={() => setActiveTab('pos')}
                className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all"
              >
                Buka Kasir Sekarang
              </button>
            </Card>
          ) : (
            <div className="space-y-6">
              {/* Category Filter Tabs */}
              {categories.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Kategori Produk</h3>
                  <div className="flex gap-2.5 overflow-x-auto pb-2 no-scrollbar">
                    <button
                      onClick={() => setActiveCategory('all')}
                      className={cn(
                        "px-5 py-3 rounded-xl border font-bold text-xs transition-all shrink-0 min-w-[100px] text-center cursor-pointer",
                        activeCategory === 'all'
                          ? "bg-indigo-600 border-indigo-650 text-white shadow-md shadow-indigo-100"
                          : "bg-white border-slate-200 text-slate-650 hover:bg-slate-50"
                      )}
                    >
                      Semua
                    </button>
                    {categories.map(c => (
                      <button
                        key={c.id}
                        onClick={() => setActiveCategory(c.id)}
                        className={cn(
                          "px-5 py-3 rounded-xl border font-bold text-xs transition-all shrink-0 min-w-[100px] text-center cursor-pointer",
                          activeCategory === c.id
                            ? "bg-indigo-600 border-indigo-650 text-white shadow-md shadow-indigo-100"
                            : "bg-white border-slate-200 text-slate-650 hover:bg-slate-50"
                        )}
                      >
                        {c.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Lembar Cek Checklist Table */}
              <Card className="overflow-hidden p-0 border border-slate-100 shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left min-w-[700px]">
                    <thead className="bg-slate-50 border-b border-slate-100">
                      <tr>
                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Nama Barang</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-center w-32">Stock Awal</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-center w-32">Terjual</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-center w-32">Retur</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right w-36">Stock Akhir</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredMaterials.map(material => {
                        const inputs = stockInputs[material.id] || { stock_awal: material.stock, masuk: 0, terpakai: 0, terbuang: 0, sisa_stock: material.stock };

                        // Formula: Stock Akhir = Stock Awal - Terjual (terpakai) - Retur (terbuang)
                        const stockAkhir = Number(inputs.stock_awal || 0) - Number(inputs.terpakai || 0) - Number(inputs.terbuang || 0);

                        return (
                          <tr key={material.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-6 py-4">
                              <p className="font-bold text-slate-900">{getDisplayName(material.name)}</p>
                              <p className="text-xs text-slate-400 font-medium">Satuan: {material.unit}</p>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <input
                                type="number"
                                min="0"
                                placeholder="0"
                                disabled={!material.enable_stok_awal}
                                value={inputs.stock_awal === undefined ? '' : inputs.stock_awal}
                                onChange={(e) => handleInputChange(material.id, 'stock_awal', Number(e.target.value))}
                                className={cn(
                                  "w-24 px-3 py-2 border rounded-xl text-center font-bold outline-none transition-all text-sm",
                                  material.enable_stok_awal
                                    ? "bg-slate-50 border-slate-200 text-slate-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                                    : "bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed opacity-75"
                                )}
                              />
                            </td>
                            <td className="px-6 py-4 text-center">
                              <input
                                type="number"
                                min="0"
                                placeholder="0"
                                value={inputs.terpakai === undefined ? '' : inputs.terpakai}
                                onChange={(e) => handleInputChange(material.id, 'terpakai', Number(e.target.value))}
                                className="w-24 px-3 py-2 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 rounded-xl text-center font-bold text-slate-800 outline-none transition-all text-sm"
                              />
                            </td>
                            <td className="px-6 py-4 text-center">
                              <input
                                type="number"
                                min="0"
                                placeholder="0"
                                value={inputs.terbuang === undefined ? '' : inputs.terbuang}
                                onChange={(e) => handleInputChange(material.id, 'terbuang', Number(e.target.value))}
                                className="w-24 px-3 py-2 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 rounded-xl text-center font-bold text-slate-800 outline-none transition-all text-sm"
                              />
                            </td>
                            <td className="px-6 py-4 text-right font-black text-slate-800 text-sm">
                              <span className={cn(
                                "px-4 py-2 rounded-xl font-black text-sm",
                                stockAkhir < 0 ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-600"
                              )}>
                                {stockAkhir}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                      {filteredMaterials.length === 0 && (
                        <tr>
                          <td colSpan={5} className="text-center py-10 text-slate-400">Belum ada barang stock pada kategori ini.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>

              {materials.length > 0 && (
                <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm flex justify-end">
                  <button
                    onClick={handleSaveStock}
                    disabled={submitting}
                    className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-indigo-200 hover:bg-indigo-700 disabled:opacity-50 transition-all cursor-pointer"
                  >
                    <Save size={18} />
                    {submitting ? 'Menyimpan...' : 'Simpan Stok'}
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {activeSubTab === 'request' && (
        <div className="space-y-6">
          <div className="flex flex-wrap gap-4 items-center bg-white border border-slate-100 p-4 rounded-2xl shadow-sm">
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
            {(filterStartDate || filterEndDate) && (
              <button
                onClick={() => { setFilterStartDate(''); setFilterEndDate(''); }}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-all"
              >
                Reset Filter
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="md:col-span-1 space-y-6">
              <form onSubmit={handleAddToDraft} className="space-y-4">
                <h3 className="font-bold text-lg mb-4 text-slate-800">Ajukan Permintaan</h3>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Pilih Barang</label>
                  <select required value={selectedMaterialId} onChange={e => setSelectedMaterialId(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl">
                    <option value="">Pilih barang...</option>
                    {materials.map(m => (
                      <option key={m.id} value={m.id}>{m.name} (Stok: {m.stock} {m.unit})</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Kuantitas</label>
                    <input required type="number" min="1" value={quantity} onChange={e => setQuantity(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl" placeholder="Jumlah" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Metode Pembayaran</label>
                    <select value={paymentMethodSR} onChange={e => setPaymentMethodSR(e.target.value as any)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl">
                      <option value="cash">Tunai (Cash)</option>
                      <option value="transfer">Transfer</option>
                    </select>
                  </div>
                </div>

                {selectedMaterialId && (
                  (() => {
                    const selMaterial = materials.find(m => m.id === Number(selectedMaterialId));
                    if (!selMaterial) return null;
                    const itemPrice = selMaterial.price || 0;
                    const itemTotal = itemPrice * Number(quantity || 0);
                    return (
                      <div className="p-4 bg-slate-50 rounded-xl space-y-2 border border-slate-100 text-xs">
                        <div className="flex justify-between font-medium text-slate-500">
                          <span>Harga Satuan:</span>
                          <span>{formatCurrency(itemPrice)}</span>
                        </div>
                        <div className="flex justify-between font-bold text-slate-700">
                          <span>Estimasi Total:</span>
                          <span className="text-indigo-600">{formatCurrency(itemTotal)}</span>
                        </div>
                      </div>
                    );
                  })()
                )}

                <button type="submit" className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all">
                  Tambah ke Daftar
                </button>
              </form>

              {requestDraft.length > 0 && (
                <div className="border-t border-slate-100 pt-6 space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="font-bold text-slate-800 text-sm">Daftar Permintaan ({requestDraft.length})</h4>
                    <button
                      onClick={() => setRequestDraft([])}
                      className="text-xs font-semibold text-rose-500 hover:text-rose-700 transition-colors"
                    >
                      Hapus Semua
                    </button>
                  </div>
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1 no-scrollbar">
                    <AnimatePresence>
                      {requestDraft.map((item, idx) => (
                        <motion.div
                          key={`${item.material_id}-${item.payment_method}`}
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                          className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100"
                        >
                          <div className="flex-1">
                            <p className="font-bold text-xs text-slate-900">{item.name}</p>
                            <p className="text-[10px] text-slate-500 font-medium">
                              Jumlah: {item.quantity} {item.unit} • {item.payment_method === 'transfer' ? 'Transfer' : 'Cash'}
                            </p>
                            <p className="text-[10px] font-bold text-indigo-600 mt-1">
                              {formatCurrency(item.price)} x {item.quantity} = {formatCurrency(item.total_price)}
                            </p>
                          </div>
                          <button
                            onClick={() => handleRemoveFromDraft(idx)}
                            className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-rose-50/50 transition-colors shrink-0"
                          >
                            <Trash2 size={14} />
                          </button>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                  <button
                    onClick={handleSubmitAllRequests}
                    disabled={submitting}
                    className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all disabled:opacity-50"
                  >
                    {submitting ? 'Mengirim...' : 'Kirim Semua Permintaan'}
                  </button>
                </div>
              )}
            </Card>

            <Card className="md:col-span-2 p-0 overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Tanggal</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Barang</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Qty</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Harga</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Total</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Metode</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {requests.map(r => (
                    <tr key={r.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 text-sm text-slate-500">{new Date(r.created_at).toLocaleDateString('id-ID')}</td>
                      <td className="px-6 py-4 font-bold text-slate-900">{r.material_name}</td>
                      <td className="px-6 py-4 text-slate-600">
                        {r.status === 'approved' ? (
                          <div className="flex flex-col">
                            <span className="text-xs line-through text-slate-400">Minta: {r.quantity}</span>
                            <span className="text-sm font-bold text-emerald-600">Acc: {r.approved_quantity || r.quantity}</span>
                          </div>
                        ) : (
                          <span className="font-bold">{r.quantity}</span>
                        )}
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-900">{formatCurrency(r.price || 0)}</td>
                      <td className="px-6 py-4 font-bold text-indigo-600">{formatCurrency(r.total_price || 0)}</td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider",
                          r.payment_method === 'transfer' ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"
                        )}>
                          {r.payment_method === 'transfer' ? 'Transfer' : 'Cash'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                          r.status === 'pending' ? "bg-amber-100 text-amber-600" :
                            r.status === 'approved' ? "bg-emerald-100 text-emerald-600" : "bg-rose-100 text-rose-600"
                        )}>
                          {r.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {requests.length === 0 && <tr><td colSpan={7} className="text-center py-6 text-slate-400">Belum ada permintaan</td></tr>}
                </tbody>
              </table>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};
