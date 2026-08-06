import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import CursorBlob from "../components/CursorBlob";
import {
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  UploadCloud,
  Search,
  Star,
  Settings,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

const DashboardLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const toggleSidebar = () => setIsSidebarOpen((open) => !open);

  const isHR = user?.role === "hr";
  const navItems = isHR
    ? [
        { path: "/dashboard/upload", label: "Upload", icon: <UploadCloud size={20} /> },
        { path: "/dashboard/search", label: "Search", icon: <Search size={20} /> },
        { path: "/dashboard/shortlisted", label: "Shortlisted", icon: <Star size={20} /> },
        { path: "/dashboard/settings", label: "Settings", icon: <Settings size={20} /> },
      ]
    : [{ path: "/dashboard/settings", label: "Settings", icon: <Settings size={20} /> }];

  const initial = user?.name?.trim()?.charAt(0)?.toUpperCase() || "?";

  return (
    <div className="relative flex min-h-screen text-white overflow-hidden font-rubik">
      <CursorBlob />

      {/* Sidebar */}
      <aside
        className={`${
          isSidebarOpen ? "w-64" : "w-[72px]"
        } shrink-0 bg-white/5 backdrop-blur-md border-r border-white/10 p-3 transition-all duration-300 flex flex-col shadow-lg`}
      >
        {/* Brand + collapse toggle. The toggle is always a real toggle - it used
            to be replaced by a "JS" label that navigated instead, which made a
            collapsed sidebar impossible to reopen. */}
        <div
          className={`mb-6 flex items-center ${
            isSidebarOpen ? "justify-between gap-2" : "justify-center"
          }`}
        >
          {isSidebarOpen && (
            <button
              onClick={() => navigate("/dashboard")}
              className="truncate text-xl font-bold tracking-wide bg-gradient-to-r from-teal-400 via-white to-teal-400 bg-[length:200%_auto] bg-clip-text text-transparent animate-shimmer hover:opacity-90 transition"
            >
              JOB SNIFF
            </button>
          )}

          <button
            onClick={toggleSidebar}
            aria-label={isSidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
            aria-expanded={isSidebarOpen}
            title={isSidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-gray-300 transition hover:bg-white/10 hover:text-white"
          >
            {isSidebarOpen ? <PanelLeftClose size={20} /> : <PanelLeftOpen size={20} />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1">
          {navItems.map(({ path, label, icon }) => (
            <NavLink
              key={path}
              to={path}
              // Labels are hidden when collapsed, so the tooltip is the only
              // way to tell the icons apart
              title={isSidebarOpen ? undefined : label}
              className={({ isActive }) =>
                `flex items-center rounded-lg py-2.5 font-medium transition-all ${
                  isSidebarOpen ? "gap-3 px-3" : "justify-center px-0"
                } ${
                  isActive
                    ? "bg-teal-500/20 text-teal-300 border border-teal-500/30"
                    : "border border-transparent text-gray-300 hover:bg-white/10 hover:text-white"
                }`
              }
            >
              <span className="shrink-0">{icon}</span>
              {isSidebarOpen && <span className="truncate">{label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Who is signed in - the role was previously invisible here */}
        <div
          className={`mt-4 flex items-center rounded-lg border border-white/10 bg-white/5 py-2 ${
            isSidebarOpen ? "gap-3 px-3" : "justify-center px-0"
          }`}
          title={isSidebarOpen ? undefined : `${user?.name || "Signed in"} · ${isHR ? "Recruiter" : "Applicant"}`}
        >
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-teal-500/30 bg-teal-500/20 text-sm font-semibold text-teal-300">
            {initial}
          </div>
          {isSidebarOpen && (
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-white">{user?.name || "Signed in"}</p>
              <p className="truncate text-xs text-gray-400">{isHR ? "Recruiter" : "Applicant"}</p>
            </div>
          )}
        </div>

        {/* Logout - toned down from solid red to the same red-tinted glass the
            destructive dashboard buttons use */}
        <button
          onClick={logout}
          title={isSidebarOpen ? undefined : "Log out"}
          aria-label="Log out"
          className={`mt-2 flex items-center rounded-lg border border-red-500/30 bg-red-500/15 py-2.5 text-sm font-medium text-red-300 transition hover:border-red-500/50 hover:bg-red-500/25 hover:text-red-200 ${
            isSidebarOpen ? "gap-3 px-3" : "justify-center px-0"
          }`}
        >
          <LogOut size={18} className="shrink-0" />
          {isSidebarOpen && <span>Log out</span>}
        </button>
      </aside>

      {/* Main Content */}
      <div className="flex-1 min-w-0 p-4 sm:p-6 overflow-y-auto">
        <Outlet />
      </div>
    </div>
  );
};

export default DashboardLayout;
