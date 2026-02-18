
import React from 'react';
import * as LucideIcons from 'lucide-react';
import { MetricData } from '../types';

const MetricCard: React.FC<MetricData> = ({ label, value, trend, icon }) => {
  // @ts-ignore - Dynamically picking icon from lucide
  const Icon = LucideIcons[icon];

  const isNumericTrend = trend?.includes('%');

  return (
    <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 hover:border-slate-700 transition-all group">
      <div className="flex justify-between items-start mb-4">
        <div className="p-2.5 rounded-xl bg-slate-800 text-purple-400 group-hover:bg-purple-600 group-hover:text-white transition-all duration-300">
          <Icon className="w-5 h-5" />
        </div>
        {trend && (
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
            isNumericTrend 
              ? (trend.startsWith('+') ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500')
              : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
          }`}>
            {trend}
          </span>
        )}
      </div>
      <div>
        <h3 className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-1">{label}</h3>
        <p className="text-2xl font-bold text-white tracking-tight">{value}</p>
      </div>
    </div>
  );
};

export default MetricCard;
