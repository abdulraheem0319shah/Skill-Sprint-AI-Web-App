import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  GraduationCap,
  Files,
  Users,
  Briefcase,
  Grid3X3,
  Sparkles,
  ShieldCheck,
  GitCompare,
  Inbox,
  CheckCircle,
  RefreshCw,
  BarChart3,
  FileCode2,
  History,
  Settings as SettingsIcon,
} from 'lucide-react';

export const Sidebar = () => {
  const { currentUser } = useAuth();
  const isEmployee = currentUser?.role === 'employee';

  const adminLinks = [
    { to: '/', label: 'Admin Dashboard', icon: LayoutDashboard },
    { to: '/documents', label: 'Company Documents', icon: Files },
    { to: '/roles', label: 'Role Management', icon: Briefcase },
    { to: '/matrix', label: 'Role Requirement Matrix', icon: Grid3X3 },
    { to: '/employees', label: 'Employees Directory', icon: Users },
    { to: '/generate', label: 'Generate Onboarding', icon: Sparkles, highlight: true },
    { to: '/validation', label: 'Python Validation', icon: ShieldCheck },
    { to: '/comparison', label: 'Comparison Engine', icon: GitCompare },
    { to: '/reviews', label: 'Human Review Queue', icon: Inbox },
    { to: '/approved-plans', label: 'Approved Plans', icon: CheckCircle },
    { to: '/policy-updates', label: 'Policy Updates & Impact', icon: RefreshCw },
    { to: '/reports', label: 'Reports & Analytics', icon: BarChart3 },
    { to: '/prompts', label: 'Prompt Templates', icon: FileCode2 },
    { to: '/audit', label: 'Audit Trail', icon: History },
    { to: '/settings', label: 'System Settings', icon: SettingsIcon },
  ];

  const employeeLinks = [
    { to: '/employee', label: 'My Onboarding Journey', icon: GraduationCap, highlight: true },
  ];

  const roleLinks = {
    training_manager: new Set(['/','/documents','/roles','/matrix','/employees','/generate','/validation','/reviews','/approved-plans','/policy-updates','/reports']),
    reviewer: new Set(['/','/validation','/comparison','/reviews','/approved-plans','/reports','/audit']),
  };
  const links = isEmployee
    ? employeeLinks
    : roleLinks[currentUser?.role]
      ? adminLinks.filter((link) => roleLinks[currentUser.role].has(link.to))
      : adminLinks;

  return (
    <aside className="w-64 bg-white border-r border-slate-200 p-4 flex flex-col justify-between overflow-y-auto shadow-sm">
      <div className="space-y-1">
        <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          Navigation
        </div>
        {links.map((link) => {
          const Icon = link.icon;
          return (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition ${
                  isActive
                    ? 'bg-brand-600 text-white shadow-md shadow-brand-600/20'
                    : link.highlight
                    ? 'text-brand-600 hover:bg-brand-50 hover:text-brand-700'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`
              }
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span>{link.label}</span>
            </NavLink>
          );
        })}
      </div>

      {/* System Status Pill */}
      <div className="pt-4 border-t border-slate-200">
        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center justify-between text-[11px]">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-brand-500 animate-ping"></span>
            <span className="text-slate-700 font-medium">Dual-Pipeline Active</span>
          </div>
          <span className="text-slate-500">v1.0.0</span>
        </div>
      </div>
    </aside>
  );
};
