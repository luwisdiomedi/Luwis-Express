import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  LayoutDashboard, MapPinned, Users, 
  BarChart3, Settings, LogOut, Menu, X, 
  User, CheckCircle2, ChevronRight, Globe
} from "lucide-react";
import { useLanguage } from "../App";
import { translations, Language } from "../translations";
import Logo from "./Logo";

interface ShellProps {
  user: any;
  onLogout: () => void;
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  menuItems: { id: string; label: string; icon: any }[];
}

function LanguageSelector() {
  const { lang, setLang } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-lg hover:border-orange-500/50 transition-all active:scale-95 shadow-lg"
      >
        {translations[lang].flag}
      </button>
      
      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            <motion.div 
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute right-0 mt-2 w-48 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-2 z-50 backdrop-blur-xl"
            >
              {(['sw', 'en', 'rn', 'fr'] as Language[]).map((l) => (
                <button
                  key={l}
                  onClick={() => {
                    setLang(l);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                    lang === l ? 'bg-orange-500 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <span className="text-lg">{translations[l].flag}</span>
                  <span className="capitalize">{translations[l].language}</span>
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function Shell({ user, onLogout, children, activeTab, setActiveTab, menuItems }: ShellProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col md:flex-row">
      {/* Mobile Top Bar */}
      <div className="md:hidden glass sticky top-0 z-[60] flex items-center justify-between px-4 py-3">
        <button 
          onClick={() => setIsSidebarOpen(true)}
          className="p-2 text-slate-400 hover:text-white bg-slate-900 rounded-xl border border-slate-800 ml-1"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          <Logo size="sm" />
        </div>
        <LanguageSelector />
      </div>

      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-slate-900/50 border-r border-slate-800/50 sticky top-0 h-screen p-6">
        <div className="mb-10">
          <Logo size="md" />
        </div>

        <nav className="flex-1 space-y-1">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium transition-all group ${
                activeTab === item.id 
                ? "bg-orange-500/10 text-orange-500 border border-orange-500/20" 
                : "text-slate-400 hover:text-white hover:bg-slate-800/50"
              }`}
            >
              <item.icon className={`w-5 h-5 ${activeTab === item.id ? "text-orange-500" : "text-slate-500 group-hover:text-slate-300"}`} />
              {t[item.id as keyof typeof t] || item.label}
              {activeTab === item.id && (
                <motion.div layoutId="activePill" className="ml-auto">
                  <ChevronRight className="w-4 h-4" />
                </motion.div>
              )}
            </button>
          ))}
        </nav>

        <div className="mt-auto pt-6 border-t border-slate-800/50 space-y-4">
          <div className="flex items-center gap-3 px-2">
            <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center">
              <User className="w-5 h-5 text-slate-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold text-white truncate">{user.name}</div>
              <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold flex items-center gap-1">
                {user.role === 'admin' ? t.admin || 'Msimamizi' : t.rider || 'Dereva'}
                {user.status === 'active' && <CheckCircle2 className="w-2.5 h-2.5 text-emerald-500" />}
              </div>
            </div>
          </div>
          <button 
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium text-red-400 hover:bg-red-500/10 transition-all border border-transparent hover:border-red-500/20"
          >
            <LogOut className="w-5 h-5" />
            {t.logout || "Ondoka"}
          </button>
        </div>
      </aside>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[70] md:hidden"
            />
            <motion.aside 
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 w-4/5 max-w-sm bg-slate-900 z-[80] p-6 flex flex-col md:hidden"
            >
              <div className="flex items-center justify-between mb-10">
                <Logo size="md" />
                <button onClick={() => setIsSidebarOpen(false)} className="p-2 text-slate-400">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <nav className="flex-1 space-y-2">
                {menuItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id);
                      setIsSidebarOpen(false);
                    }}
                    className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-base font-medium transition-all ${
                      activeTab === item.id 
                      ? "bg-orange-500 text-white shadow-lg shadow-orange-500/20" 
                      : "text-slate-400 hover:text-white hover:bg-slate-800"
                    }`}
                  >
                    <item.icon className="w-5 h-5" />
                    {t[item.id as keyof typeof t] || item.label}
                  </button>
                ))}
              </nav>

              <div className="mt-auto pt-6 border-t border-slate-800 space-y-4">
                <button 
                  onClick={onLogout}
                  className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-base font-medium text-red-400 hover:bg-red-500/10 transition-all"
                >
                  <LogOut className="w-5 h-5" />
                  {t.logout || "Ondoka"}
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <main className="flex-1 h-screen overflow-y-auto custom-scrollbar relative">
        {/* Desktop Top Bar */}
        <header className="hidden md:flex glass sticky top-0 z-40 items-center justify-between px-8 py-4 mb-2">
          <div className="flex items-center gap-2 text-slate-400 text-sm font-medium uppercase tracking-widest">
            {t[activeTab as keyof typeof t] || menuItems.find(i => i.id === activeTab)?.label}
          </div>
          <div className="flex items-center gap-4">
            <LanguageSelector />
            <div className="flex flex-col items-end mr-2 ml-2">
              <span className="text-sm font-bold text-white">{user.name}</span>
              <span className="text-[10px] text-orange-500 font-bold uppercase tracking-wider">{user.role === 'admin' ? 'Msimamizi' : 'Dereva'}</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center">
              <User className="w-5 h-5 text-slate-400" />
            </div>
          </div>
        </header>

        <div className="relative z-10">
          {children}
        </div>
      </main>
    </div>
  );
}
