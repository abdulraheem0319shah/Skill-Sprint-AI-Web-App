import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut } from 'lucide-react';
import logo from '../assets/logo.png';

export const Navbar = () => {
  const { currentUser, logout } = useAuth();
  const homePath = currentUser?.role === 'employee' ? '/employee' : '/';

  return (
    <header className="fixed top-4 left-0 right-0 z-50 px-4 w-full">
      {/* Yahan max-w-5xl ki jagah max-w-full aur w-full kar diya hai taake design wahi rahe par poore page par phail jaye */}
      <nav className="w-full bg-white/95 backdrop-blur-xl border border-slate-200 rounded-full px-6 py-2.5 flex items-center justify-between shadow-lg shadow-slate-200/60 transition-all">
        <div className="flex items-center gap-3">
          <Link to={homePath} className="w-9 h-9 rounded-full bg-brand-50 flex items-center justify-center shadow-sm hover:scale-105 transition-transform overflow-hidden">
            <img src={logo} alt="SkillSprint Logo" className="w-full h-full object-cover" />
          </Link>
          <Link to={homePath} className="text-slate-900 font-bold text-sm tracking-tight flex items-center gap-2">
            SkillSprint
          </Link>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="bg-slate-100 text-slate-800 font-semibold text-xs px-3.5 py-1.5 rounded-full shadow-sm flex items-center gap-2 max-w-[150px] sm:max-w-none truncate border border-slate-200">
            <span className="w-2 h-2 rounded-full bg-brand-500 animate-pulse"></span>
            <span className="truncate">{currentUser?.name || 'User'}</span>
          </div>

          <button
            onClick={logout}
            title="Logout"
            className="p-2 rounded-full text-slate-500 hover:text-slate-900 hover:bg-brand-50 transition-all"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </nav>
    </header>
  );
};
