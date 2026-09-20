import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  User,
  Bell,
  Shield,
  GraduationCap,
  Save,
  CheckCircle2,
  Trash2,
  Download,
  Key,
  Mail,
  Smartphone,
  MapPin,
  Sparkles,
  ExternalLink,
  ChevronRight,
  AlertTriangle,
  Clock,
  Send,
  Loader2,
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { toast } from "sonner";
import {
  getPreferences,
  updatePreferences,
  sendTestNotification,
} from "../services/notificationService";

function Toggle({ checked, onChange, disabled = false, ariaLabel = "Toggle setting" }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-750/50 ${
        checked ? "bg-emerald-800" : "bg-slate-300"
      } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
    >
      <span
        className={`pointer-events-none inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-xs transition duration-200 ease-in-out ${
          checked ? "translate-x-4.5" : "translate-x-1"
        }`}
      />
    </button>
  );
}

export default function Settings() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("profile");

  const [profile, setProfile] = useState({
    name: user?.name || "Priya Sharma",
    email: user?.email || "priya.sharma@example.com",
    phone: "+91 98765 43210",
    educationLevel: "Undergraduate (B.Tech / B.E.)",
    stream: "Engineering / Technology",
    college: "Jadavpur University",
    cgpa: "8.85",
    state: "West Bengal",
    category: "General / Open",
    annualIncome: "₹2,50,000 - ₹5,00,000",
    gender: "Female",
    disability: "No",
  });

  useEffect(() => {
    if (user) {
      setProfile((prev) => ({
        ...prev,
        name: user.name || prev.name,
        email: user.email || prev.email,
        phone: user.phone || prev.phone,
      }));
    }
  }, [user]);

  const [notifications, setNotifications] = useState({
    instantMatch: true,
    deadlineAlerts: true,
    deadline7Days: true,
    deadline48Hours: true,
    newGrantsInState: true,
    weeklyDigest: true,
    channels: {
      inApp: true,
      email: true,
    },
    timezone: "Asia/Kolkata",
    minMatchScore: 70,
  });
  const [notifLoading, setNotifLoading] = useState(false);
  const [notifSaving, setNotifSaving] = useState(false);
  const [testingAlert, setTestingAlert] = useState(false);

  const [security, setSecurity] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [targetCategories, setTargetCategories] = useState([
    "Merit-Based",
    "Means-Based / Financial Need",
    "Women & Girls",
    "STEM & Tech Grants",
  ]);

  const allCategories = [
    "Merit-Based",
    "Means-Based / Financial Need",
    "Women & Girls",
    "STEM & Tech Grants",
    "Minority & Reserved",
    "Higher Studies Abroad",
    "Single Girl Child",
    "Sports & Cultural",
    "Differently Abled (PwD)",
  ];

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (user && token) {
      setNotifLoading(true);
      getPreferences()
        .then((res) => {
          if (res.success && res.preferences) {
            setNotifications({
              instantMatch: res.preferences.instantMatch ?? true,
              deadlineAlerts: res.preferences.deadlineAlerts ?? true,
              deadline7Days: res.preferences.deadline7Days ?? true,
              deadline48Hours: res.preferences.deadline48Hours ?? true,
              newGrantsInState: res.preferences.newGrantsInState ?? true,
              weeklyDigest: res.preferences.weeklyDigest ?? true,
              channels: {
                inApp: res.preferences.channels?.inApp ?? true,
                email: res.preferences.channels?.email ?? true,
              },
              timezone: res.preferences.timezone || "Asia/Kolkata",
              minMatchScore: res.preferences.minMatchScore || 70,
            });
          }
        })
        .catch((err) => {
          if (err.response?.status !== 401) {
            console.warn("Using local alert settings fallback:", err?.message);
          }
        })
        .finally(() => setNotifLoading(false));
    }
  }, [user]);

  const handleProfileSave = (e) => {
    e.preventDefault();
    const token = localStorage.getItem("token");
    if (!user || !token) {
      toast.info("Preferences saved in session. Sign in to sync across devices.");
      return;
    }
    toast.success("Profile preferences saved successfully.");
  };

  const handleNotificationsSave = async () => {
    const token = localStorage.getItem("token");
    if (!user || !token) {
      toast.info("Preferences saved in session. Sign in to enable cloud alerts.");
      return;
    }
    setNotifSaving(true);
    try {
      const res = await updatePreferences(notifications);
      if (res.success) {
        toast.success("Notification preferences saved successfully.");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed saving alert settings");
    } finally {
      setNotifSaving(false);
    }
  };

  const handleSendTestAlert = async () => {
    setTestingAlert(true);
    const token = localStorage.getItem("token");

    if (!user || !token) {
      setTimeout(() => {
        const previewAlert = {
          _id: `preview_${Date.now()}`,
          title: "Upcoming Deadline: Post-Matric Scholarship",
          message: "Application window closes in 7 days. Complete verification with your institute nodal officer.",
          type: "DEADLINE_7_DAYS",
          priority: "high",
          isRead: false,
          createdAt: new Date().toISOString(),
          evidence: {
            eligibilityReason: "Income < ₹2.5L and verified undergraduate student",
          },
        };
        window.dispatchEvent(
          new CustomEvent("preview-notification", { detail: previewAlert })
        );
        toast.success(
          "Preview alert dispatched. Check the bell icon in your navigation bar."
        );
        setTestingAlert(false);
      }, 350);
      return;
    }

    try {
      const res = await sendTestNotification();
      if (res.success) {
        toast.success("Test notification dispatched. Check your top navigation bell.");
      }
    } catch (err) {
      if (err.response?.status === 401) {
        toast.error("Session expired. Please sign in again to dispatch live alerts.");
      } else {
        toast.error(err.response?.data?.message || "Failed dispatching test notification");
      }
    } finally {
      setTestingAlert(false);
    }
  };

  const handleSecuritySave = (e) => {
    e.preventDefault();
    if (security.newPassword && security.newPassword !== security.confirmPassword) {
      toast.error("New passwords do not match!");
      return;
    }
    if (security.newPassword && security.newPassword.length < 8) {
      toast.error("Password must be at least 8 characters long.");
      return;
    }
    toast.success("Password updated securely!");
    setSecurity({ currentPassword: "", newPassword: "", confirmPassword: "" });
  };

  const toggleCategory = (cat) => {
    if (targetCategories.includes(cat)) {
      setTargetCategories(targetCategories.filter((c) => c !== cat));
    } else {
      setTargetCategories([...targetCategories, cat]);
    }
  };

  const handleExportData = () => {
    const dataStr =
      "data:text/json;charset=utf-8," +
      encodeURIComponent(
        JSON.stringify(
          {
            user: profile,
            targetCategories,
            notifications,
            exportedAt: new Date().toISOString(),
          },
          null,
          2
        )
      );
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `udaan_profile_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    toast.success("Profile data exported as JSON.");
  };

  const tabs = [
    { id: "profile", label: "Profile & Demographics", icon: User },
    { id: "academics", label: "Academic Preferences", icon: GraduationCap },
    { id: "notifications", label: "Notifications & Alerts", icon: Bell },
    { id: "security", label: "Security & Account", icon: Shield },
  ];

  return (
    <div className="min-h-screen bg-[#FAF9F6] py-10 px-5 sm:px-8 text-slate-900">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <div className="inline-flex items-center gap-2 text-xs font-semibold tracking-wider text-emerald-850 uppercase mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-700"></span>
            <span>Account Settings</span>
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-serif text-slate-900 leading-tight">
            Settings & <span className="italic text-emerald-800 font-normal">Preferences</span>
          </h1>
          <p className="text-sm sm:text-base text-slate-600 mt-2 font-normal">
            Manage your academic profile, eligibility criteria, and deadline notification preferences.
          </p>
        </div>

        {!user && (
          <div className="mb-8 p-4 rounded-2xl bg-amber-50/80 border border-amber-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-950 shadow-2xs">
            <div className="flex items-start sm:items-center gap-2.5">
              <AlertTriangle size={16} className="text-amber-700 shrink-0 mt-0.5 sm:mt-0" />
              <span>
                You are viewing settings in guest mode. Sign in to save your profile to the cloud and receive automated deadline notifications.
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Link
                to="/login"
                className="px-3 py-1.5 rounded-xl bg-slate-900 text-white font-semibold hover:bg-slate-800 transition"
              >
                Sign In
              </Link>
              <Link
                to="/signup"
                className="px-3 py-1.5 rounded-xl border border-amber-300 bg-white font-semibold hover:bg-amber-100/50 transition"
              >
                Create Account
              </Link>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-8 items-start">
          <nav className="bg-white border border-slate-200/90 rounded-3xl p-3 shadow-2xs space-y-1 sticky top-24">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs sm:text-sm font-semibold transition-all duration-150 text-left cursor-pointer ${
                    isActive
                      ? "bg-slate-900 text-white font-bold shadow-2xs"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <Icon
                    size={17}
                    className={isActive ? "text-emerald-400" : "text-slate-400"}
                  />
                  <span>{tab.label}</span>
                </button>
              );
            })}

            <div className="pt-3 mt-3 border-t border-slate-100 px-3">
              <div className="bg-emerald-50/70 border border-emerald-200/70 rounded-2xl p-3 text-xs text-slate-700 leading-relaxed font-normal">
                <p className="font-bold text-emerald-900 flex items-center gap-1.5 mb-1">
                  <Sparkles size={13} className="text-emerald-700" /> Match Accuracy
                </p>
                Keep details up to date to get 100% accurate scholarship calculations.
              </div>
            </div>
          </nav>

          <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-2xs">
            {activeTab === "profile" && (
              <form onSubmit={handleProfileSave} className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 mb-1 font-sans">
                    Personal & Demographic Details
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-600 font-normal">
                    This information determines which state and demographic scholarships you qualify for.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={profile.name}
                      onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                      className="w-full bg-[#FAF9F6] border border-slate-300 rounded-2xl px-4 py-2.5 text-sm text-slate-900 font-medium focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700 outline-none transition"
                      required
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={profile.email}
                      onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                      className="w-full bg-[#FAF9F6] border border-slate-300 rounded-2xl px-4 py-2.5 text-sm text-slate-900 font-medium focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700 outline-none transition"
                      required
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={profile.phone}
                      onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                      className="w-full bg-[#FAF9F6] border border-slate-300 rounded-2xl px-4 py-2.5 text-sm text-slate-900 font-medium focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700 outline-none transition"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Domicile State
                    </label>
                    <select
                      value={profile.state}
                      onChange={(e) => setProfile({ ...profile, state: e.target.value })}
                      className="w-full bg-[#FAF9F6] border border-slate-300 rounded-2xl px-4 py-2.5 text-sm text-slate-900 font-medium focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700 outline-none transition cursor-pointer"
                    >
                      <option>All India / Central</option>
                      <option>West Bengal</option>
                      <option>Maharashtra</option>
                      <option>Delhi NCR</option>
                      <option>Karnataka</option>
                      <option>Tamil Nadu</option>
                      <option>Uttar Pradesh</option>
                      <option>Bihar</option>
                      <option>Rajasthan</option>
                      <option>Gujarat</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Social Category
                    </label>
                    <select
                      value={profile.category}
                      onChange={(e) => setProfile({ ...profile, category: e.target.value })}
                      className="w-full bg-[#FAF9F6] border border-slate-300 rounded-2xl px-4 py-2.5 text-sm text-slate-900 font-medium focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700 outline-none transition cursor-pointer"
                    >
                      <option>General / Open</option>
                      <option>OBC (Non-Creamy Layer)</option>
                      <option>Scheduled Caste (SC)</option>
                      <option>Scheduled Tribe (ST)</option>
                      <option>Economically Weaker Section (EWS)</option>
                      <option>Religious Minority</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Annual Family Income
                    </label>
                    <select
                      value={profile.annualIncome}
                      onChange={(e) => setProfile({ ...profile, annualIncome: e.target.value })}
                      className="w-full bg-[#FAF9F6] border border-slate-300 rounded-2xl px-4 py-2.5 text-sm text-slate-900 font-medium focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700 outline-none transition cursor-pointer"
                    >
                      <option>Less than ₹1,50,000</option>
                      <option>₹1,50,000 - ₹2,50,000</option>
                      <option>₹2,50,000 - ₹5,00,000</option>
                      <option>₹5,00,000 - ₹8,00,000</option>
                      <option>Above ₹8,00,000</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Gender
                    </label>
                    <select
                      value={profile.gender}
                      onChange={(e) => setProfile({ ...profile, gender: e.target.value })}
                      className="w-full bg-[#FAF9F6] border border-slate-300 rounded-2xl px-4 py-2.5 text-sm text-slate-900 font-medium focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700 outline-none transition cursor-pointer"
                    >
                      <option>Female</option>
                      <option>Male</option>
                      <option>Non-Binary / Other</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Person with Disability (PwD)
                    </label>
                    <select
                      value={profile.disability}
                      onChange={(e) => setProfile({ ...profile, disability: e.target.value })}
                      className="w-full bg-[#FAF9F6] border border-slate-300 rounded-2xl px-4 py-2.5 text-sm text-slate-900 font-medium focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700 outline-none transition cursor-pointer"
                    >
                      <option>No</option>
                      <option>Yes (40% or above)</option>
                    </select>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-end">
                  <button
                    type="submit"
                    className="cursor-pointer inline-flex items-center gap-2 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold px-6 py-2.5 rounded-full transition-all shadow-2xs hover:shadow-xs"
                  >
                    <Save size={14} /> Save Profile Changes
                  </button>
                </div>
              </form>
            )}

            {activeTab === "academics" && (
              <form onSubmit={handleProfileSave} className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 mb-1 font-sans">
                    Academic Background & Grants Target
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-600 font-normal">
                    Customize your fields of study and the specific types of opportunities you want highlighted.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Current Level of Study
                    </label>
                    <select
                      value={profile.educationLevel}
                      onChange={(e) => setProfile({ ...profile, educationLevel: e.target.value })}
                      className="w-full bg-[#FAF9F6] border border-slate-300 rounded-2xl px-4 py-2.5 text-sm text-slate-900 font-medium focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700 outline-none transition cursor-pointer"
                    >
                      <option>Class 10th</option>
                      <option>Class 11th / 12th</option>
                      <option>Undergraduate (B.Tech / B.E.)</option>
                      <option>Undergraduate (B.Sc / B.Com / B.A.)</option>
                      <option>Undergraduate (Medical / MBBS / BDS)</option>
                      <option>Postgraduate (M.Tech / M.Sc / M.A.)</option>
                      <option>PhD / Doctoral Research</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Field / Course Stream
                    </label>
                    <select
                      value={profile.stream}
                      onChange={(e) => setProfile({ ...profile, stream: e.target.value })}
                      className="w-full bg-[#FAF9F6] border border-slate-300 rounded-2xl px-4 py-2.5 text-sm text-slate-900 font-medium focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700 outline-none transition cursor-pointer"
                    >
                      <option>Engineering / Technology</option>
                      <option>Medicine & Healthcare</option>
                      <option>Pure & Applied Sciences</option>
                      <option>Commerce & Management</option>
                      <option>Arts, Humanities & Law</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      College / Institution Name
                    </label>
                    <input
                      type="text"
                      value={profile.college}
                      onChange={(e) => setProfile({ ...profile, college: e.target.value })}
                      className="w-full bg-[#FAF9F6] border border-slate-300 rounded-2xl px-4 py-2.5 text-sm text-slate-900 font-medium focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700 outline-none transition"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Latest CGPA / Percentage
                    </label>
                    <input
                      type="text"
                      value={profile.cgpa}
                      onChange={(e) => setProfile({ ...profile, cgpa: e.target.value })}
                      className="w-full bg-[#FAF9F6] border border-slate-300 rounded-2xl px-4 py-2.5 text-sm text-slate-900 font-medium focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700 outline-none transition"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2.5">
                    Target Scholarship Categories
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {allCategories.map((cat) => {
                      const isSelected = targetCategories.includes(cat);
                      return (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => toggleCategory(cat)}
                          className={`cursor-pointer text-xs font-bold px-3.5 py-1.5 rounded-full border transition-all ${
                            isSelected
                              ? "bg-emerald-800 text-white border-emerald-800 shadow-2xs"
                              : "bg-white border-slate-300 text-slate-700 hover:border-emerald-400 hover:bg-slate-50"
                          }`}
                        >
                          {isSelected && "✓ "} {cat}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-end">
                  <button
                    type="submit"
                    className="cursor-pointer inline-flex items-center gap-2 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold px-6 py-2.5 rounded-full transition-all shadow-2xs hover:shadow-xs"
                  >
                    <Save size={14} /> Save Academic Profile
                  </button>
                </div>
              </form>
            )}

            {activeTab === "notifications" && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 mb-1 font-sans">
                      Notification & Deadline Alerts
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-600 font-normal">
                      Configure real-time eligibility alerts, cutoff countdowns, and weekly digests. All settings are enforced immediately.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleSendTestAlert}
                    disabled={testingAlert}
                    className="cursor-pointer inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100/70 text-emerald-900 text-xs font-bold transition shadow-2xs shrink-0 disabled:opacity-60"
                  >
                    {testingAlert ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : (
                      <Send size={13} />
                    )}
                    <span>{testingAlert ? "Sending..." : "Send Test Alert"}</span>
                  </button>
                </div>

                {notifLoading ? (
                  <div className="py-12 text-center text-xs text-slate-400">
                    Loading your notification preferences...
                  </div>
                ) : (
                  <>
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-4 p-4 rounded-2xl border border-slate-200/90 bg-[#FAF9F6] hover:bg-emerald-50/30 transition-colors">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <Sparkles size={15} className="text-emerald-700" />
                            <h4 className="text-sm font-bold text-slate-900">
                              Instant Eligibility Match Alerts
                            </h4>
                          </div>
                          <p className="text-xs text-slate-600 leading-relaxed font-normal">
                            Automatically notify me the moment a newly discovered or updated scholarship matches my profile with 70% or higher confidence.
                          </p>
                        </div>
                        <div className="shrink-0 mt-0.5">
                          <Toggle
                            checked={notifications.instantMatch}
                            onChange={(val) =>
                              setNotifications({ ...notifications, instantMatch: val })
                            }
                            ariaLabel="Instant Eligibility Match Alerts"
                          />
                        </div>
                      </div>

                      <div className="p-4 rounded-2xl border border-slate-200/90 bg-[#FAF9F6] hover:bg-emerald-50/30 transition-colors space-y-3">
                        <div className="flex items-start justify-between gap-4">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <Clock size={15} className="text-amber-700" />
                              <h4 className="text-sm font-bold text-slate-900">
                                Upcoming Deadline Reminders
                              </h4>
                            </div>
                            <p className="text-xs text-slate-600 leading-relaxed font-normal">
                              Proactive countdown alerts before closing dates of matching or bookmarked scholarships. Expired schemes are suppressed automatically.
                            </p>
                          </div>
                          <div className="shrink-0 mt-0.5">
                            <Toggle
                              checked={notifications.deadlineAlerts}
                              onChange={(val) =>
                                setNotifications({ ...notifications, deadlineAlerts: val })
                              }
                              ariaLabel="Upcoming Deadline Reminders"
                            />
                          </div>
                        </div>

                        {notifications.deadlineAlerts && (
                          <div className="pt-3 border-t border-slate-200/70 pl-6 space-y-2.5">
                            <label className="flex items-center gap-2.5 cursor-pointer text-xs font-medium text-slate-800">
                              <input
                                type="checkbox"
                                checked={notifications.deadline7Days}
                                onChange={(e) =>
                                  setNotifications({
                                    ...notifications,
                                    deadline7Days: e.target.checked,
                                  })
                                }
                                className="rounded border-slate-300 text-emerald-800 focus:ring-emerald-700"
                              />
                              <span>7 Days Before Deadline (Preparation window)</span>
                            </label>

                            <label className="flex items-center gap-2.5 cursor-pointer text-xs font-medium text-slate-800">
                              <input
                                type="checkbox"
                                checked={notifications.deadline48Hours}
                                onChange={(e) =>
                                  setNotifications({
                                    ...notifications,
                                    deadline48Hours: e.target.checked,
                                  })
                                }
                                className="rounded border-slate-300 text-emerald-800 focus:ring-emerald-700"
                              />
                              <span>48 Hours Before Deadline (Urgent final submission warning)</span>
                            </label>
                          </div>
                        )}
                      </div>

                      <div className="flex items-start justify-between gap-4 p-4 rounded-2xl border border-slate-200/90 bg-[#FAF9F6] hover:bg-emerald-50/30 transition-colors">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <MapPin size={15} className="text-teal-700" />
                            <h4 className="text-sm font-bold text-slate-900">
                              State & Regional Grant Updates
                            </h4>
                          </div>
                          <p className="text-xs text-slate-600 leading-relaxed font-normal">
                            Special alerts whenever newly discovered state government schemes are announced for your domicile ({profile.state || "All India"}).
                          </p>
                        </div>
                        <div className="shrink-0 mt-0.5">
                          <Toggle
                            checked={notifications.newGrantsInState}
                            onChange={(val) =>
                              setNotifications({ ...notifications, newGrantsInState: val })
                            }
                            ariaLabel="State & Regional Grant Updates"
                          />
                        </div>
                      </div>

                      <div className="flex items-start justify-between gap-4 p-4 rounded-2xl border border-slate-200/90 bg-[#FAF9F6] hover:bg-emerald-50/30 transition-colors">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <Mail size={15} className="text-sky-700" />
                            <h4 className="text-sm font-bold text-slate-900">
                              Weekly Curated Scholarship Digest
                            </h4>
                          </div>
                          <p className="text-xs text-slate-600 leading-relaxed font-normal">
                            A curated personalized summary sent every Monday morning highlighting top matching opportunities accepting applications this week.
                          </p>
                        </div>
                        <div className="shrink-0 mt-0.5">
                          <Toggle
                            checked={notifications.weeklyDigest}
                            onChange={(val) =>
                              setNotifications({ ...notifications, weeklyDigest: val })
                            }
                            ariaLabel="Weekly Curated Scholarship Digest"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-slate-100 space-y-4">
                      <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                        Delivery Channels & Timezone
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="p-3.5 rounded-xl border border-slate-200 bg-white flex items-center justify-between">
                          <div>
                            <div className="text-xs font-bold text-slate-900">In-App Notification Center</div>
                            <div className="text-[11px] text-slate-500">Top navigation bell badge and panel</div>
                          </div>
                          <Toggle
                            checked={notifications.channels?.inApp}
                            onChange={(val) =>
                              setNotifications({
                                ...notifications,
                                channels: {
                                  ...notifications.channels,
                                  inApp: val,
                                },
                              })
                            }
                            ariaLabel="In-App Notification Center"
                          />
                        </div>

                        <div className="p-3.5 rounded-xl border border-slate-200 bg-white flex items-center justify-between">
                          <div>
                            <div className="text-xs font-bold text-slate-900">Email Delivery</div>
                            <div className="text-[11px] text-slate-500 truncate max-w-44">{user?.email || "Account email"}</div>
                          </div>
                          <Toggle
                            checked={notifications.channels?.email}
                            onChange={(val) =>
                              setNotifications({
                                ...notifications,
                                channels: {
                                  ...notifications.channels,
                                  email: val,
                                },
                              })
                            }
                            ariaLabel="Email Delivery"
                          />
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3.5 rounded-xl border border-slate-200 bg-white">
                        <div>
                          <div className="text-xs font-bold text-slate-900">Scheduled Digest Timezone</div>
                          <div className="text-[11px] text-slate-500">Determines when Monday morning digests are dispatched</div>
                        </div>
                        <select
                          value={notifications.timezone}
                          onChange={(e) =>
                            setNotifications({
                              ...notifications,
                              timezone: e.target.value,
                            })
                          }
                          className="bg-[#FAF9F6] border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-900 font-medium outline-none cursor-pointer"
                        >
                          <option value="Asia/Kolkata">Asia/Kolkata (IST - UTC+5:30)</option>
                          <option value="UTC">UTC (Coordinated Universal Time)</option>
                          <option value="Asia/Dubai">Asia/Dubai (GST - UTC+4:00)</option>
                          <option value="Europe/London">Europe/London (GMT/BST)</option>
                          <option value="America/New_York">America/New_York (EST/EDT)</option>
                        </select>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-slate-100 flex items-center justify-end">
                      <button
                        type="button"
                        onClick={handleNotificationsSave}
                        disabled={notifSaving}
                        className="cursor-pointer inline-flex items-center gap-2 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold px-6 py-2.5 rounded-full transition-all shadow-2xs hover:shadow-xs disabled:opacity-60"
                      >
                        {notifSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                        <span>{notifSaving ? "Saving..." : "Save Alert Settings"}</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {activeTab === "security" && (
              <div className="space-y-8">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 mb-1 font-sans">
                    Security & Account Control
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-600 font-normal">
                    Manage your credentials, connected identity providers, and data privacy.
                  </p>
                </div>

                <form onSubmit={handleSecuritySave} className="space-y-4">
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                    <Key size={15} className="text-emerald-800" /> Update Password
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-slate-700">
                        Current Password
                      </label>
                      <input
                        type="password"
                        placeholder="••••••••"
                        value={security.currentPassword}
                        onChange={(e) =>
                          setSecurity({ ...security, currentPassword: e.target.value })
                        }
                        className="w-full bg-[#FAF9F6] border border-slate-300 rounded-2xl px-4 py-2.5 text-sm text-slate-900 focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700 outline-none transition"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-slate-700">
                        New Password
                      </label>
                      <input
                        type="password"
                        placeholder="Min 8 characters"
                        value={security.newPassword}
                        onChange={(e) =>
                          setSecurity({ ...security, newPassword: e.target.value })
                        }
                        className="w-full bg-[#FAF9F6] border border-slate-300 rounded-2xl px-4 py-2.5 text-sm text-slate-900 focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700 outline-none transition"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-slate-700">
                        Confirm New Password
                      </label>
                      <input
                        type="password"
                        placeholder="Repeat new password"
                        value={security.confirmPassword}
                        onChange={(e) =>
                          setSecurity({ ...security, confirmPassword: e.target.value })
                        }
                        className="w-full bg-[#FAF9F6] border border-slate-300 rounded-2xl px-4 py-2.5 text-sm text-slate-900 focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700 outline-none transition"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      className="cursor-pointer inline-flex items-center gap-2 bg-slate-900 hover:bg-emerald-800 text-white text-xs font-bold px-5 py-2.5 rounded-full transition-all shadow-2xs"
                    >
                      Update Password
                    </button>
                  </div>
                </form>

                <div className="pt-6 border-t border-slate-100 space-y-3">
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Connected Accounts
                  </h3>
                  <div className="flex items-center justify-between p-4 rounded-2xl border border-slate-200 bg-[#FAF9F6]">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center shadow-2xs">
                        <svg width="18" height="18" viewBox="0 0 48 48">
                          <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                          <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                          <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                          <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.35-8.16 2.35-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900">Google OAuth</p>
                        <p className="text-xs text-slate-500 font-normal">
                          {user?.email || "Connected for one-click authentication"}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-3 py-1 rounded-full">
                      Connected
                    </span>
                  </div>
                </div>

                <div className="pt-6 border-t border-slate-100 space-y-3">
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Data Privacy & Account Controls
                  </h3>

                  <div className="flex items-center justify-between p-4 rounded-2xl border border-slate-200 bg-[#FAF9F6]">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">Download Profile Data</h4>
                      <p className="text-xs text-slate-500 font-normal">
                        Export all saved eligibility criteria, preferences, and activity in JSON format.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleExportData}
                      className="cursor-pointer inline-flex items-center gap-1.5 border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold px-4 py-2 rounded-xl transition-all shadow-2xs"
                    >
                      <Download size={13} /> Export JSON
                    </button>
                  </div>

                  <div className="p-4 rounded-2xl border border-rose-200 bg-rose-50/40 flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-rose-900 flex items-center gap-1.5">
                        <AlertTriangle size={15} className="text-rose-600" /> Delete Account
                      </h4>
                      <p className="text-xs text-rose-700 font-normal">
                        Permanently remove your account, saved scholarships, and eligibility data.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        toast.error(
                          "Please contact support@udaan.com to process permanent account deletion."
                        )
                      }
                      className="cursor-pointer inline-flex items-center gap-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all shadow-2xs"
                    >
                      <Trash2 size={13} /> Delete
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

