import React, { useState, useEffect } from 'react';
import { Trash2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { api } from '../../lib/api';
import { Card } from '../../components/Card';
import { User } from '../../types';

export const ReceiptSettingsAdmin = ({ user }: { user: User }) => {
  const [subHeadlines, setSubHeadlines] = useState<any[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);

  // Global Settings States
  const [headline, setHeadline] = useState('@HD fried chicken');
  const [address, setAddress] = useState('Jl. Raya Utama No. 45');
  const [phone, setPhone] = useState('0812-3456-7890');
  const [footerText, setFooterText] = useState('Terima Kasih atas Kunjungan Anda!');
  const [saveLoading, setSaveLoading] = useState(false);

  const fetchSubHeadlines = () => {
    api.get('/api/receipt-sub-headlines').then(setSubHeadlines);
  };

  const fetchGlobalSettings = () => {
    api.get('/api/receipt-settings').then(res => {
      if (res) {
        setHeadline(res.headline || '@HD fried chicken');
        setAddress(res.address || 'Jl. Raya Utama No. 45');
        setPhone(res.phone || '0812-3456-7890');
        setFooterText(res.footer_text || 'Terima Kasih atas Kunjungan Anda!');
      }
    });
  };

  useEffect(() => {
    fetchSubHeadlines();
    fetchGlobalSettings();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    setLoading(true);
    try {
      await api.post('/api/receipt-sub-headlines', { text: text.trim() });
      setText('');
      fetchSubHeadlines();
    } catch (err: any) {
      alert(err.message || 'Gagal menambahkan sub-headline');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm('Hapus sub-headline struk ini?')) {
      try {
        await api.delete(`/api/receipt-sub-headlines/${id}`);
        fetchSubHeadlines();
      } catch (err: any) {
        alert(err.message || 'Gagal menghapus sub-headline');
      }
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveLoading(true);
    try {
      await api.put('/api/receipt-settings', {
        headline,
        address,
        phone,
        footer_text: footerText
      });
      alert('Pengaturan struk berhasil disimpan!');
    } catch (err: any) {
      alert(err.message || 'Gagal menyimpan pengaturan');
    } finally {
      setSaveLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-6 md:space-y-8 pb-20 w-full">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 font-sans">Pengaturan Struk</h1>
        <p className="text-sm md:text-base text-slate-500">Konfigurasi struk belanja lengkap, kelola cabang, dan lihat simulasi cetak secara real-time.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Settings Panel */}
        <div className="lg:col-span-7 space-y-6">
          {/* Header & footer settings */}
          <Card className="p-6 md:p-8">
            <h3 className="font-bold text-lg mb-6 text-slate-800 border-b pb-3">Informasi Umum Struk</h3>
            <form onSubmit={handleSaveSettings} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Headline (Nama Toko/Resto)</label>
                <input 
                  required 
                  value={headline} 
                  onChange={e => setHeadline(e.target.value)} 
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-semibold" 
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Alamat Toko</label>
                  <input 
                    required 
                    value={address} 
                    onChange={e => setAddress(e.target.value)} 
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm" 
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">No. Telepon</label>
                  <input 
                    required 
                    value={phone} 
                    onChange={e => setPhone(e.target.value)} 
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm" 
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Catatan Kaki (Footer Note)</label>
                <textarea 
                  required 
                  rows={2}
                  value={footerText} 
                  onChange={e => setFooterText(e.target.value)} 
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm resize-none" 
                />
              </div>

              <button 
                type="submit" 
                disabled={saveLoading}
                className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-colors disabled:opacity-50 text-sm"
              >
                {saveLoading ? 'Menyimpan...' : 'Simpan Pengaturan Utama'}
              </button>
            </form>
          </Card>

          {/* Branches settings */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="md:col-span-1">
              <form onSubmit={handleAdd} className="space-y-4">
                <h3 className="font-bold text-base mb-2 text-slate-800">Tambah Cabang</h3>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Nama Cabang / Sub-Headline</label>
                  <input 
                    required 
                    value={text} 
                    onChange={e => setText(e.target.value)} 
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-xs" 
                    placeholder="Misal: Cabang Senopati" 
                  />
                </div>
                <button 
                  type="submit" 
                  disabled={loading}
                  className="w-full py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold shadow-md text-xs transition-colors disabled:opacity-50"
                >
                  {loading ? 'Menambahkan...' : 'Tambah Cabang'}
                </button>
              </form>
            </Card>

            <Card className="md:col-span-2 p-0 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left min-w-[400px]">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Nama Cabang (Sub-Headline)</th>
                      <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-right w-20">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {subHeadlines.map(h => (
                      <tr key={h.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-3 font-bold text-slate-900 text-xs">{h.text}</td>
                        <td className="px-4 py-3 text-right">
                          {h.id !== 1 ? (
                            <button 
                              onClick={() => handleDelete(h.id)} 
                              className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                            >
                              <Trash2 size={14} />
                            </button>
                          ) : (
                            <span className="text-[10px] text-slate-400 font-medium px-2">Default</span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {subHeadlines.length === 0 && (
                      <tr>
                        <td colSpan={2} className="text-center py-4 text-slate-400 text-xs">Belum ada cabang</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        </div>

        {/* Live Simulator Preview Panel */}
        <div className="lg:col-span-5 flex flex-col items-center">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Live Receipt Simulator</p>
          <div className="w-full max-w-[340px] bg-white border border-slate-200 rounded-[2rem] p-6 shadow-xl relative overflow-hidden flex flex-col font-sans">
            {/* Paper cut effect header */}
            <div className="absolute top-0 left-0 right-0 h-1 flex justify-around">
              {[...Array(20)].map((_, i) => (
                <div key={i} className="w-2.5 h-2.5 bg-slate-50 rounded-full -translate-y-1.5 border border-slate-200" />
              ))}
            </div>

            <div className="space-y-4 pt-3 flex-1 text-slate-800">
              {/* Receipt Header */}
              <div className="text-center space-y-1.5 border-b border-dashed border-slate-200 pb-4">
                <h4 className="text-lg font-black text-slate-900 leading-tight">{headline}</h4>
                <p className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-0.5 rounded-full inline-block">
                  {subHeadlines.length > 0 ? subHeadlines[0].text : 'Cabang Utama'}
                </p>
                <p className="text-[10px] text-slate-500 font-medium leading-relaxed">{address}</p>
                <p className="text-[10px] text-slate-500 font-medium">Telp: {phone}</p>
                <div className="text-[9px] text-slate-400 font-medium pt-1">
                  #ORD-1024 • {new Date().toLocaleDateString('id-ID')} {new Date().toLocaleTimeString('id-ID', {hour:'2-digit', minute:'2-digit'})}
                </div>
              </div>

              {/* Items */}
              <div className="space-y-3 py-1 text-xs border-b border-dashed border-slate-100">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-bold">2x Paket Fried Chicken Hemat</p>
                    <p className="text-[9px] text-slate-400">@ Rp22.500</p>
                  </div>
                  <p className="font-bold">Rp45.000</p>
                </div>
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-bold">1x Es Teh Manis Jumbo</p>
                    <p className="text-[9px] text-slate-400">@ Rp5.000</p>
                  </div>
                  <p className="font-bold">Rp5.000</p>
                </div>
              </div>

              {/* Billing Info */}
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-500">
                  <span>Subtotal</span>
                  <span className="font-semibold text-slate-700">Rp50.000</span>
                </div>
                <div className="flex justify-between text-rose-500 font-bold">
                  <span>Diskon (Promo 10%)</span>
                  <span>-Rp5.000</span>
                </div>
                <div className="flex justify-between text-sm font-black border-t border-slate-100 pt-2 text-slate-900">
                  <span>TOTAL</span>
                  <span className="text-indigo-600">Rp45.000</span>
                </div>
              </div>

              {/* Cash Info */}
              <div className="border-t border-dashed border-slate-200 pt-3 space-y-1 text-[10px]">
                <div className="flex justify-between">
                  <span className="text-slate-500">Metode</span>
                  <span className="font-bold uppercase">TUNAI</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Diberikan</span>
                  <span className="font-bold">Rp50.000</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Kembali</span>
                  <span className="font-bold">Rp5.000</span>
                </div>
              </div>

              {/* Footer Note */}
              <div className="text-center pt-4 border-t border-dashed border-slate-200">
                <p className="text-[11px] text-slate-600 font-bold leading-relaxed">{footerText}</p>
              </div>
            </div>
            
            {/* Paper cut effect footer */}
            <div className="absolute bottom-0 left-0 right-0 h-1.5 flex justify-around">
              {[...Array(20)].map((_, i) => (
                <div key={i} className="w-3.5 h-3.5 bg-slate-50 rounded-full translate-y-1 border border-slate-200" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
