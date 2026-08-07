import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import CursorBlob from "../components/CursorBlob";
import {
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  UploadCloud,
  Search,
  Star,
  Settings,
  X,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

const DashboardLayout = () => {
  // Desktop: an inline column that can collapse to an icon rail.
  // Mobile: an off-canvas drawer over the content, so it costs no width.
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isHR = user?.role === "hr";
  // Collapse is desktop-only, so every class it drives is md: prefixed and the
  // drawer always shows full labels.
  const collapsed = !isSidebarOpen;

  // Navigating from the drawer should close it
  useEffect(() => setIsMobileOpen(false), [location.pathname]);

  // While the drawer is over the content, Escape closes it and the page
  // behind it must not scroll
  useEffect(() => {
    if (!isMobileOpen) return;
    const onKeyDown = (e) => e.key === "Escape" && setIsMobileOpen(false);
    const previousOverflow = document.body.style.overflow;

    window.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isMobileOpen]);

  const navItems = isHR
    ? [
        { path: "/dashboard/upload", label: "Upload", icon: <UploadCloud size={20} /> },
        { path: "/dashboard/search", label: "Search", icon: <Search size={20} /> },
        { path: "/dashboard/shortlisted", label: "Shortlisted", icon: <Star size={20} /> },
        { path: "/dashboard/settings", label: "Settings", icon: <Settings size={20} /> },
      ]
    : [{ path: "/dashboard/settings", label: "Settings", icon: <Settings size={20} /> }];

  const initial = user?.name?.trim()?.charAt(0)?.toUpperCase() || "?";
  const roleLabel = isHR ? "Recruiter" : "Applicant";

  return (
    <div className="relative flex min-h-screen text-white font-rubik">
      <CursorBlob />

      {/* Mobile top bar - the only way to reach the drawer */}
      <header className="fixed inset-x-0 top-0 z-30 flex items-center gap-3 border-b border-white/10 bg-[#0f0f1c]/90 px-4 py-3 backdrop-blur-md md:hidden">
        <button
          onClick={() => setIsMobileOpen(true)}
          aria-label="Open menu"
          className="grid h-9 w-9 place-items-center rounded-lg text-gray-200 transition hover:bg-white/10 hover:text-white"
        >
          <Menu size={20} />
        </button>
        <button
          onClick={() => navigate("/dashboard")}
          className="text-lg font-bold tracking-wide bg-gradient-to-r from-teal-400 via-white to-teal-400 bg-[length:200%_auto] bg-clip-text text-transparent animate-shimmer"
        >
          JOB SNIFF
        </button>
      </header>

      {/* Backdrop, mobile only */}
      {isMobileOpen && (
        <div
          onClick={() => setIsMobileOpen(false)}
          aria-hidden="true"
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
        />
      )}

      {/* Sidebar: fixed drawer on mobile, static column from md up */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 shrink-0 transform flex-col border-r border-white/10 bg-[#0f0f1c]/95 p-3 shadow-lg backdrop-blur-md transition-transform duration-300
          md:static md:z-auto md:translate-x-0 md:bg-white/5 md:transition-all
          ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}
          ${collapsed ? "md:w-[72px]" : "md:w-64"}`}
      >
        {/* Brand, desktop collapse toggle, and the drawer's close button */}
        <div
          className={`mb-6 flex items-center justify-between gap-2 ${
            collapsed ? "md:justify-center" : ""
          }`}
        >
          <button
            onClick={() => navigate("/dashboard")}
            className={`truncate text-xl font-bold tracking-wide bg-gradient-to-r from-teal-400 via-white to-teal-400 bg-[length:200%_auto] bg-clip-text text-transparent animate-shimmer hover:opacity-90 transition ${
              collapsed ? "md:hidden" : ""
            }`}
          >
            JOB SNIFF
          </button>

          {/* Collapse is meaningless in a drawer, so this is desktop only */}
          <button
            onClick={() => setIsSidebarOpen((open) => !open)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-expanded={!collapsed}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="hidden h-9 w-9 shrink-0 place-items-center rounded-lg text-gray-300 transition hover:bg-white/10 hover:text-white md:grid"
          >
            {collapsed ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />}
          </button>

          <button
            onClick={() => setIsMobileOpen(false)}
            aria-label="Close menu"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-gray-300 transition hover:bg-white/10 hover:text-white md:hidden"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 space-y-1">
          {navItems.map(({ path, label, icon }) => (
            <NavLink
              key={path}
              to={path}
              title={label}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 font-medium transition-all ${
                  collapsed ? "md:justify-center md:gap-0 md:px-0" : ""
                } ${
                  isActive
                    ? "border border-teal-500/30 bg-teal-500/20 text-teal-300"
                    : "border border-transparent text-gray-300 hover:bg-white/10 hover:text-white"
                }`
              }
            >
              <span className="shrink-0">{icon}</span>
              <span className={`truncate ${collapsed ? "md:hidden" : ""}`}>{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Who is signed in */}
        <div
          title={`${user?.name || "Signed in"} · ${roleLabel}`}
          className={`mt-4 flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2 ${
            collapsed ? "md:justify-center md:gap-0 md:px-0" : ""
          }`}
        >
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-teal-500/30 bg-teal-500/20 text-sm font-semibold text-teal-300">
            {initial}
          </div>
          <div className={`min-w-0 ${collapsed ? "md:hidden" : ""}`}>
            <p className="truncate text-sm font-medium text-white">{user?.name || "Signed in"}</p>
            <p className="truncate text-xs text-gray-400">{roleLabel}</p>
          </div>
        </div>

        <button
          onClick={logout}
          title="Log out"
          aria-label="Log out"
          className={`mt-2 flex items-center gap-3 rounded-lg border border-red-500/30 bg-red-500/15 px-3 py-2.5 text-sm font-medium text-red-300 transition hover:border-red-500/50 hover:bg-red-500/25 hover:text-red-200 ${
            collapsed ? "md:justify-center md:gap-0 md:px-0" : ""
          }`}
        >
          <LogOut size={18} className="shrink-0" />
          <span className={collapsed ? "md:hidden" : ""}>Log out</span>
        </button>
      </aside>

      {/* Main content - offset for the fixed mobile header only */}
      <div className="min-w-0 flex-1 overflow-y-auto p-4 pt-20 sm:p-6 sm:pt-20 md:pt-6">
        <Outlet />
      </div>
    </div>
  );
};

export default DashboardLayout;
