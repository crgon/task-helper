import { NavLink } from "react-router-dom";

export default function NavBar() {
  const base = "flex flex-col items-center gap-1 py-2 px-6 text-xs transition-colors";
  const active = "text-blue-500";
  const inactive = "text-gray-400 hover:text-gray-600";

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 flex justify-around safe-area-pb z-20">
      <NavLink to="/" end className={({ isActive }) => `${base} ${isActive ? active : inactive}`}>
        {({ isActive }) => (
          <>
            <svg width="20" height="20" fill="none" viewBox="0 0 20 20">
              <rect x="3" y="5" width="14" height="2" rx="1" fill={isActive ? "#3b82f6" : "#9ca3af"} />
              <rect x="3" y="9" width="10" height="2" rx="1" fill={isActive ? "#3b82f6" : "#9ca3af"} />
              <rect x="3" y="13" width="12" height="2" rx="1" fill={isActive ? "#3b82f6" : "#9ca3af"} />
            </svg>
            <span>任务</span>
          </>
        )}
      </NavLink>

      <NavLink to="/timeline" className={({ isActive }) => `${base} ${isActive ? active : inactive}`}>
        {({ isActive }) => (
          <>
            <svg width="20" height="20" fill="none" viewBox="0 0 20 20">
              <circle cx="5" cy="6" r="2" fill={isActive ? "#3b82f6" : "#9ca3af"} />
              <circle cx="5" cy="14" r="2" fill={isActive ? "#3b82f6" : "#9ca3af"} />
              <rect x="9" y="5" width="8" height="2" rx="1" fill={isActive ? "#3b82f6" : "#9ca3af"} />
              <rect x="9" y="13" width="6" height="2" rx="1" fill={isActive ? "#3b82f6" : "#9ca3af"} />
              <line x1="5" y1="8" x2="5" y2="12" stroke={isActive ? "#3b82f6" : "#9ca3af"} strokeWidth="1.5" />
            </svg>
            <span>时间线</span>
          </>
        )}
      </NavLink>

      <NavLink to="/report" className={({ isActive }) => `${base} ${isActive ? active : inactive}`}>
        {({ isActive }) => (
          <>
            <svg width="20" height="20" fill="none" viewBox="0 0 20 20">
              <rect x="4" y="3" width="12" height="14" rx="2" stroke={isActive ? "#3b82f6" : "#9ca3af"} strokeWidth="1.5" fill="none" />
              <rect x="7" y="7" width="6" height="1.5" rx="0.75" fill={isActive ? "#3b82f6" : "#9ca3af"} />
              <rect x="7" y="10" width="4" height="1.5" rx="0.75" fill={isActive ? "#3b82f6" : "#9ca3af"} />
            </svg>
            <span>周报</span>
          </>
        )}
      </NavLink>
    </nav>
  );
}
