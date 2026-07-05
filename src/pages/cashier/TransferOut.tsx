import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Send, Calendar, User, Package, RefreshCw, CheckCircle2, Check, X as XIcon, Inbox } from 'lucide-react';
import { cn, formatCurrency } from '../../lib/utils';
import { api } from '../../lib/api';
import { Card } from '../../components/Card';
import { User as UserType, InventoryMaterial } from '../../types';

export const TransferOut = ({
  user
}: {
  user: UserType;
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'transfer_out' | 'penerimaan'>('transfer_out');
  const [materials, setMaterials] = useState<InventoryMaterial[]>([]);
  const [outlets, setOutlets] = useState<UserType[]>([]);
  const [transfersOut, setTransfersOut] = useState<any[]>([]);
  const [transfersIn, setTransfersIn] = useState<any[]>([]);

  const [selectedOutletId, setSelectedOutletId] = useState('');
  const [selectedMaterialId, setSelectedMaterialId] = useState('');
  const [quantity, setQuantity] = useState('');

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const fetchData = async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      // 1. Fetch materials with stock for current cashier user
      const mats = await api.get(`/api/inventory-materials?user_id=${user.id}`);
      setMaterials(mats);

      // 2. Fetch all users to filter other cashiers
      const allUsers = await api.get('/api/users');
      const filteredOutlets = allUsers.filter(
        (u: UserType) => u.role === 'cashier' && u.id !== user.id
      );
      setOutlets(filteredOutlets);

      // 3. Fetch outgoing transfers
      const outHistory = await api.get(`/api/stock-transfers?sender_id=${user.id}`);
      setTransfersOut(outHistory);

      // 4. Fetch incoming transfers
      const inHistory = await api.get(`/api/stock-transfers?receiver_id=${user.id}`);
      setTransfersIn(inHistory);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Gagal memuat data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!selectedOutletId || !selectedMaterialId || !quantity) {
      setErrorMessage('Semua kolom wajib diisi.');
      return;
    }

    const qty = Number(quantity);
    if (qty <= 0) {
      setErrorMessage('Kuantitas harus lebih besar dari 0.');
      return;
    }

    const material = materials.find(m => m.id === Number(selectedMaterialId));
    if (!material) {
      setErrorMessage('Barang tidak ditemukan.');
      return;
    }

    if (material.stock < qty) {
      setErrorMessage(`Stok tidak mencukupi. Stok saat ini: ${material.stock} ${material.unit}`);
      return;
    }

    setSubmitting(true);
    try {
      const response = await api.post('/api/stock-transfers', {
        sender_id: user.id,
        receiver_id: Number(selectedOutletId),
        material_id: Number(selectedMaterialId),
        quantity: qty
      });

      setSuccessMessage(response.message || 'Transfer stok berhasil dikirim!');
      setSelectedMaterialId('');
      setQuantity('');
      fetchData();
    } catch (err: any) {
      setErrorMessage(err.message || 'Gagal melakukan transfer stok.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleProcessTransfer = async (transferId: number, status: 'approved' | 'rejected') => {
    setErrorMessage('');
    setSuccessMessage('');
    setSubmitting(true);
    try {
      const response = await api.put(`/api/stock-transfers/${transferId}/status`, { status });
      setSuccessMessage(response.message || `Transfer stok berhasil ${status === 'approved' ? 'diterima' : 'ditolak'}!`);
      fetchData();
    } catch (err: any) {
      setErrorMessage(err.message || 'Gagal memproses transfer stok.');
    } finally {
      setSubmitting(false);
    }
  };

  // Find selected material stock to display
  const selectedMaterial = materials.find(m => m.id === Number(selectedMaterialId));

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return (
          <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-[10px] font-bold uppercase tracking-wider">
            Disetujui
          </span>
        );
      case 'rejected':
        return (
          <span className="px-2.5 py-1 bg-rose-100 text-rose-750 rounded-lg text-[10px] font-bold uppercase tracking-wider">
            Ditolak
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 bg-amber-100 text-amber-700 rounded-lg text-[10px] font-bold uppercase tracking-wider">
            Pending
          </span>
        );
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-6 md:space-y-8 w-full overflow-y-auto pb-20">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Tosser</h1>
          <p className="text-sm md:text-base text-slate-500">Kirim stok ke outlet lain dan kelola penerimaan stok masuk.</p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="p-3 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
          title="Segarkan data"
        >
          <RefreshCw size={18} className={cn(loading && "animate-spin")} />
        </button>
      </div>

      {/* Navigation sub-tabs */}
      <div className="flex bg-slate-100 p-1.5 rounded-2xl w-full max-w-md border border-slate-200 shadow-sm">
        <button
          onClick={() => { setActiveSubTab('transfer_out'); setErrorMessage(''); setSuccessMessage(''); }}
          className={cn(
            "flex-1 py-3 text-xs md:text-sm font-bold rounded-xl transition-all whitespace-nowrap",
            activeSubTab === 'transfer_out' ? "bg-white text-indigo-600 shadow-md" : "text-slate-500 hover:text-slate-800"
          )}
        >
          Tosser Out
        </button>
        <button
          onClick={() => { setActiveSubTab('penerimaan'); setErrorMessage(''); setSuccessMessage(''); }}
          className={cn(
            "flex-1 py-3 text-xs md:text-sm font-bold rounded-xl transition-all whitespace-nowrap",
            activeSubTab === 'penerimaan' ? "bg-white text-indigo-600 shadow-md" : "text-slate-500 hover:text-slate-800"
          )}
        >
          Tosser In ({transfersIn.filter(t => t.status === 'pending').length})
        </button>
      </div>

      {errorMessage && (
        <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl text-rose-600 font-bold text-sm">
          {errorMessage}
        </div>
      )}

      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl text-emerald-600 font-bold text-sm flex items-center gap-2">
          <CheckCircle2 size={16} />
          {successMessage}
        </div>
      )}

      {activeSubTab === 'transfer_out' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
          {/* Transfer Form Card */}
          <Card className="lg:col-span-1 space-y-6">
            <form onSubmit={handleTransfer} className="space-y-4">
              <h3 className="font-bold text-lg mb-4 text-slate-800 flex items-center gap-2">
                <Send size={18} className="text-indigo-600" />
                Kirim Stok
              </h3>

              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Pilih Outlet Tujuan</label>
                <select
                  required
                  value={selectedOutletId}
                  onChange={e => setSelectedOutletId(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-sm"
                >
                  <option value="">Pilih outlet tujuan...</option>
                  {outlets.map(o => (
                    <option key={o.id} value={o.id}>{o.username}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Pilih Barang</label>
                <select
                  required
                  value={selectedMaterialId}
                  onChange={e => setSelectedMaterialId(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-sm"
                >
                  <option value="">Pilih barang...</option>
                  {materials.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.name} (Tersedia: {m.stock} {m.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Jumlah Kirim</label>
                <div className="relative">
                  <input
                    required
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={e => setQuantity(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-sm"
                    placeholder="0"
                  />
                  {selectedMaterial && (
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 uppercase">
                      {selectedMaterial.unit}
                    </span>
                  )}
                </div>
              </div>

              {selectedMaterial && (
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-xs space-y-1.5">
                  <div className="flex justify-between font-medium text-slate-500">
                    <span>Nama Barang:</span>
                    <span className="font-bold text-slate-700">{selectedMaterial.name}</span>
                  </div>
                  <div className="flex justify-between font-medium text-slate-500">
                    <span>Sisa Stok Anda:</span>
                    <span className="font-bold text-slate-700">{selectedMaterial.stock} {selectedMaterial.unit}</span>
                  </div>
                  {quantity && Number(quantity) > 0 && (
                    <div className="flex justify-between font-bold text-slate-700 pt-1.5 border-t border-slate-200/60">
                      <span>Stok Setelah Kirim:</span>
                      <span className={cn(
                        selectedMaterial.stock - Number(quantity) < 0 ? "text-rose-600" : "text-emerald-600"
                      )}>
                        {selectedMaterial.stock - Number(quantity)} {selectedMaterial.unit}
                      </span>
                    </div>
                  )}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting || loading}
                className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 disabled:opacity-50 transition-all cursor-pointer flex items-center justify-center gap-2 text-sm"
              >
                <Send size={16} />
                {submitting ? 'Mengirim...' : 'Kirim Transfer'}
              </button>
            </form>
          </Card>

          {/* Outgoing History Card */}
          <Card className="lg:col-span-2 p-0 overflow-hidden">
            <div className="p-6 border-b border-slate-100 bg-white">
              <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                <Calendar size={18} className="text-slate-500" />
                Riwayat Transfer Out
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Tanggal</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Barang</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-center">Jumlah</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Outlet Tujuan</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {transfersOut.map(t => (
                    <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 text-sm text-slate-500">
                        {new Date(t.created_at).toLocaleDateString('id-ID', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-900">{t.material_name}</td>
                      <td className="px-6 py-4 text-center font-bold text-indigo-600 text-sm">
                        {t.quantity} {t.material_unit}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5">
                          <User size={14} className="text-slate-400" />
                          <span className="font-bold text-slate-800 text-sm">{t.receiver_name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {getStatusBadge(t.status)}
                      </td>
                    </tr>
                  ))}
                  {transfersOut.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center py-12 text-slate-400 text-sm font-medium">
                        Belum ada riwayat transfer keluar.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      ) : (
        /* Incoming History & Approval Card */
        <Card className="p-0 overflow-hidden">
          <div className="p-6 border-b border-slate-100 bg-white">
            <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
              <Inbox size={18} className="text-indigo-600" />
              Riwayat Penerimaan & Approval
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Tanggal</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Barang</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-center">Jumlah</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Outlet Pengirim</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-center">Status</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transfersIn.map(t => (
                  <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 text-sm text-slate-500">
                      {new Date(t.created_at).toLocaleDateString('id-ID', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-900">{t.material_name}</td>
                    <td className="px-6 py-4 text-center font-bold text-indigo-600 text-sm">
                      {t.quantity} {t.material_unit}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5">
                        <User size={14} className="text-slate-400" />
                        <span className="font-bold text-slate-800 text-sm">{t.sender_name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {getStatusBadge(t.status)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {t.status === 'pending' ? (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleProcessTransfer(t.id, 'approved')}
                            disabled={submitting}
                            className="px-3 py-1.5 bg-emerald-500 text-white hover:bg-emerald-600 rounded-lg text-xs font-bold flex items-center gap-1 transition-all disabled:opacity-50 cursor-pointer shadow-sm shadow-emerald-100"
                            title="Terima Transfer"
                          >
                            <Check size={14} />
                            Terima
                          </button>
                          <button
                            onClick={() => handleProcessTransfer(t.id, 'rejected')}
                            disabled={submitting}
                            className="px-3 py-1.5 bg-rose-500 text-white hover:bg-rose-600 rounded-lg text-xs font-bold flex items-center gap-1 transition-all disabled:opacity-50 cursor-pointer shadow-sm shadow-rose-100"
                            title="Tolak Transfer"
                          >
                            <XIcon size={14} />
                            Tolak
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 font-medium">Selesai diproses</span>
                      )}
                    </td>
                  </tr>
                ))}
                {transfersIn.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-slate-400 text-sm font-medium">
                      Belum ada riwayat penerimaan barang.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
};
