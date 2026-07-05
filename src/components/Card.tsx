import React from 'react';
import { cn } from '../lib/utils';

export const Card = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={cn("bg-white rounded-3xl p-6 shadow-sm border border-slate-50", className)}>
    {children}
  </div>
);
