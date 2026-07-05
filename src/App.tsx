import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Wallet,
  History,
  ClipboardList,
  Plus,
  FileText,
  Users,
  TrendingUp,
  X,
  Menu,
  Bell,
  LogOut,
  RotateCcw,
  GitPullRequest,
  ArrowDownLeft,
  ArrowRightLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import { User, InventoryMaterial } from './types';
import { api } from './lib/api';

// Page imports
import { Dashboard } from './pages/dashboard/Dashboard';
import { POS } from './pages/cashier/POS';
import { StockRequestPage } from './pages/cashier/StockRequestPage';
import { Inventory } from './pages/gudang/Inventory';
import { BeliVendor } from './pages/gudang/BeliVendor';
import { CashFlow } from './pages/shared/CashFlow';
import { HistoryPage } from './pages/admin/HistoryPage';
import { RegisterHistory } from './pages/admin/RegisterHistory';
import { DiscountsAdmin } from './pages/admin/DiscountsAdmin';
import { ReceiptSettingsAdmin } from './pages/admin/ReceiptSettingsAdmin';
import { UsersAdmin } from './pages/admin/UsersAdmin';
import { AuthScreen } from './pages/auth/AuthScreen';
import { TransferOut } from './pages/cashier/TransferOut';

const SidebarItem = ({ icon: Icon, label, active, onClick }: any) => (
  <button
    onClick={onClick}
    className={cn(
      "flex items-center gap-3 w-full px-4 py-3 rounded-xl transition-all duration-200 text-left",
      active
        ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200"
        : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
    )}
  >
    <Icon size={20} />
    <span className="font-medium">{label}</span>
  </button>
);

export default function App() {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeRegister, setActiveRegister] = useState<any>(null);

  // Lifted inventory state for gudang/admin
  const [materials, setMaterials] = useState<InventoryMaterial[]>([]);
  const [warehouseStockInputs, setWarehouseStockInputs] = useState<{ [materialId: number]: { stock_awal: number; terjual: number; retur: number } }>({});

  const fetchMaterials = () => {
    api.get('/api/inventory-materials').then((mats) => {
      setMaterials(mats);
      setWarehouseStockInputs(() => {
        const inputsMap: any = {};
        mats.forEach((m: any) => {
          inputsMap[m.id] = {
            stock_awal: m.stock_awal !== undefined ? m.stock_awal : m.stock,
            terjual: m.terjual !== undefined ? m.terjual : 0,
            retur: m.retur !== undefined ? m.retur : 0
          };
        });
        return inputsMap;
      });
    }).catch(console.error);
  };

  const fetchActiveRegister = () => {
    if (user) {
      api.get('/api/cash-registers/active/' + user.id).then(setActiveRegister);
    }
  };

  useEffect(() => {
    if (user?.role === 'gudang') {
      setActiveTab('dashboard');
      fetchMaterials();
    } else if (user?.role === 'admin') {
      fetchMaterials();
    }
    fetchActiveRegister();
  }, [user]);

  if (!user) {
    return <AuthScreen onLoginSuccess={setUser} />;
  }

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard user={user} />;
      case 'pos': return <POS user={user} activeRegister={activeRegister} fetchActiveRegister={fetchActiveRegister} />;
      case 'inventory': return user.role === 'cashier' ? (
        <StockRequestPage user={user} activeRegister={activeRegister} setActiveTab={setActiveTab} mode="input" />
      ) : (
        <Inventory
          user={user}
          materials={materials}
          setMaterials={setMaterials}
          warehouseStockInputs={warehouseStockInputs}
          setWarehouseStockInputs={setWarehouseStockInputs}
          fetchMaterials={fetchMaterials}
          mode="inventory"
        />
      );
      case 'r_n_b': return (
        <Inventory
          user={user}
          materials={materials}
          setMaterials={setMaterials}
          warehouseStockInputs={warehouseStockInputs}
          setWarehouseStockInputs={setWarehouseStockInputs}
          fetchMaterials={fetchMaterials}
          mode="r_n_b"
        />
      );
      case 'outlet_request': return user.role === 'cashier' ? (
        <StockRequestPage user={user} activeRegister={activeRegister} setActiveTab={setActiveTab} mode="request" />
      ) : (
        <Inventory
          user={user}
          materials={materials}
          setMaterials={setMaterials}
          warehouseStockInputs={warehouseStockInputs}
          setWarehouseStockInputs={setWarehouseStockInputs}
          fetchMaterials={fetchMaterials}
          mode="outlet_request"
        />
      );
      case 'beli': return <BeliVendor user={user} onPurchaseSuccess={fetchMaterials} />;
      case 'cashflow': return <CashFlow user={user} mode="cashflow" />;
      case 'expenses': return <CashFlow user={user} mode="expenses" />;
      case 'transfer_out': return <TransferOut user={user} />;
      case 'history': return <HistoryPage user={user} />;
      case 'register-history': return <RegisterHistory user={user} />;
      case 'discounts': return <DiscountsAdmin user={user} />;
      case 'receipt-settings': return <ReceiptSettingsAdmin user={user} />;
      case 'users': return <UsersAdmin user={user} />;
      default: return <Dashboard user={user} />;
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 font-sans overflow-hidden">
      {/* Sidebar Backdrop */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{
          width: isSidebarOpen ? 280 : 0,
          opacity: isSidebarOpen ? 1 : 0,
          x: isSidebarOpen ? 0 : -280
        }}
        className={cn(
          "bg-white border-r border-slate-100 flex flex-col overflow-hidden z-50 transition-all duration-300",
          "fixed inset-y-0 left-0 lg:relative"
        )}
      >
        <div className="p-8">
          <div className="flex items-center justify-between mb-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-100">
                <TrendingUp size={20} />
              </div>
              <h2 className="text-xl font-black tracking-tight">@HDPOS</h2>
            </div>
            <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden p-2 text-slate-400">
              <X size={20} />
            </button>
          </div>

          <nav className="space-y-2">
            <SidebarItem icon={LayoutDashboard} label="Dashboard" active={activeTab === 'dashboard'} onClick={() => { setActiveTab('dashboard'); if (window.innerWidth < 1024) setIsSidebarOpen(false); }} />
            {user.role === 'cashier' && (
              <SidebarItem icon={ShoppingCart} label="Kasir" active={activeTab === 'pos'} onClick={() => { setActiveTab('pos'); if (window.innerWidth < 1024) setIsSidebarOpen(false); }} />
            )}

            <SidebarItem icon={Package} label={user.role === 'admin' ? "Produk" : "Produk"} active={activeTab === 'inventory'} onClick={() => { setActiveTab('inventory'); if (window.innerWidth < 1024) setIsSidebarOpen(false); }} />
            {user.role === 'cashier' && (
              <SidebarItem icon={GitPullRequest} label="Outlet Request" active={activeTab === 'outlet_request'} onClick={() => { setActiveTab('outlet_request'); if (window.innerWidth < 1024) setIsSidebarOpen(false); }} />
            )}
            {user.role === 'cashier' && (
              <SidebarItem icon={ArrowRightLeft} label="Tosser" active={activeTab === 'transfer_out'} onClick={() => { setActiveTab('transfer_out'); if (window.innerWidth < 1024) setIsSidebarOpen(false); }} />
            )}

            {user.role === 'gudang' && (
              <>
                <SidebarItem icon={RotateCcw} label="R&B" active={activeTab === 'r_n_b'} onClick={() => { setActiveTab('r_n_b'); if (window.innerWidth < 1024) setIsSidebarOpen(false); }} />
                <SidebarItem icon={GitPullRequest} label="Outlet Request" active={activeTab === 'outlet_request'} onClick={() => { setActiveTab('outlet_request'); if (window.innerWidth < 1024) setIsSidebarOpen(false); }} />
                <SidebarItem icon={ShoppingCart} label="Penerimaan Barang" active={activeTab === 'beli'} onClick={() => { setActiveTab('beli'); if (window.innerWidth < 1024) setIsSidebarOpen(false); }} />
              </>
            )}

            <SidebarItem icon={Wallet} label="Arus Kas" active={activeTab === 'cashflow'} onClick={() => { setActiveTab('cashflow'); if (window.innerWidth < 1024) setIsSidebarOpen(false); }} />
            {user.role === 'cashier' && (
              <SidebarItem icon={ArrowDownLeft} label="Pengeluaran" active={activeTab === 'expenses'} onClick={() => { setActiveTab('expenses'); if (window.innerWidth < 1024) setIsSidebarOpen(false); }} />
            )}

            {user.role !== 'gudang' && (
              <>
                <SidebarItem icon={History} label="Riwayat" active={activeTab === 'history'} onClick={() => { setActiveTab('history'); if (window.innerWidth < 1024) setIsSidebarOpen(false); }} />
                <SidebarItem icon={ClipboardList} label="Riwayat Kasir" active={activeTab === 'register-history'} onClick={() => { setActiveTab('register-history'); if (window.innerWidth < 1024) setIsSidebarOpen(false); }} />
              </>
            )}
            {user.role === 'admin' && (
              <>
                <SidebarItem icon={Plus} label="Diskon" active={activeTab === 'discounts'} onClick={() => { setActiveTab('discounts'); if (window.innerWidth < 1024) setIsSidebarOpen(false); }} />
                <SidebarItem icon={FileText} label="Pengaturan Struk" active={activeTab === 'receipt-settings'} onClick={() => { setActiveTab('receipt-settings'); if (window.innerWidth < 1024) setIsSidebarOpen(false); }} />
                <SidebarItem icon={Users} label="Pengguna" active={activeTab === 'users'} onClick={() => { setActiveTab('users'); if (window.innerWidth < 1024) setIsSidebarOpen(false); }} />
              </>
            )}
          </nav>
        </div>

        <div className="mt-auto p-8">
          <div className="bg-slate-50 p-4 rounded-2xl">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Status</p>
            <p className="font-bold text-slate-900">Aktif</p>
          </div>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-20 bg-white border-b border-slate-100 flex items-center justify-between px-4 md:px-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 hover:bg-slate-50 rounded-lg text-slate-500"
            >
              <Menu size={20} />
            </button>
            <h2 className="text-lg font-bold text-slate-900 lg:hidden">@HDPOS</h2>
          </div>

          <div className="flex items-center gap-3 md:gap-6">
            <button className="relative p-2 text-slate-400 hover:text-slate-600">
              <Bell size={20} />
              <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border-2 border-white" />
            </button>
            <div className="flex items-center gap-3 border-l border-slate-200 pl-4 md:pl-6">
              <div className="text-right sm:block">
                <p className="text-sm font-bold text-slate-900">{user.username}</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{user.role}</p>
              </div>
              <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-indigo-100 border-2 border-white shadow-sm flex items-center justify-center text-indigo-600 font-bold uppercase">
                {user.username.charAt(0)}
              </div>
              <button onClick={handleLogout} className="ml-2 p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all" title="Keluar">
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto flex">
          {renderContent()}
        </div>
      </main>
    </div>
  );
}
