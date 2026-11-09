import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { planService } from '../services/api';
import { StatusBadge } from '../components/StatusBadge';
import {
  ArrowLeft,
  ShieldCheck,
  GitCompare,
  Trash2
} from 'lucide-react';

export const PlanDetails = () => {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedStage, setSelectedStage] = useState('All Stages');

  useEffect(() => {
    const fetchPlan = async () => {
      try {
        setLoading(true);
        const res = await planService.getById(id);
        setData(res.data);
      } catch (err) {
        console.error('Error fetching plan details:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchPlan();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-slate-9000 font-medium text-xs animate-pulse">
          Loading curriculum architecture and module assessments...
        </div>
      </div>
    );
  }

  const plan = data?.plan || {};
  const modules = data?.modules || [];

  const stages = ['All Stages', 'Day 1', 'Week 1', 'Week 2', 'First 30 Days', '60 Days', '90 Days'];

  const filteredModules = selectedStage === 'All Stages'
    ? modules
    : modules.filter((m) => m.stage === selectedStage);

  return (
    <div className="space-y-6 animate-fadeIn max-w-5xl mx-auto">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <Link
          to="/approved-plans"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600/70 hover:text-slate-900 transition"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Plans
        </Link>
        <div className="flex items-center gap-2">
          <Link
            to={`/validation?planId=${plan.id}`}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-50 hover:bg-brand-500/25 text-slate-600 text-xs font-semibold border border-slate-200/20 transition shadow-inner"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-brand-600" />
            Python Validation
          </Link>
          <Link
            to={`/comparison?planId=${plan.id}`}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-brand-500 hover:bg-brand-500/80 text-white text-xs font-semibold transition shadow-lg shadow-brand-500/20"
          >
            <GitCompare className="w-3.5 h-3.5" />
            100-Point Comparison
          </Link>
          <button
            onClick={async () => {
              if (!window.confirm('Are you sure you want to permanently delete this onboarding plan?')) return;
              try {
                await planService.delete(plan.id);
                window.location.href = '/approved-plans';
              } catch (err) {
                alert(err.response?.data?.detail || 'Failed to delete plan');
              }
            }}
            className="p-2 rounded-xl bg-slate-50 hover:bg-slate-50/80 text-slate-600/80 hover:text-slate-600 border border-slate-200/20 transition shadow-inner"
            title="Delete Plan"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Plan Header Card */}
      <div className="glass-panel p-6 space-y-4 border border-slate-200/20 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5">
              <span className="font-mono text-xs font-bold text-slate-9000 px-2.5 py-0.5 rounded-md bg-brand-500/15 border border-brand-500/30 shadow-inner">
                {plan.plan_code}
              </span>
              <StatusBadge status={plan.status} />
              <span className="text-xs text-slate-600/70 font-medium">
                Engine: <strong className="text-slate-900">{plan.generation_source || 'Gemini 1.5 Flash'}</strong>
              </span>
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              {plan.role_name} Personalized Onboarding Curriculum
            </h1>
          </div>

          <div className="flex items-center gap-4 bg-slate-50 p-3 rounded-2xl border border-slate-200/20 text-center shadow-inner">
            <div>
              <div className="text-xl font-bold text-brand-600">{plan.coverage_score}%</div>
              <div className="text-[10px] text-slate-600/70 uppercase font-semibold">Coverage</div>
            </div>
            <div className="h-6 w-px bg-brand-200/20"></div>
            <div>
              <div className="text-xl font-bold text-brand-600">{plan.traceability_score}%</div>
              <div className="text-[10px] text-slate-600/70 uppercase font-semibold">Traceability</div>
            </div>
            <div className="h-6 w-px bg-brand-200/20"></div>
            <div>
              <div className="text-xl font-bold text-slate-9000">{modules.length}</div>
              <div className="text-[10px] text-slate-600/70 uppercase font-semibold">Modules</div>
            </div>
          </div>
        </div>

        {/* Stage Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pt-3 border-t border-slate-200/15">
          {stages.map((st) => (
            <button
              key={st}
              onClick={() => setSelectedStage(st)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                selectedStage === st
                  ? 'bg-brand-500 text-white shadow-md shadow-brand-500/20'
                  : 'bg-slate-50/60 text-slate-600/70 hover:bg-slate-50 hover:text-slate-900 border border-slate-200/20 shadow-inner'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Modules List */}
      <div className="space-y-4">
        {filteredModules.map((m) => {
          let objectives = [];
          try {
            objectives = typeof m.learning_objectives === 'string' ? JSON.parse(m.learning_objectives) : m.learning_objectives;
          } catch {
            objectives = [];
          }

          let concepts = [];
          try {
            concepts = typeof m.key_concepts === 'string' ? JSON.parse(m.key_concepts) : m.key_concepts;
          } catch {
            concepts = [];
          }

          return (
            <div key={m.id} className="glass-panel p-6 space-y-4 border border-slate-200/20 hover:border-brand-500/50 transition shadow-lg">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-slate-9000 bg-brand-500/15 px-2 py-0.5 rounded border border-brand-500/30 shadow-inner">
                      {m.module_code}
                    </span>
                    <h3 className="text-sm font-bold text-slate-900">{m.title}</h3>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-50 text-slate-600 border border-slate-200/20 shadow-inner">
                      {m.category}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600/80">{m.purpose}</p>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <span className="px-2.5 py-1 rounded bg-slate-50 font-semibold text-brand-600 border border-slate-200/20 shadow-inner">
                    Stage: {m.stage}
                  </span>
                  <span className="px-2.5 py-1 rounded bg-slate-50 text-slate-600/70 border border-slate-200/20 shadow-inner">
                    {m.duration}
                  </span>
                </div>
              </div>

              {/* Objectives & Concepts */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs bg-slate-50 p-3.5 rounded-xl border border-slate-200/20 shadow-inner">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-9000 block mb-1">Learning Objectives</span>
                  <ul className="list-disc pl-4 space-y-0.5 text-slate-600/90 text-[11px]">
                    {objectives?.map((obj, i) => (
                      <li key={i}>{obj}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-brand-600 block mb-1">Source Grounding</span>
                  <p className="text-slate-600/90 text-[11px]">
                    Document: <strong className="text-slate-900">{m.source_doc_code}</strong> ({m.source_section})
                  </p>
                  <p className="text-slate-600/60 text-[10px] mt-1">
                    Key Concepts: {concepts?.join(', ') || 'Domain Protocols'}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
