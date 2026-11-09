import React, { useEffect, useState } from 'react';
import { reportService } from '../services/api';
import {
  BarChart3,
  Download,
  FileSpreadsheet
} from 'lucide-react';

export const Reports = () => {
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReports = async () => {
      try {
        setLoading(true);
        const res = await reportService.getSummary();
        setReportData(res.data);
      } catch (err) {
        console.error('Failed to load reports:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchReports();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-brand-600 font-medium text-xs animate-pulse">
          Aggregating enterprise analytics and audit logs...
        </div>
      </div>
    );
  }

  const roleReports = reportData?.role_coverage_report || [];
  const security = reportData?.security_and_hallucinations || {};

  return (
    <div className="space-y-6 animate-fadeIn max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-950 tracking-tight flex items-center gap-2.5">
            <BarChart3 className="w-5 h-5 text-brand-600" />
            Executive Reports & Compliance Analytics
          </h1>
          <p className="text-xs text-slate-600 mt-1">
            Mandatory policy compliance rates, traceability scores, and hallucination metrics
          </p>
        </div>

        <div className="flex items-center gap-3">
          <a
            href={reportService.exportCsvUrl}
            download
            className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-sm transition"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </a>
          <a
            href={reportService.exportJsonUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold px-4 py-2.5 rounded-xl border border-slate-200 transition shadow-sm"
          >
            <FileSpreadsheet className="w-4 h-4 text-brand-600" />
            JSON Report
          </a>
        </div>
      </div>

      {/* Security & Hallucination Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white/80 backdrop-blur-md border border-slate-200/80 rounded-2xl p-5 shadow-sm">
          <span className="text-[11px] font-semibold uppercase text-slate-500">Total Flagged Items</span>
          <div className="text-2xl font-black text-brand-600 mt-2">{security.total_flagged_items || 0}</div>
          <p className="text-[11px] text-slate-500 mt-1">Adversarial & contradiction scans</p>
        </div>

        <div className="bg-white/80 backdrop-blur-md border border-slate-200/80 rounded-2xl p-5 shadow-sm">
          <span className="text-[11px] font-semibold uppercase text-slate-500">High-Risk Threats</span>
          <div className="text-2xl font-black text-brand-600 mt-2">{security.high_risk_threats || 0}</div>
          <p className="text-[11px] text-slate-500 mt-1">Quarantined from GenAI context</p>
        </div>

        <div className="bg-white/80 backdrop-blur-md border border-slate-200/80 rounded-2xl p-5 shadow-sm">
          <span className="text-[11px] font-semibold uppercase text-slate-500">Resolved Human Reviews</span>
          <div className="text-2xl font-black text-brand-600 mt-2">{security.resolved_reviews || 0}</div>
          <p className="text-[11px] text-slate-500 mt-1">Authorized & approved rollouts</p>
        </div>
      </div>

      {/* Role Compliance Coverage Table */}
      <div className="bg-white/80 backdrop-blur-md border border-slate-200/80 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-200">
          <h2 className="text-sm font-bold text-slate-900">Role-Level Mandatory Policy Coverage Audit</h2>
          <p className="text-xs text-slate-600">Ground-truth compliance averages across job roles</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-500 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-5 py-3.5">Job Role</th>
                <th className="px-5 py-3.5">Mandatory Matrix Requirements</th>
                <th className="px-5 py-3.5">Avg Mandatory Coverage</th>
                <th className="px-5 py-3.5">Avg Source Traceability</th>
                <th className="px-5 py-3.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {roleReports.length === 0 ? (
                <tr>
                  <td colSpan="5" className="text-center py-12 text-slate-500">
                    No report data available. Create roles and generate plans to view compliance analytics.
                  </td>
                </tr>
              ) : (
                roleReports.map((r, i) => (
                  <tr key={i} className="hover:bg-slate-50/65 transition">
                    <td className="px-5 py-3.5 font-bold text-slate-900">{r.role_name}</td>
                    <td className="px-5 py-3.5 font-semibold text-slate-700">{r.mandatory_requirements} Items</td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-slate-100 border border-slate-200 rounded-full h-2 overflow-hidden shadow-inner">
                          <div
                            className="bg-brand-600 h-2 rounded-full"
                            style={{ width: `${r.average_coverage}%` }}
                          ></div>
                        </div>
                        <span className="font-bold text-brand-600">{r.average_coverage}%</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 font-bold text-brand-700">{r.average_traceability}%</td>
                    <td className="px-5 py-3.5">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-brand-50 text-brand-700 border border-slate-200">
                        {r.average_coverage >= 80 ? 'COMPLIANT' : 'NEEDS ATTENTION'}
                      </span>
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
