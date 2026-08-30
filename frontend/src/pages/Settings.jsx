import { useState } from "react";
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
} from "lucide-react";
import Badge from "../components/Badge";
import { useAuth } from "../hooks/useAuth";
import { toast } from "sonner";

export default function Settings() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("profile");

  // Profile Form State
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

  // Notification Preferences State
  const [notifications, setNotifications] = useState({
    instantMatch: true,
    deadlineAlerts: true,
    weeklyDigest: true,
    smsAlerts: false,
    newGrantsInState: true,
  });

  // Security Form State
  const [security, setSecurity] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  // Target preferences
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

  const handleProfileSave = (e) => {
    e.preventDefault();
    toast.success("Profile preferences saved successfully!");
  };

  const handleNotificationsSave = () => {
    toast.success("Notification preferences updated!");
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
    <div className="min-h-screen bg-gray-50/60 py-10 px-4 sm:px-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <Badge>Account Settings</Badge>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 ">
            Settings & Preferences
          </h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1 font-normal">
            Manage your personal profile, eligibility parameters, and alert notifications.
          </p>
        </div>

        {/* Layout: Sidebar Tabs + Content Area */}
        <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-8 items-start">
          {/* Tabs Navigation */}
          <nav className="bg-white border border-gray-200/90 rounded-2xl p-3 shadow-2xs space-y-1 sticky top-24">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-semibold transition-all duration-150 text-left cursor-pointer ${
                    isActive
                      ? "bg-[#EAF3DE] text-[#27500A] font-bold shadow-2xs"
                      : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                >
                  <Icon
                    size={18}
                    className={isActive ? "text-[#5AAD1F]" : "text-gray-500"}
                  />
                  <span>{tab.label}</span>
                </button>
              );
            })}

            <div className="pt-3 mt-3 border-t border-gray-100 px-3">
              <div className="bg-[#F6FAF1] border border-[#C0DD97] rounded-xl p-3 text-xs text-gray-700 leading-relaxed font-normal">
                <p className="font-bold text-[#27500A] flex items-center gap-1 mb-1">
                  <Sparkles size={13} className="text-[#5AAD1F]" /> Match Accuracy
                </p>
                Keep details up to date to get 100% accurate scholarship recommendations.
              </div>
            </div>
          </nav>

          {/* Tab Content Panes */}
          <div className="bg-white border border-gray-200/90 rounded-3xl p-6 sm:p-8 shadow-2xs">
            {/* 1. PROFILE & DEMOGRAPHICS */}
            {activeTab === "profile" && (
              <form onSubmit={handleProfileSave} className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 mb-1">
                    Personal & Demographic Details
                  </h2>
                  <p className="text-xs sm:text-sm text-gray-600 font-medium">
                    This information determines which state and demographic scholarships you qualify for.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={profile.name}
                      onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                      className="w-full bg-[#F6FAF1] border border-[#C0DD97] rounded-xl px-4 py-2.5 text-sm text-gray-900 font-medium focus:ring-2 focus:ring-[#5AAD1F]/20 focus:border-[#5AAD1F] outline-none shadow-2xs"
                      required
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={profile.email}
                      onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                      className="w-full bg-[#F6FAF1] border border-[#C0DD97] rounded-xl px-4 py-2.5 text-sm text-gray-900 font-medium focus:ring-2 focus:ring-[#5AAD1F]/20 focus:border-[#5AAD1F] outline-none shadow-2xs"
                      required
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={profile.phone}
                      onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                      className="w-full bg-[#F6FAF1] border border-[#C0DD97] rounded-xl px-4 py-2.5 text-sm text-gray-900 font-medium focus:ring-2 focus:ring-[#5AAD1F]/20 focus:border-[#5AAD1F] outline-none shadow-2xs"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Domicile State
                    </label>
                    <select
                      value={profile.state}
                      onChange={(e) => setProfile({ ...profile, state: e.target.value })}
                      className="w-full bg-[#F6FAF1] border border-[#C0DD97] rounded-xl px-4 py-2.5 text-sm text-gray-900 font-medium focus:ring-2 focus:ring-[#5AAD1F]/20 focus:border-[#5AAD1F] outline-none shadow-2xs cursor-pointer"
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
                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Social Category
                    </label>
                    <select
                      value={profile.category}
                      onChange={(e) => setProfile({ ...profile, category: e.target.value })}
                      className="w-full bg-[#F6FAF1] border border-[#C0DD97] rounded-xl px-4 py-2.5 text-sm text-gray-900 font-medium focus:ring-2 focus:ring-[#5AAD1F]/20 focus:border-[#5AAD1F] outline-none shadow-2xs cursor-pointer"
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
                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Annual Family Income
                    </label>
                    <select
                      value={profile.annualIncome}
                      onChange={(e) => setProfile({ ...profile, annualIncome: e.target.value })}
                      className="w-full bg-[#F6FAF1] border border-[#C0DD97] rounded-xl px-4 py-2.5 text-sm text-gray-900 font-medium focus:ring-2 focus:ring-[#5AAD1F]/20 focus:border-[#5AAD1F] outline-none shadow-2xs cursor-pointer"
                    >
                      <option>Less than ₹1,50,000</option>
                      <option>₹1,50,000 - ₹2,50,000</option>
                      <option>₹2,50,000 - ₹5,00,000</option>
                      <option>₹5,00,000 - ₹8,00,000</option>
                      <option>Above ₹8,00,000</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Gender
                    </label>
                    <select
                      value={profile.gender}
                      onChange={(e) => setProfile({ ...profile, gender: e.target.value })}
                      className="w-full bg-[#F6FAF1] border border-[#C0DD97] rounded-xl px-4 py-2.5 text-sm text-gray-900 font-medium focus:ring-2 focus:ring-[#5AAD1F]/20 focus:border-[#5AAD1F] outline-none shadow-2xs cursor-pointer"
                    >
                      <option>Female</option>
                      <option>Male</option>
                      <option>Non-Binary / Other</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Person with Disability (PwD)
                    </label>
                    <select
                      value={profile.disability}
                      onChange={(e) => setProfile({ ...profile, disability: e.target.value })}
                      className="w-full bg-[#F6FAF1] border border-[#C0DD97] rounded-xl px-4 py-2.5 text-sm text-gray-900 font-medium focus:ring-2 focus:ring-[#5AAD1F]/20 focus:border-[#5AAD1F] outline-none shadow-2xs cursor-pointer"
                    >
                      <option>No</option>
                      <option>Yes (40% or above)</option>
                    </select>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-100 flex items-center justify-end">
                  <button
                    type="submit"
                    className="cursor-pointer inline-flex items-center gap-2 bg-[#5AAD1F] hover:bg-[#4A9A18] text-white text-sm font-bold px-6 py-2.5 rounded-full transition-all shadow-sm hover:shadow-md active:scale-98"
                  >
                    <Save size={16} /> Save Changes
                  </button>
                </div>
              </form>
            )}

            {/* 2. ACADEMIC PREFERENCES */}
            {activeTab === "academics" && (
              <form onSubmit={handleProfileSave} className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 mb-1">
                    Academic Background & Grants Target
                  </h2>
                  <p className="text-xs sm:text-sm text-gray-600 font-medium">
                    Customize your fields of study and the specific types of opportunities you want highlighted.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Current Level of Study
                    </label>
                    <select
                      value={profile.educationLevel}
                      onChange={(e) => setProfile({ ...profile, educationLevel: e.target.value })}
                      className="w-full bg-[#F6FAF1] border border-[#C0DD97] rounded-xl px-4 py-2.5 text-sm text-gray-900 font-medium focus:ring-2 focus:ring-[#5AAD1F]/20 focus:border-[#5AAD1F] outline-none shadow-2xs cursor-pointer"
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
                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Field / Course Stream
                    </label>
                    <select
                      value={profile.stream}
                      onChange={(e) => setProfile({ ...profile, stream: e.target.value })}
                      className="w-full bg-[#F6FAF1] border border-[#C0DD97] rounded-xl px-4 py-2.5 text-sm text-gray-900 font-medium focus:ring-2 focus:ring-[#5AAD1F]/20 focus:border-[#5AAD1F] outline-none shadow-2xs cursor-pointer"
                    >
                      <option>Engineering / Technology</option>
                      <option>Medicine & Healthcare</option>
                      <option>Pure & Applied Sciences</option>
                      <option>Commerce & Management</option>
                      <option>Arts, Humanities & Law</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                      College / Institution Name
                    </label>
                    <input
                      type="text"
                      value={profile.college}
                      onChange={(e) => setProfile({ ...profile, college: e.target.value })}
                      className="w-full bg-[#F6FAF1] border border-[#C0DD97] rounded-xl px-4 py-2.5 text-sm text-gray-900 font-medium focus:ring-2 focus:ring-[#5AAD1F]/20 focus:border-[#5AAD1F] outline-none shadow-2xs"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Latest CGPA / Percentage
                    </label>
                    <input
                      type="text"
                      value={profile.cgpa}
                      onChange={(e) => setProfile({ ...profile, cgpa: e.target.value })}
                      className="w-full bg-[#F6FAF1] border border-[#C0DD97] rounded-xl px-4 py-2.5 text-sm text-gray-900 font-medium focus:ring-2 focus:ring-[#5AAD1F]/20 focus:border-[#5AAD1F] outline-none shadow-2xs"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-100">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block mb-2">
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
                              ? "bg-[#EAF3DE] border-[#C0DD97] text-[#27500A] shadow-2xs"
                              : "bg-white border-gray-300 text-gray-700 hover:border-[#5AAD1F] hover:bg-gray-50"
                          }`}
                        >
                          {isSelected && "✓ "} {cat}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-100 flex items-center justify-end">
                  <button
                    type="submit"
                    className="cursor-pointer inline-flex items-center gap-2 bg-[#5AAD1F] hover:bg-[#4A9A18] text-white text-sm font-bold px-6 py-2.5 rounded-full transition-all shadow-sm hover:shadow-md active:scale-98"
                  >
                    <Save size={16} /> Save Academic Profile
                  </button>
                </div>
              </form>
            )}

            {/* 3. NOTIFICATIONS & ALERTS */}
            {activeTab === "notifications" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 mb-1">
                    Notification & Deadline Alerts
                  </h2>
                  <p className="text-xs sm:text-sm text-gray-600 font-medium">
                    Never miss a grant closing date. Choose how often you receive updates.
                  </p>
                </div>

                <div className="space-y-4">
                  {[
                    {
                      key: "instantMatch",
                      title: "Instant Eligibility Match Alerts",
                      desc: "Get notified when a high-probability scholarship matching your profile is published.",
                    },
                    {
                      key: "deadlineAlerts",
                      title: "Upcoming Deadline Reminders (7 days & 48 hours)",
                      desc: "Crucial alerts for scholarships closing soon so you don't miss submission cutoffs.",
                    },
                    {
                      key: "newGrantsInState",
                      title: "State & Regional Grant Updates",
                      desc: "Special alerts whenever new state government schemes are announced in your state.",
                    },
                    {
                      key: "weeklyDigest",
                      title: "Weekly Curated Scholarship Digest",
                      desc: "A summary email every Monday morning with top opportunities tailored for you.",
                    },
                  ].map((item) => (
                    <div
                      key={item.key}
                      className="flex items-start justify-between gap-4 p-4 rounded-2xl border border-gray-200/90 bg-gray-50/40 hover:bg-[#F6FAF1] transition-colors"
                    >
                      <div>
                        <h4 className="text-sm font-bold text-gray-900">{item.title}</h4>
                        <p className="text-xs text-gray-600 leading-relaxed mt-0.5 font-medium">
                          {item.desc}
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                        <input
                          type="checkbox"
                          checked={notifications[item.key]}
                          onChange={(e) =>
                            setNotifications({
                              ...notifications,
                              [item.key]: e.target.checked,
                            })
                          }
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#5AAD1F]"></div>
                      </label>
                    </div>
                  ))}
                </div>

                <div className="pt-4 border-t border-gray-100 flex items-center justify-end">
                  <button
                    onClick={handleNotificationsSave}
                    className="cursor-pointer inline-flex items-center gap-2 bg-[#5AAD1F] hover:bg-[#4A9A18] text-white text-sm font-bold px-6 py-2.5 rounded-full transition-all shadow-sm hover:shadow-md active:scale-98"
                  >
                    <Save size={16} /> Save Alert Settings
                  </button>
                </div>
              </div>
            )}

            {/* 4. SECURITY & ACCOUNT */}
            {activeTab === "security" && (
              <div className="space-y-8">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 mb-1">
                    Security & Account Control
                  </h2>
                  <p className="text-xs sm:text-sm text-gray-600 font-medium">
                    Manage your credentials, connected identity providers, and data privacy.
                  </p>
                </div>

                {/* Password Change */}
                <form onSubmit={handleSecuritySave} className="space-y-4">
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                    <Key size={16} className="text-[#5AAD1F]" /> Update Password
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-gray-700">
                        Current Password
                      </label>
                      <input
                        type="password"
                        placeholder="••••••••"
                        value={security.currentPassword}
                        onChange={(e) =>
                          setSecurity({ ...security, currentPassword: e.target.value })
                        }
                        className="w-full bg-[#F6FAF1] border border-[#C0DD97] rounded-xl px-4 py-2.5 text-sm text-gray-900 focus:ring-2 focus:ring-[#5AAD1F]/20 focus:border-[#5AAD1F] outline-none shadow-2xs"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-gray-700">
                        New Password
                      </label>
                      <input
                        type="password"
                        placeholder="Min 8 characters"
                        value={security.newPassword}
                        onChange={(e) =>
                          setSecurity({ ...security, newPassword: e.target.value })
                        }
                        className="w-full bg-[#F6FAF1] border border-[#C0DD97] rounded-xl px-4 py-2.5 text-sm text-gray-900 focus:ring-2 focus:ring-[#5AAD1F]/20 focus:border-[#5AAD1F] outline-none shadow-2xs"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-gray-700">
                        Confirm New Password
                      </label>
                      <input
                        type="password"
                        placeholder="Repeat new password"
                        value={security.confirmPassword}
                        onChange={(e) =>
                          setSecurity({ ...security, confirmPassword: e.target.value })
                        }
                        className="w-full bg-[#F6FAF1] border border-[#C0DD97] rounded-xl px-4 py-2.5 text-sm text-gray-900 focus:ring-2 focus:ring-[#5AAD1F]/20 focus:border-[#5AAD1F] outline-none shadow-2xs"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      className="cursor-pointer inline-flex items-center gap-2 bg-gray-900 hover:bg-[#5AAD1F] text-white text-xs font-bold px-5 py-2.5 rounded-full transition-all shadow-xs"
                    >
                      Update Password
                    </button>
                  </div>
                </form>

                {/* Connected Identity */}
                <div className="pt-6 border-t border-gray-100 space-y-4">
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
                    Connected Accounts
                  </h3>
                  <div className="flex items-center justify-between p-4 rounded-2xl border border-gray-200 bg-gray-50/50">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-white border border-gray-200 flex items-center justify-center shadow-2xs">
                        <svg width="18" height="18" viewBox="0 0 48 48">
                          <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                          <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                          <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                          <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.35-8.16 2.35-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900">Google OAuth</p>
                        <p className="text-xs text-gray-600 font-medium">
                          {user?.email || "Connected for one-click authentication"}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-[#27500A] bg-[#EAF3DE] border border-[#C0DD97] px-3 py-1 rounded-full">
                      Connected
                    </span>
                  </div>
                </div>

                {/* Data Privacy & Danger Zone */}
                <div className="pt-6 border-t border-gray-100 space-y-4">
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
                    Data Privacy & Account Controls
                  </h3>

                  <div className="flex items-center justify-between p-4 rounded-2xl border border-gray-200 bg-gray-50/30">
                    <div>
                      <h4 className="text-sm font-bold text-gray-900">Download Profile Data</h4>
                      <p className="text-xs text-gray-600 font-medium">
                        Export all saved eligibility criteria, preferences, and activity in JSON format.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleExportData}
                      className="cursor-pointer inline-flex items-center gap-1.5 border border-gray-300 bg-white hover:bg-gray-50 text-gray-800 text-xs font-bold px-4 py-2 rounded-xl transition-all shadow-2xs"
                    >
                      <Download size={14} /> Export JSON
                    </button>
                  </div>

                  <div className="p-4 rounded-2xl border border-red-200 bg-red-50/40 flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-red-900 flex items-center gap-1.5">
                        <AlertTriangle size={15} className="text-red-600" /> Delete Account
                      </h4>
                      <p className="text-xs text-red-700 font-medium">
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
                      className="cursor-pointer inline-flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all shadow-2xs"
                    >
                      <Trash2 size={14} /> Delete
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
