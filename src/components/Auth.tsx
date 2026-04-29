import React, { useState } from "react";
import { api } from "../lib/api";
import { motion, AnimatePresence } from "motion/react";
import { 
  LogIn, UserPlus, ShieldCheck, 
  Mail, Lock, User, Phone, CheckCircle2,
  ArrowRight, Loader2
} from "lucide-react";
import Logo from "./Logo";

interface AuthProps {
  onLogin: (user: any, token: string) => void;
}

export default function Auth({ onLogin }: AuthProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [isForgot, setIsForgot] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
  });

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const data = await api.post("/auth/forgot-password", { email: formData.email });
      setError(data.message);
      setTimeout(() => setIsForgot(false), 5000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      if (isLogin) {
        const data = await api.post("/auth/login", {
          email: formData.email,
          password: formData.password,
        });
        onLogin(data.user, data.token);
      } else {
        await api.post("/auth/register", formData);
        setIsLogin(true);
        setError("Usajili umefanikiwa! Subiri Admin aidhinishe akaunti yako.");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (isForgot) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-orange-500/10 rounded-full blur-[120px]" />
        </div>
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md relative z-10">
          <div className="glass rounded-[40px] p-8 md:p-10">
            <h2 className="text-2xl font-display font-bold text-white mb-2">Sahau Nenosiri?</h2>
            <p className="text-slate-500 text-sm mb-8">Weka email yako ili kupata maelekezo ya kubadili nenosiri.</p>
            <form onSubmit={handleForgot} className="space-y-4">
              <AuthInput 
                icon={<Mail className="w-5 h-5" />} 
                type="email" 
                placeholder="Barua Pepe" 
                value={formData.email}
                onChange={(val: string) => setFormData({...formData, email: val})}
              />
              {error && (
                <div className={`text-[10px] font-bold text-center py-2 px-3 rounded-lg border ${error.includes('pokelewa') ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                  {error}
                </div>
              )}
              <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-4 rounded-2xl shadow-xl shadow-orange-500/20 transition-all flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Tuma Ombi"}
              </button>
              <button type="button" onClick={() => setIsForgot(false)} className="w-full text-slate-500 text-xs font-bold uppercase tracking-widest mt-4">Rudi Kuingia</button>
            </form>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 selection:bg-orange-500/30">
      {/* Background Glows */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-orange-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[120px]" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="text-center mb-10">
          <Logo size="lg" className="justify-center mb-6" />
          <p className="text-slate-500 mt-2 text-sm font-medium uppercase tracking-[0.3em] pl-1">Speed. Reliability. Service.</p>
        </div>

        <div className="glass rounded-[40px] p-8 md:p-10 relative overflow-hidden">
          <div className="flex items-center gap-2 mb-8 bg-slate-900/50 p-1.5 rounded-2xl border border-slate-800">
            <button 
              type="button"
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all uppercase tracking-widest ${isLogin ? 'bg-slate-800 text-white shadow-lg shadow-black/40' : 'text-slate-600 hover:text-slate-400'}`}
            >
              Ingia
            </button>
            <button 
              type="button"
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all uppercase tracking-widest ${!isLogin ? 'bg-slate-800 text-white shadow-lg shadow-black/40' : 'text-slate-600 hover:text-slate-400'}`}
            >
              Sajili
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <AnimatePresence mode="wait">
              <motion.div
                key={isLogin ? 'login' : 'register'}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                {!isLogin && (
                  <>
                    <AuthInput 
                      icon={<User className="w-5 h-5" />} 
                      type="text" 
                      placeholder="Jina Kamili" 
                      value={formData.name}
                      autoComplete="name"
                      onChange={(val: string) => setFormData({...formData, name: val})}
                    />
                    <AuthInput 
                      icon={<Phone className="w-5 h-5" />} 
                      type="tel" 
                      placeholder="Namba ya Simu" 
                      value={formData.phone}
                      autoComplete="tel"
                      onChange={(val: string) => setFormData({...formData, phone: val})}
                    />
                  </>
                )}
                <AuthInput 
                  icon={<Mail className="w-5 h-5" />} 
                  type="email" 
                  placeholder="Barua Pepe" 
                  value={formData.email}
                  autoComplete="email"
                  onChange={(val: string) => setFormData({...formData, email: val})}
                />
                <AuthInput 
                  icon={<Lock className="w-5 h-5" />} 
                  type="password" 
                  placeholder="Neno la Siri" 
                  value={formData.password}
                  autoComplete={isLogin ? "current-password" : "new-password"}
                  onChange={(val: string) => setFormData({...formData, password: val})}
                />
                {isLogin && (
                  <div className="flex justify-end">
                    <button 
                      type="button" 
                      onClick={() => setIsForgot(true)}
                      className="text-[10px] text-slate-500 hover:text-orange-500 font-bold uppercase tracking-wider transition-colors"
                    >
                      Sahau Nenosiri?
                    </button>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>

            {error && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className={`text-[10px] font-bold text-center py-2 px-3 rounded-lg border flex items-center justify-center ${error.includes('fanikiwa') ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}
              >
                {error}
              </motion.div>
            )}

            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-bold py-4 rounded-2xl shadow-xl shadow-orange-500/20 transition-all flex items-center justify-center gap-2 active:scale-95 group"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                <>
                  <span className="uppercase tracking-widest text-sm">{isLogin ? "Ingia Sasa" : "Tengeneza Akaunti"}</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <p className="mt-8 text-center text-[10px] text-slate-600 font-bold uppercase tracking-[0.2em]">
            Luwis Express &copy; {new Date().getFullYear()}
          </p>
        </div>

        <div className="mt-8 flex justify-center gap-6 text-slate-600">
          <div className="flex items-center gap-1.5 grayscale opacity-50 text-orange-500">
            <ShieldCheck className="w-4 h-4" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Salama</span>
          </div>
          <div className="flex items-center gap-1.5 grayscale opacity-50 text-orange-500">
            <CheckCircle2 className="w-4 h-4" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Imeidhinishwa</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function AuthInput({ icon, value, onChange, ...props }: { icon: any, value: string, onChange: (val: string) => void, [key: string]: any }) {
  return (
    <div className="relative group">
      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-orange-500 transition-colors">
        {icon}
      </div>
      <input 
        {...props} 
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-slate-900 border border-slate-800 rounded-2xl py-4 pl-12 pr-6 text-white text-sm font-medium focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 outline-none transition-all placeholder:text-slate-700"
        required
      />
    </div>
  );
}
