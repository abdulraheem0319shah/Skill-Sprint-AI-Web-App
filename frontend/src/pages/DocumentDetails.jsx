import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { documentService } from '../services/api';
import { StatusBadge } from '../components/StatusBadge';
import {
  FileText,
  ArrowLeft,
  Layers,
  ShieldAlert,
  ListChecks,
  Code,
  Calendar,
  Sparkles,
  CheckCircle2
} from 'lucide-react';

export const DocumentDetails = () => {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('text'); // text | chunks | requirements | security

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        setLoading(true);
        const res = await documentService.getById(id);
        setData(res.data);
      } catch (err) {
        console.error('Error fetching document details:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDetails();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-brand-600 font-medium text-xs animate-pulse">
          Parsing document chunks and extracting traceability metadata...
        </div>
      </div>
    );
  }

  const doc = data?.document || {};
  const chunks = data?.chunks || [];
  const extracted = data?.extracted_requirements || [];
  const security = data?.security_scan || {};

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Back button */}
      <Link
        to="/documents"
        className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-white transition"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Documents
      </Link>

      {/* Document Header Card */}
      <div className="glass-panel p-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5">
              <span className="font-mono text-xs font-bold text-brand-600 px-2.5 py-0.5 rounded-md bg-brand-500/10 border border-brand-500/20">
                {doc.doc_code}
              </span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-300">
                v{doc.version}
              </span>
              <StatusBadge status={doc.status} />
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight">{doc.title}</h1>
            <p className="text-xs text-slate-600">File: {doc.file_name} • Category: {doc.category}</p>
          </div>

          <div className="flex items-center gap-4 text-xs text-slate-600 bg-slate-50/60 p-3 rounded-xl border border-slate-200">
            <div>
              <span className="block text-[10px] text-slate-500 uppercase font-semibold">Effective Date</span>
              <span className="font-semibold text-slate-800">{doc.effective_date || '2026-01-01'}</span>
            </div>
            <div className="h-6 w-px bg-slate-100"></div>
            <div>
              <span className="block text-[10px] text-slate-500 uppercase font-semibold">Total Chunks</span>
              <span className="font-semibold text-brand-600">{chunks.length}</span>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 pt-2 border-t border-slate-200/80">
          <button
            onClick={() => setActiveTab('text')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === 'text' ? 'bg-brand-600 text-white' : 'text-slate-600 hover:text-slate-800'
            }`}
          >
            Full Document Text
          </button>
          <button
            onClick={() => setActiveTab('chunks')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === 'chunks' ? 'bg-brand-600 text-white' : 'text-slate-600 hover:text-slate-800'
            }`}
          >
            Traceable Chunks ({chunks.length})
          </button>
          <button
            onClick={() => setActiveTab('requirements')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === 'requirements' ? 'bg-brand-600 text-white' : 'text-slate-600 hover:text-slate-800'
            }`}
          >
            Extracted Policy Requirements ({extracted.length})
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === 'security'
                ? 'bg-brand-600 text-white'
                : security.has_threats
                ? 'text-brand-600 hover:text-slate-600'
                : 'text-slate-600 hover:text-slate-800'
            }`}
          >
            Security Scan {security.has_threats ? `(⚠️ ${security.threat_count} Threats)` : '(Clean)'}
          </button>
        </div>
      </div>

      {/* Tab Panels */}
      {activeTab === 'text' && (
        <div className="glass-panel p-6 space-y-3">
          <h3 className="text-xs font-bold uppercase text-slate-600 tracking-wider">Raw Ingested Text</h3>
          <pre className="p-4 rounded-xl bg-slate-50/80 border border-slate-200 text-xs text-slate-700 font-mono whitespace-pre-wrap leading-relaxed overflow-x-auto">
            {doc.content || 'No content found.'}
          </pre>
        </div>
      )}

      {activeTab === 'chunks' && (
        <div className="space-y-4">
          {chunks.map((chunk) => (
            <div key={chunk.id} className="glass-panel p-5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-brand-600 bg-brand-500/10 px-2 py-0.5 rounded border border-brand-500/20">
                  {chunk.chunk_id}
                </span>
                <span className="text-xs text-slate-600 font-medium">
                  {chunk.section} • Chunk #{chunk.chunk_index}
                </span>
              </div>
              <p className="text-xs text-slate-700 bg-slate-50/50 p-3 rounded-lg border border-slate-200/60 leading-relaxed font-sans">
                {chunk.content}
              </p>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'requirements' && (
        <div className="glass-panel overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-xs font-bold text-slate-800">Automatically Extracted Requirements</h3>
              <p className="text-[11px] text-slate-600">Classified by modal keywords and due stages</p>
            </div>
            <button
              onClick={async () => {
                const targetRole = prompt('Enter Target Role Name to sync requirements to (e.g. Software Support Engineer):', 'Software Support Engineer');
                if (!targetRole) return;
                try {
                  const res = await documentService.extractRequirements(id, { save_to_matrix: true, target_role: targetRole });
                  alert(`Successfully saved ${res.data.saved_to_matrix_count} requirement(s) to Role Requirement Matrix for "${targetRole}".`);
                } catch (err) {
                  alert(err.response?.data?.detail || 'Failed to sync to matrix');
                }
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow transition"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Sync Extracted to Role Matrix
            </button>
          </div>
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50/80 text-slate-600 uppercase text-[10px] font-semibold tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Requirement Statement</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Mandatory</th>
                <th className="px-4 py-3">Priority</th>
                <th className="px-4 py-3">Due Stage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {extracted.map((req) => (
                <tr key={req.req_code} className="hover:bg-slate-100/40">
                  <td className="px-4 py-3 font-mono font-bold text-brand-600">{req.req_code}</td>
                  <td className="px-4 py-3 text-slate-800">{req.policy_requirement}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-300 text-[10px]">
                      {req.requirement_type}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      req.is_mandatory ? 'bg-slate-50 text-slate-600 border border-brand-200' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {req.is_mandatory ? 'YES' : 'NO'}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-semibold text-slate-700">{req.priority}</td>
                  <td className="px-4 py-3 text-brand-600 font-medium">{req.due_stage}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'security' && (
        <div className="glass-panel p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
              security.has_threats ? 'bg-brand-500/20 text-brand-600 border border-brand-500/30' : 'bg-brand-500/20 text-brand-600 border border-brand-500/30'
            }`}>
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Adversarial & Prompt Injection Defense Report</h3>
              <p className="text-xs text-slate-600">Heuristic signature evaluation for embedded override commands</p>
            </div>
          </div>

          {security.has_threats ? (
            <div className="space-y-3 mt-4">
              <div className="p-3.5 rounded-xl bg-slate-50/60 border border-brand-200 text-xs text-slate-600 font-semibold">
                ⚠️ Security Threats Detected: This document contains suspicious prompt injection or policy bypass patterns.
              </div>
              {(security.threats || []).map((t, idx) => (
                <div key={idx} className="p-4 rounded-xl bg-slate-50/80 border border-brand-900/60 space-y-1 text-xs">
                  <div className="flex items-center justify-between text-brand-600 font-bold">
                    <span>{t.risk_type}</span>
                    <span>Line #{t.line_number}</span>
                  </div>
                  <p className="text-slate-700 font-mono bg-white p-2 rounded border border-slate-200">
                    "{t.snippet}"
                  </p>
                  <p className="text-[11px] text-slate-600">Matched Pattern: <code className="text-slate-600">{t.matched_text}</code></p>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6 rounded-xl bg-slate-50/30 border border-brand-200/40 text-center space-y-2">
              <CheckCircle2 className="w-8 h-8 text-brand-600 mx-auto" />
              <p className="text-xs font-bold text-slate-600">Clean Document: No Adversarial Overrides Found</p>
              <p className="text-[11px] text-slate-600">Passed all 13 regex jailbreak and prompt-injection signature checks.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
