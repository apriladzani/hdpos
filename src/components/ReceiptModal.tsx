import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { CheckCircle2, Printer } from 'lucide-react';
import { formatCurrency, formatTransactionDate } from '../lib/utils';
import { api } from '../lib/api';

export const ReceiptModal = ({ transaction, onClose }: { transaction: any, onClose: () => void }) => {
  if (!transaction) return null;
  const [settings, setSettings] = useState<any>(null);

  useEffect(() => {
    api.get('/api/receipt-settings').then(setSettings);
  }, []);

  const handlePrint = () => {
    window.print();
  };

  const headline = settings?.headline || '@HD fried chicken';
  const address = settings?.address || 'Jl. Raya Utama No. 45';
  const phone = settings?.phone || '0812-3456-7890';
  const footerText = settings?.footer_text || 'Terima Kasih atas Kunjungan Anda!';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm no-print" 
      />
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="relative bg-white w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl flex flex-col animate-in fade-in zoom-in duration-200"
      >
        <div className="p-8 space-y-6 overflow-y-auto print:p-0 print:shadow-none max-h-[80vh]">
          {/* Receipt Header */}
          <div className="text-center space-y-2 border-b border-dashed border-slate-200 pb-6">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-2 no-print">
              <CheckCircle2 size={32} />
            </div>
            <h3 className="text-2xl font-black text-slate-900 leading-tight">{headline}</h3>
            <p className="text-sm font-semibold text-slate-700">{localStorage.getItem('receipt_sub_headline') || 'Cabang Utama'}</p>
            <p className="text-xs text-slate-500 font-medium">{address} • Telp: {phone}</p>
            <div className="h-2"></div>
            <p className="text-[10px] text-slate-500 font-medium">#{1000 + transaction.id} • {formatTransactionDate(transaction.date)}</p>
            <p className="text-[10px] text-slate-400">Kasir: {transaction.cashier_name || 'Admin'}</p>
          </div>

          {/* Items */}
          <div className="space-y-4 py-2">
            {transaction.items.map((item: any, i: number) => {
              const itemPrice = Number(item.price);
              const hasItemDiscount = item.discount_type && item.discount_type !== 'none';
              const priceAfterDiscount = hasItemDiscount
                ? (item.discount_type === 'percent'
                  ? Math.max(0, itemPrice - (itemPrice * Number(item.discount_value || 0)) / 100)
                  : Math.max(0, itemPrice - Number(item.discount_value || 0)))
                : itemPrice;
              const itemTotal = priceAfterDiscount * item.quantity;
              
              return (
                <div key={i} className="flex justify-between items-start gap-4">
                  <div className="flex-1">
                    <p className="text-sm font-bold text-slate-800">{item.name}</p>
                    <p className="text-[10px] text-slate-500">
                      {item.quantity} x {formatCurrency(itemPrice)}
                      {hasItemDiscount && (
                        <span className="text-rose-500 font-semibold ml-2">
                          (Disc {item.discount_type === 'percent' ? `${item.discount_value}%` : `-${formatCurrency(item.discount_value)}`})
                        </span>
                      )}
                    </p>
                  </div>
                  <p className="text-sm font-bold text-slate-900">{formatCurrency(itemTotal)}</p>
                </div>
              );
            })}
          </div>

          {/* Billing Info */}
          <div className="border-t border-dashed border-slate-200 pt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Subtotal</span>
              <span className="font-bold text-slate-800">{formatCurrency(transaction.subtotal)}</span>
            </div>
            {transaction.discount_amount > 0 && (
              <div className="flex justify-between text-sm text-rose-500 font-bold">
                <span>Diskon ({transaction.discount_type === 'percent' ? transaction.discount_value + '%' : 'Potongan'})</span>
                <span>-{formatCurrency(transaction.discount_amount)}</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-black border-t border-slate-100 pt-2 mt-2">
              <span>TOTAL</span>
              <span className="text-indigo-600">{formatCurrency(transaction.total_amount)}</span>
            </div>
          </div>

          <div className="border-t border-dashed border-slate-200 pt-4 space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-slate-500">Metode</span>
              <span className="font-bold uppercase">{transaction.payment_method}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-500">Diberikan</span>
              <span className="font-bold">{formatCurrency(transaction.cash_received)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-500">Kembali</span>
              <span className="font-bold">{formatCurrency(transaction.change_amount)}</span>
            </div>
          </div>

          <div className="text-center pt-4 border-t border-slate-100">
            <p className="text-xs text-slate-600 font-bold leading-relaxed">{footerText}</p>
          </div>
        </div>

        <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-3 no-print">
          <button 
            onClick={handlePrint}
            className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all"
          >
            <Printer size={18} /> Cetak Struk
          </button>
          <button 
            onClick={onClose}
            className="px-6 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-100 transition-all"
          >
            Tutup
          </button>
        </div>
      </motion.div>
    </div>
  );
};
