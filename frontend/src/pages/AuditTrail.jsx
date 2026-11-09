import React, { useEffect, useState } from 'react';
import { promptService } from '../services/api';
import { History, Search, Shield, User, Clock } from 'lucide-react';

export const AuditTrail = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        setLoading(true);
        const res = await promptService.getAuditTrail();
        setLogs(res.data.audit_trail || []);
      } catch (err) {
        console.error('Failed to load audit trail:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, []);

  const filteredLogs = logs.filter((log) => {
    const s = searchTerm.toLowerCase();
    return (
      log.action_type?.toLowerCase().includes(s) ||
      log.entity_type?.toLowerCase().includes(s) ||
      log.username?.toLowerCase().includes(s)
    );
  });

  return (
    <div className="space-y-6 animate-fadeIn max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-950 tracking-tight flex items-center gap-2.5">
            <History className="w-5 h-5 text-brand-600" />
            Immutable System Audit Trail
          </h1>
          <p className="text-xs text-slate-600 mt-1">
            Complete traceability of user logins, document uploads, reviewer overrides, and curriculum regenerations
          </p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white/80 backdrop-blur-md border border-slate-200/80 rounded-2xl p-4 shadow-sm">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600" />
          <input
            type="text"
            placeholder="Search audit trail by Action, User or Entity..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-brand-600 shadow-inner"
          />
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white/80 backdrop-blur-md border border-slate-200/80 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-500 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-5 py-3.5">Timestamp</th>
                <th className="px-5 py-3.5">Action Type</th>
                <th className="px-5 py-3.5">Entity</th>
                <th className="px-5 py-3.5">User</th>
                <th className="px-5 py-3.5">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="5" className="text-center py-12 text-slate-500">
                    Loading audit trail...
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan="5" className="text-center py-12 text-slate-500">
                    No audit records found.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/65 transition">
                    <td className="px-5 py-3.5 text-slate-500 text-[11px] whitespace-nowrap">
                      {log.timestamp}
                    </td>
                    <td className="px-5 py-3.5 font-mono font-bold text-brand-600">
                      {log.action_type}
                    </td>
                    <td className="px-5 py-3.5 text-slate-700 capitalize">
                      {log.entity_type} #{log.entity_id}
                    </td>
                    <td className="px-5 py-3.5 font-semibold text-slate-900">
                      {log.username || 'system'}
                    </td>
                    <td className="px-5 py-3.5 font-mono text-[10px] text-slate-500 max-w-xs truncate">
                      {log.details_json}
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
