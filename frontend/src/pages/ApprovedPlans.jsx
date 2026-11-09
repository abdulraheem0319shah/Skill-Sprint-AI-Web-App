import React, { useEffect, useState } from 'react';
import { planService } from '../services/api';
import { StatusBadge } from '../components/StatusBadge';
import { Link } from 'react-router-dom';
import {
  CheckCircle2,
  Sparkles,
  Eye,
  GitCompare,
  ShieldCheck,
  Search,
  BookOpen
} from 'lucide-react';

export const ApprovedPlans = () => {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        setLoading(true);
        const res = await planService.getAll();
        setPlans(res.data.plans || []);
      } catch (err) {
        console.error('Failed to load approved plans:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchPlans();
  }, []);

  const filtered = plans.filter((p) => {
    const s = searchTerm.toLowerCase();
    return (
      p.plan_code?.toLowerCase().includes(s) ||
      p.role_name?.toLowerCase().includes(s) ||
      p.employee_name?.toLowerCase().includes(s)
    );
  });

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-950 tracking-tight flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-brand-600" />
            Approved Enterprise Onboarding Plans
          </h1>
          <p className="text-xs text-slate-600 mt-1">
            Rollout-ready training tracks verified for 100% matrix compliance and zero hallucinations
          </p>
        </div>
        <Link
          to="/generate"
          className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-sm transition"
        >
          <Sparkles className="w-4 h-4" />
          Generate New Plan
        </Link>
      </div>

      {/* Search Bar */}
      <div className="bg-white/80 backdrop-blur-md border border-slate-200/80 rounded-2xl p-4 shadow-sm">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600" />
          <input
            type="text"
            placeholder="Search by Plan Code, Employee or Role..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-brand-600 shadow-inner"
          />
        </div>
      </div>

      {/* Plans Table */}
      <div className="bg-white/80 backdrop-blur-md border border-slate-200/80 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-500 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-5 py-3.5">Plan Code</th>
                <th className="px-5 py-3.5">Employee & Role</th>
                <th className="px-5 py-3.5">Mandatory Coverage</th>
                <th className="px-5 py-3.5">Source Traceability</th>
                <th className="px-5 py-3.5">Validation Status</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="6" className="text-center py-12 text-slate-500">
                    Loading plans...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-12 text-slate-500">
                    No onboarding plans generated yet.
                  </td>
                </tr>
              ) : (
                filtered.map((plan) => (
                  <tr key={plan.id} className="hover:bg-slate-50/65 transition">
                    <td className="px-5 py-3.5 font-mono font-bold text-brand-600">
                      {plan.plan_code}
                    </td>
                    <td className="px-5 py-3.5 space-y-0.5">
                      <div className="font-bold text-slate-900">{plan.employee_name || 'Employee'}</div>
                      <div className="text-[11px] text-slate-600">{plan.role_name}</div>
                    </td>
                    <td className="px-5 py-3.5 font-bold text-brand-600">
                      {plan.coverage_score}%
                    </td>
                    <td className="px-5 py-3.5 font-bold text-brand-700">
                      {plan.traceability_score}%
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={plan.status} />
                    </td>
                    <td className="px-5 py-3.5 text-right space-x-2">
                      <Link
                        to={`/plans/${plan.id}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white font-semibold transition shadow-sm"
                      >
                        <Eye className="w-3.5 h-3.5" /> Inspect Curriculum
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
