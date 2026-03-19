
import React from 'react';
import { LogOut, Monitor, ShieldCheck } from 'lucide-react';
import { MENU_ITEMS } from '../constants';

interface SidebarProps {
  activeView: string;
  setActiveView: (view: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeView, setActiveView }) => {
  return (
    <div className="w-64 h-full bg-[#0f172a] border-r border-slate-800 flex flex-col fixed left-0 top-0 z-50">
      {/* Logo Section */}
      <div className="p-6 flex items-center gap-3">
        <div className="w-10 h-10 bg-gradient-to-br from-red-600 to-rose-500 rounded-lg flex items-center justify-center shadow-lg shadow-red-900/20">
          <ShieldCheck className="text-white w-6 h-6" />
        </div>
        <div>
            CAPT<span className="text-green-500">OR V2.5</span>
          <p className="text-[10px] text-slate-500 font-medium tracking-widest uppercase">ARX Digital Elite</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 mt-4 space-y-1">
        {MENU_ITEMS.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveView(item.id)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${activeView === item.id
                ? 'bg-purple-600/10 text-purple-400 border border-purple-500/20 shadow-sm shadow-purple-500/10'
                : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-100'
              }`}
          >
            <item.icon className={`w-5 h-5 transition-transform duration-200 ${activeView === item.id ? 'scale-110' : 'group-hover:scale-110'}`} />
            <span className="font-medium text-sm">{item.label}</span>
            {activeView === item.id && (
              <div className="ml-auto w-1.5 h-1.5 rounded-full bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.8)]" />
            )}
          </button>
        ))}
      </nav>

      {/* System Status Footer */}
      <div className="p-4 mt-auto">
        <div className="p-4 rounded-2xl bg-slate-900/50 border border-slate-800">
          <div className="flex items-center gap-3 mb-3">
            <div className="relative">
              <Monitor className="text-slate-400 w-5 h-5" />
              <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-green-500 rounded-full pulse-dot shadow-[0_0_10px_rgba(34,197,94,0.6)]" />
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-semibold text-slate-200 truncate">MacBook Pro</p>
              <p className="text-[10px] text-green-500 font-bold uppercase tracking-wide">Conectado</p>
            </div>
          </div>
          <button className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-slate-800 hover:bg-red-900/20 hover:text-red-400 text-slate-400 rounded-lg text-xs font-medium transition-colors">
            <LogOut className="w-3.5 h-3.5" />
            Desconectar
          </button>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
