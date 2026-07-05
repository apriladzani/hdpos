import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, FileText, Trash2, Calendar, Save } from 'lucide-react';
import { cn, formatCurrency } from '../../lib/utils';
import { api } from '../../lib/api';
import { Card } from '../../components/Card';
import { Product, Category, InventoryMaterial, User } from '../../types';

export const Inventory = ({
  user,
  materials,
  setMaterials,
  warehouseStockInputs,
  setWarehouseStockInputs,
  fetchMaterials,
  mode = 'inventory'
}: {
  user: User;
  materials: InventoryMaterial[];
  setMaterials: React.Dispatch<React.SetStateAction<InventoryMaterial[]>>;
  warehouseStockInputs: any;
  setWarehouseStockInputs: any;
  fetchMaterials: () => void;
  mode?: 'inventory' | 'r_n_b' | 'outlet_request';
}) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [materialCategories, setMaterialCategories] = useState<Category[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [cashierStocks, setCashierStocks] = useState<any[]>([]);
  const [cashierRunningStocks, setCashierRunningStocks] = useState<any[]>([]);
  const [activeInventoryTab, setActiveInventoryTab] = useState<'products' | 'materials' | 'input_warehouse' | 'requests' | 'broken' | 'reports'>(() => {
    if (user.role === 'gudang') {
      if (mode === 'r_n_b') return 'broken';
      if (mode === 'outlet_request') return 'requests';
      return 'materials';
    }
    return 'products';
  });

  // Retur & Broken states
  const [selectedCashierId, setSelectedCashierId] = useState('');
  const [selectedReturnMaterialId, setSelectedReturnMaterialId] = useState('');
  const [returnQty, setReturnQty] = useState('');
  const [returnCondition, setReturnCondition] = useState<'layak' | 'tidak_layak'>('layak');
  const [returnSubmitting, setReturnSubmitting] = useState(false);
  const [offlineReturns, setOfflineReturns] = useState<any[]>([]);
  const [approveQuantities, setApproveQuantities] = useState<{ [key: number]: number }>({});

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isMaterialModalOpen, setIsMaterialModalOpen] = useState(false);

  // Edit states
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingMaterial, setEditingMaterial] = useState<any>(null);

  const [newCategoryName, setNewCategoryName] = useState('');
  const [enableStokAwal, setEnableStokAwal] = useState(true);
  const [activeCategory, setActiveCategory] = useState<number | 'all'>('all');
  const [draggedCategoryId, setDraggedCategoryId] = useState<number | null>(null);
  const [draggedRowId, setDraggedRowId] = useState<number | null>(null);

  const [cashiers, setCashiers] = useState<User[]>([]);
  const [selectedCashier, setSelectedCashier] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  // Warehouse specific states
  const [warehouseSubmitting, setWarehouseSubmitting] = useState(false);
  const [vendorRequests, setVendorRequests] = useState<any[]>([]);
  const [selectedVendorMatId, setSelectedVendorMatId] = useState('');
  const [vendorQty, setVendorQty] = useState('');
  const [vendorPrice, setVendorPrice] = useState('');
  const [vendorPaymentMethod, setVendorPaymentMethod] = useState<'cash' | 'transfer'>('cash');
  const [vendorSubmitting, setVendorSubmitting] = useState(false);

  const fetchData = () => {
    api.get('/api/products').then(setProducts);
    api.get('/api/categories').then(setCategories);
    api.get('/api/material-categories').then(setMaterialCategories);
    fetchMaterials();
    if (user.role !== 'cashier') {
      api.get('/api/cashier-running-stocks').then(setCashierRunningStocks);
      api.get('/api/vendor-stock-requests').then(setVendorRequests);
      api.get('/api/offline-returns').then(setOfflineReturns).catch(console.error);
    }
  };

  useEffect(fetchData, []);

  useEffect(() => {
    if (user.role === 'gudang') {
      if (mode === 'r_n_b') {
        setActiveInventoryTab('broken');
      } else if (mode === 'outlet_request') {
        setActiveInventoryTab('requests');
      } else {
        setActiveInventoryTab('materials');
      }
    }
  }, [mode, user.role]);

  useEffect(() => {
    if (user.role !== 'cashier') {
      api.get('/api/users').then((users: User[]) => {
        setCashiers(users.filter(u => u.role === 'cashier'));
      });
    }
  }, [user]);

  const fetchFilteredData = () => {
    if (user.role !== 'cashier') {
      const params = [];
      if (selectedCashier) params.push(`user_id=${selectedCashier}`);
      if (filterStartDate) params.push(`startDate=${filterStartDate}`);
      if (filterEndDate) params.push(`endDate=${filterEndDate}`);
      const queryStr = params.length > 0 ? '?' + params.join('&') : '';

      api.get('/api/stock-requests' + queryStr).then(setRequests);
      api.get('/api/cashier-stocks' + queryStr).then(setCashierStocks);
    }
  };

  useEffect(() => {
    fetchFilteredData();
  }, [selectedCashier, filterStartDate, filterEndDate]);

  // Warehouse specific handlers
  const handleWarehouseInputChange = (materialId: number, field: string, val: number) => {
    setWarehouseStockInputs(prev => ({
      ...prev,
      [materialId]: {
        ...prev[materialId],
        [field]: val
      }
    }));
  };

  const handleSaveWarehouseStock = async () => {
    setWarehouseSubmitting(true);
    try {
      const items = materials.map(m => {
        const input = warehouseStockInputs[m.id] || { stock_awal: m.stock, terjual: 0, retur: 0 };
        const sisa = Number(input.stock_awal) - Number(input.terjual) + Number(input.retur);
        return {
          material_id: m.id,
          stock_awal: Number(input.stock_awal),
          terjual: Number(input.terjual),
          retur: Number(input.retur),
          sisa_stock: sisa
        };
      });

      await api.post('/api/warehouse-stocks', { items });
      alert('Stok harian gudang berhasil disimpan!');
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Gagal menyimpan stok gudang');
    } finally {
      setWarehouseSubmitting(false);
    }
  };

  const handleSubmitOfflineReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCashierId) return alert('Pilih Outlet terlebih dahulu!');
    if (!selectedReturnMaterialId) return alert('Pilih bahan baku terlebih dahulu!');
    if (!returnQty || Number(returnQty) <= 0) return alert('Jumlah harus lebih besar dari 0!');

    const cashierId = Number(selectedCashierId);
    const materialId = Number(selectedReturnMaterialId);
    const qty = Number(returnQty);

    const processReturn = async (addToWarehouseInput: boolean) => {
      setReturnSubmitting(true);
      try {
        await api.post('/api/offline-returns', {
          material_id: materialId,
          cashier_id: cashierId,
          quantity: qty,
          condition_status: returnCondition,
          added_to_input: addToWarehouseInput
        });

        if (addToWarehouseInput) {
          setWarehouseStockInputs(prev => {
            const currentVal = prev[materialId]?.retur || 0;
            return {
              ...prev,
              [materialId]: {
                ...prev[materialId],
                retur: currentVal + qty
              }
            };
          });
          alert(`Retur offline berhasil diproses dan dimasukkan ke input retur gudang!`);
          setActiveInventoryTab('input_warehouse');
        } else {
          alert('Retur offline berhasil dicatat!');
        }

        setSelectedCashierId('');
        setSelectedReturnMaterialId('');
        setReturnQty('');
        setReturnCondition('layak');
        fetchData();
      } catch (err: any) {
        alert(err.message || 'Gagal memproses retur offline');
      } finally {
        setReturnSubmitting(false);
      }
    };

    if (returnCondition === 'layak') {
      const confirmAdd = window.confirm(
        `Barang layak dikembalikan. Apakah Anda yakin ingin memasukkan ${qty} barang ini ke input Retur Stok Gudang?`
      );
      if (confirmAdd) {
        await processReturn(true);
      } else {
        await processReturn(false);
      }
    } else {
      await processReturn(false);
    }
  };

  const handleVendorMaterialChange = (matId: string) => {
    setSelectedVendorMatId(matId);
    if (!matId) {
      setVendorPrice('');
      return;
    }
    const material = materials.find(m => m.id === Number(matId));
    if (material) {
      setVendorPrice(String(material.price || 0));
    } else {
      setVendorPrice('');
    }
  };

  const handleSubmitVendorRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVendorMatId) return alert('Pilih bahan baku terlebih dahulu!');
    if (!vendorQty || Number(vendorQty) <= 0) return alert('Jumlah harus lebih besar dari 0!');
    if (!vendorPrice || Number(vendorPrice) < 0) return alert('Harga harus valid!');

    setVendorSubmitting(true);
    try {
      const qty = Number(vendorQty);
      const prc = Number(vendorPrice);
      const payload = {
        material_id: Number(selectedVendorMatId),
        quantity: qty,
        price: prc,
        total_price: qty * prc,
        payment_method: vendorPaymentMethod
      };

      await api.post('/api/vendor-stock-requests', payload);
      alert('Pembelian stok ke vendor berhasil disimpan!');
      setSelectedVendorMatId('');
      setVendorQty('');
      setVendorPrice('');
      setVendorPaymentMethod('cash');
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Gagal menyimpan pembelian vendor');
    } finally {
      setVendorSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());

    if (editingProduct) {
      await api.put(`/api/products/${editingProduct.id}`, data);
    } else {
      await api.post('/api/products', data);
    }

    setIsModalOpen(false);
    setEditingProduct(null);
    fetchData();
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    const isMaterial = activeInventoryTab === 'materials';
    const endpoint = isMaterial ? '/api/material-categories' : '/api/categories';
    const payload: any = { name: newCategoryName };
    if (isMaterial) {
      payload.enable_stok_awal = enableStokAwal ? 1 : 0;
    }
    if (editingCategory) {
      await api.put(`${endpoint}/${editingCategory.id}`, payload);
    } else {
      await api.post(endpoint, payload);
    }
    setNewCategoryName('');
    setEnableStokAwal(true);
    setEditingCategory(null);
    setIsCategoryModalOpen(false);
    fetchData();
  };

  const handleDelete = async (id: number) => {
    if (confirm("Apakah Anda yakin menghapus produk ini?")) {
      await api.delete(`/api/products/${id}`);
      fetchData();
    }
  };

  const handleDeleteCategory = async (id: number) => {
    if (confirm("Menghapus kategori akan menghapus kaitannya dari produk. Lanjutkan?")) {
      const isMaterial = activeInventoryTab === 'materials';
      const endpoint = isMaterial ? '/api/material-categories' : '/api/categories';
      await api.delete(`${endpoint}/${id}`);
      if (activeCategory === id) setActiveCategory('all');
      fetchData();
    }
  };

  const handleCategoryDragStart = (id: number) => {
    setDraggedCategoryId(id);
  };

  const handleCategoryDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleCategoryDrop = async (e: React.DragEvent, targetId: number) => {
    e.preventDefault();
    if (draggedCategoryId === null || draggedCategoryId === targetId) return;

    const isMaterial = activeInventoryTab === 'materials' || activeInventoryTab === 'input_warehouse';
    const currentCategories = isMaterial ? materialCategories : categories;
    const setCategoriesState = isMaterial ? setMaterialCategories : setCategories;
    const endpoint = isMaterial ? '/api/material-categories/reorder' : '/api/categories/reorder';

    const draggedIndex = currentCategories.findIndex(cat => cat.id === draggedCategoryId);
    const targetIndex = currentCategories.findIndex(cat => cat.id === targetId);
    if (draggedIndex === -1 || targetIndex === -1) return;

    const newCategories = [...currentCategories];
    const [removed] = newCategories.splice(draggedIndex, 1);
    newCategories.splice(targetIndex, 0, removed);

    setCategoriesState(newCategories);

    try {
      const order = newCategories.map(cat => cat.id);
      await api.put(endpoint, { order });
    } catch (err) {
      console.error("Reorder failed:", err);
      fetchData();
    }
    setDraggedCategoryId(null);
  };

  const handleRowDragStart = (id: number) => {
    setDraggedRowId(id);
  };

  const handleRowDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleRowDrop = async (e: React.DragEvent, targetId: number) => {
    e.preventDefault();
    if (draggedRowId === null || draggedRowId === targetId) return;

    const isMaterial = activeInventoryTab === 'materials';
    const currentItems = isMaterial ? materials : products;
    const setItemsState = isMaterial ? setMaterials : setProducts;
    const endpoint = isMaterial ? '/api/inventory-materials/reorder' : '/api/products/reorder';

    const draggedIndex = currentItems.findIndex(item => item.id === draggedRowId);
    const targetIndex = currentItems.findIndex(item => item.id === targetId);
    if (draggedIndex === -1 || targetIndex === -1) return;

    const newItems = [...currentItems];
    const [removed] = newItems.splice(draggedIndex, 1);
    newItems.splice(targetIndex, 0, removed);

    setItemsState(newItems);

    try {
      const order = newItems.map(item => item.id);
      await api.put(endpoint, { order });
    } catch (err) {
      console.error("Reorder rows failed:", err);
      fetchData();
    }
    setDraggedRowId(null);
  };

  const handleSubmitMaterial = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());

    if (editingMaterial) {
      await api.put(`/api/inventory-materials/${editingMaterial.id}`, data);
    } else {
      await api.post('/api/inventory-materials', data);
    }

    setIsMaterialModalOpen(false);
    setEditingMaterial(null);
    fetchData();
  };

  const handleDeleteMaterial = async (id: number) => {
    if (confirm("Apakah Anda yakin menghapus stok produk ini?")) {
      await api.delete(`/api/inventory-materials/${id}`);
      fetchData();
    }
  };

  const handleApproveReject = async (id: number, status: 'approved' | 'rejected') => {
    try {
      const payload: any = { status };
      if (status === 'approved') {
        const approvedQty = approveQuantities[id];
        if (approvedQty !== undefined) {
          payload.approved_quantity = approvedQty;
        }
      }
      const res = await api.put(`/api/stock-requests/${id}`, payload);
      if (res.message) {
        alert(res.message);
      } else {
        alert(`Permintaan stok berhasil di-${status === 'approved' ? 'setujui' : 'tolak'}!`);
      }
      fetchData();
      fetchFilteredData();
    } catch (err: any) {
      alert(err.message || 'Gagal memproses permintaan');
    }
  };

  const displayedProducts = activeCategory === 'all'
    ? products
    : products.filter(p => p.category_id === activeCategory);

  const displayedMaterials = activeCategory === 'all'
    ? materials
    : materials.filter(m => m.category_id === activeCategory);

  // Group stock requests by cashier/account name
  const groupedRequests = requests.reduce((acc: any, req: any) => {
    const key = req.cashier_name || 'Tidak Diketahui';
    if (!acc[key]) acc[key] = [];
    acc[key].push(req);
    return acc;
  }, {});

  // Group cashier stocks by cashier_name and date
  const groupedCashierStocks = cashierStocks.reduce((acc: any, cs: any) => {
    const dateStr = new Date(cs.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    const key = `${cs.cashier_name || 'Tidak Diketahui'} - ${dateStr}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(cs);
    return acc;
  }, {});

  return (
    <div className="p-4 md:p-8 space-y-6 md:space-y-8 w-full">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">
            {user.role === 'gudang' && mode === 'r_n_b' ? 'R&B (Retur & Broken)' :
              user.role === 'gudang' && mode === 'outlet_request' ? 'Outlet Request' :
                'Stok Barang'}
          </h1>
          <p className="text-sm md:text-base text-slate-500">
            {user.role === 'gudang' && mode === 'r_n_b' ? 'Kelola retur barang dan barang rusak dari outlet.' :
              user.role === 'gudang' && mode === 'outlet_request' ? 'Kelola permintaan stok barang dari outlet.' :
                'Kelola produk penjualan outlet and persediaan stok Anda.'}
          </p>
        </div>

        <div className="flex flex-wrap gap-3 w-full md:w-auto">
          {user.role !== 'cashier' && activeInventoryTab === 'products' && (
            <>
              <button
                onClick={() => { setEditingCategory(null); setNewCategoryName(''); setEnableStokAwal(true); setIsCategoryModalOpen(true); }}
                className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 md:px-6 py-2 md:py-3 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-50 transition-all"
              >
                <Plus size={18} /> Kategori
              </button>
              <button
                onClick={() => { setEditingProduct(null); setIsModalOpen(true); }}
                className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 md:px-6 py-2 md:py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all"
              >
                <Plus size={18} /> Produk
              </button>
            </>
          )}

          {user.role !== 'cashier' && activeInventoryTab === 'materials' && (
            <>
              <button
                onClick={() => { setEditingCategory(null); setNewCategoryName(''); setEnableStokAwal(true); setIsCategoryModalOpen(true); }}
                className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 md:px-6 py-2 md:py-3 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-50 transition-all"
              >
                <Plus size={18} /> Kategori
              </button>
              <button
                onClick={() => { setEditingMaterial(null); setIsMaterialModalOpen(true); }}
                className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 md:px-6 py-2 md:py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all"
              >
                <Plus size={18} /> Tambah Produk
              </button>
            </>
          )}
        </div>
      </div>

      {/* Sub-tab navigation for warehouse and admin */}
      {((user.role !== 'gudang') || (user.role === 'gudang' && mode === 'inventory')) && (
        <div className="flex bg-slate-100 p-1.5 rounded-2xl w-full max-w-2xl border border-slate-200 shadow-sm overflow-x-auto">
          {user.role !== 'gudang' && (
            <button
              onClick={() => setActiveInventoryTab('products')}
              className={cn(
                "flex-1 py-3 text-xs md:text-sm font-bold rounded-xl transition-all whitespace-nowrap px-4",
                activeInventoryTab === 'products' ? "bg-white text-indigo-600 shadow-md" : "text-slate-500 hover:text-slate-800"
              )}
            >
              Produk Kasir
            </button>
          )}
          <button
            onClick={() => setActiveInventoryTab('materials')}
            className={cn(
              "flex-1 py-3 text-xs md:text-sm font-bold rounded-xl transition-all whitespace-nowrap px-4",
              activeInventoryTab === 'materials' ? "bg-white text-indigo-600 shadow-md" : "text-slate-500 hover:text-slate-800"
            )}
          >
            {user.role === 'gudang' ? 'Kelola Produk' : 'Stok Produk'}
          </button>
          {user.role === 'gudang' && (
            <button
              onClick={() => setActiveInventoryTab('input_warehouse')}
              className={cn(
                "flex-1 py-3 text-xs md:text-sm font-bold rounded-xl transition-all whitespace-nowrap px-4",
                activeInventoryTab === 'input_warehouse' ? "bg-white text-indigo-600 shadow-md" : "text-slate-500 hover:text-slate-800"
              )}
            >
              Stock Produk
            </button>
          )}
          {user.role !== 'gudang' && (
            <>
              <button
                onClick={() => setActiveInventoryTab('requests')}
                className={cn(
                  "flex-1 py-3 text-xs md:text-sm font-bold rounded-xl transition-all whitespace-nowrap px-4",
                  activeInventoryTab === 'requests' ? "bg-white text-indigo-600 shadow-md" : "text-slate-500 hover:text-slate-800"
                )}
              >
                Permintaan Stok
              </button>
              <button
                onClick={() => setActiveInventoryTab('reports')}
                className={cn(
                  "flex-1 py-3 text-xs md:text-sm font-bold rounded-xl transition-all whitespace-nowrap px-4",
                  activeInventoryTab === 'reports' ? "bg-white text-indigo-600 shadow-md" : "text-slate-500 hover:text-slate-800"
                )}
              >
                Laporan Stok Kasir
              </button>
            </>
          )}
        </div>
      )}

      {(activeInventoryTab === 'requests' || activeInventoryTab === 'reports') && (
        <div className="flex flex-wrap gap-4 items-center bg-white border border-slate-100 p-4 rounded-2xl shadow-sm">
          <select
            value={selectedCashier}
            onChange={e => setSelectedCashier(e.target.value)}
            className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Semua Outlet</option>
            {cashiers.map(c => (
              <option key={c.id} value={c.id}>{c.username}</option>
            ))}
          </select>

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

          {(selectedCashier || filterStartDate || filterEndDate) && (
            <button
              onClick={() => { setSelectedCashier(''); setFilterStartDate(''); setFilterEndDate(''); }}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-all"
            >
              Reset Filter
            </button>
          )}
        </div>
      )}

      {activeInventoryTab === 'products' && (
        <>
          <div className="space-y-4">
            <h3 className="text-lg font-bold">Kategori Produk</h3>
            <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
              <div
                onClick={() => setActiveCategory('all')}
                className={cn("px-6 py-4 rounded-2xl border cursor-pointer transition-all shrink-0 min-w-[120px] flex items-center justify-center", activeCategory === 'all' ? "bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-200" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50")}
              >
                <p className="font-bold">Semua</p>
              </div>
              {categories.map(c => (
                <div
                  key={c.id}
                  draggable={user.role === 'admin' || user.role === 'gudang'}
                  onDragStart={() => handleCategoryDragStart(c.id)}
                  onDragOver={handleCategoryDragOver}
                  onDrop={(e) => handleCategoryDrop(e, c.id)}
                  className={cn("px-6 py-4 rounded-2xl border relative group cursor-grab active:cursor-grabbing transition-all shrink-0 min-w-[120px] flex items-center justify-center", activeCategory === c.id ? "bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-200" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50")}
                  onClick={() => setActiveCategory(c.id)}
                >
                  <p className="font-bold">{c.name}</p>
                  {(user.role === 'admin' || user.role === 'gudang') && (
                    <div className="absolute -top-2 -right-2 hidden group-hover:flex bg-white shadow-lg rounded-xl border border-slate-100 overflow-hidden">
                      <button
                        onClick={(e) => { e.stopPropagation(); setEditingCategory(c); setNewCategoryName(c.name); setIsCategoryModalOpen(true); }}
                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"
                      >
                        <FileText size={14} />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteCategory(c.id); }}
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <Card className="overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[600px]">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Produk</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Kategori</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Harga (Rp)</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Stok</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {displayedProducts.map(product => (
                    <tr
                      key={product.id}
                      draggable={user.role === 'admin' || user.role === 'gudang'}
                      onDragStart={() => handleRowDragStart(product.id)}
                      onDragOver={handleRowDragOver}
                      onDrop={(e) => handleRowDrop(e, product.id)}
                      className="hover:bg-slate-50 transition-colors cursor-grab active:cursor-grabbing"
                    >
                      <td className="px-6 py-4">
                        <p className="font-bold text-slate-900">{product.name}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-[10px] font-bold">{product.category_name}</span>
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-900">{formatCurrency(product.price)}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "w-2 h-2 rounded-full",
                            product.stock < 10 ? "bg-rose-500" : "bg-emerald-500"
                          )} />
                          <span className="font-bold text-slate-900">{product.stock}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => { setEditingProduct(product); setIsModalOpen(true); }}
                            className="p-2 text-slate-400 hover:text-indigo-600 transition-colors"
                          >
                            <FileText size={18} />
                          </button>
                          {user.role !== 'cashier' && (
                            <button
                              onClick={() => handleDelete(product.id)}
                              className="p-2 text-slate-400 hover:text-rose-600 transition-colors"
                            >
                              <Trash2 size={18} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      {activeInventoryTab === 'materials' && (
        <>
          <div className="space-y-4 mb-6">
            <h3 className="text-lg font-bold">Kategori Produk</h3>
            <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
              <div
                onClick={() => setActiveCategory('all')}
                className={cn("px-6 py-4 rounded-2xl border cursor-pointer transition-all shrink-0 min-w-[120px] flex items-center justify-center", activeCategory === 'all' ? "bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-200" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50")}
              >
                <p className="font-bold">Semua</p>
              </div>
              {materialCategories.map(c => (
                <div
                  key={c.id}
                  draggable={user.role === 'admin' || user.role === 'gudang'}
                  onDragStart={() => handleCategoryDragStart(c.id)}
                  onDragOver={handleCategoryDragOver}
                  onDrop={(e) => handleCategoryDrop(e, c.id)}
                  className={cn("px-6 py-4 rounded-2xl border relative group cursor-grab active:cursor-grabbing transition-all shrink-0 min-w-[120px] flex flex-col items-center justify-center gap-1", activeCategory === c.id ? "bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-200" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50")}
                  onClick={() => setActiveCategory(c.id)}
                >
                  <p className="font-bold">{c.name}</p>
                  {c.enable_stok_awal === 0 && (
                    <span className={cn("text-[9px] font-black uppercase px-2 py-0.5 rounded-lg", activeCategory === c.id ? "bg-white/20 text-white" : "bg-rose-50 text-rose-600")}>
                      Stok Awal Off
                    </span>
                  )}
                  {(user.role === 'admin' || user.role === 'gudang') && (
                    <div className="absolute -top-2 -right-2 hidden group-hover:flex bg-white shadow-lg rounded-xl border border-slate-100 overflow-hidden">
                      <button
                        onClick={(e) => { e.stopPropagation(); setEditingCategory(c); setNewCategoryName(c.name); setEnableStokAwal(c.enable_stok_awal !== 0); setIsCategoryModalOpen(true); }}
                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"
                      >
                        <FileText size={14} />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteCategory(c.id); }}
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <Card className="overflow-hidden p-0 border border-slate-100 shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[600px]">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Nama Stok Produk (Bahan Baku)</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Kategori</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-center w-36">Satuan</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-center w-36">Harga</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right w-32">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {displayedMaterials.map(material => (
                    <tr
                      key={material.id}
                      draggable={user.role === 'admin' || user.role === 'gudang'}
                      onDragStart={() => handleRowDragStart(material.id)}
                      onDragOver={handleRowDragOver}
                      onDrop={(e) => handleRowDrop(e, material.id)}
                      className="hover:bg-slate-50/50 transition-colors cursor-grab active:cursor-grabbing"
                    >
                      <td className="px-6 py-4">
                        <p className="font-bold text-slate-900">{material.name}</p>
                      </td>
                      <td className="px-6 py-4">
                        {material.category_name ? (
                          <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-[10px] font-bold">
                            {material.category_name}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400 font-medium">Tanpa Kategori</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs font-semibold">{material.unit}</span>
                      </td>
                      <td className="px-6 py-4 text-center font-bold text-slate-900">
                        {formatCurrency(material.price || 0)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => { setEditingMaterial(material); setIsMaterialModalOpen(true); }}
                            className="p-2 text-slate-400 hover:text-indigo-600 transition-colors"
                          >
                            <FileText size={18} />
                          </button>
                          {user.role !== 'cashier' && (
                            <button
                              onClick={() => handleDeleteMaterial(material.id)}
                              className="p-2 text-slate-400 hover:text-rose-600 transition-colors"
                            >
                              <Trash2 size={18} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {materials.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center py-10 text-slate-400">Belum ada stok produk bahan baku yang dibuat.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      {activeInventoryTab === 'requests' && (
        <div className="space-y-8">
          {Object.keys(groupedRequests).length > 0 ? (
            Object.keys(groupedRequests).map(cashierName => {
              const cashierReqs = groupedRequests[cashierName];
              return (
                <div key={cashierName} className="space-y-4">
                  <div className="bg-slate-100 p-4 rounded-2xl flex items-center justify-between border border-slate-200 shadow-sm">
                    <div>
                      <h3 className="font-bold text-slate-900 text-md">Pemohon: {cashierName}</h3>
                      <p className="text-xs text-slate-500 font-medium">Permintaan stok barang khusus akun ini</p>
                    </div>
                    <span className="px-3 py-1 bg-white rounded-xl shadow-sm text-xs font-bold text-slate-700">
                      {cashierReqs.length} Permintaan
                    </span>
                  </div>
                  <Card className="p-0 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead className="bg-slate-50 border-b border-slate-100">
                          <tr>
                            <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Tanggal</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Barang</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-center">Qty</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-center">Harga Satuan</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-center">Total Harga</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-center">Pembayaran</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Aksi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {cashierReqs.map((r: any) => (
                            <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="px-6 py-4 text-sm text-slate-500">
                                {new Date(r.created_at).toLocaleDateString('id-ID')} | {new Date(r.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                              </td>
                              <td className="px-6 py-4 font-bold text-slate-900">{r.material_name}</td>
                              <td className="px-6 py-4 font-bold text-center text-slate-600">
                                {r.status === 'pending' ? (
                                  <div className="flex flex-col items-center gap-1">
                                    <span className="text-xs text-slate-400">Minta: {r.quantity}</span>
                                    <input
                                      type="number"
                                      min="1"
                                      max={r.quantity}
                                      value={approveQuantities[r.id] !== undefined ? approveQuantities[r.id] : r.quantity}
                                      onChange={(e) => {
                                        const val = Math.max(1, Math.min(r.quantity, Number(e.target.value)));
                                        setApproveQuantities(prev => ({ ...prev, [r.id]: val }));
                                      }}
                                      className="w-16 px-1.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-center text-xs font-bold focus:ring-1 focus:ring-indigo-500 outline-none"
                                    />
                                  </div>
                                ) : (
                                  r.status === 'approved' ? (
                                    <div className="flex flex-col items-center">
                                      <span className="text-xs line-through text-slate-400">Minta: {r.quantity}</span>
                                      <span className="text-sm text-emerald-600 font-extrabold">Acc: {r.approved_quantity || r.quantity}</span>
                                    </div>
                                  ) : (
                                    r.quantity
                                  )
                                )}
                              </td>
                              <td className="px-6 py-4 font-bold text-center text-slate-900">{formatCurrency(r.price || 0)}</td>
                              <td className="px-6 py-4 font-bold text-center text-indigo-600">
                                {r.status === 'pending' ? (
                                  formatCurrency((r.price || 0) * (approveQuantities[r.id] !== undefined ? approveQuantities[r.id] : r.quantity))
                                ) : (
                                  formatCurrency(r.total_price || 0)
                                )}
                              </td>
                              <td className="px-6 py-4 text-center">
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
                              <td className="px-6 py-4 text-right">
                                {r.status === 'pending' && (
                                  <div className="flex gap-2 justify-end">
                                    <button
                                      onClick={() => handleApproveReject(r.id, 'approved')}
                                      className="px-3 py-1.5 bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-100 hover:bg-emerald-600 transition-all"
                                    >
                                      Setujui
                                    </button>
                                    <button
                                      onClick={() => handleApproveReject(r.id, 'rejected')}
                                      className="px-3 py-1.5 bg-rose-500 text-white rounded-xl text-xs font-bold shadow-md shadow-rose-100 hover:bg-rose-600 transition-all"
                                    >
                                      Tolak
                                    </button>
                                  </div>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                </div>
              );
            })
          ) : (
            <Card className="text-center py-10 text-slate-400">Tidak ada permintaan stok masuk.</Card>
          )}
        </div>
      )}

      {activeInventoryTab === 'reports' && (
        <div className="space-y-6">
          {Object.keys(groupedCashierStocks).length > 0 ? (
            Object.keys(groupedCashierStocks).map(sessionKey => {
              const items = groupedCashierStocks[sessionKey];
              return (
                <div key={sessionKey} className="border border-slate-100 rounded-3xl bg-white shadow-sm overflow-hidden">
                  <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                    <h3 className="font-bold text-slate-800 text-sm md:text-base">Laporan Kasir: {sessionKey}</h3>
                    <span className="px-3 py-1 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600">
                      {items.length} Item
                    </span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left min-w-[700px]">
                      <thead className="bg-slate-50/50 border-b border-slate-100">
                        <tr>
                          <th className="px-6 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Nama Barang</th>
                          <th className="px-6 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider text-center w-24">Stok Awal</th>
                          <th className="px-6 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider text-center w-24">Masuk</th>
                          <th className="px-6 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider text-center w-24">Terpakai</th>
                          <th className="px-6 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider text-center w-24">Terbuang</th>
                          <th className="px-6 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider text-right w-28">Sisa Stok</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {items.map((item: any) => (
                          <tr key={item.id} className="hover:bg-slate-50/20 transition-colors">
                            <td className="px-6 py-3 text-sm font-bold text-slate-900">{item.material_name}</td>
                            <td className="px-6 py-3 text-sm text-center text-slate-600 font-semibold">{item.stock_awal}</td>
                            <td className="px-6 py-3 text-sm text-center text-slate-600 font-semibold">{item.masuk}</td>
                            <td className="px-6 py-3 text-sm text-center text-slate-600 font-semibold">{item.terpakai}</td>
                            <td className="px-6 py-3 text-sm text-center text-slate-600 font-semibold">{item.terbuang}</td>
                            <td className="px-6 py-3 text-sm text-right font-black text-slate-800 bg-slate-50/50">{item.sisa_stock}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })
          ) : (
            <Card className="text-center py-10 text-slate-400">Belum ada laporan stok harian kasir yang dikirim.</Card>
          )}
        </div>
      )}

      {activeInventoryTab === 'input_warehouse' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-100 rounded-2xl p-4 md:p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h3 className="font-bold text-slate-900 text-lg">Form Stok Gudang</h3>
              <p className="text-sm text-slate-500 font-medium">Sesuaikan stok fisik bahan baku yang ada di gudang hari ini.</p>
            </div>
            <button
              onClick={handleSaveWarehouseStock}
              disabled={warehouseSubmitting}
              className="w-full md:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-indigo-150 hover:bg-indigo-700 transition-all disabled:opacity-50"
            >
              <Save size={18} />
              {warehouseSubmitting ? 'Menyimpan...' : 'Simpan Stok Gudang'}
            </button>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-bold">Kategori Produk</h3>
            <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
              <div
                onClick={() => setActiveCategory('all')}
                className={cn("px-6 py-4 rounded-2xl border cursor-pointer transition-all shrink-0 min-w-[120px] flex items-center justify-center", activeCategory === 'all' ? "bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-200" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50")}
              >
                <p className="font-bold">Semua</p>
              </div>
              {materialCategories.map(c => (
                <div
                  key={c.id}
                  draggable={user.role === 'admin' || user.role === 'gudang'}
                  onDragStart={() => handleCategoryDragStart(c.id)}
                  onDragOver={handleCategoryDragOver}
                  onDrop={(e) => handleCategoryDrop(e, c.id)}
                  className={cn("px-6 py-4 rounded-2xl border relative group cursor-grab active:cursor-grabbing transition-all shrink-0 min-w-[120px] flex items-center justify-center", activeCategory === c.id ? "bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-200" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50")}
                  onClick={() => setActiveCategory(c.id)}
                >
                  <p className="font-bold">{c.name}</p>
                </div>
              ))}
            </div>
          </div>

          <Card className="overflow-hidden p-0 border border-slate-100 shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[700px]">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Nama Barang</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-center w-32">Stok Awal (qty)</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-center w-32">Terjual (qty)</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-center w-32">Retur (qty)</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right w-36">Stok Akhir (qty)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {displayedMaterials.map(material => {
                    const inputs = warehouseStockInputs[material.id] || { stock_awal: material.stock, terjual: 0, retur: 0 };
                    const sisa = Number(inputs.stock_awal) - Number(inputs.terjual) + Number(inputs.retur);
                    return (
                      <tr key={material.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <p className="font-bold text-slate-900">{material.name}</p>
                          <p className="text-xs text-slate-400 font-medium">Satuan: {material.unit}</p>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <input
                            type="number"
                            min="0"
                            disabled
                            value={inputs.stock_awal}
                            onChange={(e) => handleWarehouseInputChange(material.id, 'stock_awal', Number(e.target.value))}
                            className="w-24 px-2.5 py-2 bg-slate-100 border border-slate-200 rounded-xl text-center font-semibold text-slate-400 outline-none text-sm cursor-not-allowed opacity-75"
                          />
                        </td>
                        <td className="px-6 py-4 text-center">
                          <input
                            type="number"
                            min="0"
                            disabled
                            value={inputs.terjual}
                            onChange={(e) => handleWarehouseInputChange(material.id, 'terjual', Number(e.target.value))}
                            className="w-24 px-2.5 py-2 bg-slate-100 border border-slate-200 rounded-xl text-center font-semibold text-slate-400 outline-none text-sm cursor-not-allowed opacity-75"
                          />
                        </td>
                        <td className="px-6 py-4 text-center">
                          <input
                            type="number"
                            min="0"
                            disabled
                            value={inputs.retur}
                            onChange={(e) => handleWarehouseInputChange(material.id, 'retur', Number(e.target.value))}
                            className="w-24 px-2.5 py-2 bg-slate-100 border border-slate-200 rounded-xl text-center font-semibold text-slate-400 outline-none text-sm cursor-not-allowed opacity-75"
                          />
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className={cn(
                            "font-bold text-base px-3 py-1.5 rounded-lg",
                            sisa < 0 ? "text-rose-600 bg-rose-50" : "text-emerald-600 bg-emerald-50"
                          )}>
                            {sisa} {material.unit}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  {displayedMaterials.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center py-10 text-slate-400">Belum ada bahan baku yang terdaftar.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {activeInventoryTab === 'broken' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8 font-sans">
          {/* Form Pencatatan Retur Offline */}
          <div className="lg:col-span-1 space-y-6">
            <Card className="p-6 space-y-6 border border-slate-100 shadow-sm bg-white">
              <div>
                <h3 className="font-bold text-slate-900 text-lg">Retur & Barang Rusak (Offline)</h3>
                <p className="text-xs text-slate-500 font-medium">Proses pengembalian barang dari Outlet secara offline.</p>
              </div>

              <form onSubmit={handleSubmitOfflineReturn} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Pilih Outlet</label>
                  <select
                    value={selectedCashierId}
                    onChange={(e) => setSelectedCashierId(e.target.value)}
                    required
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-sm"
                  >
                    <option value="">-- Pilih Outlet --</option>
                    {cashiers.map(u => (
                      <option key={u.id} value={u.id}>{u.username}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Pilih Bahan Baku</label>
                  <select
                    value={selectedReturnMaterialId}
                    onChange={(e) => setSelectedReturnMaterialId(e.target.value)}
                    required
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-sm"
                  >
                    <option value="">-- Pilih Bahan Baku --</option>
                    {materials.map(m => (
                      <option key={m.id} value={m.id}>{m.name} ({m.unit})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Jumlah (Qty)</label>
                  <input
                    type="number"
                    min="1"
                    value={returnQty}
                    onChange={(e) => setReturnQty(e.target.value)}
                    required
                    placeholder="0"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-semibold text-sm"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Kondisi Barang</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setReturnCondition('layak')}
                      className={cn(
                        "py-3 rounded-xl font-bold text-xs border transition-all",
                        returnCondition === 'layak'
                          ? "bg-emerald-50 border-emerald-500 text-emerald-600 shadow-sm"
                          : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
                      )}
                    >
                      LAYAK (Kembali ke Gudang)
                    </button>
                    <button
                      type="button"
                      onClick={() => setReturnCondition('tidak_layak')}
                      className={cn(
                        "py-3 rounded-xl font-bold text-xs border transition-all",
                        returnCondition === 'tidak_layak'
                          ? "bg-rose-50 border-rose-500 text-rose-600 shadow-sm"
                          : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
                      )}
                    >
                      TIDAK LAYAK (Broken / Rugi)
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={returnSubmitting}
                  className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-indigo-150 hover:bg-indigo-700 transition-all disabled:opacity-50"
                >
                  {returnSubmitting ? 'Memproses...' : 'Proses Retur Offline'}
                </button>
              </form>
            </Card>
          </div>

          {/* Tabel Histori Retur & Broken */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-slate-100 p-4 rounded-2xl flex items-center justify-between border border-slate-200 shadow-sm">
              <div>
                <h3 className="font-bold text-slate-900 text-sm md:text-base">Riwayat Retur & Broken Offline</h3>
                <p className="text-xs text-slate-500 font-medium">Log pengembalian barang dari outlet secara offline</p>
              </div>
              <span className="px-3 py-1 bg-white rounded-xl shadow-sm text-xs font-bold text-slate-700">
                {offlineReturns.length} Transaksi
              </span>
            </div>

            <Card className="p-0 overflow-hidden border border-slate-100 shadow-sm bg-white">
              <div className="overflow-x-auto">
                <table className="w-full text-left min-w-[700px]">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Tanggal</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Outlet</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Bahan Baku</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-center">Qty</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Harga Satuan</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Total Nilai / Kerugian</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-center">Kondisi</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {offlineReturns.map((r: any) => (
                      <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 text-xs text-slate-500 font-medium">
                          {new Date(r.created_at).toLocaleDateString('id-ID')} <br />
                          {new Date(r.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="px-6 py-4 font-bold text-slate-900">
                          {r.cashier_name}
                        </td>
                        <td className="px-6 py-4 font-bold text-slate-900">
                          {r.material_name}
                        </td>
                        <td className="px-6 py-4 font-bold text-center text-slate-600">
                          {r.quantity} {r.unit}
                        </td>
                        <td className="px-6 py-4 text-right font-medium text-slate-600">
                          {formatCurrency(r.material_price || 0)}
                        </td>
                        <td className={cn(
                          "px-6 py-4 text-right font-bold",
                          r.condition_status === 'tidak_layak' ? "text-rose-600" : "text-slate-900"
                        )}>
                          {formatCurrency(r.quantity * (r.material_price || 0))}
                          {r.condition_status === 'tidak_layak' && (
                            <span className="block text-[10px] text-rose-500 font-medium">(Rugi)</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={cn(
                            "px-2.5 py-1 rounded-lg text-xs font-bold",
                            r.condition_status === 'layak' ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                          )}>
                            {r.condition_status === 'layak' ? 'Layak' : 'Tidak Layak'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className={cn(
                            "px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider",
                            r.condition_status === 'layak'
                              ? (r.added_to_input ? "bg-indigo-100 text-indigo-700" : "bg-slate-100 text-slate-700")
                              : "bg-red-100 text-red-700"
                          )}>
                            {r.condition_status === 'layak'
                              ? (r.added_to_input ? 'Masuk Input Retur' : 'Hanya Dicatat')
                              : 'Dibuang (Rugi)'}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {offlineReturns.length === 0 && (
                      <tr>
                        <td colSpan={8} className="text-center py-10 text-slate-400">Belum ada riwayat retur offline.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        </div>
      )}

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-white w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-4 md:space-y-6">
                <h3 className="text-xl md:text-2xl font-bold">{editingProduct ? "Edit Produk" : "Tambah Produk Baru"}</h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Nama Produk</label>
                    <input disabled={user.role === 'cashier'} name="name" defaultValue={editingProduct?.name} required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Harga (Rupiah)</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">Rp</span>
                      <input disabled={user.role === 'cashier'} type="number" name="price" defaultValue={editingProduct?.price} required className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50" />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Stok (Opsional)</label>
                    <input type="number" name="stock" defaultValue={editingProduct?.stock} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" placeholder="0" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Kategori</label>
                    <select disabled={user.role === 'cashier'} name="category_id" defaultValue={editingProduct?.category_id} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50">
                      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-all">Batal</button>
                  <button type="submit" className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all">Simpan</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {isCategoryModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCategoryModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-white w-full max-w-md rounded-3xl overflow-hidden shadow-2xl"
            >
              <form onSubmit={handleAddCategory} className="p-8 space-y-6">
                <h3 className="text-2xl font-bold">{editingCategory ? "Edit Kategori" : "Tambah Kategori"}</h3>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Nama Kategori</label>
                  <input
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    required
                    placeholder="Contoh: Makanan, Minuman, Elektronik"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-medium"
                  />
                </div>
                {activeInventoryTab === 'materials' && (
                  <div className="flex items-center gap-3 bg-slate-50 border border-slate-100 p-4 rounded-2xl">
                    <input
                      type="checkbox"
                      id="enableStokAwal"
                      checked={enableStokAwal}
                      onChange={(e) => setEnableStokAwal(e.target.checked)}
                      className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 cursor-pointer"
                    />
                    <label htmlFor="enableStokAwal" className="text-xs font-bold text-slate-600 cursor-pointer select-none">
                      Aktifkan input Stok Awal untuk kategori ini
                    </label>
                  </div>
                )}
                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => setIsCategoryModalOpen(false)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-all text-sm">Batal</button>
                  <button type="submit" className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all text-sm">Simpan</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {isMaterialModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMaterialModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-white w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <form onSubmit={handleSubmitMaterial} className="p-6 md:p-8 space-y-4 md:space-y-6">
                <h3 className="text-xl md:text-2xl font-bold">{editingMaterial ? "Edit Stok Produk" : "Tambah Stok Produk Baru"}</h3>

                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Nama Stok Barang</label>
                    <input name="name" defaultValue={editingMaterial?.name} required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Misal: Biji Kopi, Gelas Cup 16oz" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Kategori</label>
                    <select
                      name="category_id"
                      defaultValue={editingMaterial?.category_id || ""}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-medium"
                    >
                      <option value="">-- Tanpa Kategori --</option>
                      {materialCategories.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Satuan / Unit</label>
                    <input name="unit" defaultValue={editingMaterial?.unit || 'pcs'} required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Misal: pcs, kg, pack, liter" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Harga Satuan (Rupiah)</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">Rp</span>
                      <input type="number" name="price" defaultValue={editingMaterial?.price || 0} required className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" placeholder="0" />
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => setIsMaterialModalOpen(false)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-all">Batal</button>
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
