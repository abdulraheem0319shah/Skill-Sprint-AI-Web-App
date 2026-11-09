import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { employeeService, roleService, planService } from '../services/api';
import {
  Sparkles,
  Bot,
  ShieldCheck,
  Zap,
  CheckCircle2,
  Clock,
  Layers,
  ArrowRight,
  AlertCircle
} from 'lucide-react';

export const GeneratePlan = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const defaultRole = searchParams.get('role') || '';
  const defaultEmpId = searchParams.get('empId') || '';

  const [employees, setEmployees] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [selectedEmpId, setSelectedEmpId] = useState(defaultEmpId);
  const [selectedRole, setSelectedRole] = useState(defaultRole);
  const [selectedModel, setSelectedModel] = useState('Gemini 1.5 Flash (Source-Grounded)');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState('');
  const [resultPlan, setResultPlan] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [eRes, rRes] = await Promise.all([
          employeeService.getAll(),
          roleService.getAll()
        ]);
        const emps = eRes.data.employees || [];
        const rls = rRes.data.roles || [];
        setEmployees(emps);
        setRoles(rls);

        if (!selectedRole && rls.length > 0) {
          setSelectedRole(rls[0].role_name);
        }
        if (!selectedEmpId && emps.length > 0) {
          setSelectedEmpId(emps[0].id);
        }
      } catch (err) {
        console.error('Failed to load generate options:', err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const handleEmpChange = (empId) => {
    setSelectedEmpId(empId);
    const emp = employees.find((e) => String(e.id) === String(empId));
    if (emp) {
      setSelectedRole(emp.role_name);
    }
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!selectedRole && !selectedEmpId) {
      alert('Please select or create an employee and role first.');
      return;
    }
    try {
      setIsGenerating(true);
      setGenerationStep('Retrieving Ground-Truth Role Matrix and Active Source Chunks...');
      await new Promise((r) => setTimeout(r, 600));

      setGenerationStep('Invoking Pipeline 1 (GenAI Curriculum Synthesis & Stage Sequencing)...');
      await new Promise((r) => setTimeout(r, 800));

      const payload = {
        employee_id: selectedEmpId ? parseInt(selectedEmpId) : null,
        role_name: selectedRole,
      };

      setGenerationStep('Running Pipeline 2 (Independent Python Validation Engine)...');
      const res = await planService.generate(payload);
      setResultPlan(res.data);
      setGenerationStep('Generation & Validation Complete!');
    } catch (err) {
      alert(err.response?.data?.detail || 'Plan generation failed');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn max-w-4xl mx-auto">
      {/* Top Banner */}
      <div className="glass-panel p-6 bg-gradient-to-r from-brand-950/60 via-slate-900 to-slate-900 border-brand-900/40">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-brand-600/30 border border-brand-500/40 text-brand-600 flex items-center justify-center">
            <Sparkles className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">Generate Personalized Onboarding Plan</h1>
            <p className="text-xs text-slate-600 mt-0.5">
              Dual-Pipeline synthesis: GenAI model drafting + independent deterministic Python ground-truth verification
            </p>
          </div>
        </div>
      </div>

      {/* Generator Form Card */}
      <div className="glass-panel p-6 space-y-6">
        <form onSubmit={handleGenerate} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Target Employee
              </label>
              <select
                value={selectedEmpId}
                onChange={(e) => handleEmpChange(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50/70 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-brand-500"
              >
                {employees.length === 0 ? (
                  <option value="">No employees found (Enroll an employee first)</option>
                ) : (
                  employees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name} ({e.role_name} - {e.department})
                    </option>
                  ))
                )}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Job Role & Matrix Mapping
              </label>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50/70 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-brand-500"
              >
                {roles.length === 0 ? (
                  <option value="">No roles defined (Create a role first)</option>
                ) : (
                  roles.map((r) => (
                    <option key={r.id} value={r.role_name}>
                      {r.role_name} ({r.department})
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Generative AI Engine
              </label>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50/70 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-brand-500"
              >
                <option value="Gemini 1.5 Flash (Source-Grounded)">Gemini 1.5 Flash (Source-Grounded)</option>
                <option value="Gemini Pro (Multi-Stage Reasoning)">Gemini Pro (Multi-Stage Reasoning)</option>
                <option value="Deterministic Grounded Engine">Deterministic Grounded Engine</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Configured Chronological Stages
              </label>
              <div className="p-2.5 bg-slate-50/70 border border-slate-200 rounded-xl text-[11px] text-slate-600 flex flex-wrap gap-1.5">
                <span className="px-2 py-0.5 rounded bg-slate-50/60 text-slate-600 border border-brand-200">Day 1</span>
                <span className="px-2 py-0.5 rounded bg-slate-50/60 text-slate-600 border border-brand-200">Week 1</span>
                <span className="px-2 py-0.5 rounded bg-slate-50/60 text-slate-600 border border-brand-200">Week 2</span>
                <span className="px-2 py-0.5 rounded bg-slate-50/60 text-slate-600 border border-brand-200">30 Days</span>
                <span className="px-2 py-0.5 rounded bg-slate-50/60 text-slate-600 border border-brand-200">60 Days</span>
                <span className="px-2 py-0.5 rounded bg-slate-50/60 text-slate-600 border border-brand-200">90 Days</span>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={isGenerating || (employees.length === 0 && !selectedRole)}
            className="w-full py-3 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-brand-600/30 flex items-center justify-center gap-2"
          >
            <Zap className="w-4 h-4" />
            {isGenerating ? 'Synthesizing & Validating Grounded Curriculum...' : 'Generate and Validate Plan'}
          </button>
        </form>

        {/* Live Progress Bar */}
        {isGenerating && (
          <div className="p-4 bg-slate-50/80 rounded-xl border border-brand-900/50 space-y-2 animate-fadeIn">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-600 font-semibold flex items-center gap-2">
                <Bot className="w-4 h-4 animate-spin text-brand-600" />
                {generationStep}
              </span>
            </div>
            <div className="w-full bg-white rounded-full h-1.5 overflow-hidden">
              <div className="bg-brand-500 h-1.5 rounded-full animate-pulse w-3/4"></div>
            </div>
          </div>
        )}
      </div>

      {/* Generated Result Showcase */}
      {resultPlan && (
        <div className="glass-panel p-6 space-y-5 animate-fadeIn border-brand-200/40 bg-slate-50/10">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-brand-600" />
              <h2 className="text-sm font-bold text-white">
                Plan {resultPlan.plan_code} Generated & Python Verified
              </h2>
            </div>
            <button
              onClick={() => navigate(`/plans/${resultPlan.plan_id}`)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold transition shadow-md shadow-brand-600/20"
            >
              View Full Plan Breakdown <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-slate-50/60 p-4 rounded-xl border border-slate-200 text-center">
              <div className="text-2xl font-black text-brand-600">
                {resultPlan.validation?.coverage_score}%
              </div>
              <div className="text-[11px] text-slate-600 uppercase font-semibold mt-1">Mandatory Policy Coverage</div>
            </div>
            <div className="bg-slate-50/60 p-4 rounded-xl border border-slate-200 text-center">
              <div className="text-2xl font-black text-brand-600">
                {resultPlan.validation?.traceability_score}%
              </div>
              <div className="text-[11px] text-slate-600 uppercase font-semibold mt-1">Source Traceability</div>
            </div>
            <div className="bg-slate-50/60 p-4 rounded-xl border border-slate-200 text-center">
              <div className="text-2xl font-black text-brand-600">
                {resultPlan.plan?.modules?.length || 0}
              </div>
              <div className="text-[11px] text-slate-600 uppercase font-semibold mt-1">Multi-Stage Modules</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
