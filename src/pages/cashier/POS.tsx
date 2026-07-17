import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search,
  Wallet,
  Clock,
  ShoppingCart,
  Package,
  X,
  Trash2,
  Save,
  WalletCards
} from 'lucide-react';
import { cn, formatCurrency } from '../../lib/utils';
import { api } from '../../lib/api';
import { ReceiptModal } from '../../components/ReceiptModal';
import { Product, Category, TransactionItem, OpenBill, User } from '../../types';

// Styling constants for POS layout consistency
const CARD_CLASS = "bg-white border border-slate-200 rounded-xl p-1.5 md:p-2.5 flex flex-col justify-between text-left select-none w-full h-[95px] md:h-[130px] hover:border-violet-300 hover:shadow-sm transition-all cursor-pointer group";
const CATEGORY_CLASS = "text-[7.5px] md:text-[9.5px] text-slate-400 font-bold uppercase tracking-wider block h-3 line-clamp-1 mb-0.5 leading-none";
const NAME_CLASS = "font-bold text-slate-800 text-[11px] md:text-sm leading-tight line-clamp-2 h-[28px] md:h-[36px] overflow-hidden mb-0.5 group-hover:text-violet-600 transition-colors";
const PRICE_CLASS = "text-violet-600 font-black text-xs md:text-base leading-none mt-0.5";
const FOOTER_CLASS = "flex items-center justify-between mt-1 pt-1 border-t border-slate-100 w-full";
const STOCK_CLASS = "text-[8px] md:text-[10px] text-slate-400 font-medium leading-none";
const ADD_BTN_CLASS = "text-[8px] md:text-[10px] bg-violet-50 text-violet-600 font-extrabold px-1.5 py-0.5 rounded-md group-hover:bg-violet-600 group-hover:text-white transition-colors leading-none";

const GRID_CONTAINER_CLASS = "flex-1 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-2 md:gap-3 pb-24 lg:pb-6";

const CATEGORIES_CONTAINER_CLASS = "flex gap-1.5 overflow-x-auto pb-3 mb-1.5 no-scrollbar shrink-0";
const CATEGORY_BTN_ACTIVE = "px-3.5 py-1.5 rounded-xl text-xs md:text-sm font-bold whitespace-nowrap transition-all border select-none cursor-pointer bg-violet-600 text-white border-violet-600 shadow-sm shadow-violet-100";
const CATEGORY_BTN_INACTIVE = "px-3.5 py-1.5 rounded-xl text-xs md:text-sm font-bold whitespace-nowrap transition-all border select-none cursor-pointer bg-white text-slate-500 border-slate-200 hover:bg-slate-50";

export const POS = ({ user, activeRegister, fetchActiveRegister }: { user: User, activeRegister: any, fetchActiveRegister: () => void }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeCategory, setActiveCategory] = useState<number | 'all'>('all');
  const [cart, setCart] = useState<TransactionItem[]>([]);
  const [search, setSearch] = useState('');
  const [paymentModal, setPaymentModal] = useState(false);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [openingBalance, setOpeningBalance] = useState('');
  const [cashReceived, setCashReceived] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [showCart, setShowCart] = useState(false);
  const [discountType, setDiscountType] = useState<'none' | 'percent' | 'fixed'>('none');
  const [discountValue, setDiscountValue] = useState('');

  const [receiptData, setReceiptData] = useState<any>(null);
  const [openBills, setOpenBills] = useState<OpenBill[]>([]);
  const [isOpenBillsModalOpen, setIsOpenBillsModalOpen] = useState(false);
  const [isSaveBillModalOpen, setIsSaveBillModalOpen] = useState(false);
  const [newBillTable, setNewBillTable] = useState('');
  const [newBillCustomer, setNewBillCustomer] = useState('');

  const [expectedBalance, setExpectedBalance] = useState<number | null>(null);
  const [discountsList, setDiscountsList] = useState<any[]>([]);
  const [subHeadlines, setSubHeadlines] = useState<any[]>([]);
  const [selectedSubHeadline, setSelectedSubHeadline] = useState('');

  const fetchSubHeadlines = () => {
    api.get('/api/receipt-sub-headlines').then(data => {
      setSubHeadlines(data);
      const stored = localStorage.getItem('receipt_sub_headline');
      if (stored) {
        setSelectedSubHeadline(stored);
      } else if (data && data.length > 0) {
        setSelectedSubHeadline(data[0].text);
        localStorage.setItem('receipt_sub_headline', data[0].text);
      }
    });
  };

  const handleOpenCloseModal = async () => {
    if (activeRegister) {
      try {
        const res = await api.get('/api/cash-registers/expected/' + activeRegister.id);
        setExpectedBalance(res.expected_balance);
      } catch (err) {
        console.error("Failed to get expected balance");
      }
    } else {
      setExpectedBalance(null);
    }
    setOpeningBalance('');
    setIsRegisterModalOpen(true);
  };

  const fetchOpenBills = () => {
    api.get('/api/open-bills').then(setOpenBills);
  };

  useEffect(() => {
    api.get('/api/products').then(setProducts);
    api.get('/api/categories').then(setCategories);
    api.get('/api/discounts').then(setDiscountsList);
    fetchOpenBills();
    fetchActiveRegister();
    fetchSubHeadlines();
  }, []);

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { ...product, quantity: 1, discount_type: 'none', discount_value: 0 }];
    });
  };

  const removeFromCart = (id: number) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const updateQuantity = (id: number, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const updateItemDiscount = (id: number, type: 'none' | 'percent' | 'fixed', value: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        return {
          ...item,
          discount_type: type,
          discount_value: value
        };
      }
      return item;
    }));
  };

  const getItemPriceAfterDiscount = (item: TransactionItem) => {
    const price = item.price;
    if (item.discount_type === 'percent') {
      return Math.max(0, price - (price * (item.discount_value || 0)) / 100);
    } else if (item.discount_type === 'fixed') {
      return Math.max(0, price - (item.discount_value || 0));
    }
    return price;
  };

  const subtotal = cart.reduce((sum, item) => sum + (getItemPriceAfterDiscount(item) * item.quantity), 0);

  const discountAmount = React.useMemo(() => {
    const val = parseFloat(discountValue) || 0;
    if (discountType === 'percent') {
      return (subtotal * val) / 100;
    } else if (discountType === 'fixed') {
      return val;
    }
    return 0;
  }, [subtotal, discountType, discountValue]);

  const total = Math.max(0, subtotal - discountAmount);
  const receivedAmount = parseFloat(cashReceived) || 0;
  const change = receivedAmount - total;

  const handleCheckout = async () => {
    if (!activeRegister) {
      alert("Harap buka sesi kasir terlebih dahulu!");
      return;
    }
    const transactionData = {
      user_id: user.id,
      items: cart,
      subtotal,
      total_amount: total,
      discount_type: discountType,
      discount_value: parseFloat(discountValue) || 0,
      discount_amount: discountAmount,
      payment_method: paymentMethod,
      cash_received: receivedAmount || total,
      change_amount: Math.max(0, change),
      date: new Date().toISOString()
    };

    const res = await api.post('/api/transactions', transactionData);

    setReceiptData({ ...transactionData, id: res.id });
    setCart([]);
    setDiscountType('none');
    setDiscountValue('');
    setPaymentModal(false);
    setCashReceived('');
  };

  const handleSaveOpenBill = async () => {
    await api.post('/api/open-bills', {
      table_name: newBillTable,
      customer_name: newBillCustomer,
      items: cart
    });
    setCart([]);
    setIsSaveBillModalOpen(false);
    setNewBillTable('');
    setNewBillCustomer('');
    fetchOpenBills();
  };

  const handleLoadOpenBill = (bill: OpenBill) => {
    setCart(bill.items);
    setIsOpenBillsModalOpen(false);
    // Optionally delete from open bills after loading
    api.delete(`/api/open-bills/${bill.id}`).then(fetchOpenBills);
  };

  const handleDeleteOpenBill = async (id: number) => {
    await api.delete(`/api/open-bills/${id}`);
    fetchOpenBills();
  };

  const filteredProducts = products.filter(p =>
    (activeCategory === 'all' || p.category_id === activeCategory) &&
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleOpenRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (activeRegister) {
        await api.post('/api/cash-registers/close', {
          id: activeRegister.id,
          closing_balance: Number(openingBalance)
        });
        alert('Kasir berhasil ditutup!');
      } else {
        await api.post('/api/cash-registers/open', {
          cashier_id: user.id || 0,
          cashier_name: user.username,
          opening_balance: Number(openingBalance)
        });
        alert('Kasir berhasil dibuka!');
      }
      setIsRegisterModalOpen(false);
      setOpeningBalance('');
      fetchActiveRegister();
    } catch (err: any) {
      alert(err.message || 'Terjadi kesalahan saat memproses sesi kasir');
    }
  };

  return (
    <div className="h-full flex overflow-hidden relative w-full">
      <div className="flex-1 flex flex-col p-4 md:p-6 overflow-hidden">
        <div className="mb-6 flex flex-col lg:flex-row gap-1 items-stretch lg:items-center">
          {/* Row 1 (on mobile): Search & Cart Button */}
          <div className="flex gap-3 items-center w-full lg:flex-1">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input
                type="text"
                placeholder="Cari produk atau scan barcode..."
                className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-violet-500 outline-none shadow-sm text-sm"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <button
              onClick={() => setShowCart(true)}
              className="lg:hidden p-3 bg-violet-600 text-white rounded-xl shadow-lg relative shrink-0 select-none cursor-pointer"
            >
              <ShoppingCart size={20} />
              {cart.length > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white text-[10px] flex items-center justify-center rounded-full border-2 border-white font-bold animate-pulse-slow">
                  {cart.length}
                </span>
              )}
            </button>
          </div>

          {/* Row 2 (on mobile): Actions & Branch Select */}
          <div className="flex gap-2 items-center overflow-x-auto w-full lg:w-auto shrink-0 pb-1 lg:pb-0 no-scrollbar">
            {subHeadlines.length > 0 && (
              <select
                value={selectedSubHeadline}
                onChange={(e) => {
                  setSelectedSubHeadline(e.target.value);
                  localStorage.setItem('receipt_sub_headline', e.target.value);
                }}
                className="bg-white border border-slate-200 text-slate-700 font-bold text-xs px-3 py-2.5 rounded-xl outline-none shadow-sm focus:ring-2 focus:ring-violet-500 shrink-0"
              >
                {subHeadlines.map(h => (
                  <option key={h.id} value={h.text}>{h.text}</option>
                ))}
              </select>
            )}

            <button
              onClick={handleOpenCloseModal}
              className={cn(
                "relative px-3 py-2.5 border rounded-xl shadow-sm transition-all flex items-center gap-1.5 shrink-0 text-xs font-bold select-none cursor-pointer",
                activeRegister
                  ? "bg-rose-50 border-rose-200 text-rose-600 hover:bg-rose-100"
                  : "bg-emerald-50 border-emerald-200 text-emerald-600 hover:bg-emerald-100"
              )}
            >
              <Wallet size={16} />
              <span>
                {activeRegister ? "Tutup Kasir" : "Buka Kasir"}
              </span>
            </button>

            <button
              onClick={() => setIsOpenBillsModalOpen(true)}
              className="relative px-3 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl shadow-sm hover:bg-slate-50 transition-all flex items-center gap-1.5 shrink-0 text-xs font-bold select-none cursor-pointer"
              title="Daftar Bill Pending"
            >
              <Clock size={16} />
              <span>Bills</span>
              {openBills.length > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-amber-500 text-white text-[10px] flex items-center justify-center rounded-full border-2 border-white font-bold">
                  {openBills.length}
                </span>
              )}
            </button>
          </div>
        </div>

        <div className={CATEGORIES_CONTAINER_CLASS}>
          <button
            onClick={() => setActiveCategory('all')}
            className={activeCategory === 'all' ? CATEGORY_BTN_ACTIVE : CATEGORY_BTN_INACTIVE}
          >
            Semua
          </button>
          {categories.map(c => (
            <button
              key={c.id}
              onClick={() => setActiveCategory(c.id)}
              className={activeCategory === c.id ? CATEGORY_BTN_ACTIVE : CATEGORY_BTN_INACTIVE}
            >
              {c.name}
            </button>
          ))}
        </div>

        <div className={GRID_CONTAINER_CLASS}>
          {filteredProducts.map(product => (
            <button
              key={product.id}
              onClick={() => addToCart(product)}
              className={CARD_CLASS}
            >
              <div>
                <span className={CATEGORY_CLASS}>{product.category_name || 'Umum'}</span>
                <h4 className={NAME_CLASS}>{product.name}</h4>
                <p className={PRICE_CLASS}>{formatCurrency(product.price)}</p>
              </div>
              <div className={FOOTER_CLASS}>
                <span className={ADD_BTN_CLASS}>+ Add</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Cart Overlay for Mobile/Tablet */}
      <AnimatePresence>
        {showCart && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowCart(false)}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-30 lg:hidden"
          />
        )}
      </AnimatePresence>

      <div className={cn(
        "bg-white border-l border-slate-100 flex flex-col shadow-2xl transition-all duration-300 z-40",
        "fixed inset-y-0 right-0 w-full sm:w-[380px] lg:relative lg:w-[400px] lg:translate-x-0",
        showCart ? "translate-x-0" : "translate-x-full"
      )}>
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <h3 className="text-xl font-bold flex items-center gap-2">
            <ShoppingCart size={24} className="text-violet-600" /> Pesanan Saat Ini
          </h3>
          <button onClick={() => setShowCart(false)} className="lg:hidden p-2 text-slate-400 hover:text-slate-600">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400">
              <ShoppingCart size={64} strokeWidth={1} className="mb-4 opacity-20" />
              <p>Keranjang kosong</p>
            </div>
          ) : (
            cart.map(item => {
              const hasItemDiscount = item.discount_type && item.discount_type !== 'none';
              const priceAfterDiscount = getItemPriceAfterDiscount(item);
              const itemTotal = priceAfterDiscount * item.quantity;

              return (
                <div key={item.id} className="flex flex-col gap-2 pb-4 border-b border-slate-100 last:border-0">
                  <div className="flex gap-4 justify-between items-start">
                    <div className="flex-1">
                      <h5 className="font-bold text-slate-900 text-sm">{item.name}</h5>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={cn("text-xs text-slate-500", hasItemDiscount && "line-through opacity-50")}>
                          {formatCurrency(item.price)}
                        </span>
                        {hasItemDiscount && (
                          <span className="text-xs text-emerald-600 font-bold">
                            {formatCurrency(priceAfterDiscount)}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 mt-2">
                        <button onClick={() => updateQuantity(item.id, -1)} className="w-6 h-6 rounded-md border border-slate-200 flex items-center justify-center hover:bg-slate-50 text-xs font-bold">-</button>
                        <span className="text-sm font-bold">{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.id, 1)} className="w-6 h-6 rounded-md border border-slate-200 flex items-center justify-center hover:bg-slate-50 text-xs font-bold">+</button>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="font-bold text-slate-900 text-sm">{formatCurrency(itemTotal)}</p>
                      <button onClick={() => removeFromCart(item.id)} className="text-rose-500 mt-2 hover:text-rose-600 block ml-auto">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Per-item Discount Controls */}
                  <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-100 mt-1">
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Diskon Item:</span>
                    <select
                      value={
                        item.discount_type && item.discount_type !== 'none'
                          ? discountsList.find(d => d.type === item.discount_type && Number(d.value) === Number(item.discount_value))?.id?.toString() || 'none'
                          : 'none'
                      }
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === 'none') {
                          updateItemDiscount(item.id, 'none', 0);
                        } else {
                          const d = discountsList.find(x => x.id.toString() === val);
                          if (d) {
                            updateItemDiscount(item.id, d.type, Number(d.value));
                          }
                        }
                      }}
                      className="bg-white border border-slate-200 rounded-md p-1 text-[10px] font-bold outline-none cursor-pointer flex-1"
                    >
                      <option value="none">Tanpa Diskon</option>
                      {discountsList.map(d => (
                        <option key={d.id} value={d.id}>
                          {d.name} ({d.type === 'percent' ? d.value + '%' : formatCurrency(d.value)})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="p-6 bg-slate-50 border-t border-slate-100 space-y-4">
          <div className="flex justify-between items-center text-slate-500">
            <span>Subtotal</span>
            <span className="font-medium">{formatCurrency(subtotal)}</span>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center text-slate-500">
              <span className="text-xs font-bold uppercase tracking-wider">Diskon</span>
              <select
                className="bg-white border border-slate-200 rounded-lg p-1 text-xs font-bold outline-none"
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === 'none') {
                    setDiscountType('none');
                    setDiscountValue('');
                  } else {
                    const d = discountsList.find(x => x.id.toString() === val);
                    if (d) {
                      setDiscountType(d.type);
                      setDiscountValue(d.value.toString());
                    }
                  }
                }}
              >
                <option value="none">Tanpa Diskon</option>
                {discountsList.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.type === 'percent' ? d.value + '%' : formatCurrency(d.value)})
                  </option>
                ))}
              </select>
            </div>

            {discountAmount > 0 && (
              <div className="flex justify-between items-center text-rose-500 text-xs font-bold">
                <span>Potongan Harga</span>
                <span>-{formatCurrency(discountAmount)}</span>
              </div>
            )}
          </div>

          <div className="flex justify-between items-center pt-4 border-t border-slate-200">
            <span className="text-lg font-bold">Total</span>
            <span className="text-2xl font-black text-violet-600">{formatCurrency(total)}</span>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              disabled={cart.length === 0}
              onClick={() => setIsSaveBillModalOpen(true)}
              className="flex-1 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl text-sm font-bold shadow-sm hover:bg-slate-50 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Save size={18} /> Simpan Bill
            </button>
            <button
              disabled={cart.length === 0}
              onClick={() => setPaymentModal(true)}
              className="flex-1 py-3 bg-violet-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-violet-100 hover:bg-violet-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <WalletCards size={18} /> Bayar
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {receiptData && (
          <ReceiptModal transaction={receiptData} onClose={() => setReceiptData(null)} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isSaveBillModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsSaveBillModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-white w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl p-8 space-y-6"
            >
              <h3 className="text-2xl font-bold">Simpan Bill</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Meja (Opsional)</label>
                  <input value={newBillTable} onChange={e => setNewBillTable(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl" placeholder="Contoh: Meja 05" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Pelanggan (Opsional)</label>
                  <input value={newBillCustomer} onChange={e => setNewBillCustomer(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl" placeholder="Nama pelanggan" />
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setIsSaveBillModalOpen(false)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold">Batal</button>
                <button onClick={handleSaveOpenBill} className="flex-1 py-3 bg-violet-600 text-white rounded-xl font-bold">Simpan</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpenBillsModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsOpenBillsModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-white w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[80vh]"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <Clock size={24} className="text-violet-600" /> Bill Tersimpan
                </h3>
                <button onClick={() => setIsOpenBillsModalOpen(false)} className="p-2 text-slate-400"><X size={24} /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {openBills.length === 0 ? (
                  <p className="text-center text-slate-500 py-10">Tidak ada bill tersimpan</p>
                ) : (
                  openBills.map(bill => (
                    <div key={bill.id} className="p-4 border border-slate-100 rounded-2xl flex justify-between items-center hover:border-violet-200 transition-all">
                      <div>
                        <h4 className="font-bold text-slate-900">{bill.table_name || 'Tanpa Meja'}</h4>
                        <p className="text-xs text-slate-500">{bill.customer_name || 'Umum'} • {bill.items.length} item</p>
                        <p className="text-[10px] text-slate-400 mt-1">{new Date(bill.created_at).toLocaleString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-violet-600 mb-2">{formatCurrency(bill.items.reduce((s, i) => s + (i.price * i.quantity), 0))}</p>
                        <div className="flex gap-2">
                          <button onClick={() => handleDeleteOpenBill(bill.id)} className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-all" title="Hapus Bill"><Trash2 size={16} /></button>
                          <button onClick={() => handleLoadOpenBill(bill)} className="px-4 py-2 bg-violet-50 text-violet-600 rounded-lg text-xs font-bold hover:bg-violet-100 transition-all">Buka Bill</button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {paymentModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setPaymentModal(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-white w-full max-w-md rounded-3xl overflow-hidden shadow-2xl"
            >
              <div className="p-8">
                <h3 className="text-2xl font-bold mb-6">Pembayaran</h3>

                <div className="space-y-6">
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Metode</label>
                    <div className="grid grid-cols-3 gap-3">
                      {['cash', 'transfer', 'qris'].map(m => (
                        <button
                          key={m}
                          onClick={() => {
                            setPaymentMethod(m);
                            if (m !== 'cash') {
                              setCashReceived(total.toString());
                            } else {
                              setCashReceived('');
                            }
                          }}
                          className={cn(
                            "py-3 rounded-xl border text-sm font-bold capitalize transition-all",
                            paymentMethod === m ? "border-violet-600 bg-violet-50 text-violet-600" : "border-slate-200 text-slate-500 hover:border-slate-300"
                          )}
                        >
                          {m === 'cash' ? 'Tunai' : m}
                        </button>
                      ))}
                    </div>
                  </div>

                  {paymentMethod === 'cash' && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Uang Diterima</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">Rp</span>
                        <input
                          type="number"
                          autoFocus
                          className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-2xl font-bold outline-none focus:ring-2 focus:ring-violet-500"
                          value={cashReceived}
                          onChange={(e) => setCashReceived(e.target.value)}
                          placeholder="0"
                        />
                      </div>
                    </motion.div>
                  )}

                  <div className="p-4 bg-violet-50 rounded-2xl space-y-2">
                    <div className="flex justify-between text-sm text-violet-600 font-medium">
                      <span>Total Tagihan</span>
                      <span>{formatCurrency(total)}</span>
                    </div>
                    {paymentMethod === 'cash' && (
                      <div className="flex justify-between items-center pt-2">
                        <span className="text-sm font-bold text-violet-900">Status</span>
                        <span className={cn(
                          "text-sm font-black px-3 py-1 rounded-lg",
                          receivedAmount === 0 ? "bg-slate-100 text-slate-400" :
                            receivedAmount < total ? "bg-rose-100 text-rose-600" :
                              receivedAmount === total ? "bg-emerald-100 text-emerald-600" :
                                "bg-violet-100 text-violet-600"
                        )}>
                          {receivedAmount === 0 ? "Menunggu Pembayaran" :
                            receivedAmount < total ? "Uang tidak cukup" :
                              receivedAmount === total ? "Uang pas" :
                                `Kembalian: ${formatCurrency(change)}`}
                        </span>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={handleCheckout}
                    disabled={(paymentMethod === 'cash' && receivedAmount < total) || !activeRegister}
                    className="w-full py-4 bg-violet-600 text-white rounded-2xl font-bold shadow-lg shadow-violet-100 hover:bg-violet-700 transition-all disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed"
                  >
                    {!activeRegister ? "Buka Kasir Terlebih Dahulu" : "Selesaikan Transaksi"}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Buka / Tutup Kasir */}
      <AnimatePresence>
        {isRegisterModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsRegisterModalOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-white w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl p-6"
            >
              <h3 className="text-xl font-bold mb-4">{activeRegister ? "Tutup Kasir" : "Buka Kasir"}</h3>
              <form onSubmit={handleOpenRegister}>
                {activeRegister && expectedBalance !== null && (
                  <div className="mb-4 p-4 bg-slate-50 border border-slate-200 rounded-xl">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Saldo Diharapkan (Sistem)</p>
                    <p className="text-2xl font-black text-slate-800">{formatCurrency(expectedBalance)}</p>
                  </div>
                )}
                <div className="mb-4">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">
                    {activeRegister ? "Saldo Aktual di Laci Kasir" : "Saldo Awal (Modal Kembalian)"}
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">Rp</span>
                    <input
                      type="number"
                      required
                      value={openingBalance}
                      onChange={(e) => setOpeningBalance(e.target.value)}
                      className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-violet-500 font-bold text-lg"
                    />
                  </div>
                </div>
                {activeRegister && expectedBalance !== null && openingBalance !== '' && (
                  <div className={cn(
                    "mb-4 p-3 rounded-xl border text-sm font-bold",
                    Number(openingBalance) === expectedBalance ? "bg-emerald-50 border-emerald-100 text-emerald-600" :
                      Number(openingBalance) < expectedBalance ? "bg-rose-50 border-rose-100 text-rose-600" :
                        "bg-amber-50 border-amber-100 text-amber-600"
                  )}>
                    {Number(openingBalance) === expectedBalance ? "Sesuai" :
                      Number(openingBalance) < expectedBalance ? `Minus: -${formatCurrency(expectedBalance - Number(openingBalance))}` :
                        `Lebih: +${formatCurrency(Number(openingBalance) - expectedBalance)}`}
                  </div>
                )}
                <div className="flex gap-3 mt-6">
                  <button type="button" onClick={() => setIsRegisterModalOpen(false)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200">Batal</button>
                  <button type="submit" className={cn(
                    "flex-1 py-3 text-white rounded-xl font-bold shadow-lg",
                    activeRegister ? "bg-rose-500 shadow-rose-200 hover:bg-rose-600" : "bg-emerald-500 shadow-emerald-200 hover:bg-emerald-600"
                  )}>Simpan</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Floating Bottom Cart Bar for Mobile */}
      {cart.length > 0 && (
        <div className="lg:hidden fixed bottom-4 left-4 right-4 z-40 bg-violet-600 text-white rounded-2xl shadow-xl p-4 flex justify-between items-center">
          <div>
            <p className="text-[10px] text-violet-200 font-bold uppercase tracking-wider">{cart.length} Item</p>
            <p className="text-base font-black">{formatCurrency(total)}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowCart(true)}
              className="px-3.5 py-2 bg-white/20 hover:bg-white/30 rounded-xl text-xs font-bold transition-all"
            >
              Detail Order
            </button>
            <button
              onClick={() => setPaymentModal(true)}
              className="px-3.5 py-2 bg-white text-violet-600 rounded-xl text-xs font-black shadow-md hover:bg-violet-50 transition-all select-none cursor-pointer"
            >
              Bayar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
