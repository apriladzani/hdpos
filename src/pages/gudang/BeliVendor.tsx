import React, { useState, useEffect } from 'react';
import { ShoppingCart, Plus, Trash2, Edit } from 'lucide-react';
import { cn, formatCurrency } from '../../lib/utils';
import { api } from '../../lib/api';
import { Card } from '../../components/Card';
import { User, Vendor, VendorItem, InventoryMaterial } from '../../types';

export const BeliVendor = ({ user, onPurchaseSuccess }: { user: User; onPurchaseSuccess?: () => void }) => {
  const [activeBeliTab, setActiveBeliTab] = useState<'transaksi' | 'barang' | 'vendor'>('transaksi');

  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [vendorItems, setVendorItems] = useState<VendorItem[]>([]);
  const [vendorRequests, setVendorRequests] = useState<any[]>([]);
  const [materials, setMaterials] = useState<InventoryMaterial[]>([]);

  // 1. Vendor CRUD States
  const [newVendorCode, setNewVendorCode] = useState('');
  const [newVendorName, setNewVendorName] = useState('');
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [editVendorCode, setEditVendorCode] = useState('');
  const [editVendorName, setEditVendorName] = useState('');
  const [vendorSubmitting, setVendorSubmitting] = useState(false);

  // 2. Vendor Item CRUD States
  const [newItemName, setNewItemName] = useState('');
  const [newItemVendorId, setNewItemVendorId] = useState('');
  const [newItemMaterialId, setNewItemMaterialId] = useState('');
  const [editingVendorItem, setEditingVendorItem] = useState<VendorItem | null>(null);
  const [editItemName, setEditItemName] = useState('');
  const [editItemVendorId, setEditItemVendorId] = useState('');
  const [editItemMaterialId, setEditItemMaterialId] = useState('');
  const [itemSubmitting, setItemSubmitting] = useState(false);

  // 3. Purchase Transaction States
  const [selectedVendorId, setSelectedVendorId] = useState('');
  const [selectedVendorItemId, setSelectedVendorItemId] = useState('');
  const [vendorQty, setVendorQty] = useState('');
  const [vendorPrice, setVendorPrice] = useState('');
  const [vendorPaymentMethod, setVendorPaymentMethod] = useState<'cash' | 'transfer'>('cash');
  const [purchaseSubmitting, setPurchaseSubmitting] = useState(false);

  const fetchData = () => {
    api.get('/api/vendors').then(setVendors).catch(console.error);
    api.get('/api/vendor-items').then(setVendorItems).catch(console.error);
    api.get('/api/vendor-stock-requests').then(setVendorRequests).catch(console.error);
    api.get('/api/inventory-materials').then(setMaterials).catch(console.error);
  };

  useEffect(() => {
    fetchData();
  }, []);

  // --- 1. Vendor CRUD Actions ---
  const handleCreateVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVendorCode || !newVendorName) return alert('Kode dan Nama vendor harus diisi!');
    setVendorSubmitting(true);
    try {
      await api.post('/api/vendors', { code: newVendorCode, name: newVendorName });
      alert('Vendor baru berhasil didaftarkan!');
      setNewVendorCode('');
      setNewVendorName('');
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Gagal menambahkan vendor');
    } finally {
      setVendorSubmitting(false);
    }
  };

  const handleUpdateVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVendor || !editVendorCode || !editVendorName) return;
    setVendorSubmitting(true);
    try {
      await api.put(`/api/vendors/${editingVendor.id}`, { code: editVendorCode, name: editVendorName });
      alert('Vendor berhasil diubah!');
      setEditingVendor(null);
      setEditVendorCode('');
      setEditVendorName('');
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Gagal mengubah vendor');
    } finally {
      setVendorSubmitting(false);
    }
  };

  const handleDeleteVendor = async (id: number) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus vendor ini? Semua barang kustom dari vendor ini juga akan dihapus.')) return;
    try {
      await api.delete(`/api/vendors/${id}`);
      alert('Vendor berhasil dihapus!');
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Gagal menghapus vendor');
    }
  };

  const startEditVendor = (vendor: Vendor) => {
    setEditingVendor(vendor);
    setEditVendorCode(vendor.code);
    setEditVendorName(vendor.name);
  };

  // --- 2. Vendor Item CRUD Actions ---
  const handleCreateVendorItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName || !newItemVendorId || !newItemMaterialId) {
      return alert('Semua kolom barang vendor harus diisi!');
    }
    setItemSubmitting(true);
    try {
      await api.post('/api/vendor-items', {
        name: newItemName,
        vendor_id: Number(newItemVendorId),
        material_id: Number(newItemMaterialId)
      });
      alert('Barang vendor baru berhasil didaftarkan!');
      setNewItemName('');
      setNewItemVendorId('');
      setNewItemMaterialId('');
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Gagal menambahkan barang vendor');
    } finally {
      setItemSubmitting(false);
    }
  };

  const handleUpdateVendorItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVendorItem || !editItemName || !editItemVendorId || !editItemMaterialId) return;
    setItemSubmitting(true);
    try {
      await api.put(`/api/vendor-items/${editingVendorItem.id}`, {
        name: editItemName,
        vendor_id: Number(editItemVendorId),
        material_id: Number(editItemMaterialId)
      });
      alert('Barang vendor berhasil diubah!');
      setEditingVendorItem(null);
      setEditItemName('');
      setEditItemVendorId('');
      setEditItemMaterialId('');
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Gagal mengubah barang vendor');
    } finally {
      setItemSubmitting(false);
    }
  };

  const handleDeleteVendorItem = async (id: number) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus barang vendor ini?')) return;
    try {
      await api.delete(`/api/vendor-items/${id}`);
      alert('Barang vendor berhasil dihapus!');
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Gagal menghapus barang vendor');
    }
  };

  const startEditVendorItem = (item: VendorItem) => {
    setEditingVendorItem(item);
    setEditItemName(item.name);
    setEditItemVendorId(String(item.vendor_id));
    setEditItemMaterialId(String(item.material_id));
  };

  // --- 3. Purchase Transaction Actions ---
  const handleSubmitPurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVendorItemId) return alert('Pilih barang vendor terlebih dahulu!');
    if (!vendorQty || Number(vendorQty) <= 0) return alert('Jumlah Qty harus lebih besar dari 0!');
    if (!vendorPrice || Number(vendorPrice) < 0) return alert('Harga harus valid!');

    setPurchaseSubmitting(true);
    try {
      await api.post('/api/vendor-stock-requests', {
        vendor_item_id: Number(selectedVendorItemId),
        quantity: Number(vendorQty),
        price: Number(vendorPrice),
        payment_method: vendorPaymentMethod
      });
      alert('Pembelian stok dari vendor berhasil dicatat! Kuantitas telah masuk ke stok awal gudang.');
      setSelectedVendorItemId('');
      setVendorQty('');
      setVendorPrice('');
      setVendorPaymentMethod('cash');
      fetchData();
      if (onPurchaseSuccess) onPurchaseSuccess();
    } catch (err: any) {
      alert(err.message || 'Gagal mencatat pembelian vendor');
    } finally {
      setPurchaseSubmitting(false);
    }
  };

  const handleDeletePurchase = async (id: number) => {
    if (!window.confirm('Apakah Anda yakin ingin membatalkan/menghapus pembelian vendor ini? Tindakan ini akan mengembalikan (mengurangi) stok awal gudang.')) return;
    try {
      await api.delete(`/api/vendor-stock-requests/${id}`);
      alert('Transaksi pembelian vendor berhasil dibatalkan!');
      fetchData();
      if (onPurchaseSuccess) onPurchaseSuccess();
    } catch (err: any) {
      alert(err.message || 'Gagal membatalkan transaksi');
    }
  };

  // Filter vendor items based on selected vendor code
  const filteredVendorItems = selectedVendorId
    ? vendorItems.filter(vi => vi.vendor_id === Number(selectedVendorId))
    : [];

  return (
    <div className="p-4 md:p-8 space-y-6 overflow-y-auto max-h-[calc(100vh-5rem)] font-sans w-full">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900">
            Kelola Pengadaan Beli Vendor
          </h2>
          <p className="text-slate-500 font-medium text-sm mt-1">
            Catat transaksi pembelian kustom, kelola data barang vendor, dan kelola kode vendor.
          </p>
        </div>
      </div>

      {/* Sub-tab navigation inside Beli Page */}
      <div className="flex bg-slate-100 p-1.5 rounded-2xl w-full max-w-xl border border-slate-200 shadow-sm overflow-x-auto">
        <button
          onClick={() => setActiveBeliTab('transaksi')}
          className={cn(
            "flex-1 py-3 text-xs md:text-sm font-bold rounded-xl transition-all whitespace-nowrap px-4",
            activeBeliTab === 'transaksi' ? "bg-white text-indigo-600 shadow-md" : "text-slate-500 hover:text-slate-800"
          )}
        >
          Transaksi Pembelian
        </button>
        <button
          onClick={() => setActiveBeliTab('barang')}
          className={cn(
            "flex-1 py-3 text-xs md:text-sm font-bold rounded-xl transition-all whitespace-nowrap px-4",
            activeBeliTab === 'barang' ? "bg-white text-indigo-600 shadow-md" : "text-slate-500 hover:text-slate-800"
          )}
        >
          Kelola Barang Vendor
        </button>
        <button
          onClick={() => setActiveBeliTab('vendor')}
          className={cn(
            "flex-1 py-3 text-xs md:text-sm font-bold rounded-xl transition-all whitespace-nowrap px-4",
            activeBeliTab === 'vendor' ? "bg-white text-indigo-600 shadow-md" : "text-slate-500 hover:text-slate-800"
          )}
        >
          Kelola Kode Vendor
        </button>
      </div>

      {/* Tab Panels */}
      {activeBeliTab === 'transaksi' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
          {/* Purchase form */}
          <div className="lg:col-span-1 space-y-6">
            <Card className="p-6 space-y-6 border border-slate-100 shadow-sm bg-white">
              <div>
                <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                  <ShoppingCart className="text-indigo-600" size={20} />
                  Catat Pembelian
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-1">Lakukan transaksi pengadaan barang dari vendor.</p>
              </div>

              <form onSubmit={handleSubmitPurchase} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Pilih Vendor</label>
                  <select
                    value={selectedVendorId}
                    onChange={(e) => {
                      setSelectedVendorId(e.target.value);
                      setSelectedVendorItemId('');
                    }}
                    required
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-sm"
                  >
                    <option value="">-- Pilih Vendor --</option>
                    {vendors.map(v => (
                      <option key={v.id} value={v.id}>{v.name} ({v.code})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Pilih Barang Vendor</label>
                  <select
                    value={selectedVendorItemId}
                    onChange={(e) => setSelectedVendorItemId(e.target.value)}
                    required
                    disabled={!selectedVendorId}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-sm disabled:opacity-50"
                  >
                    <option value="">-- Pilih Barang --</option>
                    {filteredVendorItems.map(vi => (
                      <option key={vi.id} value={vi.id}>
                        {vi.name} &rarr; Mapped: {vi.material_name || '-'}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Jumlah (Qty)</label>
                    <input
                      type="number"
                      min="1"
                      value={vendorQty}
                      onChange={(e) => setVendorQty(e.target.value)}
                      required
                      placeholder="0"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-semibold text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Harga Beli Satuan</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">Rp</span>
                      <input
                        type="number"
                        min="0"
                        value={vendorPrice}
                        onChange={(e) => setVendorPrice(e.target.value)}
                        required
                        placeholder="0"
                        className="w-full pl-9 pr-3 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-semibold text-sm"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Metode Pembayaran</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setVendorPaymentMethod('cash')}
                      className={cn(
                        "py-3 rounded-xl font-bold text-xs border transition-all",
                        vendorPaymentMethod === 'cash'
                          ? "bg-indigo-50 border-indigo-500 text-indigo-600 shadow-sm"
                          : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
                      )}
                    >
                      CASH
                    </button>
                    <button
                      type="button"
                      onClick={() => setVendorPaymentMethod('transfer')}
                      className={cn(
                        "py-3 rounded-xl font-bold text-xs border transition-all",
                        vendorPaymentMethod === 'transfer'
                          ? "bg-indigo-50 border-indigo-500 text-indigo-600 shadow-sm"
                          : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
                      )}
                    >
                      TRANSFER
                    </button>
                  </div>
                </div>

                {Number(vendorQty) > 0 && Number(vendorPrice) > 0 && (
                  <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100 flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-500">Total Pengeluaran:</span>
                    <span className="font-extrabold text-indigo-600 text-base">
                      {formatCurrency(Number(vendorQty) * Number(vendorPrice))}
                    </span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={purchaseSubmitting}
                  className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all disabled:opacity-50"
                >
                  {purchaseSubmitting ? 'Memproses...' : 'Catat Pembelian Vendor'}
                </button>
              </form>
            </Card>
          </div>

          {/* History Column */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-slate-100 p-4 rounded-2xl flex items-center justify-between border border-slate-200 shadow-sm">
              <div>
                <h3 className="font-bold text-slate-900 text-sm md:text-base">Riwayat Pembelian Vendor</h3>
                <p className="text-xs text-slate-500 font-medium">Histori pengadaan barang yang terintegrasi dengan stok awal</p>
              </div>
              <span className="px-3 py-1 bg-white rounded-xl shadow-sm text-xs font-bold text-slate-700">
                {vendorRequests.length} Transaksi
              </span>
            </div>

            <Card className="p-0 overflow-hidden border border-slate-100 shadow-sm bg-white">
              <div className="overflow-x-auto max-h-[500px]">
                <table className="w-full text-left min-w-[700px]">
                  <thead className="bg-slate-50 border-b border-slate-100 sticky top-0">
                    <tr>
                      <th className="px-6 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Tanggal</th>
                      <th className="px-6 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Barang & Vendor</th>
                      <th className="px-6 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider text-center">Jumlah (Qty)</th>
                      <th className="px-6 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Harga Satuan</th>
                      <th className="px-6 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Total Harga</th>
                      <th className="px-6 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {vendorRequests.map((req) => (
                      <tr key={req.id} className="hover:bg-slate-50/50 transition-colors text-sm">
                        <td className="px-6 py-3 font-semibold text-slate-500 text-xs">
                          {new Date(req.created_at).toLocaleString('id-ID')}
                        </td>
                        <td className="px-6 py-3">
                          <p className="font-bold text-slate-900">{req.vendor_item_name || req.material_name}</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">
                            Vendor: {req.vendor_name || '-'} ({req.vendor_code || '-'}) | Map: {req.material_name || '-'}
                          </p>
                        </td>
                        <td className="px-6 py-3 text-center font-semibold text-slate-700">
                          {req.quantity} {req.unit}
                        </td>
                        <td className="px-6 py-3 text-right font-semibold text-slate-955">
                          {formatCurrency(req.price)}
                        </td>
                        <td className="px-6 py-3 text-right font-bold text-indigo-600">
                          {formatCurrency(req.total_price)}
                        </td>
                        <td className="px-6 py-3 text-center">
                          <button
                            onClick={() => handleDeletePurchase(req.id)}
                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                            title="Batalkan / Hapus Transaksi"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {vendorRequests.length === 0 && (
                      <tr>
                        <td colSpan={6} className="text-center py-10 text-slate-400">Belum ada riwayat pembelian vendor.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        </div>
      )}

      {activeBeliTab === 'barang' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
          {/* Vendor Item CRUD form */}
          <div className="lg:col-span-1 space-y-6">
            <Card className="p-6 space-y-6 border border-slate-100 shadow-sm bg-white">
              <div>
                <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                  <Plus className="text-indigo-600" size={20} />
                  {editingVendorItem ? 'Edit Barang Vendor' : 'Tambah Barang Vendor'}
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-1">
                  {editingVendorItem ? 'Perbarui informasi barang vendor.' : 'Daftarkan barang vendor kustom baru.'}
                </p>
              </div>

              <form onSubmit={editingVendorItem ? handleUpdateVendorItem : handleCreateVendorItem} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Nama Barang Vendor</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Daging Ayam Fillet"
                    value={editingVendorItem ? editItemName : newItemName}
                    onChange={(e) => editingVendorItem ? setEditItemName(e.target.value) : setNewItemName(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-semibold text-sm"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Pilih Vendor</label>
                  <select
                    value={editingVendorItem ? editItemVendorId : newItemVendorId}
                    onChange={(e) => editingVendorItem ? setEditItemVendorId(e.target.value) : setNewItemVendorId(e.target.value)}
                    required
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-sm"
                  >
                    <option value="">-- Pilih Vendor --</option>
                    {vendors.map(v => (
                      <option key={v.id} value={v.id}>{v.name} ({v.code})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Hubungkan ke Bahan Gudang</label>
                  <select
                    value={editingVendorItem ? editItemMaterialId : newItemMaterialId}
                    onChange={(e) => editingVendorItem ? setEditItemMaterialId(e.target.value) : setNewItemMaterialId(e.target.value)}
                    required
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-sm"
                  >
                    <option value="">-- Pilih Bahan Gudang --</option>
                    {materials.map(m => (
                      <option key={m.id} value={m.id}>{m.name} ({m.unit})</option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={itemSubmitting}
                    className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm shadow-md hover:bg-indigo-700 transition-all disabled:opacity-50"
                  >
                    {itemSubmitting ? 'Menyimpan...' : (editingVendorItem ? 'Perbarui Barang' : 'Simpan Barang')}
                  </button>
                  {editingVendorItem && (
                    <button
                      type="button"
                      onClick={() => setEditingVendorItem(null)}
                      className="py-3 px-4 bg-slate-100 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-200 transition-all"
                    >
                      Batal
                    </button>
                  )}
                </div>
              </form>
            </Card>
          </div>

          {/* Vendor Items List */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-slate-100 p-4 rounded-2xl flex items-center justify-between border border-slate-200 shadow-sm">
              <div>
                <h3 className="font-bold text-slate-900 text-sm md:text-base">Daftar Barang Vendor</h3>
                <p className="text-xs text-slate-500 font-medium">Semua item vendor terdaftar yang siap dipesan</p>
              </div>
              <span className="px-3 py-1 bg-white rounded-xl shadow-sm text-xs font-bold text-slate-700">
                {vendorItems.length} Item
              </span>
            </div>

            <Card className="p-0 overflow-hidden border border-slate-100 shadow-sm bg-white">
              <div className="overflow-x-auto max-h-[500px]">
                <table className="w-full text-left min-w-[550px]">
                  <thead className="bg-slate-50 border-b border-slate-100 sticky top-0">
                    <tr>
                      <th className="px-6 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Nama Barang</th>
                      <th className="px-6 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Vendor</th>
                      <th className="px-6 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Bahan Gudang Terhubung</th>
                      <th className="px-6 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {vendorItems.map(item => (
                      <tr key={item.id} className="hover:bg-slate-50/50 transition-colors text-sm">
                        <td className="px-6 py-3 font-bold text-slate-900">{item.name}</td>
                        <td className="px-6 py-3">
                          <p className="font-semibold text-slate-700">{item.vendor_name}</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase">Code: {item.vendor_code}</p>
                        </td>
                        <td className="px-6 py-3">
                          <span className="px-2.5 py-1 bg-indigo-50 text-indigo-600 rounded-lg font-semibold text-xs">
                            {item.material_name || '-'} ({item.unit || ''})
                          </span>
                        </td>
                        <td className="px-6 py-3 text-center flex justify-center gap-2">
                          <button
                            onClick={() => startEditVendorItem(item)}
                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                            title="Edit Barang"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteVendorItem(item.id)}
                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                            title="Hapus Barang"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {vendorItems.length === 0 && (
                      <tr>
                        <td colSpan={4} className="text-center py-10 text-slate-400">Belum ada barang vendor yang terdaftar.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        </div>
      )}

      {activeBeliTab === 'vendor' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
          {/* Vendor CRUD form */}
          <div className="lg:col-span-1 space-y-6">
            <Card className="p-6 space-y-6 border border-slate-100 shadow-sm bg-white">
              <div>
                <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                  <Plus className="text-indigo-600" size={20} />
                  {editingVendor ? 'Edit Kode Vendor' : 'Daftarkan Kode Vendor'}
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-1">
                  {editingVendor ? 'Perbarui informasi kode dan nama vendor.' : 'Daftarkan kode vendor baru ke sistem.'}
                </p>
              </div>

              <form onSubmit={editingVendor ? handleUpdateVendor : handleCreateVendor} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Kode Vendor</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: VND-AYM-01"
                    disabled={!!editingVendor}
                    value={editingVendor ? editVendorCode : newVendorCode}
                    onChange={(e) => editingVendor ? setEditVendorCode(e.target.value) : setNewVendorCode(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-semibold text-sm disabled:opacity-50"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Nama Vendor</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: PT. Ayam Sejahtera"
                    value={editingVendor ? editVendorName : newVendorName}
                    onChange={(e) => editingVendor ? setEditVendorName(e.target.value) : setNewVendorName(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-semibold text-sm"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={vendorSubmitting}
                    className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm shadow-md hover:bg-indigo-700 transition-all disabled:opacity-50"
                  >
                    {vendorSubmitting ? 'Menyimpan...' : (editingVendor ? 'Perbarui Vendor' : 'Simpan Vendor')}
                  </button>
                  {editingVendor && (
                    <button
                      type="button"
                      onClick={() => setEditingVendor(null)}
                      className="py-3 px-4 bg-slate-100 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-200 transition-all"
                    >
                      Batal
                    </button>
                  )}
                </div>
              </form>
            </Card>
          </div>

          {/* Vendors List */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-slate-100 p-4 rounded-2xl flex items-center justify-between border border-slate-200 shadow-sm">
              <div>
                <h3 className="font-bold text-slate-900 text-sm md:text-base">Daftar Kode Vendor</h3>
                <p className="text-xs text-slate-500 font-medium">Semua data vendor kustom terdaftar</p>
              </div>
              <span className="px-3 py-1 bg-white rounded-xl shadow-sm text-xs font-bold text-slate-700">
                {vendors.length} Vendor
              </span>
            </div>

            <Card className="p-0 overflow-hidden border border-slate-100 shadow-sm bg-white">
              <div className="overflow-x-auto max-h-[500px]">
                <table className="w-full text-left min-w-[500px]">
                  <thead className="bg-slate-50 border-b border-slate-100 sticky top-0">
                    <tr>
                      <th className="px-6 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Kode Vendor</th>
                      <th className="px-6 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Nama Vendor</th>
                      <th className="px-6 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Tanggal Daftar</th>
                      <th className="px-6 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {vendors.map(v => (
                      <tr key={v.id} className="hover:bg-slate-50/50 transition-colors text-sm">
                        <td className="px-6 py-3 font-semibold text-slate-700">{v.code}</td>
                        <td className="px-6 py-3 font-bold text-slate-900">{v.name}</td>
                        <td className="px-6 py-3 text-slate-500 text-xs">
                          {new Date(v.created_at).toLocaleDateString('id-ID')}
                        </td>
                        <td className="px-6 py-3 text-center flex justify-center gap-2">
                          <button
                            onClick={() => startEditVendor(v)}
                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                            title="Edit Vendor"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteVendor(v.id)}
                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                            title="Hapus Vendor"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {vendors.length === 0 && (
                      <tr>
                        <td colSpan={4} className="text-center py-10 text-slate-400">Belum ada vendor terdaftar.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};
