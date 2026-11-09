import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { employeeService, planService } from '../services/api';
import { StatusBadge } from '../components/StatusBadge';
import {
  Users,
  ArrowLeft,
  Sparkles,
  BookOpen,
  Award,
  AlertTriangle,
  Lightbulb,
  CheckCircle2,
  Clock,
  Layers,
  TrendingUp
} from 'lucide-react';

export const EmployeeDetails = () => {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [planDetails, setPlanDetails] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEmployeeInfo = async () => {
      try {
        setLoading(true);
        const res = await employeeService.getById(id);
        setData(res.data);
        if (res.data.active_plan) {
          const pRes = await planService.getById(res.data.active_plan.id);
          setPlanDetails(pRes.data);
        }
      } catch (err) {
        console.error('Failed to load employee details:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchEmployeeInfo();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-brand-600 font-medium text-xs animate-pulse">
          Loading employee profile and onboarding intelligence...
        </div>
      </div>
    );
  }

  const emp = data?.employee || {};
  const plan = planDetails?.plan || data?.active_plan;
  const progress = data?.progress || {};

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Back button */}
      <Link
        to="/employees"
        className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-white transition"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Employee Directory
      </Link>

      {/* Profile Header */}
      <div className="glass-panel p-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-brand-600 to-brand-500 text-white font-black text-xl flex items-center justify-center shadow-lg shadow-brand-600/30">
              {emp.name?.slice(0, 2).toUpperCase() || 'EM'}
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl font-bold text-white tracking-tight">{emp.name}</h1>
                <span className="font-mono text-xs font-bold text-brand-600 bg-brand-500/10 px-2 py-0.5 rounded border border-brand-500/20">
                  {emp.employee_code}
                </span>
                <StatusBadge status={emp.training_status} />
              </div>
              <p className="text-xs text-slate-600 mt-1">
                {emp.role_name} • {emp.department} • Manager: <strong className="text-slate-800">{emp.reporting_manager || 'None'}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to={`/generate?empId=${emp.id}&role=${encodeURIComponent(emp.role_name)}`}
              className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-lg shadow-brand-600/20 transition"
            >
              <Sparkles className="w-4 h-4" />
              Regenerate Plan
            </Link>
          </div>
        </div>

        {/* Profile Info Pills */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-200 text-xs">
          <div className="bg-slate-50/60 p-3 rounded-xl border border-slate-200">
            <span className="text-[10px] text-slate-500 uppercase font-semibold block">Experience Level</span>
            <span className="font-bold text-slate-800">{emp.experience_level}</span>
          </div>
          <div className="bg-slate-50/60 p-3 rounded-xl border border-slate-200">
            <span className="text-[10px] text-slate-500 uppercase font-semibold block">Location Hub</span>
            <span className="font-bold text-slate-800">{emp.location}</span>
          </div>
          <div className="bg-slate-50/60 p-3 rounded-xl border border-slate-200">
            <span className="text-[10px] text-slate-500 uppercase font-semibold block">Joining Date</span>
            <span className="font-bold text-slate-800">{emp.joining_date}</span>
          </div>
          <div className="bg-slate-50/60 p-3 rounded-xl border border-slate-200">
            <span className="text-[10px] text-slate-500 uppercase font-semibold block">Overall Progress</span>
            <span className="font-bold text-brand-600">{emp.plan_progress || 0}% Completed</span>
          </div>
        </div>
      </div>

      {/* Plan & Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Plan Overview */}
        <div className="lg:col-span-2 glass-panel p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <div>
              <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-brand-600" />
                Assigned Personalized Onboarding Plan
              </h2>
              <p className="text-xs text-slate-600">Ground-truth verified multi-stage curriculum</p>
            </div>
            {plan && <StatusBadge status={plan.status} />}
          </div>

          {plan ? (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-slate-100/40 p-3.5 rounded-xl border border-slate-300/60 text-center">
                  <div className="text-xl font-bold text-brand-600">{plan.coverage_score}%</div>
                  <div className="text-[10px] text-slate-600 font-semibold uppercase">Coverage Score</div>
                </div>
                <div className="bg-slate-100/40 p-3.5 rounded-xl border border-slate-300/60 text-center">
                  <div className="text-xl font-bold text-brand-600">{plan.traceability_score}%</div>
                  <div className="text-[10px] text-slate-600 font-semibold uppercase">Traceability Score</div>
                </div>
                <div className="bg-slate-100/40 p-3.5 rounded-xl border border-slate-300/60 text-center">
                  <div className="text-xl font-bold text-brand-600">{plan.consistency_score || 0}%</div>
                  <div className="text-[10px] text-slate-600 font-semibold uppercase">Consistency Score</div>
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <h3 className="text-xs font-bold text-slate-700">Plan Learning Modules ({planDetails?.modules?.length || 0})</h3>
                <div className="space-y-2">
                  {(planDetails?.modules || []).map((m) => (
                    <div key={m.id} className="p-3 bg-slate-50/60 border border-slate-200/80 rounded-xl flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-slate-800">{m.title}</span>
                        <span className="text-[10px] text-slate-600 block">{m.stage} • Ref: {m.source_doc_code}</span>
                      </div>
                      <StatusBadge status={m.status} />
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-3">
                <Link
                  to={`/plans/${plan.id}`}
                  className="w-full py-2.5 bg-slate-100 hover:bg-slate-700 text-slate-800 text-xs font-semibold rounded-xl flex items-center justify-center gap-2 border border-slate-300 transition"
                >
                  <Layers className="w-4 h-4" /> Open Full Interactive Plan
                </Link>
              </div>
            </div>
          ) : (
            <div className="text-center py-10 space-y-3">
              <p className="text-xs text-slate-500">No active onboarding plan generated for this employee yet.</p>
              <Link
                to={`/generate?empId=${emp.id}&role=${encodeURIComponent(emp.role_name)}`}
                className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold px-4 py-2 rounded-xl transition"
              >
                <Sparkles className="w-4 h-4" /> Generate Plan Now
              </Link>
            </div>
          )}
        </div>

        {/* Weak Area Detection & Adaptive Recommendations */}
        <div className="space-y-6">
          <div className="glass-panel p-6 space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-200">
              <AlertTriangle className="w-4 h-4 text-brand-600" />
              <h2 className="text-sm font-bold text-slate-800">Weak-Area Identification</h2>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Based on quiz scoring and prerequisite sequencing:
            </p>
            <div className="space-y-2.5">
              <div className="p-3 bg-slate-50/20 border border-brand-200/40 rounded-xl text-xs space-y-1">
                <div className="font-bold text-slate-600">Data Privacy & GDPR Reporting</div>
                <p className="text-[11px] text-slate-600">Needs reinforcement on 72-hour regulatory breach escalation window.</p>
              </div>
            </div>
          </div>

          <div className="glass-panel p-6 space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-200">
              <Lightbulb className="w-4 h-4 text-brand-600" />
              <h2 className="text-sm font-bold text-slate-800">Adaptive Recommendations</h2>
            </div>
            <div className="space-y-2.5 text-xs">
              <div className="p-3 bg-slate-50/60 border border-slate-200 rounded-xl space-y-1">
                <span className="text-[10px] uppercase font-bold text-brand-600">Recommended Next Step</span>
                <p className="text-slate-700 font-medium">Complete Security Operations Triage Practical Simulation before Day 30.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
