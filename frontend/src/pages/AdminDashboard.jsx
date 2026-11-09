import React, { useEffect, useState } from 'react';
import { statsService } from '../services/api';
import { StatusBadge } from '../components/StatusBadge';
import { Link } from 'react-router-dom';
import {
  FileText,
  Layers,
  TrendingUp,
  AlertTriangle,
  Sparkles,
  ArrowRight,
  Activity,
  CheckCircle2,
  ShieldCheck,
  Zap
} from 'lucide-react';

export const AdminDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const res = await statsService.getDashboard();
      setData(res.data);
    } catch (err) {
      console.error('Failed to load dashboard stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex items-center gap-3 text-brand-600 font-medium text-xs">
          <Activity className="w-5 h-5 animate-spin text-brand-600" />
          <span>Synthesizing enterprise metrics...</span>
        </div>
      </div>
    );
  }

  const stats = data?.stats || {};
  const recentPlans = data?.recent_plans || [];
  const recentReviews = data?.recent_reviews || [];

  return (
    <div className="space-y-6 animate-fadeIn max-w-6xl mx-auto pb-10">
      {/* Top Hero Banner with Richer Gradient & Visual Flair */}
      <div className="relative overflow-hidden bg-gradient-to-br from-brand-900 via-brand-950 to-slate-900 rounded-3xl p-8 text-white shadow-xl border border-brand-200/50">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-brand-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute right-40 -top-10 w-48 h-48 bg-brand-500/10 rounded-full blur-2xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-brand-500/20 text-slate-600 border border-brand-400/30 text-xs font-semibold backdrop-blur-md">
              <Sparkles className="w-3.5 h-3.5 text-brand-600 animate-pulse" /> Apex Global Enterprise Knowledge Mesh
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Enterprise Onboarding Intelligence Hub
            </h1>
            <p className="text-xs sm:text-sm text-white leading-relaxed">
              Source-grounded curriculum generation featuring independent Python rule validation, strict prompt injection defense, and real-time matrix compliance monitoring.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <Link
              to="/generate"
              className="inline-flex items-center gap-2 bg-brand-500 hover:bg-brand-400 text-white text-xs font-bold px-5 py-3 rounded-2xl shadow-lg shadow-brand-500/30 transition-all hover:-translate-y-0.5"
            >
              <Zap className="w-4 h-4 fill-white" />
              Generate Plan
            </Link>
            <Link
              to="/validation"
              className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white text-xs font-bold px-5 py-3 rounded-2xl border border-white/20 backdrop-blur-md transition-all hover:-translate-y-0.5"
            >
              Run Validation
            </Link>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Documents */}
        <div className="bg-white/90 backdrop-blur-md border border-slate-200/80 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">Total Documents</span>
            <div className="w-9 h-9 rounded-xl bg-brand-50 border border-brand-100 text-brand-600 flex items-center justify-center shadow-inner">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900">{stats.total_documents || 0}</span>
            <span className="text-xs text-brand-600 font-bold bg-brand-50 px-2 py-0.5 rounded-md border border-brand-100">
              {stats.active_documents || 0} Active
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2 font-medium">Policies, SOPs, FAQs & Handbooks</p>
        </div>

        {/* Matrix Requirements */}
        <div className="bg-white/90 backdrop-blur-md border border-slate-200/80 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">Matrix Requirements</span>
            <div className="w-9 h-9 rounded-xl bg-brand-50 border border-brand-100 text-brand-600 flex items-center justify-center shadow-inner">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900">{stats.total_matrix_requirements || 0}</span>
            <span className="text-xs text-brand-600 font-bold bg-brand-50 px-2 py-0.5 rounded-md border border-brand-100">
              {stats.mandatory_requirements || 0} Core
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2 font-medium">Across 10 standard job roles</p>
        </div>

        {/* Avg Coverage */}
        <div className="bg-white/90 backdrop-blur-md border border-slate-200/80 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">Mandatory Coverage</span>
            <div className="w-9 h-9 rounded-xl bg-brand-50 border border-brand-100 text-brand-600 flex items-center justify-center shadow-inner">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-brand-600">{stats.average_coverage_score || 0}%</span>
            <span className="text-xs text-slate-600 font-semibold">Target 100%</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2 font-medium">Python Ground-Truth Verified</p>
        </div>

        {/* Review Queue */}
        <div className="bg-white/90 backdrop-blur-md border border-slate-200/80 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">Review Queue</span>
            <div className="w-9 h-9 rounded-xl bg-brand-50 border border-brand-100 text-brand-600 flex items-center justify-center shadow-inner">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-brand-600">{stats.pending_reviews || 0}</span>
            <span className="text-xs text-brand-700 font-bold bg-brand-50 px-2 py-0.5 rounded-md border border-brand-100">
              Needs Action
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2 font-medium">Flagged items awaiting review</p>
        </div>
      </div>

      {/* Main Content Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Generated Plans */}
        <div className="bg-white/90 backdrop-blur-md border border-slate-200/80 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Recent Generated Onboarding Plans</h2>
                <p className="text-xs text-slate-500">Multi-stage curriculums verified against Ground Truth</p>
              </div>
              <Link to="/approved-plans" className="text-xs font-bold text-brand-600 hover:text-slate-9000 flex items-center gap-1 bg-brand-50 px-3 py-1.5 rounded-xl border border-brand-100 transition">
                View All <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="divide-y divide-slate-100 mt-3">
              {recentPlans.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-600">No onboarding plans generated yet.</div>
              ) : (
                recentPlans.map((plan) => (
                  <div key={plan.id} className="py-3.5 flex items-center justify-between hover:bg-slate-50/80 px-3 rounded-2xl transition-all">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">{plan.employee_name || 'Employee'}</span>
                        <span className="text-[11px] text-slate-500 font-semibold bg-slate-100 px-2 py-0.5 rounded-md">{plan.role_name}</span>
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-slate-500 font-medium">
                        <span>Code: <strong className="text-slate-800 font-mono">{plan.plan_code}</strong></span>
                        <span>Coverage: <strong className="text-brand-600 font-bold">{plan.coverage_score}%</strong></span>
                        <span>Traceability: <strong className="text-brand-600 font-bold">{plan.traceability_score}%</strong></span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <StatusBadge status={plan.status} />
                      <Link
                        to={`/plans/${plan.id}`}
                        className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-brand-600 text-slate-700 hover:text-white transition text-xs font-bold border border-slate-200 hover:border-brand-600 shadow-sm"
                      >
                        Inspect
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Active Review & Escalation Queue */}
        <div className="bg-white/90 backdrop-blur-md border border-slate-200/80 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Active Review & Escalation Queue</h2>
                <p className="text-xs text-slate-500">Security scans, contradictions & missing requirements</p>
              </div>
              <Link to="/reviews" className="text-xs font-bold text-brand-600 hover:text-slate-9000 flex items-center gap-1 bg-brand-50 px-3 py-1.5 rounded-xl border border-brand-100 transition">
                Open Queue <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="divide-y divide-slate-100 mt-3">
              {recentReviews.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-600 flex flex-col items-center justify-center gap-2">
                  <ShieldCheck className="w-8 h-8 text-slate-9000" />
                  <span>Review queue is currently clear and fully compliant!</span>
                </div>
              ) : (
                recentReviews.map((rev) => (
                  <div key={rev.id} className="py-3.5 space-y-1.5 hover:bg-slate-50/80 px-3 rounded-2xl transition-all">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900">{rev.employee_name} <span className="text-slate-500 font-normal">({rev.role_name})</span></span>
                      <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg uppercase tracking-wider ${
                        rev.risk_flag === 'high' ? 'bg-brand-50 text-brand-700 border border-slate-200' : 'bg-brand-50 text-brand-700 border border-slate-200'
                      }`}>
                        {rev.risk_flag} risk
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 line-clamp-1 font-medium bg-slate-50 p-2 rounded-xl border border-slate-100">{rev.flag_reason}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
