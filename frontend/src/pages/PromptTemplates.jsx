import React, { useEffect, useState } from 'react';
import { promptService } from '../services/api';
import { FileCode2, Sparkles, Shield } from 'lucide-react';

export const PromptTemplates = () => {
  const [prompts, setPrompts] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPrompts = async () => {
      try {
        setLoading(true);
        const res = await promptService.getPrompts();
        setPrompts(res.data);
      } catch (err) {
        console.error('Failed to load prompts:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchPrompts();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-brand-600 font-medium text-xs animate-pulse">
          Loading versioned prompt registries...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn max-w-5xl mx-auto">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-md border border-slate-200/80 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-950 tracking-tight flex items-center gap-2.5">
              <FileCode2 className="w-5 h-5 text-brand-600" />
              Controlled Prompt Registry & Versioning
            </h1>
            <p className="text-xs text-slate-600 mt-1">
              Version-controlled system & user prompt templates with strict data-instruction separation
            </p>
          </div>
          <span className="font-mono text-xs font-bold text-brand-600 bg-brand-50 px-3 py-1 rounded-full border border-slate-200 shadow-inner">
            Active Version: v{prompts?.active_version || '2.4.0'}
          </span>
        </div>
      </div>

      {/* System Prompt */}
      <div className="bg-white/80 backdrop-blur-md border border-slate-200/80 rounded-2xl p-6 space-y-3 shadow-sm">
        <div className="flex items-center justify-between pb-2 border-b border-slate-200">
          <h2 className="text-xs font-bold uppercase text-brand-600 flex items-center gap-2">
            <Shield className="w-4 h-4 text-brand-600" /> System Prompt (Data-Instruction Sandboxing)
          </h2>
          <span className="text-[10px] text-slate-500 font-medium">Strict JSON Output Enforced</span>
        </div>
        <pre className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 font-mono whitespace-pre-wrap leading-relaxed shadow-inner">
          {prompts?.system_prompt}
        </pre>
      </div>

      {/* User Prompt */}
      <div className="bg-white/80 backdrop-blur-md border border-slate-200/80 rounded-2xl p-6 space-y-3 shadow-sm">
        <div className="flex items-center justify-between pb-2 border-b border-slate-200">
          <h2 className="text-xs font-bold uppercase text-brand-700 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-brand-600" /> User Prompt Template
          </h2>
          <span className="text-[10px] text-slate-500 font-medium">Ground-Truth Matrix Injected</span>
        </div>
        <pre className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 font-mono whitespace-pre-wrap leading-relaxed shadow-inner">
          {prompts?.user_prompt}
        </pre>
      </div>
    </div>
  );
};
