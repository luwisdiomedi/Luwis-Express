/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, createContext, useContext } from "react";
import Auth from "./components/Auth";
import AdminDashboard from "./components/AdminDashboard";
import RiderDashboard from "./components/RiderDashboard";
import { CheckCircle, XCircle } from "lucide-react";
import Logo from "./components/Logo";
import { api } from "./lib/api";
import { translations, Language } from "./translations";

// Toast Notification System
const ToastContext = createContext<any>(null);
const LanguageContext = createContext<any>(null);

export const useToast = () => useContext(ToastContext);
export const useLanguage = () => useContext(LanguageContext);

function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Language>(() => (localStorage.getItem('lang') as Language) || 'sw');

  useEffect(() => {
    localStorage.setItem('lang', lang);
  }, [lang]);

  const t = translations[lang];

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<any[]>([]);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    const id = Date.now();
    setToasts([...toasts, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-8 right-8 z-[100] flex flex-col gap-3 pointer-events-none">
        {toasts.map(t => (
          <div 
            key={t.id} 
            className={`flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl animate-in slide-in-from-right duration-300 border ${
              t.type === 'success' 
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                : 'bg-red-500/10 border-red-500/20 text-red-400'
            } backdrop-blur-xl pointer-events-auto`}
          >
            {t.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
            <span className="font-bold text-sm tracking-tight">{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem("luwis_token"));
  const [loading, setLoading] = useState(true);

  const checkAuth = async (currentToken: string) => {
    try {
      const userData = await api.get("/auth/me", currentToken);
      setUser(userData);
    } catch (err) {
      handleLogout();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      checkAuth(token);
    } else {
      setLoading(false);
    }
  }, []);

  const handleLogin = (userData: any, userToken: string) => {
    setUser(userData);
    setToken(userToken);
    localStorage.setItem("luwis_token", userToken);
  };

  const handleLogout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("luwis_token");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Logo size="lg" className="animate-pulse" />
          <div className="text-slate-500 font-medium font-display animate-pulse uppercase tracking-[0.3em] text-[10px]">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <LanguageProvider>
      <ToastProvider>
        <div className="min-h-screen bg-slate-950 text-slate-100">
          <AppContent user={user} token={token} handleLogin={handleLogin} onLogout={handleLogout} />
        </div>
      </ToastProvider>
    </LanguageProvider>
  );
}

function AppContent({ user, token, handleLogin, onLogout }: any) {
  const { lang, setLang, t } = useLanguage();
  const { showToast } = useToast();

  if (!user || !token) {
    return (
      <div className="relative">
        <div className="absolute top-8 right-8 z-[60]">
          <div className="flex gap-2 bg-slate-900/80 backdrop-blur-xl p-2 rounded-2xl border border-slate-800 shadow-2xl">
            {(['sw', 'en', 'rn', 'fr'] as Language[]).map((l) => (
              <button
                key={l}
                onClick={() => {
                  setLang(l);
                  showToast(translations[l].success);
                }}
                className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all ${
                  lang === l 
                    ? 'bg-orange-500 scale-110 shadow-lg shadow-orange-500/40 text-lg' 
                    : 'text-slate-500 hover:text-white hover:bg-slate-800 text-base'
                }`}
              >
                {translations[l].flag}
              </button>
            ))}
          </div>
        </div>
        <Auth onLogin={handleLogin} />
      </div>
    );
  }

  return (
    <>
      <div className="fixed top-6 right-6 z-[60] flex items-center gap-1 bg-slate-900/80 p-1 rounded-xl border border-slate-800/50 backdrop-blur-xl shadow-2xl">
        {(['sw', 'en', 'rn', 'fr'] as Language[]).map((l) => (
          <button
            key={l as string}
            onClick={() => {
              setLang(l as Language);
              showToast(translations[l].success);
            }}
            className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm transition-all ${
              lang === l ? 'bg-orange-500 scale-110 shadow-lg shadow-orange-500/20' : 'text-slate-500 hover:text-white hover:bg-slate-800'
            }`}
          >
            {translations[l as Language].flag}
          </button>
        ))}
      </div>
      {user.role === "admin" ? (
        <AdminDashboard token={token} user={user} onLogout={onLogout} />
      ) : (
        <RiderDashboard token={token} user={user} onLogout={onLogout} />
      )}
    </>
  );
}
