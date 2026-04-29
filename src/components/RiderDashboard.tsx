import React, { useState, useEffect } from "react";
import { api } from "../lib/api";
import { motion } from "motion/react";
import { 
  Power, Wallet, History, Navigation, CheckCircle, 
  MapPin, Clock, CreditCard, Loader2, AlertTriangle,
  ArrowUpRight, LayoutDashboard, MapPinned, Settings as SettingsIcon,
  ChevronRight, Bike, PowerOff, DollarSign, Send,
  Smartphone, Upload, Image as ImageIcon, Plus
} from "lucide-react";
import Shell from "./Shell";
import Modal from "./Modal";
import { useToast, useLanguage } from "../App";
import { translations, Language } from "../translations";

interface RiderDashboardProps {
  token: string;
  user: any;
  onLogout: () => void;
}

export default function RiderDashboard({ token, user: initialUser, onLogout }: RiderDashboardProps) {
  const { showToast } = useToast();
  const { t } = useLanguage();
  const [user, setUser] = useState<any>(initialUser);
  const [profileData, setProfileData] = useState({
    name: initialUser?.name || "",
    phone: initialUser?.phone || "",
    plate_number: initialUser?.plate_number || "",
    profile_image: initialUser?.profile_image || null
  });
  const [activeTab, setActiveTab] = useState("home");
  const [trips, setTrips] = useState<any[]>([]);
  const [vehicle, setVehicle] = useState<any>(null);
  const [availableVehicles, setAvailableVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(false);
  const [dailyStatus, setDailyStatus] = useState<any>(null);
  const [isLipiaModalOpen, setIsLipiaModalOpen] = useState(false);
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [isBonusModalOpen, setIsBonusModalOpen] = useState(false);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const [withdrawDetails, setWithdrawDetails] = useState({
    amount: "",
    method: initialUser?.payment_method || "",
    account: initialUser?.payment_account || "",
    name: initialUser?.name || ""
  });
  const [payAmount, setPayAmount] = useState("5000");
  const [bonusAmount, setBonusAmount] = useState("");
  const [payMethod, setPayMethod] = useState<'wallet' | 'manual'>('wallet');
  const [selectedNetwork, setSelectedNetwork] = useState("");
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [txRef, setTxRef] = useState("");
  const [payouts, setPayouts] = useState<any[]>([]);
  const [paymentInfo, setPaymentInfo] = useState({ method: "", account: "" });
  const [totalDebt, setTotalDebt] = useState(0);

  const networks = [
    { id: 'mpesa', name: 'M-Pesa', color: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', number: '0791591274', owner: 'MICHAEL RWABUKOBA LYAMUKAMA' },
    { id: 'lumicash', name: 'LUMICASH', color: 'text-blue-400', bg: 'bg-blue-400/10', border: 'border-blue-400/20', number: '67788407', owner: 'LOUIS NDAGIJIMANA' },
    { id: 'airtel', name: 'Airtel Money', color: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/20', number: '688388889', owner: 'DAUD CHUBWA' },
    { id: 'halopesa', name: 'HaloPesa', color: 'text-orange-500', bg: 'bg-orange-500/10', border: 'border-orange-500/20', number: '634455274', owner: 'SADI RASHID MKOMI' },
  ];

  const menuItems = [
    { id: "home", label: "Nyumbani", icon: LayoutDashboard },
    { id: "vehicle", label: t.my_vehicle || "Chombo", icon: Bike },
    { id: "trips", label: "Safari", icon: MapPinned },
    { id: "wallet", label: "Wallet & Bonus", icon: Wallet },
    { id: "settings", label: "Profile", icon: SettingsIcon },
  ];

  const fetchData = async () => {
    try {
      const [u, t, ds, po, v, av] = await Promise.all([
        api.get("/auth/me", token),
        api.get("/rider/trips", token),
        api.get("/rider/daily-status", token),
        api.get("/rider/payouts", token),
        api.get("/rider/vehicle", token),
        api.get("/rider/available-vehicles", token)
      ]);
      setUser(u);
      setVehicle(v);
      setAvailableVehicles(av);
      setProfileData({
        name: u.name || "",
        phone: u.phone || "",
        plate_number: u.plate_number || "",
        profile_image: u.profile_image || null
      });
      setTrips(t);
      setDailyStatus(ds);
      setTotalDebt(ds.debt || 0);
      setPayAmount(String(u.daily_amount || 5000));
      setPayouts(po);
      setIsOnline(u.online_status === 1);
      setPaymentInfo({ method: u.payment_method || "", account: u.payment_account || "" });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setScreenshot(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleProfileImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileData({ ...profileData, profile_image: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleChooseVehicle = async (vehicleId: number) => {
    try {
      await api.post("/rider/choose-vehicle", { vehicle_id: vehicleId }, token);
      showToast(t.success);
      fetchData();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post("/rider/profile", profileData, token);
      showToast("Profile imesasishwa!");
      fetchData();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  const handlePayDaily = async () => {
    try {
      if (payMethod === 'manual' && !selectedNetwork) {
        showToast("Tafadhali chagua mtandao kwanza", "error");
        return;
      }
      if (payMethod === 'manual' && !screenshot) {
        showToast("Tafadhali weka picha ya muamala (Screenshot)", "error");
        return;
      }

      const payload = payMethod === 'wallet' 
        ? { amount: Number(payAmount), method: 'wallet' }
        : { 
            amount: Number(payAmount), 
            method: 'manual', 
            network: selectedNetwork,
            transaction_ref: txRef,
            screenshot: screenshot
          };
        
      await api.post("/rider/pay-daily", payload, token);
      showToast(payMethod === 'wallet' ? "Malipo yamefanikiwa!" : "Ombi la malipo limetumwa kwa uhakiki!");
      setIsLipiaModalOpen(false);
      setTxRef("");
      setScreenshot(null);
      setSelectedNetwork("");
      fetchData();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  const handleConvertBonus = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post("/rider/convert-bonus", { amount: Number(bonusAmount) }, token);
      setBonusAmount("");
      setIsBonusModalOpen(false);
      showToast("Bonus imebadilishwa kuwa pesa!");
      fetchData();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  const handleToggleStatus = async () => {
    try {
      const newStatus = isOnline ? 0 : 1;
      await api.post("/rider/toggle-status", { status: newStatus }, token);
      setIsOnline(!isOnline);
      showToast(newStatus === 1 ? "Uko Online sasa!" : "Uko Offline.");
      fetchData();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  const handleUpdatePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post("/rider/payment-info", paymentInfo, token);
      showToast("Taarifa za malipo zimehifadhiwa.");
      fetchData();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  const handleRequestPayout = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const amount = Number(withdrawDetails.amount);
      if (amount > user.wallet_balance) {
        showToast("Salio lako halitoshi!", "error");
        return;
      }
      
      await api.post("/rider/payout-request", { 
        amount,
        payment_method: withdrawDetails.method,
        payment_account: withdrawDetails.account,
        account_name: withdrawDetails.name
      }, token);

      setWithdrawDetails({ ...withdrawDetails, amount: "" });
      setIsWithdrawModalOpen(false);
      showToast("Ombi lako la pesa limetumwa.");
      fetchData();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  const handleStartTrip = async (id: number) => {
    try {
      await api.post(`/rider/trips/${id}/start`, {}, token);
      showToast("Safari imeanza!");
      fetchData();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  const handleCompleteTrip = async (id: number) => {
    try {
      await api.post(`/rider/trips/${id}/complete`, {}, token);
      showToast("Hongera! Safari imekamilika.");
      fetchData();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950">
      <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
    </div>
  );

  return (
    <Shell 
      user={user} 
      onLogout={onLogout} 
      activeTab={activeTab} 
      setActiveTab={setActiveTab}
      menuItems={menuItems}
    >
      <div className="p-4 md:p-8 space-y-8 animate-in fade-in duration-500 max-w-4xl mx-auto">
        {activeTab === "home" && (
          <div className="space-y-8">
            <header className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-display font-bold text-white uppercase tracking-tight">{t.welcome}, {user.name.split(' ')[0]}</h1>
                <p className="text-slate-500 text-sm">{t.status}: {isOnline ? t.online : t.offline}</p>
              </div>
              <button 
                onClick={handleToggleStatus}
                className={`p-4 rounded-2xl transition-all shadow-xl active:scale-95 ${
                  isOnline 
                  ? "bg-red-500/10 text-red-500 border border-red-500/20" 
                  : "bg-emerald-500 text-white shadow-emerald-500/20"
                }`}
              >
                {isOnline ? <PowerOff className="w-6 h-6" /> : <Power className="w-6 h-6" />}
              </button>
            </header>

            {/* Debt Alert Card */}
            {totalDebt > 0 && (
              <div className="glass-error p-6 rounded-[32px] border-2 border-red-500/20 bg-red-500/5 flex items-center justify-between animate-bounce-subtle">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-red-500/20 text-red-500 flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white uppercase tracking-tight">Una Deni la Jumla</div>
                    <div className="text-xl font-display font-bold text-red-500">TZS {totalDebt.toLocaleString()}</div>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    setPayAmount(String(totalDebt));
                    setIsLipiaModalOpen(true);
                  }}
                  className="bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-xl text-xs font-bold transition-all shadow-lg shadow-red-500/20 active:scale-95"
                >
                  Lipia Deni
                </button>
              </div>
            )}

            {/* Quick Cards Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="glass-emerald p-6 rounded-[32px] space-y-2">
                <div className="flex items-center justify-between">
                  <Wallet className="w-6 h-6 text-emerald-500" />
                  <span className="text-[10px] font-bold text-emerald-500/50 uppercase">ID: {user.rider_id_number || '---'}</span>
                </div>
                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{t.wallet_balance}</div>
                <div className="text-xl font-display font-bold text-white">TZS {(user.wallet_balance || 0).toLocaleString()}</div>
              </div>
              <div className="glass-purple p-6 rounded-[32px] space-y-2 cursor-pointer hover:scale-[1.02] transition-transform" onClick={() => setIsBonusModalOpen(true)}>
                <div className="flex items-center justify-between">
                  <DollarSign className="w-6 h-6 text-purple-500" />
                  <span className="text-[10px] font-bold text-purple-500/50 uppercase">Rate: TZS {user.daily_amount?.toLocaleString() || '5,000'}</span>
                </div>
                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{t.bonus_balance}</div>
                <div className="text-xl font-display font-bold text-white">TZS {(user.bonus_balance || 0).toLocaleString()}</div>
              </div>
            </div>

            {/* Lipia Card */}
            <div className="glass p-6 rounded-[32px] flex flex-col md:flex-row items-center justify-between border-2 border-emerald-500/20 bg-emerald-500/5 transition-all gap-4">
              <div className="flex items-center gap-4 w-full md:w-auto">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 bg-emerald-500/20 text-emerald-500">
                  <DollarSign className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-sm font-bold text-white uppercase tracking-tight">{t.pay_daily}</div>
                  <div className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">
                    Kila Siku: TZS {(user.daily_amount || 5000).toLocaleString()}
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col md:flex-row items-center gap-3 w-full md:w-auto">
                {dailyStatus?.paid && (
                  <div className="flex items-center gap-2 bg-emerald-500/10 text-emerald-500 px-4 py-2 rounded-xl text-[10px] font-bold uppercase border border-emerald-500/20">
                    <CheckCircle className="w-4 h-4" />
                    Leo Imelipwa
                  </div>
                )}
                
                <button 
                  onClick={() => {
                    setPayAmount(totalDebt > 0 ? String(totalDebt) : String(user.daily_amount || 5000));
                    setIsLipiaModalOpen(true);
                  }}
                  className="w-full md:w-auto bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-3 rounded-xl text-xs font-bold transition-all shadow-lg shadow-emerald-500/20 active:scale-95 flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  {totalDebt > 0 ? 'Lipika Deni' : 'Lipia Ada'}
                </button>
              </div>
            </div>

            {/* Modal for Payment Options */}
            <Modal isOpen={isLipiaModalOpen} onClose={() => setIsLipiaModalOpen(false)} title="Chagua Njia ya Malipo">
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={() => setPayMethod('wallet')}
                    className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${payMethod === 'wallet' ? 'border-emerald-500 bg-emerald-500/10' : 'border-slate-800 hover:border-slate-700'}`}
                  >
                    <Wallet className={`w-6 h-6 ${payMethod === 'wallet' ? 'text-emerald-500' : 'text-slate-500'}`} />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-white">Pesa za Wallet</span>
                  </button>
                  <button 
                    onClick={() => setPayMethod('manual')}
                    className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${payMethod === 'manual' ? 'border-emerald-500 bg-emerald-500/10' : 'border-slate-800 hover:border-slate-700'}`}
                  >
                    <Send className={`w-6 h-6 ${payMethod === 'manual' ? 'text-emerald-500' : 'text-slate-500'}`} />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-white">Hamisho la Simu</span>
                  </button>
                </div>

                {payMethod === 'wallet' ? (
                  <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] text-slate-500 font-bold uppercase ml-1">Kiasi cha Kulipa</label>
                        <span className="text-[9px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded">Bonus +10%</span>
                      </div>
                      <input 
                        type="number" 
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl py-3 px-4 text-white text-sm outline-none focus:border-emerald-500/50"
                        value={payAmount}
                        onChange={(e) => setPayAmount(e.target.value)}
                        placeholder="Ingiza kiasi"
                      />
                      <p className="text-[9px] text-slate-500 italic mt-1 pl-1">Lipa kiasi chote au zaidi ya ada kupata 10% ya pesa unayolipa kama bonus.</p>
                    </div>
                    <div className="flex justify-between items-center text-sm pt-2 border-t border-slate-800">
                      <span className="text-slate-500">Salio Lako:</span>
                      <span className="font-bold text-white uppercase">TZS {(user.wallet_balance || 0).toLocaleString()}</span>
                    </div>
                    <button 
                      onClick={handlePayDaily}
                      disabled={user.wallet_balance < Number(payAmount) || Number(payAmount) <= 0}
                      className="w-full py-4 bg-emerald-500 rounded-2xl text-white font-bold text-sm shadow-xl shadow-emerald-500/20 disabled:opacity-50 transition-all active:scale-[0.98]"
                    >
                      Lipia Sasa (Wallet)
                    </button>
                  </div>
                ) : (
                    <div className="space-y-6">
                      <div className="space-y-3">
                        <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest pl-1">Chagua Mtandao:</div>
                        <div className="grid grid-cols-2 gap-2">
                          {networks.map((net) => (
                            <button
                              key={net.id}
                              onClick={() => setSelectedNetwork(net.id)}
                              className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center gap-1 ${selectedNetwork === net.id ? `border-white bg-white/10` : `border-slate-800 hover:border-slate-700`}`}
                            >
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${net.bg} ${net.color}`}>
                                <Smartphone className="w-5 h-5" />
                              </div>
                              <span className="text-[9px] font-bold uppercase text-white">{net.name}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {selectedNetwork && (
                        <div className="space-y-4 animate-in slide-in-from-top-2 duration-300">
                          <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest pl-1">Tuma Pesa Kwenda:</div>
                          <div className={`p-4 rounded-2xl border ${networks.find(n => n.id === selectedNetwork)?.border} ${networks.find(n => n.id === selectedNetwork)?.bg}`}>
                            <div className={`text-xs font-bold mb-1 uppercase tracking-tight ${networks.find(n => n.id === selectedNetwork)?.color}`}>
                              {networks.find(n => n.id === selectedNetwork)?.name}
                            </div>
                            <div className="text-lg font-display font-bold text-white tracking-widest leading-none">
                              {networks.find(n => n.id === selectedNetwork)?.number}
                            </div>
                            <div className="text-[9px] text-slate-500 mt-1 uppercase font-bold">
                              {networks.find(n => n.id === selectedNetwork)?.owner}
                            </div>
                          </div>

                          <div className="space-y-3">
                            <div className="space-y-2">
                              <label className="text-[10px] text-slate-500 font-bold uppercase ml-1">Kiasi Ulichotuma (TZS)</label>
                              <input 
                                type="number" 
                                className="w-full bg-slate-900 border border-slate-800 rounded-xl py-3 px-4 text-white text-sm outline-none focus:border-emerald-500/50"
                                value={payAmount}
                                onChange={(e) => setPayAmount(e.target.value)}
                              />
                            </div>
                            
                            <div className="space-y-2">
                              <label className="text-[10px] text-slate-500 font-bold uppercase ml-1">Pakia Screenshot ya Muamala</label>
                              <div className="relative group">
                                <input 
                                  type="file" 
                                  accept="image/*"
                                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                  onChange={handleFileChange}
                                />
                                <div className={`w-full h-24 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center gap-2 transition-colors ${screenshot ? 'border-emerald-500 bg-emerald-500/5' : 'border-slate-800 group-hover:border-slate-700'}`}>
                                  {screenshot ? (
                                    <div className="flex flex-col items-center gap-1">
                                      <ImageIcon className="w-6 h-6 text-emerald-500" />
                                      <span className="text-[8px] font-bold text-emerald-500 uppercase">Picha Imewekwa</span>
                                    </div>
                                  ) : (
                                    <>
                                      <Upload className="w-6 h-6 text-slate-500" />
                                      <span className="text-[8px] font-bold text-slate-500 uppercase">Gusa kupakia picha</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="space-y-2">
                              <label className="text-[10px] text-slate-500 font-bold uppercase ml-1">Meseji ya Muamala / Ref ID (Hali)</label>
                              <input 
                                type="text" 
                                placeholder="Mfano: RX4567..."
                                className="w-full bg-slate-900 border border-slate-800 rounded-xl py-3 px-4 text-white text-sm outline-none focus:border-emerald-500/50"
                                value={txRef}
                                onChange={(e) => setTxRef(e.target.value)}
                              />
                            </div>
                          </div>
                          
                          <button 
                            onClick={handlePayDaily}
                            disabled={!screenshot}
                            className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 rounded-2xl text-white font-bold text-sm shadow-xl shadow-emerald-500/20 disabled:opacity-50 transition-all active:scale-[0.98]"
                          >
                            Tuma kwa ajili ya Uhakiki
                          </button>
                        </div>
                      )}
                    </div>
                )}
              </div>
            </Modal>

            {/* Home Withdrawal Section */}
            <div className="glass-emerald p-6 rounded-[32px] space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-emerald-500 uppercase tracking-widest flex items-center gap-2">
                  <Wallet className="w-4 h-4" /> {t.withdraw}
                </h2>
                <button 
                  onClick={() => setIsWithdrawModalOpen(true)}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-2 rounded-xl text-[10px] font-bold transition-all shadow-lg shadow-emerald-500/20 active:scale-95"
                >
                  {t.withdraw}
                </button>
              </div>
              
              <div className="bg-slate-900/40 p-4 rounded-2xl border border-emerald-500/10">
                <div className="text-[9px] text-slate-500 font-bold uppercase mb-1">{t.wallet_balance}:</div>
                <div className="text-xl font-display font-bold text-white uppercase tracking-tight">TZS {(user.wallet_balance || 0).toLocaleString()}</div>
              </div>
              
              {payouts.length > 0 && (
                <div className="pt-4 border-t border-emerald-500/10 space-y-2">
                  <div className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Maombi ya Karibuni:</div>
                  <div className="space-y-2">
                    {payouts.slice(0, 3).map(p => (
                      <div key={p.id} className="flex justify-between items-center bg-slate-900/50 p-3 rounded-xl border border-slate-800">
                        <div className="text-[10px] text-white font-bold">TZS {p.amount.toLocaleString()}</div>
                        <div className="flex items-center gap-2">
                          <span className="text-[8px] text-slate-500">{new Date(p.created_at).toLocaleDateString()}</span>
                          <span className={`text-[8px] font-bold uppercase px-1.5 py-0.5 rounded-full ${p.status === 'approved' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-yellow-500/10 text-yellow-500'}`}>
                            {p.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <p className="text-[9px] text-slate-500 italic">Pesa itatunwa kwenye akaunti yako (Benki/Simu) iliyosajiliwa.</p>
            </div>

            {/* Active Trips / Recent Section */}
            <div className="space-y-4">
              <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <Clock className="w-4 h-4" /> Safari Mpya
              </h2>
              {trips.filter(t => t.status !== 'completed').length === 0 ? (
                <div className="glass border-dashed rounded-[32px] py-12 text-center text-slate-500 italic">
                  Hakuna safari mpya kwa sasa
                </div>
              ) : (
                <div className="space-y-4">
                  {trips.filter(t => t.status !== 'completed').map(trip => (
                    <TripCard 
                      key={trip.id}
                      trip={trip}
                      onStart={() => handleStartTrip(trip.id)}
                      onComplete={() => handleCompleteTrip(trip.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "trips" && (
          <div className="space-y-6">
            <h1 className="text-2xl font-display font-bold text-white">Historia ya Safari</h1>
            <div className="space-y-4">
              {trips.map(trip => (
                <TripCard 
                  key={trip.id}
                  trip={trip}
                  onStart={() => handleStartTrip(trip.id)}
                  onComplete={() => handleCompleteTrip(trip.id)}
                />
              ))}
            </div>
          </div>
        )}

        {activeTab === "wallet" && (
          <div className="space-y-8">
            <h1 className="text-2xl font-display font-bold text-white">Wallet & Bonus</h1>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="glass-emerald p-8 rounded-[40px] space-y-6">
                <div className="space-y-1">
                  <div className="text-emerald-500/60 uppercase tracking-[0.2em] text-[10px] font-bold">Salio la Wallet</div>
                  <div className="text-4xl font-display font-bold text-white">TZS {(user.wallet_balance || 0).toLocaleString()}</div>
                </div>
                <button 
                  onClick={() => setIsWithdrawModalOpen(true)}
                  className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-4 rounded-2xl shadow-xl shadow-emerald-500/20 transition-all flex items-center justify-center gap-2"
                >
                  Kutoa Pesa (Withdraw) <ArrowUpRight className="w-5 h-5" />
                </button>
              </div>

              <div className="glass-purple p-8 rounded-[40px] space-y-6">
                <div className="space-y-1">
                  <div className="text-purple-500/60 uppercase tracking-[0.2em] text-[10px] font-bold">Bonus ya Wiki</div>
                  <div className="text-4xl font-display font-bold text-white">TZS {(user.bonus_balance || 0).toLocaleString()}</div>
                </div>
                <button 
                  onClick={() => setIsBonusModalOpen(true)}
                  className="w-full bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 font-bold py-4 rounded-2xl border border-purple-500/20 transition-all flex items-center justify-center gap-2"
                >
                  Badilisha kuwa Pesa <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="glass rounded-[32px] overflow-hidden">
              <div className="p-6 border-b border-slate-800/50 flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-2 uppercase tracking-widest">
                  <History className="w-4 h-4 text-slate-500" /> Historia ya Miamala
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-800/30 text-slate-500 text-[10px] uppercase tracking-widest font-bold">
                    <tr>
                      <th className="px-6 py-4">Tarehe</th>
                      <th className="px-6 py-4">Kiasi</th>
                      <th className="px-6 py-4">Hali</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {payouts.length === 0 ? (
                      <tr><td colSpan={3} className="px-6 py-10 text-center text-slate-500 italic">Hakuna miamala bado</td></tr>
                    ) : (
                      payouts.map((p) => (
                        <tr key={p.id} className="hover:bg-white/[0.02]">
                          <td className="px-6 py-4 text-xs text-slate-400">{new Date(p.created_at).toLocaleDateString()}</td>
                          <td className="px-6 py-4 text-xs font-bold text-white">TZS {p.amount.toLocaleString()}</td>
                          <td className="px-6 py-4">
                            <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full ${p.status === 'approved' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-yellow-500/10 text-yellow-500'}`}>
                              {p.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Bonus Conversion Modal */}
        <Modal isOpen={isBonusModalOpen} onClose={() => setIsBonusModalOpen(false)} title="Badilisha Bonus">
          <form onSubmit={handleConvertBonus} className="space-y-6">
            <div className="bg-purple-500/10 p-4 rounded-2xl border border-purple-500/20 text-center">
              <div className="text-[10px] text-purple-400 font-bold uppercase mb-1">Bonus Inayoweza Kubadilishwa</div>
              <div className="text-2xl font-display font-bold text-white tracking-tight">TZS {(user.bonus_balance || 0).toLocaleString()}</div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] text-slate-500 font-bold uppercase ml-1">Pesa ya Kubadilisha (TZS)</label>
              <input 
                type="number" 
                placeholder="Mfano 2000"
                className="w-full bg-slate-900 border border-slate-800 rounded-2xl py-4 px-6 text-white text-lg font-bold outline-none focus:ring-2 focus:ring-purple-500/50"
                value={bonusAmount}
                onChange={(e) => setBonusAmount(e.target.value)}
                required
              />
            </div>
            <button 
              type="submit"
              className="w-full bg-purple-500 hover:bg-purple-600 text-white font-bold py-4 rounded-2xl shadow-xl shadow-purple-500/20 transition-all active:scale-95"
            >
              Convert to Wallet Cash
            </button>
          </form>
        </Modal>

        {/* Withdrawal Modal */}
        <Modal isOpen={isWithdrawModalOpen} onClose={() => setIsWithdrawModalOpen(false)} title="Ombi la Kutoa Pesa">
          <form onSubmit={handleRequestPayout} className="space-y-6">
            <div className="bg-emerald-500/5 p-4 rounded-2xl border border-emerald-500/10 text-center">
              <div className="text-[10px] text-emerald-500 font-bold uppercase mb-1">Salio Linapatikana</div>
              <div className="text-2xl font-display font-bold text-white">TZS {(user.wallet_balance || 0).toLocaleString()}</div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] text-slate-500 font-bold uppercase ml-1">Kiasi cha Kutoa (TZS)</label>
                <input 
                  type="number" 
                  placeholder="Mfano 5000"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl py-4 px-6 text-white text-lg font-bold outline-none focus:ring-2 focus:ring-emerald-500/50"
                  value={withdrawDetails.amount}
                  onChange={(e) => setWithdrawDetails({...withdrawDetails, amount: e.target.value})}
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] text-slate-500 font-bold uppercase ml-1">Chagua Mtandao kupokelea</label>
                <select 
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl py-4 px-6 text-white text-sm outline-none focus:ring-2 focus:ring-emerald-500/50"
                  value={withdrawDetails.method}
                  onChange={(e) => setWithdrawDetails({...withdrawDetails, method: e.target.value})}
                  required
                >
                  <option value="">Chagua Mtandao...</option>
                  <option value="M-Pesa (TZ)">M-Pesa (Tanzania)</option>
                  <option value="Tigo Pesa (TZ)">Tigo Pesa (Tanzania)</option>
                  <option value="Airtel Money (TZ)">Airtel Money (Tanzania)</option>
                  <option value="HaloPesa (TZ)">HaloPesa (Tanzania)</option>
                  <option value="LUMICASH (BI)">LUMICASH (Burundi)</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] text-slate-500 font-bold uppercase ml-1">Namba ya Simu ya kupokelea</label>
                <input 
                  type="text" 
                  placeholder="0..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl py-4 px-6 text-white text-sm outline-none focus:ring-2 focus:ring-emerald-500/50"
                  value={withdrawDetails.account}
                  onChange={(e) => setWithdrawDetails({...withdrawDetails, account: e.target.value})}
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] text-slate-500 font-bold uppercase ml-1">Jina lilisajiliwa kwenye Number</label>
                <input 
                  type="text" 
                  placeholder="Jina lako..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl py-4 px-6 text-white text-sm outline-none focus:ring-2 focus:ring-emerald-500/50"
                  value={withdrawDetails.name}
                  onChange={(e) => setWithdrawDetails({...withdrawDetails, name: e.target.value})}
                  required
                />
              </div>
            </div>

            <button 
              type="submit"
              disabled={
                !withdrawDetails.amount || 
                !withdrawDetails.method || 
                !withdrawDetails.account || 
                !withdrawDetails.name ||
                Number(withdrawDetails.amount) > user.wallet_balance ||
                Number(withdrawDetails.amount) <= 0
              }
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-4 rounded-2xl shadow-xl shadow-emerald-500/20 transition-all active:scale-95 disabled:bg-slate-800 disabled:text-slate-500 disabled:shadow-none disabled:cursor-not-allowed"
            >
              {Number(withdrawDetails.amount) > user.wallet_balance ? "Salio Halitoshi" : "Tuma Ombi la Kutoa Pesa"}
            </button>
            <p className="text-[9px] text-slate-500 text-center uppercase tracking-widest italic font-bold">Pesa itatumwa baada ya uhakiki kukamilika.</p>
          </form>
        </Modal>

        {activeTab === "vehicle" && (
          <div className="space-y-6">
            <h1 className="text-2xl font-display font-bold text-white uppercase tracking-tight">{t.my_vehicle}</h1>
            
            {vehicle ? (
              <div className="space-y-8">
                <div className="glass rounded-[40px] p-8 border-2 border-emerald-500/20 bg-emerald-500/5">
                  <div className="flex items-center gap-6">
                    <div className="w-20 h-20 rounded-3xl bg-slate-900 flex items-center justify-center border-2 border-slate-800">
                      <Bike className="w-10 h-10 text-emerald-500" />
                    </div>
                    <div>
                      <div className="text-3xl font-display font-bold text-white tracking-widest uppercase">{vehicle.plate_number}</div>
                      <div className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">{vehicle.model || "Universal Boda"} / MC</div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest px-2">{t.vehicle_docs}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="glass p-6 rounded-[32px] space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-bold text-white uppercase">{t.card_image}</div>
                        <CheckCircle className="w-4 h-4 text-emerald-500" />
                      </div>
                      <div 
                        className="aspect-[16/10] bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 flex items-center justify-center cursor-pointer group relative"
                        onClick={() => vehicle.card_image && setZoomedImage(vehicle.card_image)}
                      >
                        {vehicle.card_image ? (
                          <>
                            <img src={vehicle.card_image} className="w-full h-full object-contain" alt="Kadi" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <span className="text-[10px] font-bold text-white uppercase tracking-widest bg-emerald-500 px-3 py-1 rounded-full shadow-lg">Gusa Kukuza</span>
                            </div>
                          </>
                        ) : (
                          <ImageIcon className="w-8 h-8 text-slate-800" />
                        )}
                      </div>
                    </div>
                    <div className="glass p-6 rounded-[32px] space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-bold text-white uppercase">{t.insurance}</div>
                        <CheckCircle className="w-4 h-4 text-emerald-500" />
                      </div>
                      <div 
                        className="aspect-[16/10] bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 flex items-center justify-center cursor-pointer group relative"
                        onClick={() => vehicle.insurance_image && setZoomedImage(vehicle.insurance_image)}
                      >
                        {vehicle.insurance_image ? (
                          <>
                            <img src={vehicle.insurance_image} className="w-full h-full object-contain" alt="Bima" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <span className="text-[10px] font-bold text-white uppercase tracking-widest bg-emerald-500 px-3 py-1 rounded-full shadow-lg">Gusa Kukuza</span>
                            </div>
                          </>
                        ) : (
                          <ImageIcon className="w-8 h-8 text-slate-800" />
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-500/10 border border-blue-500/20 p-6 rounded-3xl flex items-start gap-4">
                  <AlertTriangle className="w-6 h-6 text-blue-400 shrink-0" />
                  <div>
                    <h4 className="text-sm font-bold text-blue-400 uppercase mb-1">Police Notice</h4>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Nyaraka hizi ni halali na zimeunganishwa na mfumo wetu. Dereva huyu amesajiliwa kihalali na anatumia chombo hiki kwa kazi ya usafirishaji.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="glass p-12 rounded-[40px] flex flex-col items-center justify-center text-center space-y-4 border-2 border-dashed border-slate-800">
                  <div className="w-20 h-20 rounded-full bg-slate-900 flex items-center justify-center text-slate-700">
                    <Bike className="w-10 h-10" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-lg font-bold text-white">Bado Hujafungiwa Chombo</h3>
                    <p className="text-sm text-slate-500 max-w-xs">Wasaliana na msimamizi (Admin) akupangie chombo au chagua kimoja hapa chini.</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest px-2">{t.browse_vehicles}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {availableVehicles.map((v) => (
                      <div key={v.id} className="glass p-6 rounded-[32px] border border-slate-800 hover:border-emerald-500/30 transition-all group">
                        <div className="flex items-start justify-between mb-4">
                          <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center border border-slate-800 group-hover:scale-110 transition-transform">
                            <Bike className="w-6 h-6 text-emerald-500" />
                          </div>
                          <button 
                            onClick={() => handleChooseVehicle(v.id)}
                            className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-xl text-[10px] font-bold uppercase transition-all shadow-lg shadow-emerald-500/20 active:scale-95"
                          >
                            Chagua Hii
                          </button>
                        </div>
                        <div>
                          <div className="text-xl font-display font-bold text-white tracking-widest uppercase">{v.plate_number}</div>
                          <div className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">{v.model || "Universal Boda"} / MC</div>
                        </div>
                      </div>
                    ))}
                    {availableVehicles.length === 0 && (
                      <div className="col-span-full py-8 text-center text-slate-600 text-xs font-bold uppercase italic">
                        Hakuna vyombo vilivyo wazi kwa sasa.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "settings" && (
          <div className="space-y-6">
            <h1 className="text-2xl font-display font-bold text-white uppercase tracking-tight">{t.settings || "Mipangilio"}</h1>
            
            <div className="glass rounded-[40px] p-8 space-y-10">
              {/* Language Selection */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-400 flex items-center gap-2 uppercase tracking-widest px-1">
                  <SettingsIcon className="w-4 h-4 text-emerald-500" /> {t.language || "Lugha / Language"}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {[
                    { code: 'sw', label: 'Kiswahili' },
                    { code: 'en', label: 'English' },
                    { code: 'rn', label: 'Kirundi' },
                    { code: 'fr', label: 'Français' }
                  ].map((langItem) => {
                    const { lang, setLang } = useLanguage();
                    return (
                      <button
                        key={langItem.code}
                        onClick={() => {
                          setLang(langItem.code as any);
                          showToast(translations[langItem.code as Language].success);
                        }}
                        className={`px-6 py-4 rounded-2xl text-[11px] font-bold uppercase transition-all border-2 flex items-center gap-2 active:scale-95 ${
                          lang === langItem.code 
                            ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400 shadow-xl shadow-emerald-500/10' 
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <div className={`w-2 h-2 rounded-full ${lang === langItem.code ? 'bg-emerald-400' : 'bg-slate-700'}`} />
                        {langItem.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex flex-col items-center gap-4 pt-10 border-t border-slate-800/50">
                <div className="relative group">
                  <div className="w-32 h-32 rounded-[40px] overflow-hidden border-2 border-slate-800 bg-slate-900 flex items-center justify-center relative shadow-2xl">
                    {profileData.profile_image ? (
                      <img src={profileData.profile_image} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <LayoutDashboard className="w-12 h-12 text-slate-700" />
                    )}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer">
                      <Upload className="w-6 h-6 text-white" />
                    </div>
                    <input 
                      type="file" 
                      accept="image/*"
                      className="absolute inset-0 opacity-0 cursor-pointer"
                      onChange={handleProfileImageChange}
                    />
                  </div>
                  <div className="absolute -bottom-2 -right-2 bg-emerald-500 p-2 rounded-xl border-4 border-slate-950">
                    <ImageIcon className="w-4 h-4 text-white" />
                  </div>
                </div>
                <div className="text-center">
                  <h2 className="text-lg font-bold text-white uppercase tracking-tight">{user.name}</h2>
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">{user.role}</p>
                </div>
              </div>

              <form onSubmit={handleUpdateProfile} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] text-slate-500 font-bold uppercase ml-1">Jina Kamili</label>
                    <input 
                      type="text" 
                      className="w-full bg-slate-900 border border-slate-800 rounded-2xl py-4 px-6 text-white outline-none focus:ring-2 focus:ring-emerald-500/50"
                      value={profileData.name}
                      onChange={(e) => setProfileData({...profileData, name: e.target.value})}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] text-slate-500 font-bold uppercase ml-1">Namba ya Simu</label>
                    <input 
                      type="text" 
                      className="w-full bg-slate-900 border border-slate-800 rounded-2xl py-4 px-6 text-white outline-none focus:ring-2 focus:ring-emerald-500/50"
                      value={profileData.phone}
                      onChange={(e) => setProfileData({...profileData, phone: e.target.value})}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] text-slate-500 font-bold uppercase ml-1">Namba ya PikiPiki (Plate Number)</label>
                    <input 
                      type="text" 
                      placeholder="MC 123 ABC"
                      className="w-full bg-slate-900 border border-slate-800 rounded-2xl py-4 px-6 text-white outline-none focus:ring-2 focus:ring-emerald-500/50 uppercase"
                      value={profileData.plate_number}
                      onChange={(e) => setProfileData({...profileData, plate_number: e.target.value})}
                      required
                    />
                  </div>
                </div>
                <button className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-2xl shadow-xl shadow-emerald-500/20 transition-all active:scale-[0.98]">
                  Hifadhi Profile
                </button>
              </form>

              <div className="pt-8 border-t border-slate-800/50">
                <form onSubmit={handleUpdatePayment} className="space-y-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      <CreditCard className="w-5 h-5 text-emerald-500" /> Taarifa za Malipo
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] text-slate-500 font-bold uppercase">Chagua Mtandao/Benki</label>
                        <select 
                          className="w-full bg-slate-900 border border-slate-800 rounded-2xl py-4 px-6 text-white outline-none focus:ring-2 focus:ring-emerald-500/50"
                          value={paymentInfo.method}
                          onChange={(e) => setPaymentInfo({...paymentInfo, method: e.target.value})}
                          required
                        >
                          <option value="">Chagua...</option>
                          <optgroup label="Tanzania">
                            <option value="M-Pesa (TZ)">M-Pesa (Tanzania)</option>
                            <option value="Tigo Pesa (TZ)">Tigo Pesa (Tanzania)</option>
                            <option value="Airtel Money (TZ)">Airtel Money (Tanzania)</option>
                            <option value="HaloPesa (TZ)">HaloPesa (Tanzania)</option>
                          </optgroup>
                          <optgroup label="Burundi">
                            <option value="LUMICASH (BI)">LUMICASH (Burundi)</option>
                            <option value="BANCOBU (BI)">BANCOBU (Bank Burundi)</option>
                            <option value="EcoCash (BI)">EcoCash (Burundi)</option>
                          </optgroup>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] text-slate-500 font-bold uppercase">Namba ya Simu au Akaunti</label>
                        <input 
                          type="text" 
                          placeholder="0..."
                          className="w-full bg-slate-900 border border-slate-800 rounded-2xl py-4 px-6 text-white outline-none focus:ring-2 focus:ring-emerald-500/50"
                          value={paymentInfo.account}
                          onChange={(e) => setPaymentInfo({...paymentInfo, account: e.target.value})}
                          required
                        />
                      </div>
                    </div>
                  </div>
                  <button className="w-full py-4 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-2xl transition-all border border-slate-700">
                    Sasisha Taarifa za Malipo
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}
        {/* Image Zoom Modal */}
        {zoomedImage && (
          <div 
            className="fixed inset-0 z-50 bg-black/95 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300"
            onClick={() => setZoomedImage(null)}
          >
            <button 
              className="absolute top-6 right-6 w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-all active:scale-95"
              onClick={() => setZoomedImage(null)}
            >
              <PowerOff className="w-6 h-6 rotate-45" />
            </button>
            <motion.img 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              src={zoomedImage} 
              className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl shadow-white/5"
              alt="Zoomed Document"
              onClick={(e) => e.stopPropagation()}
            />
            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 text-white/50 text-[10px] font-bold uppercase tracking-[0.3em] bg-white/5 px-6 py-2 rounded-full border border-white/10">
              Gusa popote kufunga
            </div>
          </div>
        )}
      </div>
    </Shell>
  );
}

function TripCard({ trip, onStart, onComplete }: { trip: any; onStart: () => void; onComplete: () => void; [key: string]: any }) {
  const isStarted = trip.status === 'started';
  const isCompleted = trip.status === 'completed';

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`glass rounded-[32px] p-6 space-y-6 relative overflow-hidden group ${isCompleted ? 'opacity-60' : ''}`}
    >
      <div className="flex justify-between items-start">
        <div>
          <div className="text-xl font-display font-bold text-white">TZS {trip.fare.toLocaleString()}</div>
          <div className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest">Chako: TZS {trip.rider_share.toLocaleString()}</div>
        </div>
        <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
          isCompleted ? 'bg-slate-800 text-slate-500' :
          isStarted ? 'bg-blue-500/10 text-blue-400' :
          'bg-yellow-500/10 text-yellow-500'
        }`}>
          {isCompleted ? 'Completed' : isStarted ? 'In-Progress' : 'New'}
        </div>
      </div>

      <div className="space-y-4 relative">
        <div className="absolute left-[7px] top-[10px] bottom-[10px] w-0.5 bg-slate-800" />
        <div className="flex items-start gap-4 relative z-10">
          <div className="w-4 h-4 rounded-full bg-emerald-500/20 border-2 border-emerald-500 mt-1" />
          <div>
            <div className="text-[10px] text-slate-500 font-bold uppercase">Kutoka</div>
            <div className="text-sm font-medium text-white">{trip.pickup}</div>
          </div>
        </div>
        <div className="flex items-start gap-4 relative z-10">
          <div className="w-4 h-4 rounded-full bg-purple-500/20 border-2 border-purple-500 mt-1" />
          <div>
            <div className="text-[10px] text-slate-500 font-bold uppercase">Kwenda</div>
            <div className="text-sm font-medium text-white">{trip.dropoff}</div>
          </div>
        </div>
      </div>

      {!isCompleted && (
        <button 
          onClick={isStarted ? onComplete : onStart}
          className={`w-full py-4 rounded-2xl font-bold transition-all shadow-xl flex items-center justify-center gap-2 active:scale-95 ${
            isStarted 
            ? "bg-purple-600 hover:bg-purple-700 text-white shadow-purple-500/20" 
            : "bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/20"
          }`}
        >
          {isStarted ? "Kamilisha Safari" : "Anza Safari"}
          <ChevronRight className="w-5 h-5" />
        </button>
      )}
      {isCompleted && (
        <div className="text-center text-[10px] text-slate-500 font-bold uppercase flex items-center justify-center gap-1.5">
          <CheckCircle className="w-3.5 h-3.5" /> Safari Imekamilika
        </div>
      )}
    </motion.div>
  );
}
