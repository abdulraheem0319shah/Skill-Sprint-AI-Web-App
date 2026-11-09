import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { comparisonService } from '../services/api';
import {
  GitCompare,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Download,
  Filter,
  Sparkles,
  Layers
} from 'lucide-react';

export const ComparisonResults = () => {
  const [searchParams] = useSearchParams();
  const planId = searchParams.get('planId');

  const [multiRoleReport, setMultiRoleReport] = useState(null);
  const [selectedRoleFilter, setSelectedRoleFilter] = useState('');
  const [matchStatusFilter, setMatchStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchComparisonData = async () => {
      try {
        setLoading(true);
        const res = await comparisonService.getMultiRole();
        setMultiRoleReport(res.data);
      } catch (err) {
        console.error('Failed to load comparison data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchComparisonData();
  }, [planId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-brand-600 font-medium text-xs animate-pulse">
          Computing requirement-level GenAI vs Python Ground-Truth comparison metrics...
        </div>
      </div>
    );
  }

  const roleReports = multiRoleReport?.role_reports || [];
  
  // Flatten comparison rows from all role reports
  let allRows = [];
  roleReports.forEach((rep) => {
    (rep.comparison_rows || []).forEach((row) => {
      allRows.push(row);
    });
  });

  const filteredRows = allRows.filter((row) => {
    const matchesRole = !selectedRoleFilter || row.role === selectedRoleFilter;
    const matchesStatus = !matchStatusFilter || row.match_status === matchStatusFilter;
    return matchesRole && matchesStatus;
  });

  const totalMatches = allRows.filter((r) => r.match_status === 'Match').length;
  const overallRate = allRows.length > 0 ? Math.round((totalMatches / allRows.length) * 100) : 0;

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-950 tracking-tight flex items-center gap-2.5">
            <GitCompare className="w-5 h-5 text-brand-600" />
            GenAI vs Python Ground-Truth Comparison Engine
          </h1>
          <p className="text-xs text-slate-600 mt-1">
            Auditing requirement-level decisions across standard job roles (SRS Deliverable 6)
          </p>
        </div>

        <a
          href="/api/reports/export?format=csv"
          download
          className="inline-flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold px-4 py-2.5 rounded-xl border border-slate-200 shadow-sm transition"
        >
          <Download className="w-4 h-4 text-brand-600" />
          Export Comparison (CSV)
        </a>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white/80 backdrop-blur-md border border-slate-200/80 rounded-2xl p-5 shadow-sm">
          <span className="text-[11px] font-semibold uppercase text-slate-500">Total Requirements Audited</span>
          <div className="text-2xl font-black text-slate-900 mt-2">{allRows.length}</div>
          <p className="text-[11px] text-slate-500 mt-1">Dynamic Evaluation Benchmark</p>
        </div>

        <div className="bg-white/80 backdrop-blur-md border border-slate-200/80 rounded-2xl p-5 shadow-sm">
          <span className="text-[11px] font-semibold uppercase text-slate-500">GenAI / Python Match Rate</span>
          <div className="text-2xl font-black text-brand-600 mt-2">{overallRate}%</div>
          <p className="text-[11px] text-slate-500 mt-1">{totalMatches} of {allRows.length} Requirements Matched</p>
        </div>

        <div className="bg-white/80 backdrop-blur-md border border-slate-200/80 rounded-2xl p-5 shadow-sm">
          <span className="text-[11px] font-semibold uppercase text-slate-500">Roles Evaluated</span>
          <div className="text-2xl font-black text-brand-600 mt-2">{roleReports.length} Roles</div>
          <p className="text-[11px] text-slate-500 mt-1">All Enterprise Departments Covered</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white/80 backdrop-blur-md border border-slate-200/80 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <select
            value={selectedRoleFilter}
            onChange={(e) => setSelectedRoleFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-brand-600 font-medium shadow-inner"
          >
            <option value="">All Job Roles ({roleReports.length})</option>
            {roleReports.map((r, i) => (
              <option key={i} value={r.role}>{r.role}</option>
            ))}
          </select>

          <select
            value={matchStatusFilter}
            onChange={(e) => setMatchStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-brand-600 font-medium shadow-inner"
          >
            <option value="">All Match Statuses</option>
            <option value="Match">Match</option>
            <option value="Mismatch (Missing in AI Plan)">Mismatch (Missing)</option>
          </select>
        </div>

        <div className="text-xs text-slate-600 font-medium">
          Showing <strong className="text-slate-900">{filteredRows.length}</strong> requirement comparison items
        </div>
      </div>

      {/* Side-by-Side Comparison Table */}
      <div className="bg-white/80 backdrop-blur-md border border-slate-200/80 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-500 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-4 py-3.5">Req Code & Role</th>
                <th className="px-4 py-3.5">Python Ground-Truth Expected</th>
                <th className="px-4 py-3.5">GenAI Pipeline Output</th>
                <th className="px-4 py-3.5">Match Status</th>
                <th className="px-4 py-3.5">Traceability</th>
                <th className="px-4 py-3.5">Explanation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-12 text-slate-500">
                    No comparison data available. Generate an onboarding plan to trigger comparison.
                  </td>
                </tr>
              ) : (
                filteredRows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/65 transition">
                    <td className="px-4 py-3.5 space-y-0.5">
                      <div className="font-mono font-bold text-brand-600">{row.req_code}</div>
                      <div className="font-semibold text-slate-900">{row.role}</div>
                    </td>
                    <td className="px-4 py-3.5 text-slate-800 max-w-xs font-medium">
                      {row.python_expected}
                    </td>
                    <td className="px-4 py-3.5 text-slate-600 max-w-xs">
                      {row.genai_result}
                    </td>
                    <td className="px-4 py-3.5">
                      {row.match_status === 'Match' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-brand-700 bg-brand-50 px-2 py-0.5 rounded border border-slate-200">
                          <CheckCircle2 className="w-3 h-3" /> MATCH
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-brand-700 bg-brand-50 px-2 py-0.5 rounded border border-slate-200">
                          <XCircle className="w-3 h-3" /> MISMATCH
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-brand-700 font-medium text-[11px]">{row.traceability_status}</span>
                    </td>
                    <td className="px-4 py-3.5 text-slate-500 text-[11px] max-w-xs">
                      {row.explanation}
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
