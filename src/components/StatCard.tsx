import React from 'react';
import { cn } from '../lib/utils';
import { Card } from './Card';

export const StatCard = ({ label, value, icon: Icon, trend, color }: any) => (
  <Card className="flex items-center gap-6 shadow-sm border border-slate-50">
    <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg", color)}>
      <Icon size={24} />
    </div>
    <div>
      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{label}</p>
      <h3 className="text-2xl font-black text-slate-900 mt-1">{value}</h3>
      {trend && (
        <p className="text-xs font-bold text-emerald-500 mt-1">{trend}</p>
      )}
    </div>
  </Card>
);
