import React, { useState, useEffect } from "react";
import { api } from "../lib/api";
import { motion } from "motion/react";
import { 
  Users, MapPin, DollarSign, Wallet, CheckCircle, 
  XCircle, Send, TrendingUp, UserCheck, UserX,
  CreditCard, Loader2, Plus, ArrowUpRight, 
  LayoutDashboard, MapPinned, BarChart3, Settings as SettingsIcon,
  Search, Filter, Image as ImageIcon, User, Bike, AlertTriangle, PowerOff
} from "lucide-react";
import Shell from "./Shell";
import Modal from "./Modal";
import { useToast, useLanguage } from "../App";
import { translations, Language } from "../translations";

interface AdminDashboardProps {
  token: string;
  user: any;
  onLogout: () => void;
}

export default function AdminDashboard({ token, user, onLogout }: AdminDashboardProps) {
  const { showToast } = useToast();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState("home");
  const [stats, setStats] = useState<any>(null);
  const [riders, setRiders] = useState<any[]>([]);
  const [payouts, setPayouts] = useState<any[]>([]);
  const [dailyPayments, setDailyPayments] = useState<any[]>([]);
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  const [selectedPayout, setSelectedPayout] = useState<any>(null);
  const [selectedRider, setSelectedRider] = useState<any>(null);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const [isRiderModalOpen, setIsRiderModalOpen] = useState(false);
  const [riderData, setRiderData] = useState({
    id: "",
    name: "",
    phone: "",
    status: "",
    daily_amount: 5000,
    rider_id_number: ""
  });
  const [payoutSearch, setPayoutSearch] = useState("");
  const [payoutFilter, setPayoutFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [isDispatchModalOpen, setIsDispatchModalOpen] = useState(false);
  const [isBonusModalOpen, setIsBonusModalOpen] = useState(false);
  const [bonusData, setBonusData] = useState({ rider_id: "", amount: "" });
  const [estimatedFare, setEstimatedFare] = useState<number | null>(null);

  const handleAwardBonus = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post("/admin/award-bonus", { rider_id: Number(bonusData.rider_id), amount: Number(bonusData.amount) }, token);
      setIsBonusModalOpen(false);
      setBonusData({ rider_id: "", amount: "" });
      showToast("Bonus imetolewa kwa mafanikio!");
      fetchData();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };
  const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [debts, setDebts] = useState<any[]>([]);
  const [vehicleData, setVehicleData] = useState({
    plate_number: "",
    model: "",
    card_image: "",
    insurance_image: ""
  });
  const [dispatchData, setDispatchData] = useState({
    rider_id: "",
    pickup: "",
    dropoff: "",
    fare: 0,
  });

  const handleSaveVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post("/admin/vehicles", vehicleData, token);
      setIsVehicleModalOpen(false);
      setVehicleData({ plate_number: "", model: "", card_image: "", insurance_image: "" });
      showToast(t.success);
      fetchData();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  const handleAssignVehicle = async (riderId: number, vehicleId: number) => {
    try {
      await api.post("/admin/assign-vehicle", { rider_id: riderId, vehicle_id: vehicleId }, token);
      showToast(t.success);
      fetchData();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  const calculateEstimate = (pickup: string, dropoff: string) => {
    if (pickup.length > 3 && dropoff.length > 3) {
      // Mock distance calculation based on string length difference + 5km base
      const mockDistance = Math.abs(pickup.length - dropoff.length) + 5;
      const baseFare = 2000;
      const ratePerKm = 800;
      const total = baseFare + (mockDistance * ratePerKm);
      setEstimatedFare(Math.ceil(total / 500) * 500); // Round to nearest 500
    }
  };

  const handleApproveDaily = async (id: number) => {
    try {
      await api.post(`/admin/approve-daily/${id}`, {}, token);
      showToast("Malipo yamethibitishwa.");
      fetchData();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  const handleRejectDaily = async (id: number) => {
    try {
      await api.post(`/admin/reject-daily/${id}`, {}, token);
      showToast("Malipo yamekataliwa.", "error");
      fetchData();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  const menuItems = [
    { id: "home", label: "Nyumbani", icon: LayoutDashboard },
    { id: "riders", label: "Madereva", icon: Users },
    { id: "payouts", label: "Malipo ya Madereva", icon: CreditCard },
    { id: "daily", label: t.daily_installment || "Malipo ya Siku", icon: DollarSign },
    { id: "debts", label: t.debt_inspection || "Wadaiwa", icon: AlertTriangle },
    { id: "vehicles", label: t.manage_vehicles || "Vyombo", icon: Bike },
    { id: "finances", label: "Ripoti za Fedha", icon: BarChart3 },
    { id: "settings", label: "Mpangilio", icon: SettingsIcon },
  ];

  const fetchData = async () => {
    try {
      const results = await Promise.allSettled([
        api.get("/admin/stats", token),
        api.get("/admin/riders", token),
        api.get("/admin/payouts", token),
        api.get("/admin/daily-payments", token),
        api.get("/admin/vehicles", token),
        api.get("/admin/rider-debts", token)
      ]);

      if (results[0].status === "fulfilled") setStats(results[0].value);
      if (results[1].status === "fulfilled") setRiders(results[1].value);
      if (results[2].status === "fulfilled") setPayouts(results[2].value);
      if (results[3].status === "fulfilled") setDailyPayments(results[3].value);
      if (results[4].status === "fulfilled") setVehicles(results[4].value);
      if (results[5].status === "fulfilled") setDebts(results[5].value);

      // Report errors to UI if any important call failed
      let hasError = false;
      results.forEach((res, idx) => {
        if (res.status === "rejected") {
          console.error(`API call ${idx} failed:`, res.reason);
          hasError = true;
        }
      });
      if (hasError) showToast("Hitilafu imetokea wakati wa kupakia data. Tafadhali refresh ukurasa.", "error");
    } catch (err) {
      console.error("Fetch data error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleApproveRider = async (id: number) => {
    try {
      await api.post(`/admin/riders/${id}/approve`, {}, token);
      showToast("Dereva ameidhinishwa.");
      fetchData();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  const handleSaveRider = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Ensure daily_amount is treated as number
      const payload = { 
        ...riderData, 
        daily_amount: Number(riderData.daily_amount),
        // If rider_id_number is empty, generate one (fallback)
        rider_id_number: riderData.rider_id_number || `LX-${String(riderData.id).padStart(3, '0')}`
      };
      await api.post(`/admin/riders/${riderData.id}/update`, payload, token);
      setIsRiderModalOpen(false);
      showToast("Taarifa za dereva zimesasishwa!");
      fetchData();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  const handleSuspendRider = async (id: number) => {
    try {
      await api.post(`/admin/riders/${id}/suspend`, {}, token);
      showToast("Dereva amesimamishwa.", "error");
      fetchData();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  const handleDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post("/admin/trips", {
        ...dispatchData,
        fare: Number(dispatchData.fare)
      }, token);
      setDispatchData({ rider_id: "", pickup: "", dropoff: "", fare: 0 });
      setIsDispatchModalOpen(false);
      showToast("Safari imetumwa kwa dereva!");
      fetchData();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  const handleApprovePayout = async (id: number) => {
    try {
      await api.post(`/admin/payouts/${id}/approve`, {}, token);
      showToast("Malipo yamethibitishwa!");
      fetchData();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  const handleRejectPayout = async (id: number) => {
    try {
      await api.post(`/admin/payouts/${id}/reject`, {}, token);
      showToast("Ombi limekataliwa.", "error");
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
      <div className="p-4 md:p-8 space-y-8 animate-in fade-in duration-500">
        {activeTab === "home" && (
          <div className="space-y-8">
            <header className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl md:text-3xl font-display font-bold text-white tracking-tight">Vitu vya Leo</h1>
                <p className="text-slate-500 text-sm">Hali halisi ya biashara yako</p>
              </div>
              <button 
                onClick={() => setIsDispatchModalOpen(true)}
                className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 md:px-6 md:py-3 rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition-all active:scale-95"
              >
                <Plus className="w-5 h-5" />
                <span className="hidden sm:inline">Tuma Safari Mpya</span>
                <span className="sm:hidden">Tuma</span>
              </button>
            </header>

            {/* Quick Stats Grid - 2x2 for mobile */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 md:gap-6">
              <StatCard 
                icon={<Users className="text-emerald-400 w-5 h-5" />} 
                label="Madereva" 
                value={stats?.totalRiders || 0} 
                subText={`${stats?.activeRiders || 0} Online`}
                theme="emerald"
              />
              <StatCard 
                icon={<MapPin className="text-purple-400 w-5 h-5" />} 
                label="Safari" 
                value={stats?.todayTrips || 0} 
                subText="Safari za leo"
                theme="purple"
              />
              <StatCard 
                icon={<TrendingUp className="text-emerald-400 w-5 h-5" />} 
                label="Mapato (15%)" 
                value={`TZS ${(stats?.companyEarnings || 0).toLocaleString()}`} 
                subText="Faida"
                theme="emerald"
              />
              <StatCard 
                icon={<Wallet className="text-purple-400 w-5 h-5" />} 
                label="Mizania (85%)" 
                value={`TZS ${(stats?.totalRiderBalance || 0).toLocaleString()}`} 
                subText="Kwa madereva"
                theme="purple"
              />
              <StatCard 
                icon={<AlertTriangle className="text-red-400 w-5 h-5" />} 
                label="Jumla Wadaiwa" 
                value={`TZS ${(stats?.totalDebt || 0).toLocaleString()}`} 
                subText="Deni la Kampuni"
                theme="red"
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Recent Payout Requests */}
              <div className="glass rounded-[32px] overflow-hidden">
                <div className="p-6 border-b border-slate-800/50 flex items-center justify-between">
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <CreditCard className="text-purple-400 w-5 h-5" />
                    Maombi ya Malipo
                  </h2>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-400 font-bold">
                    {payouts.filter(p => p.status === 'pending').length} Mapya
                  </span>
                </div>
                <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                  {payouts.filter(p => p.status === 'pending').length === 0 ? (
                    <div className="p-12 text-center text-slate-500 italic">Hakuna maombi mapya</div>
                  ) : (
                    <div className="divide-y divide-slate-800/50">
                      {payouts.filter(p => p.status === 'pending').map((payout) => (
                        <div key={payout.id} className="p-6 flex items-center justify-between hover:bg-slate-800/30 transition-colors">
                          <div className="flex gap-4 items-center">
                            <div className="w-12 h-12 glass-purple rounded-2xl flex items-center justify-center text-purple-400">
                              <Wallet className="w-6 h-6" />
                            </div>
                            <div>
                              <div className="font-bold text-white text-sm">{payout.rider_name}</div>
                              <div className="text-[10px] text-slate-500 uppercase tracking-wider">{payout.payment_method}</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-base font-bold text-emerald-400">TZS {payout.amount.toLocaleString()}</div>
                            <button 
                              onClick={() => handleApprovePayout(payout.id)}
                              className="mt-1 text-xs px-3 py-1.5 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white rounded-lg transition-all font-bold"
                            >
                              Idhinisha
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Quick Status View */}
              <div className="glass rounded-[32px] p-8 flex flex-col justify-center items-center text-center space-y-4">
                <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center text-emerald-500 emerald-glow">
                  <CheckCircle className="w-10 h-10" />
                </div>
                <h3 className="text-xl font-bold text-white">Mfumo Upo Sawa</h3>
                <p className="text-slate-400 text-sm max-w-xs">
                  Miamala yote na safari za leo zinaenda kama zilivyopangwa bila hitilafu yoyote.
                </p>
                <div className="flex gap-4 pt-4">
                  <div className="text-center">
                    <div className="text-xl font-display font-bold text-white">{stats?.activeRiders || 0}</div>
                    <div className="text-[10px] text-emerald-500 uppercase font-bold">Online</div>
                  </div>
                  <div className="w-px h-10 bg-slate-800" />
                  <div className="text-center">
                    <div className="text-xl font-display font-bold text-white">100%</div>
                    <div className="text-[10px] text-purple-500 uppercase font-bold">Ufanisi</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "riders" && (
          <div className="space-y-6">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-display font-bold text-white">Usimamizi wa Madereva</h1>
                <p className="text-slate-500 text-xs mt-1 uppercase tracking-widest font-bold">Total: {riders.length} madereva</p>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => setIsBonusModalOpen(true)}
                  className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-lg shadow-purple-500/20 transition-all flex items-center gap-2"
                >
                  <DollarSign className="w-4 h-4" /> Toa Bonus
                </button>
                <div className="relative flex-1 md:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input 
                    type="text" 
                    placeholder="Tafuta dereva..." 
                    className="w-full bg-slate-900/50 border border-slate-800 rounded-xl py-2 pl-10 pr-4 text-sm text-white"
                  />
                </div>
              </div>
            </header>

            <div className="glass rounded-[32px] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-800/30 text-slate-500 text-[10px] uppercase tracking-[0.2em] font-bold">
                    <tr>
                      <th className="px-8 py-5">Dereva / ID</th>
                      <th className="px-8 py-5">Malipo (Siku)</th>
                      <th className="px-8 py-5">Hali ya Kazi</th>
                      <th className="px-8 py-5">Mizania (Wallet / Bonus)</th>
                      <th className="px-8 py-5 text-right">Vitendo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {riders.map((r) => (
                      <tr 
                        key={r.id} 
                        className="hover:bg-white/[0.02] transition-colors group cursor-pointer"
                        onClick={() => {
                          setRiderData({
                            id: r.id,
                            name: r.name,
                            phone: r.phone,
                            status: r.status,
                            daily_amount: r.daily_amount || 5000,
                            rider_id_number: r.rider_id_number || ""
                          });
                          setIsRiderModalOpen(true);
                        }}
                      >
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-4">
                            <div className="relative">
                              <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-900 border border-slate-800 flex items-center justify-center">
                                {r.profile_image ? (
                                  <img src={r.profile_image} alt={r.name} className="w-full h-full object-cover" />
                                ) : (
                                  <LayoutDashboard className="w-5 h-5 text-slate-700" />
                                )}
                              </div>
                              <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-slate-950 ${r.online_status === 1 ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-slate-700'}`} />
                            </div>
                            <div>
                              <div className="text-sm font-bold text-white uppercase group-hover:text-emerald-400 transition-colors">{r.name}</div>
                              <div className="text-[10px] text-slate-500 font-medium">ID: {r.rider_id_number || '---'}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-5">
                          <div className="text-sm font-bold text-white uppercase tracking-widest bg-slate-900/50 px-2 py-1 rounded-lg border border-slate-800 w-fit">
                            TZS {r.daily_amount?.toLocaleString() || '5,000'}
                          </div>
                        </td>
                        <td className="px-8 py-5">
                          <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            r.status === 'active' ? 'bg-emerald-500/10 text-emerald-400' :
                            r.status === 'pending' ? 'bg-yellow-500/10 text-yellow-500' :
                            'bg-red-500/10 text-red-500'
                          }`}>
                            {r.status === 'active' ? 'Approved' : r.status === 'pending' ? 'Pending' : 'Suspended'}
                          </span>
                        </td>
                        <td className="px-8 py-5">
                          <div className="flex flex-col gap-0.5">
                            <div className="text-sm font-bold text-white">TZS {r.wallet_balance.toLocaleString()}</div>
                            <div className="text-[9px] text-purple-400 font-bold uppercase">Bonus: TZS {(r.bonus_balance || 0).toLocaleString()}</div>
                          </div>
                        </td>
                        <td className="px-8 py-5 text-right">
                          <div className="flex justify-end gap-2">
                            {r.status !== 'active' ? (
                              <button 
                                onClick={(e) => { e.stopPropagation(); handleApproveRider(r.id); }}
                                className="p-2.5 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/10"
                                title="Approve Rider"
                              >
                                <UserCheck className="w-5 h-5" />
                              </button>
                            ) : (
                              <button 
                                onClick={(e) => { e.stopPropagation(); handleSuspendRider(r.id); }}
                                className="p-2.5 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all border border-red-500/20"
                                title="Suspend Rider"
                              >
                                <UserX className="w-5 h-5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === "payouts" && (
          <div className="space-y-6">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-display font-bold text-white">Malipo ya Madereva</h1>
                <p className="text-slate-500 text-xs mt-1 uppercase tracking-widest font-bold">Historia ya maombi ya kutoa pesa</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <select 
                  className="bg-slate-900/50 border border-slate-800 rounded-xl px-4 py-2 text-xs font-bold text-slate-400 outline-none"
                  value={payoutFilter}
                  onChange={(e) => setPayoutFilter(e.target.value)}
                >
                  <option value="all">Hali Zote</option>
                  <option value="pending">Inayosubiri</option>
                  <option value="approved">Zilizokamilika</option>
                </select>
                <div className="relative flex-1 md:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input 
                    type="text" 
                    placeholder="Tafuta dereva..." 
                    className="w-full bg-slate-900/50 border border-slate-800 rounded-xl py-2 pl-10 pr-4 text-sm text-white"
                    value={payoutSearch}
                    onChange={(e) => setPayoutSearch(e.target.value)}
                  />
                </div>
              </div>
            </header>

            <div className="glass rounded-[32px] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-800/30 text-slate-500 text-[10px] uppercase tracking-[0.2em] font-bold">
                    <tr>
                      <th className="px-8 py-5">Dereva</th>
                      <th className="px-8 py-5">Kiasi</th>
                      <th className="px-8 py-5">Njia ya Pesa</th>
                      <th className="px-8 py-5">Tarehe ya Ombi</th>
                      <th className="px-8 py-5">Hali / Tarehe ya Idhini</th>
                      <th className="px-8 py-5 text-right">Vitendo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {payouts
                      .filter(p => {
                        const matchesSearch = p.rider_name.toLowerCase().includes(payoutSearch.toLowerCase());
                        const matchesFilter = payoutFilter === 'all' || p.status === payoutFilter;
                        return matchesSearch && matchesFilter;
                      })
                      .length === 0 ? (
                        <tr><td colSpan={6} className="px-8 py-10 text-center text-slate-500 italic">Hakuna malipo yaliyopatikana</td></tr>
                      ) : (
                        payouts
                          .filter(p => {
                            const matchesSearch = p.rider_name.toLowerCase().includes(payoutSearch.toLowerCase());
                            const matchesFilter = payoutFilter === 'all' || p.status === payoutFilter;
                            return matchesSearch && matchesFilter;
                          })
                          .map((p) => (
                            <tr 
                              key={p.id} 
                              className="hover:bg-white/[0.02] transition-colors cursor-pointer group"
                              onClick={() => setSelectedPayout(p)}
                            >
                              <td className="px-8 py-5">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-lg overflow-hidden bg-slate-900 border border-slate-800 flex-shrink-0">
                                    {p.rider_profile_image ? (
                                      <img src={p.rider_profile_image} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center text-slate-600 bg-slate-900 font-bold text-[10px] uppercase">
                                        {p.rider_name.charAt(0)}
                                      </div>
                                    )}
                                  </div>
                                  <div>
                                    <div className="text-sm font-bold text-white uppercase group-hover:text-emerald-400 transition-colors leading-none">{p.rider_name}</div>
                                    <div className="text-[9px] text-slate-500 font-bold uppercase tracking-tighter mt-1">{p.rider_plate_number || 'NO PLATE'}</div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-8 py-5 text-sm font-bold text-emerald-400">TZS {p.amount.toLocaleString()}</td>
                              <td className="px-8 py-5">
                                <div className="text-xs text-white uppercase font-medium">{p.payment_method}</div>
                                <div className="text-[10px] text-slate-500">{p.payment_account}</div>
                              </td>
                              <td className="px-8 py-5 text-xs text-slate-400">
                                {new Date(p.created_at).toLocaleString()}
                              </td>
                              <td className="px-8 py-5">
                                <div className="flex flex-col gap-1">
                                  <span className={`w-fit px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                                    p.status === 'approved' ? 'bg-emerald-500/10 text-emerald-500' : 
                                    p.status === 'rejected' ? 'bg-red-500/10 text-red-500' :
                                    'bg-yellow-500/10 text-yellow-500'
                                  }`}>
                                    {p.status}
                                  </span>
                                  {p.approved_at && (
                                    <span className="text-[9px] text-slate-500 italic">
                                      {new Date(p.approved_at).toLocaleString()}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-8 py-5 text-right">
                                {p.status === 'pending' && (
                                  <div className="flex justify-end gap-2">
                                    <button 
                                      onClick={(e) => { e.stopPropagation(); handleApprovePayout(p.id); }}
                                      className="p-2 bg-emerald-500/10 text-emerald-500 rounded-lg hover:bg-emerald-500 hover:text-white transition-all shadow-lg"
                                      title="Thibitisha"
                                    >
                                      <CheckCircle className="w-4 h-4" />
                                    </button>
                                    <button 
                                      onClick={(e) => { e.stopPropagation(); handleRejectPayout(p.id); }}
                                      className="p-2 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-all shadow-lg"
                                      title="Kataa"
                                    >
                                      <XCircle className="w-4 h-4" />
                                    </button>
                                  </div>
                                )}
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

        {activeTab === "daily" && (
          <div className="space-y-6">
            <h1 className="text-2xl font-display font-bold text-white uppercase tracking-tight">{t.daily_installment || "Kumbukumbu ya Malipo"}</h1>
            <div className="glass rounded-[32px] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-800/30 text-slate-500 text-[10px] uppercase tracking-[0.2em] font-bold">
                    <tr>
                      <th className="px-8 py-5">Dereva</th>
                      <th className="px-8 py-5">Kiasi</th>
                      <th className="px-8 py-5">Njia / Ref</th>
                      <th className="px-8 py-5">Hali</th>
                      <th className="px-8 py-5 text-right">Vitendo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {dailyPayments.length === 0 ? (
                      <tr><td colSpan={5} className="px-8 py-10 text-center text-slate-500 italic">Hakuna malipo yaliyofanyika</td></tr>
                    ) : (
                      dailyPayments.map((p) => (
                        <tr 
                          key={p.id} 
                          className="hover:bg-white/[0.02] transition-colors cursor-pointer group"
                          onClick={() => setSelectedPayment(p)}
                        >
                          <td className="px-8 py-5">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg overflow-hidden bg-slate-900 border border-slate-800 flex-shrink-0">
                                {p.rider_profile_image ? (
                                  <img src={p.rider_profile_image} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-slate-600 bg-slate-900 font-bold text-[10px] uppercase">
                                    {p.rider_name.charAt(0)}
                                  </div>
                                )}
                              </div>
                              <div>
                                <div className="text-sm font-bold text-white uppercase group-hover:text-emerald-400 transition-colors leading-none">{p.rider_name}</div>
                                <div className="text-[9px] text-slate-500 font-bold uppercase tracking-tighter mt-1">{p.rider_plate_number || 'NO PLATE'} • {p.payment_date}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-8 py-5 text-sm font-bold text-emerald-400">TZS {p.amount.toLocaleString()}</td>
                          <td className="px-8 py-5">
                            <div className="text-xs text-white uppercase">{p.payment_method}</div>
                            <div className="text-[9px] text-slate-500">{p.transaction_ref || 'N/A'}</div>
                          </td>
                          <td className="px-8 py-5">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                              p.status === 'approved' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-yellow-500/10 text-yellow-500 animate-pulse'
                            }`}>
                              {p.status}
                            </span>
                          </td>
                          <td className="px-8 py-5 text-right">
                            {p.status === 'pending' && (
                              <div className="flex justify-end gap-2">
                                <button 
                                  onClick={(e) => { e.stopPropagation(); handleApproveDaily(p.id); }}
                                  className="p-2 bg-emerald-500/10 text-emerald-500 rounded-lg hover:bg-emerald-500 hover:text-white transition-all shadow-lg"
                                >
                                  <CheckCircle className="w-4 h-4" />
                                </button>
                                <button 
                                  onClick={(e) => { e.stopPropagation(); handleRejectDaily(p.id); }}
                                  className="p-2 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-all shadow-lg"
                                >
                                  <XCircle className="w-4 h-4" />
                                </button>
                              </div>
                            )}
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

        {activeTab === "finances" && (
          <div className="space-y-8">
            <h1 className="text-2xl font-display font-bold text-white">Ripoti za Fedha</h1>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="glass-emerald p-8 rounded-[32px] space-y-2">
                <div className="text-emerald-400 uppercase tracking-widest text-[10px] font-bold">Faida Halisi</div>
                <div className="text-3xl font-display font-bold text-white">TZS {(stats?.companyEarnings || 0).toLocaleString()}</div>
                <p className="text-slate-500 text-xs text-balance">Hii ni 15% ya safari zote zilizokamilika.</p>
              </div>
              <div className="glass-purple p-8 rounded-[32px] space-y-2">
                <div className="text-purple-400 uppercase tracking-widest text-[10px] font-bold">Mizania ya Madereva</div>
                <div className="text-3xl font-display font-bold text-white">TZS {(stats?.totalRiderBalance || 0).toLocaleString()}</div>
                <p className="text-slate-500 text-xs">Pesa zinazosubiri kutolewa na madereva.</p>
              </div>
              <div className="glass p-8 rounded-[32px] space-y-2 flex flex-col justify-center">
                <div className="flex items-center gap-2 text-blue-400 uppercase tracking-widest text-[10px] font-bold">
                  Pakua Ripoti <ArrowUpRight className="w-4 h-4" />
                </div>
                <button className="w-full py-2 bg-slate-800 rounded-xl text-xs font-bold text-slate-300 hover:bg-slate-700 transition-colors">
                  PDF (Januari - Aprili)
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === "debts" && (
          <div className="space-y-6">
            <h1 className="text-2xl font-display font-bold text-white uppercase tracking-tight">{t.debt_inspection}</h1>
            <div className="glass rounded-[32px] overflow-hidden border border-slate-800">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-900/50 border-b border-slate-800">
                      <th className="px-6 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t.name}</th>
                      <th className="px-6 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t.days_active}</th>
                      <th className="px-6 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t.expected}</th>
                      <th className="px-6 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t.paid}</th>
                      <th className="px-6 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t.debt}</th>
                      <th className="px-6 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t.status}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {debts.map((r: any) => (
                      <tr key={r.id} className="hover:bg-white/5 transition-colors group">
                        <td className="px-6 py-5">
                          <div className="font-bold text-white">{r.name}</div>
                          <div className="text-[10px] text-slate-500 font-mono tracking-tighter">{r.email}</div>
                        </td>
                        <td className="px-6 py-5 text-sm text-slate-300 font-medium">{r.days_active}</td>
                        <td className="px-6 py-5 text-sm text-slate-300 font-display font-bold">TZS {r.expected.toLocaleString()}</td>
                        <td className="px-6 py-5 text-sm text-emerald-400 font-display font-bold">TZS {r.paid.toLocaleString()}</td>
                        <td className="px-6 py-5">
                          <div className={`text-sm font-display font-bold ${r.debt > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                            TZS {r.debt.toLocaleString()}
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <div className={`inline-block px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter ${r.debt > 5000 ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}`}>
                            {r.debt > 5000 ? 'Anadaiwa' : 'Safi'}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === "vehicles" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-display font-bold text-white uppercase tracking-tight">{t.manage_vehicles}</h1>
              <button 
                onClick={() => {
                  setVehicleData({ plate_number: "", model: "", card_image: "", insurance_image: "" });
                  setIsVehicleModalOpen(true);
                }}
                className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-3 rounded-2xl text-sm font-bold shadow-xl shadow-emerald-500/20 active:scale-95 transition-all flex items-center gap-2"
              >
                <Plus className="w-5 h-5" /> {t.add_vehicle}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {vehicles.map((v) => (
                <div key={v.id} className="glass rounded-[32px] p-6 space-y-4 border border-slate-800/50 hover:border-emerald-500/30 transition-all group">
                  <div className="flex items-start justify-between">
                    <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center border border-slate-800 group-hover:scale-110 transition-transform">
                      <Bike className="w-6 h-6 text-emerald-500" />
                    </div>
                    <div className="text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-tighter bg-emerald-500/10 text-emerald-400">
                      {v.rider_name || t.unassigned}
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg font-display font-bold text-white uppercase tracking-tight">{v.plate_number}</h3>
                    <p className="text-xs text-slate-500 font-medium">{v.model || "Universal Boda"}</p>
                  </div>
                  
                  <div className="flex gap-2">
                    <button 
                      onClick={() => {
                        setVehicleData(v);
                        setIsVehicleModalOpen(true);
                      }}
                      className="flex-1 py-3 rounded-xl bg-slate-900 border border-slate-800 text-[10px] font-bold text-slate-400 uppercase tracking-widest hover:border-slate-700 transition-all"
                    >
                      Hariri
                    </button>
                    <select 
                      onChange={(e) => handleAssignVehicle(Number(e.target.value), v.id)}
                      className="flex-1 py-3 rounded-xl bg-slate-900 border border-slate-800 text-[10px] font-bold text-emerald-400 uppercase tracking-widest outline-none px-2 text-white"
                      value={v.rider_id || ""}
                    >
                      <option value="">{t.select_rider || "Chagua Dereva"}</option>
                      {riders.map(r => (
                        <option key={r.id} value={r.id} className="bg-slate-900">{r.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "settings" && (
          <div className="space-y-6">
            <h1 className="text-2xl font-display font-bold text-white uppercase tracking-tight">{t.settings}</h1>
            <div className="glass rounded-[40px] p-8 space-y-10">
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-400 flex items-center gap-2 uppercase tracking-widest px-1">
                  <SettingsIcon className="w-4 h-4 text-emerald-500" /> {t.language}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {(['sw', 'en', 'rn', 'fr'] as Language[]).map((lcode) => {
                    const { lang, setLang } = useLanguage();
                    return (
                      <button
                        key={lcode}
                        onClick={() => {
                          setLang(lcode);
                          showToast(translations[lcode].success);
                        }}
                        className={`px-6 py-4 rounded-2xl text-[11px] font-bold uppercase transition-all border-2 flex items-center gap-2 active:scale-95 ${
                          lang === lcode 
                            ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400 shadow-xl shadow-emerald-500/10' 
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <span className="text-lg">{translations[lcode].flag}</span>
                        {translations[lcode].language}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-10 border-t border-slate-800/50 space-y-4">
                <h3 className="text-sm font-bold text-slate-400 flex items-center gap-2 uppercase tracking-widest px-1">
                  <User className="w-4 h-4 text-purple-400" /> {t.admin}
                </h3>
                <div className="bg-slate-900/50 p-6 rounded-3xl border border-slate-800 space-y-2">
                  <div className="text-sm font-bold text-white uppercase">{user.name}</div>
                  <div className="text-xs text-slate-500 font-mono tracking-tight">{user.email}</div>
                  <div className="inline-block px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-bold">{user.role}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Bonus Award Modal */}
        <Modal isOpen={isBonusModalOpen} onClose={() => setIsBonusModalOpen(false)} title="Toa Bonus kwa Dereva">
          <form onSubmit={handleAwardBonus} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] text-slate-500 font-bold uppercase ml-1">Mchague Dereva</label>
              <select 
                className="w-full bg-slate-900 border border-slate-800 rounded-2xl py-4 px-6 text-white outline-none focus:ring-2 focus:ring-purple-500/50"
                value={bonusData.rider_id}
                onChange={(e) => setBonusData({...bonusData, rider_id: e.target.value})}
                required
              >
                <option value="">Chagua Dereva...</option>
                {riders.map(r => (
                  <option key={r.id} value={r.id}>{r.name} ({r.phone})</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] text-slate-500 font-bold uppercase ml-1">Kiasi cha Bonus (TZS)</label>
              <input 
                type="number" 
                placeholder="Mfano 5000"
                className="w-full bg-slate-800 border border-slate-700 rounded-2xl py-4 px-6 text-white text-lg font-bold outline-none"
                value={bonusData.amount}
                onChange={(e) => setBonusData({...bonusData, amount: e.target.value})}
                required
              />
            </div>
            <button 
              type="submit"
              className="w-full bg-purple-500 hover:bg-purple-600 text-white font-bold py-4 rounded-2xl shadow-xl shadow-purple-500/20 transition-all active:scale-95"
            >
              Toa Bonus Sasa
            </button>
            <p className="text-[9px] text-slate-500 text-center uppercase tracking-widest italic font-bold">Hii itaongezwa kwenye Bonus Balance ya dereva mara moja.</p>
          </form>
        </Modal>

        {/* Payment Detail Modal */}
        <Modal 
          isOpen={!!selectedPayment} 
          onClose={() => setSelectedPayment(null)} 
          title="Maelezo ya Malipo"
        >
          {selectedPayment && (
            <div className="space-y-6">
              <div className="bg-slate-900/50 p-6 rounded-3xl border border-slate-800 space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 flex-shrink-0">
                    {selectedPayment.rider_profile_image ? (
                      <img src={selectedPayment.rider_profile_image} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-emerald-500 bg-emerald-500/10">
                        <UserCheck className="w-6 h-6" />
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white uppercase">{selectedPayment.rider_name}</div>
                    <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{selectedPayment.rider_plate_number || 'NO PLATE'}</div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-800">
                  <div>
                    <div className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Kiasi</div>
                    <div className="text-sm font-bold text-emerald-400">TZS {selectedPayment.amount.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Tarehe</div>
                    <div className="text-sm font-bold text-white">{selectedPayment.payment_date}</div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                  <div className="glass p-5 rounded-2xl border-slate-800 space-y-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest">
                      <CreditCard className="w-4 h-4" /> Njia ya Malipo
                    </div>
                    <div className="text-sm font-bold text-white uppercase bg-slate-900/50 p-3 rounded-xl border border-slate-800">
                      {selectedPayment.payment_method} {selectedPayment.payment_network ? `(${selectedPayment.payment_network})` : ''}
                    </div>
                  </div>

                  {selectedPayment.screenshot && (
                    <div className="glass p-5 rounded-2xl border-slate-800 space-y-3">
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest">
                        <ImageIcon className="w-4 h-4" /> Picha ya Muamala
                      </div>
                      <div className="relative group overflow-hidden rounded-xl border border-slate-700 bg-slate-900/50">
                        <img 
                          src={selectedPayment.screenshot} 
                          alt="Screenshot" 
                          className="w-full h-auto max-h-64 object-contain cursor-zoom-in group-hover:scale-105 transition-transform"
                          onClick={() => window.open(selectedPayment.screenshot, '_blank')}
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity pointer-events-none">
                          <span className="text-[10px] text-white font-bold uppercase">Gusa Kupanua</span>
                        </div>
                      </div>
                    </div>
                  )}

                <div className="glass p-5 rounded-2xl border-slate-800 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest">
                    <CheckCircle className="w-4 h-4" /> Kumbukumbu (Ref)
                  </div>
                  <div className="text-sm font-mono font-bold text-emerald-500 bg-slate-900/50 p-3 rounded-xl border border-slate-800 break-all">
                    {selectedPayment.transaction_ref || 'N/A'}
                  </div>
                </div>
              </div>

              {selectedPayment.status === 'pending' ? (
                <div className="flex gap-3">
                  <button 
                    onClick={() => {
                      handleApproveDaily(selectedPayment.id);
                      setSelectedPayment(null);
                    }}
                    className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-4 rounded-2xl shadow-xl shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 active:scale-95"
                  >
                    <CheckCircle className="w-5 h-5" /> Thibitisha Malipo
                  </button>
                  <button 
                    onClick={() => {
                      handleRejectDaily(selectedPayment.id);
                      setSelectedPayment(null);
                    }}
                    className="flex-1 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white font-bold py-4 rounded-2xl border border-red-500/20 transition-all flex items-center justify-center gap-2 active:scale-95"
                  >
                    <XCircle className="w-5 h-5" /> Kataa Malipo
                  </button>
                </div>
              ) : (
                <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-2xl flex items-center justify-center gap-2 text-emerald-500 font-bold text-sm">
                  <CheckCircle className="w-5 h-5" /> Malipo Yamethibitishwa
                </div>
              )}
            </div>
          )}
        </Modal>

        {/* Payout Detail Modal */}
        <Modal 
          isOpen={!!selectedPayout} 
          onClose={() => setSelectedPayout(null)} 
          title="Maelezo ya Kutoa Pesa"
        >
          {selectedPayout && (
            <div className="space-y-6">
              <div className="bg-slate-900/50 p-6 rounded-3xl border border-slate-800 space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 flex-shrink-0">
                    {selectedPayout.rider_profile_image ? (
                      <img src={selectedPayout.rider_profile_image} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-purple-400 bg-purple-500/10">
                        <Wallet className="w-6 h-6" />
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white uppercase">{selectedPayout.rider_name}</div>
                    <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{selectedPayout.rider_plate_number || 'NO PLATE'}</div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-800">
                  <div>
                    <div className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Kiasi</div>
                    <div className="text-base font-bold text-emerald-400">TZS {selectedPayout.amount.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Hali Sasa</div>
                    <div className={`text-[10px] font-bold uppercase ${selectedPayout.status === 'approved' ? 'text-emerald-500' : 'text-yellow-500'}`}>
                      {selectedPayout.status}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="glass p-5 rounded-2xl border-slate-800 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest">
                    <CreditCard className="w-4 h-4" /> Akaunti ya Malipo
                  </div>
                  <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800">
                    <div className="text-sm font-bold text-white uppercase mb-1">{selectedPayout.payment_method}</div>
                    <div className="text-lg font-display font-bold text-emerald-500 tracking-widest">{selectedPayout.payment_account}</div>
                    <div className="text-[10px] text-slate-500 mt-2 italic font-medium">Tafadhali tumia namba hii kutuma pesa.</div>
                  </div>
                </div>
              </div>

              {selectedPayout.status === 'pending' ? (
                <div className="flex gap-3">
                  <button 
                    onClick={() => {
                      handleApprovePayout(selectedPayout.id);
                      setSelectedPayout(null);
                    }}
                    className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-4 rounded-2xl shadow-xl shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 active:scale-95"
                  >
                    <CheckCircle className="w-5 h-5" /> Idhinisha Malipo
                  </button>
                  <button 
                    onClick={() => {
                      handleRejectPayout(selectedPayout.id);
                      setSelectedPayout(null);
                    }}
                    className="flex-1 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white font-bold py-4 rounded-2xl border border-red-500/20 transition-all flex items-center justify-center gap-2 active:scale-95"
                  >
                    <XCircle className="w-5 h-5" /> Kataa Ombi
                  </button>
                </div>
              ) : (
                <div className="bg-slate-800 p-4 rounded-2xl text-center text-slate-400 text-sm font-bold uppercase tracking-widest">
                  Tayari Imeshughulikiwa
                </div>
              )}
            </div>
          )}
        </Modal>
        
        {/* Rider Detail Modal */}
        <Modal 
          isOpen={!!selectedRider} 
          onClose={() => setSelectedRider(null)} 
          title="Profile ya Dereva"
        >
          {selectedRider && (
            <div className="space-y-6">
              <div className="flex flex-col items-center gap-4 py-4">
                <div className="w-24 h-24 rounded-[32px] overflow-hidden border-2 border-slate-800 bg-slate-900 flex items-center justify-center">
                  {selectedRider.profile_image ? (
                    <img src={selectedRider.profile_image} alt={selectedRider.name} className="w-full h-full object-cover" />
                  ) : (
                    <Users className="w-10 h-10 text-slate-700" />
                  )}
                </div>
                <div className="text-center">
                  <h2 className="text-xl font-bold text-white uppercase tracking-tight">{selectedRider.name}</h2>
                  <div className="flex items-center justify-center gap-2 mt-1">
                    <span className={`w-2 h-2 rounded-full ${selectedRider.online_status === 1 ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-slate-700'}`} />
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                      {selectedRider.online_status === 1 ? 'Online' : 'Offline'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="glass p-4 rounded-2xl border-slate-800">
                  <div className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mb-1">Mizania ya Wallet</div>
                  <div className="text-lg font-display font-bold text-emerald-400">TZS {selectedRider.wallet_balance.toLocaleString()}</div>
                </div>
                <div className="glass p-4 rounded-2xl border-slate-800">
                  <div className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mb-1">Mizania ya Bonus</div>
                  <div className="text-lg font-display font-bold text-purple-400">TZS {(selectedRider.bonus_balance || 0).toLocaleString()}</div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="glass p-5 rounded-2xl border-slate-800 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest">
                    <MapPinned className="w-4 h-4" /> Maelezo ya Chombo
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-[8px] text-slate-500 uppercase font-black tracking-tighter">Plate Number</div>
                      <div className="text-sm font-bold text-white uppercase mt-1">{selectedRider.plate_number || 'Haikuwekwa'}</div>
                    </div>
                    <div>
                      <div className="text-[8px] text-slate-500 uppercase font-black tracking-tighter">Aina ya Chombo</div>
                      <div className="text-sm font-bold text-white uppercase mt-1">Bodaboda</div>
                    </div>
                  </div>
                </div>

                <div className="glass p-5 rounded-2xl border-slate-800 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest">
                    <SettingsIcon className="w-4 h-4" /> Vitendo vya Haraka
                  </div>
                  <div className="flex gap-2">
                    {selectedRider.status !== 'active' ? (
                      <button 
                        onClick={() => { handleApproveRider(selectedRider.id); setSelectedRider(null); }}
                        className="flex-1 py-3 bg-emerald-500 text-white text-[10px] font-bold rounded-xl hover:bg-emerald-600 transition-all flex items-center justify-center gap-2"
                      >
                        <UserCheck className="w-4 h-4" /> Thibitisha Dereva
                      </button>
                    ) : (
                      <button 
                        onClick={() => { handleSuspendRider(selectedRider.id); setSelectedRider(null); }}
                        className="flex-1 py-3 bg-red-500/10 text-red-500 border border-red-500/20 text-[10px] font-bold rounded-xl hover:bg-red-500 hover:text-white transition-all flex items-center justify-center gap-2"
                      >
                        <UserX className="w-4 h-4" /> Sitisha Huduma
                      </button>
                    )}
                    <button 
                      onClick={() => { setBonusData({ rider_id: selectedRider.id.toString(), amount: "" }); setIsBonusModalOpen(true); setSelectedRider(null); }}
                      className="flex-1 py-3 bg-purple-500/10 text-purple-400 border border-purple-500/20 text-[10px] font-bold rounded-xl hover:bg-purple-500 hover:text-white transition-all flex items-center justify-center gap-2"
                    >
                      <DollarSign className="w-4 h-4" /> Toa Bonus
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </Modal>

        {/* Modal for Dispatch */}
        <Modal 
          isOpen={isDispatchModalOpen} 
          onClose={() => setIsDispatchModalOpen(false)} 
          title="Tuma Safari Mpya"
        >
          <form onSubmit={handleDispatch} className="space-y-5">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Dereva</label>
              <select 
                className="w-full bg-slate-800 border border-slate-700 rounded-2xl py-4 px-5 text-white focus:ring-2 focus:ring-emerald-500/50 transition-all outline-none appearance-none"
                value={dispatchData.rider_id}
                onChange={(e) => setDispatchData({...dispatchData, rider_id: e.target.value})}
                required
              >
                <option value="">Chagua Dereva Online...</option>
                {riders.filter(r => r.online_status === 1 && r.status === 'active').map(r => (
                  <option key={r.id} value={r.id}>{r.name} ({r.phone})</option>
                ))}
              </select>
              <p className="text-[10px] text-slate-500 italic">Ni madereva waliopo "Online" pekee ndio wanaonekana hapa.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Kuchukua</label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />
                  <input 
                    type="text" 
                    placeholder="Pickup Location"
                    className="w-full bg-slate-800 border border-slate-700 rounded-2xl py-4 pl-12 pr-5 text-white"
                    value={dispatchData.pickup}
                    onChange={(e) => {
                      setDispatchData({...dispatchData, pickup: e.target.value});
                      calculateEstimate(e.target.value, dispatchData.dropoff);
                    }}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Kufika</label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-500" />
                  <input 
                    type="text" 
                    placeholder="Drop-off Location"
                    className="w-full bg-slate-800 border border-slate-700 rounded-2xl py-4 pl-12 pr-5 text-white"
                    value={dispatchData.dropoff}
                    onChange={(e) => {
                      setDispatchData({...dispatchData, dropoff: e.target.value});
                      calculateEstimate(dispatchData.pickup, e.target.value);
                    }}
                    required
                  />
                </div>
              </div>
            </div>

            {estimatedFare && (
              <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl flex items-center justify-between">
                <div>
                  <div className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest">Kadirio la Bei</div>
                  <div className="text-sm font-bold text-white">TZS {estimatedFare.toLocaleString()}</div>
                </div>
                <button 
                  type="button"
                  onClick={() => setDispatchData({...dispatchData, fare: estimatedFare})}
                  className="bg-emerald-500/20 hover:bg-emerald-500 text-emerald-400 hover:text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                >
                  Tumia Hii
                </button>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Bei ya Safari (TZS)</label>
              <div className="relative">
                <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input 
                  type="number" 
                  placeholder="Mfano: 5000"
                  className="w-full bg-slate-800 border border-slate-700 rounded-2xl py-4 pl-12 pr-5 font-display text-lg text-white"
                  value={dispatchData.fare || ""}
                  onChange={(e) => setDispatchData({...dispatchData, fare: Number(e.target.value)})}
                  required
                />
              </div>
              <div className="flex justify-between text-[10px] uppercase font-bold tracking-tighter">
                <span className="text-slate-500">Dereva: TZS {(dispatchData.fare * 0.85).toLocaleString()}</span>
                <span className="text-emerald-500">Faida: TZS {(dispatchData.fare * 0.15).toLocaleString()}</span>
              </div>
            </div>

            <button 
              type="submit"
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-4 rounded-2xl shadow-xl shadow-emerald-500/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
            >
              <Send className="w-5 h-5" />
              Tuma Safari Sasa
            </button>
          </form>
        </Modal>

        {/* Rider Edit Modal */}
        <Modal isOpen={isRiderModalOpen} onClose={() => setIsRiderModalOpen(false)} title="Hariri Taarifa za Dereva">
          <form onSubmit={handleSaveRider} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1">Jina kamili</label>
                <input 
                  type="text" 
                  value={riderData.name}
                  onChange={(e) => setRiderData({...riderData, name: e.target.value})}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl py-3 px-4 text-sm text-white focus:ring-2 focus:ring-emerald-500/50 outline-none transition-all"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1">ID Number</label>
                <div className="relative">
                  <input 
                    type="text" 
                    value={riderData.rider_id_number}
                    onChange={(e) => setRiderData({...riderData, rider_id_number: e.target.value})}
                    readOnly={!!riderData.rider_id_number}
                    className={`w-full bg-slate-900 border border-slate-800 rounded-xl py-3 px-4 text-sm text-white focus:ring-2 focus:ring-emerald-500/50 outline-none transition-all ${!!riderData.rider_id_number ? 'opacity-70 cursor-not-allowed' : ''}`}
                    placeholder="Mf. LX-001"
                  />
                  {!riderData.rider_id_number && (
                    <button 
                      type="button"
                      onClick={() => setRiderData({...riderData, rider_id_number: `LX-${String(riderData.id).padStart(3, '0')}`})}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-bold bg-emerald-500 hover:bg-emerald-600 text-white px-2 py-1 rounded-lg transition-colors"
                    >
                      Zalisha
                    </button>
                  )}
                </div>
                <p className="text-[9px] text-slate-500 italic mt-1 px-1">
                  {riderData.rider_id_number ? "Namba hii imeshalindwa." : "Gusa 'Zalisha' kupata namba mpya."}
                </p>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1">Malipo ya Siku</label>
                <input 
                  type="number" 
                  value={riderData.daily_amount}
                  onChange={(e) => setRiderData({...riderData, daily_amount: Number(e.target.value)})}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl py-3 px-4 text-sm text-white focus:ring-2 focus:ring-emerald-500/50 outline-none transition-all"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1">Hali (Status)</label>
                <select 
                  value={riderData.status}
                  onChange={(e) => setRiderData({...riderData, status: e.target.value})}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl py-3 px-4 text-sm text-white focus:ring-2 focus:ring-emerald-500/50 outline-none transition-all"
                >
                  <option value="active" className="bg-slate-900">Active</option>
                  <option value="pending" className="bg-slate-900">Pending</option>
                  <option value="suspended" className="bg-slate-900">Suspended</option>
                </select>
              </div>
            </div>
            <button 
              type="submit" 
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-4 rounded-2xl shadow-xl shadow-emerald-500/20 active:scale-95 transition-all"
            >
              Hifadhi Mabadiliko
            </button>
          </form>
        </Modal>

        {/* Vehicle Management Modal */}
        <Modal 
          isOpen={isVehicleModalOpen} 
          onClose={() => setIsVehicleModalOpen(false)} 
          title={vehicleData.id ? "Hariri Chombo" : t.add_vehicle}
        >
          <form onSubmit={handleSaveVehicle} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest px-1">Namba ya Chombo</label>
                <input 
                  type="text" 
                  placeholder="Mfano: MC 123 ABC"
                  className="w-full bg-slate-900 border border-slate-800 rounded-2xl py-4 px-5 text-white focus:ring-2 focus:ring-emerald-500/50 outline-none uppercase font-display font-bold"
                  value={vehicleData.plate_number}
                  onChange={(e) => setVehicleData({...vehicleData, plate_number: e.target.value.toUpperCase()})}
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest px-1">Model / Brand</label>
                <input 
                  type="text" 
                  placeholder="Mfano: Boxer, Yamaha"
                  className="w-full bg-slate-900 border border-slate-800 rounded-2xl py-4 px-5 text-white focus:ring-2 focus:ring-emerald-500/50 outline-none"
                  value={vehicleData.model}
                  onChange={(e) => setVehicleData({...vehicleData, model: e.target.value})}
                  required
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest px-1">{t.card_image}</label>
                <div className="flex items-center gap-4">
                  <div 
                    className="w-16 h-12 bg-slate-900 rounded-xl border border-slate-800 overflow-hidden flex items-center justify-center cursor-pointer hover:border-emerald-500/50 transition-all"
                    onClick={() => vehicleData.card_image && setZoomedImage(vehicleData.card_image)}
                  >
                    {vehicleData.card_image ? (
                      <img src={vehicleData.card_image} className="w-full h-full object-cover" alt="Card" />
                    ) : (
                      <ImageIcon className="w-6 h-6 text-slate-800" />
                    )}
                  </div>
                  <label className="flex-1 cursor-pointer">
                    <div className="w-full py-3 bg-slate-900 border border-slate-800 border-dashed rounded-xl text-[10px] font-bold text-slate-400 text-center uppercase hover:border-emerald-500/50 transition-all">
                      {vehicleData.card_image ? "Badilisha Kadi" : "Pakia Kadi"}
                    </div>
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => setVehicleData({...vehicleData, card_image: reader.result as string});
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </label>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest px-1">{t.insurance}</label>
                <div className="flex items-center gap-4">
                  <div 
                    className="w-16 h-12 bg-slate-900 rounded-xl border border-slate-800 overflow-hidden flex items-center justify-center cursor-pointer hover:border-emerald-500/50 transition-all"
                    onClick={() => vehicleData.insurance_image && setZoomedImage(vehicleData.insurance_image)}
                  >
                    {vehicleData.insurance_image ? (
                      <img src={vehicleData.insurance_image} className="w-full h-full object-cover" alt="Insurance" />
                    ) : (
                      <ImageIcon className="w-6 h-6 text-slate-800" />
                    )}
                  </div>
                  <label className="flex-1 cursor-pointer">
                    <div className="w-full py-3 bg-slate-900 border border-slate-800 border-dashed rounded-xl text-[10px] font-bold text-slate-400 text-center uppercase hover:border-emerald-500/50 transition-all">
                      {vehicleData.insurance_image ? "Badilisha Bima" : "Pakia Bima"}
                    </div>
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => setVehicleData({...vehicleData, insurance_image: reader.result as string});
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </label>
                </div>
              </div>
            </div>

            <button 
              type="submit"
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-4 rounded-2xl shadow-xl shadow-emerald-500/20 transition-all active:scale-95"
            >
              Hifadhi Chombo
            </button>
          </form>
        </Modal>

        {/* Global Image Zoom Modal */}
        {zoomedImage && (
          <div 
            className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300"
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
            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 text-white/50 text-[10px] font-bold uppercase tracking-[0.3em] bg-white/5 px-6 py-2 rounded-full border border-white/10 italic">
              Gusa popote kufunga
            </div>
          </div>
        )}
      </div>
    </Shell>
  );
}

function StatCard({ icon, label, value, subText, theme }: { icon: any, label: string, value: string | number, subText: string, theme: "emerald" | "purple" | "red" }) {
  const styles = {
    emerald: "glass-emerald emerald-glow",
    purple: "glass-purple purple-glow",
    red: "bg-red-500/5 border-red-500/20 shadow-xl shadow-red-500/5"
  };

  return (
    <motion.div 
      whileHover={{ y: -4, scale: 1.02 }}
      className={`p-4 md:p-6 rounded-[28px] md:rounded-[32px] flex flex-col justify-between ${styles[theme]}`}
    >
      <div className="w-10 h-10 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-center mb-6">
        {icon}
      </div>
      <div>
        <div className="text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">{label}</div>
        <div className="text-lg md:text-2xl font-display font-bold text-white leading-tight mb-1">{value}</div>
        <div className="text-[9px] md:text-[10px] text-slate-500 font-medium">{subText}</div>
      </div>
    </motion.div>
  );
}
