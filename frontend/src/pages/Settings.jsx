import { useState, useEffect, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import AlertPreferences from "../components/AlertPreferences";
import SettingsSectionHeader from "../components/SettingsSectionHeader";
import "./settings.css";
import {
  User,
  Bell,
  Shield,
  GraduationCap,
  Save,
  Trash2,
  Download,
  Key,
  Sparkles,
  AlertTriangle,
  Sliders,
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { toast } from "sonner";
import {
  getPreferences,
  updatePreferences,
  sendTestNotification,
} from "../services/notificationService";

export default function Settings() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTab = searchParams.get("tab");
  const activeTab = ["profile", "academics", "notifications", "security"].includes(requestedTab) ? requestedTab : "profile";
  const setActiveTab = (tab) => {
    const next = new URLSearchParams(searchParams);
    next.set("tab", tab);
    setSearchParams(next, { replace: true });
  };

  const [profile, setProfile] = useState({
    name: user?.name || "",
    email: user?.email || "",
    phone: user?.phone || "",
    educationLevel: "",
    stream: "",
    college: "",
    cgpa: "",
    state: "",
    category: "",
    annualIncome: "",
    gender: "",
    disability: "",
  });

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
  const [notifLoading, setNotifLoading] = useState(Boolean(user));
  const [savedNotifications, setSavedNotifications] = useState(null);
  const [notifError, setNotifError] = useState(false);
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

  const loadNotificationPreferences = useCallback(() => {
    const token = localStorage.getItem("token");
    if (user && token) {
      setNotifLoading(true);
      setNotifError(false);
      getPreferences()
        .then((res) => {
          if (res.success && res.preferences) {
            const preferences = {
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
            };
            setNotifications(preferences);
            setSavedNotifications(preferences);
          } else {
            setNotifError(true);
          }
        })
        .catch((err) => {
          setNotifError(true);
          if (err.response?.status !== 401) {
            console.warn("Could not load alert settings:", err?.message);
          }
        })
        .finally(() => setNotifLoading(false));
    }
  }, [user]);

  useEffect(() => {
    const start = setTimeout(loadNotificationPreferences, 0);
    return () => clearTimeout(start);
  }, [loadNotificationPreferences]);

  const handleProfileSave = (e) => {
    e.preventDefault();
    toast.success("Your draft is kept while you're on this page. Export a copy from Security & Account to keep it.");
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
        setSavedNotifications(notifications);
        toast.success("Notification preferences saved successfully.");
      } else {
        toast.error("Couldn't save your alert settings. Try again.");
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
        window.dispatchEvent(new Event("notifications-updated"));
        if (!notifications.channels?.inApp && !notifications.channels?.email) {
          toast.warning(
            "Test alert processed, but both In-App and Email channels are disabled in your settings.",
            { duration: 4000 }
          );
        } else if (!notifications.channels?.inApp) {
          toast.info(
            "Test alert dispatched to email only (In-App notifications are currently disabled).",
            { duration: 4000 }
          );
        } else {
          toast.success(
            "Test notification dispatched! Check your top navigation bell.",
            { duration: 4000 }
          );
        }
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
    toast.info("Password changes aren't available on this page yet.");
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
    <div className="settings-page min-h-screen py-10 px-5 sm:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="settings-main-header">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-slate-200 bg-white text-xs font-semibold tracking-wider text-emerald-850 uppercase mb-2 shadow-2xs">
            <Sliders size={13} className="text-emerald-700 shrink-0" />
            <span>Account Settings</span>
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-serif text-slate-900 leading-tight">
            Settings & <span className="italic text-emerald-800 font-normal">Preferences</span>
          </h1>
          <p className="text-sm sm:text-base text-slate-600 mt-2 font-normal">
            Your details, your interests, your reminders. Keep them all in one place.
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
          <nav aria-label="Settings sections" className="settings-tabs bg-white border border-slate-200/90 rounded-3xl p-3 shadow-2xs space-y-1 sticky top-24">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  aria-pressed={isActive}
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
                  <Sparkles size={13} className="text-emerald-700" /> Your profile matters
                </p>
                Keep your details current so scholarship matches reflect your profile.
              </div>
            </div>
          </nav>

          <div className="settings-content bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-2xs">
            {activeTab === "profile" && (
              <form onSubmit={handleProfileSave} className="settings-form space-y-6">
                <SettingsSectionHeader eyebrow="Your student file" title="Start with a little about you." description="Put your personal details in one place as you prepare to explore scholarship requirements." note="Profile edits are a draft for this session. Export a copy to keep them." icon={User} />

                <div className="st-paper-section st-fields-grid grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="st-section-marker sm:col-span-2">01 / Your personal details</div>
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="settings-name" className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Full Name
                    </label>
                    <input
                      type="text"
                      id="settings-name" placeholder="Your full name" value={profile.name}
                      onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                      className="w-full bg-[#FAF9F6] border border-slate-300 rounded-2xl px-4 py-2.5 text-sm text-slate-900 font-medium focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700 outline-none transition"
                      required
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="settings-email" className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Email Address
                    </label>
                    <input
                      type="email"
                      id="settings-email" placeholder="Your email address" value={profile.email}
                      onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                      className="w-full bg-[#FAF9F6] border border-slate-300 rounded-2xl px-4 py-2.5 text-sm text-slate-900 font-medium focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700 outline-none transition"
                      required
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="settings-phone" className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      id="settings-phone" placeholder="Optional phone number" value={profile.phone}
                      onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                      className="w-full bg-[#FAF9F6] border border-slate-300 rounded-2xl px-4 py-2.5 text-sm text-slate-900 font-medium focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700 outline-none transition"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="settings-state" className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Domicile State
                    </label>
                    <select
                      id="settings-state" value={profile.state}
                      onChange={(e) => setProfile({ ...profile, state: e.target.value })}
                      className="w-full bg-[#FAF9F6] border border-slate-300 rounded-2xl px-4 py-2.5 text-sm text-slate-900 font-medium focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700 outline-none transition cursor-pointer"
                    >
                      <option value="" disabled>Choose an option</option>
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
                    <label htmlFor="settings-category" className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Social Category
                    </label>
                    <select
                      id="settings-category" value={profile.category}
                      onChange={(e) => setProfile({ ...profile, category: e.target.value })}
                      className="w-full bg-[#FAF9F6] border border-slate-300 rounded-2xl px-4 py-2.5 text-sm text-slate-900 font-medium focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700 outline-none transition cursor-pointer"
                    >
                      <option value="" disabled>Choose an option</option>
                      <option>General / Open</option>
                      <option>OBC (Non-Creamy Layer)</option>
                      <option>Scheduled Caste (SC)</option>
                      <option>Scheduled Tribe (ST)</option>
                      <option>Economically Weaker Section (EWS)</option>
                      <option>Religious Minority</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="settings-annualIncome" className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Annual Family Income
                    </label>
                    <select
                      id="settings-annualIncome" value={profile.annualIncome}
                      onChange={(e) => setProfile({ ...profile, annualIncome: e.target.value })}
                      className="w-full bg-[#FAF9F6] border border-slate-300 rounded-2xl px-4 py-2.5 text-sm text-slate-900 font-medium focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700 outline-none transition cursor-pointer"
                    >
                      <option value="" disabled>Choose an option</option>
                      <option>Less than ₹1,50,000</option>
                      <option>₹1,50,000 - ₹2,50,000</option>
                      <option>₹2,50,000 - ₹5,00,000</option>
                      <option>₹5,00,000 - ₹8,00,000</option>
                      <option>Above ₹8,00,000</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="settings-gender" className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Gender
                    </label>
                    <select
                      id="settings-gender" value={profile.gender}
                      onChange={(e) => setProfile({ ...profile, gender: e.target.value })}
                      className="w-full bg-[#FAF9F6] border border-slate-300 rounded-2xl px-4 py-2.5 text-sm text-slate-900 font-medium focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700 outline-none transition cursor-pointer"
                    >
                      <option value="" disabled>Choose an option</option>
                      <option>Female</option>
                      <option>Male</option>
                      <option>Non-Binary / Other</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="settings-disability" className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Person with Disability (PwD)
                    </label>
                    <select
                      id="settings-disability" value={profile.disability}
                      onChange={(e) => setProfile({ ...profile, disability: e.target.value })}
                      className="w-full bg-[#FAF9F6] border border-slate-300 rounded-2xl px-4 py-2.5 text-sm text-slate-900 font-medium focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700 outline-none transition cursor-pointer"
                    >
                      <option value="" disabled>Choose an option</option>
                      <option>No</option>
                      <option>Yes (40% or above)</option>
                    </select>
                  </div>
                </div>

                <div className="st-save-bar">
                  <p>These changes stay on this page. They are not saved to your account yet.</p>
                  <button
                    type="submit"
                    className="st-primary"
                  >
                    <Save size={14} /> Keep profile draft
                  </button>
                </div>
              </form>
            )}

            {activeTab === "academics" && (
              <form onSubmit={handleProfileSave} className="settings-form space-y-6">
                <SettingsSectionHeader eyebrow="Your next chapter" title="What are you working towards?" description="Add your course details and pick the kinds of scholarships you'd like to explore." note={`${targetCategories.length} interests selected. Choose as many as you'd like.`} icon={GraduationCap} />

                <div className="st-paper-section st-fields-grid grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="st-section-marker sm:col-span-2">01 / Your studies</div>
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="settings-educationLevel" className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Current Level of Study
                    </label>
                    <select
                      id="settings-educationLevel" value={profile.educationLevel}
                      onChange={(e) => setProfile({ ...profile, educationLevel: e.target.value })}
                      className="w-full bg-[#FAF9F6] border border-slate-300 rounded-2xl px-4 py-2.5 text-sm text-slate-900 font-medium focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700 outline-none transition cursor-pointer"
                    >
                      <option value="" disabled>Choose an option</option>
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
                    <label htmlFor="settings-stream" className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Field / Course Stream
                    </label>
                    <select
                      id="settings-stream" value={profile.stream}
                      onChange={(e) => setProfile({ ...profile, stream: e.target.value })}
                      className="w-full bg-[#FAF9F6] border border-slate-300 rounded-2xl px-4 py-2.5 text-sm text-slate-900 font-medium focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700 outline-none transition cursor-pointer"
                    >
                      <option value="" disabled>Choose an option</option>
                      <option>Engineering / Technology</option>
                      <option>Medicine & Healthcare</option>
                      <option>Pure & Applied Sciences</option>
                      <option>Commerce & Management</option>
                      <option>Arts, Humanities & Law</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="settings-college" className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      College / Institution Name
                    </label>
                    <input
                      type="text"
                      id="settings-college" placeholder="Your college or institution" value={profile.college}
                      onChange={(e) => setProfile({ ...profile, college: e.target.value })}
                      className="w-full bg-[#FAF9F6] border border-slate-300 rounded-2xl px-4 py-2.5 text-sm text-slate-900 font-medium focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700 outline-none transition"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="settings-cgpa" className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Latest CGPA / Percentage
                    </label>
                    <input
                      type="text"
                      id="settings-cgpa" placeholder="For example, 8.5 CGPA or 85%" value={profile.cgpa}
                      onChange={(e) => setProfile({ ...profile, cgpa: e.target.value })}
                      className="w-full bg-[#FAF9F6] border border-slate-300 rounded-2xl px-4 py-2.5 text-sm text-slate-900 font-medium focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700 outline-none transition"
                    />
                  </div>
                </div>

                <section className="st-paper-section" aria-labelledby="scholarship-interests-title">
                  <h3 id="scholarship-interests-title" className="st-section-marker">02 / Your scholarship interests</h3>
                  <p className="st-category-summary">{targetCategories.length} selected. Tap an interest to add or remove it from your draft.</p>
                  <div className="st-category-list">
                    {allCategories.map((cat) => {
                      const isSelected = targetCategories.includes(cat);
                      return (
                        <button
                          key={cat}
                          type="button"
                          aria-pressed={isSelected}
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
                </section>

                <div className="st-save-bar">
                  <p>Your study details and interests stay in this session. You can export them from Security & Account.</p>
                  <button
                    type="submit"
                    className="st-primary"
                  >
                    <Save size={14} /> Keep study draft
                  </button>
                </div>
              </form>
            )}

            {activeTab === "notifications" && (
              <AlertPreferences
                value={notifications}
                onChange={setNotifications}
                savedValue={savedNotifications}
                loading={notifLoading}
                saving={notifSaving}
                testing={testingAlert}
                onSave={handleNotificationsSave}
                onTest={handleSendTestAlert}
                error={notifError}
                onRetry={loadNotificationPreferences}
                email={user?.email}
                state={profile.state}
              />
            )}
            {activeTab === "security" && (
              <div className="settings-form space-y-6">
                <SettingsSectionHeader eyebrow="Your account file" title="Your account, in your hands." description="See your sign-in details, export your current preferences, or find help with your account." note={user?.email || "Your account details belong here."} icon={Shield} />

                <form onSubmit={handleSecuritySave} className="st-paper-section space-y-4">
                  <h3 className="st-section-marker">
                    <Key size={15} /> 01 / Your password
                  </h3>
                  <p className="st-security-note">Password changes aren't available here yet. These fields are disabled until account updates are connected.</p>
                  <div className="st-fields-grid grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="settings-currentPassword" className="text-xs font-bold text-slate-700">
                        Current Password
                      </label>
                      <input
                        disabled
                        autoComplete="current-password"
                        type="password"
                        placeholder="••••••••"
                        id="settings-currentPassword" value={security.currentPassword}
                        onChange={(e) =>
                          setSecurity({ ...security, currentPassword: e.target.value })
                        }
                        className="w-full bg-[#FAF9F6] border border-slate-300 rounded-2xl px-4 py-2.5 text-sm text-slate-900 focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700 outline-none transition"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="settings-newPassword" className="text-xs font-bold text-slate-700">
                        New Password
                      </label>
                      <input
                        disabled
                        autoComplete="new-password"
                        type="password"
                        placeholder="Min 8 characters"
                        id="settings-newPassword" value={security.newPassword}
                        onChange={(e) =>
                          setSecurity({ ...security, newPassword: e.target.value })
                        }
                        className="w-full bg-[#FAF9F6] border border-slate-300 rounded-2xl px-4 py-2.5 text-sm text-slate-900 focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700 outline-none transition"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="settings-confirmPassword" className="text-xs font-bold text-slate-700">
                        Confirm New Password
                      </label>
                      <input
                        disabled
                        autoComplete="new-password"
                        type="password"
                        placeholder="Repeat new password"
                        id="settings-confirmPassword" value={security.confirmPassword}
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
                      disabled
                      className="st-primary"
                    >
                      Password changes unavailable
                    </button>
                  </div>
                </form>

                <section className="st-paper-section">
                  <h3 className="st-section-marker">
                    02 / Sign-in connections
                  </h3>
                  <div className="st-account-row">
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
                        <p className="text-sm font-bold text-slate-900">Google sign-in</p>
                        <p className="text-xs text-slate-500 font-normal">
                          {user?.authProvider === "google" || user?.googleId ? user.email : "Connection details are not available for this session."}
                        </p>
                      </div>
                    </div>
                    <span className="st-account-badge">
                      {user?.authProvider === "google" || user?.googleId ? "Connected" : "Not confirmed"}
                    </span>
                  </div>
                </section>

                <section className="st-paper-section">
                  <h3 className="st-section-marker">
                    03 / Keep a copy
                  </h3>

                  <div className="st-account-row">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">Download your current settings</h4>
                      <p className="text-xs text-slate-500 font-normal">
                        Keep a JSON copy of the profile draft, scholarship interests, and alert settings shown on this page.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleExportData}
                      className="st-secondary"
                    >
                      <Download size={13} /> Export JSON
                    </button>
                  </div>
                </section>

                <section className="st-paper-section st-danger-section">
                  <h3 className="st-section-marker"><AlertTriangle size={15} /> 04 / Account help</h3>
                  <div className="st-account-row">
                    <div>
                      <h4 className="text-sm font-bold text-rose-900 flex items-center gap-1.5">
                        <AlertTriangle size={15} className="text-rose-600" /> Delete Account
                      </h4>
                      <p className="text-xs text-rose-700 font-normal">
                        Find the support options for requesting account deletion.
                      </p>
                    </div>
                    <Link to="/support" className="st-secondary"><Trash2 size={13} /> Get account help</Link>
                  </div>
                </section>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
