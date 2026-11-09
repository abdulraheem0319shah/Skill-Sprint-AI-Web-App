import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { reviewService } from '../services/api';
import { StatusBadge } from '../components/StatusBadge';
import {
  Inbox,
  CheckCircle2,
  XCircle,
  Edit3,
  RefreshCw,
  AlertTriangle,
  ShieldAlert,
  MessageSquare,
  Sparkles
} from 'lucide-react';

export const HumanReviewQueue = () => {
  const { currentUser } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReview, setSelectedReview] = useState(null);
  const [actionType, setActionType] = useState('approve'); // approve | reject | edit | override
  const [overrideReason, setOverrideReason] = useState('');
  const [comment, setComment] = useState('');
  const [processing, setProcessing] = useState(false);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const res = await reviewService.getAll();
      setReviews(res.data.reviews || []);
    } catch (err) {
      console.error('Failed to load review queue:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  const handleTakeAction = async (e) => {
    e.preventDefault();
    if (!selectedReview) return;

    try {
      setProcessing(true);
      await reviewService.takeAction(selectedReview.id, {
        review_id: selectedReview.id,
        action: actionType,
        reviewer_username: currentUser?.username || 'reviewer',
        override_reason: overrideReason,
        comment: comment
      });

      setSelectedReview(null);
      setOverrideReason('');
      setComment('');
      fetchReviews();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to submit review action');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-950 tracking-tight flex items-center gap-2.5">
            <Inbox className="w-5 h-5 text-brand-600" />
            Human Review Queue & Approval Workflow
          </h1>
          <p className="text-xs text-slate-600 mt-1">
            Review flagged plans, evaluate security warnings, and log authorized reviewer overrides with full auditability
          </p>
        </div>
      </div>

      {/* Reviews Table */}
      <div className="bg-white/80 backdrop-blur-md border border-slate-200/80 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-500 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-5 py-3.5">Review Code</th>
                <th className="px-5 py-3.5">Employee & Role</th>
                <th className="px-5 py-3.5">Risk Level</th>
                <th className="px-5 py-3.5">Flag Reason</th>
                <th className="px-5 py-3.5">Source Reference</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="7" className="text-center py-12 text-slate-500">
                    Loading review queue...
                  </td>
                </tr>
              ) : reviews.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-12 text-slate-500">
                    No pending items in the review queue.
                  </td>
                </tr>
              ) : (
                reviews.map((rev) => (
                  <tr key={rev.id} className="hover:bg-slate-50/65 transition">
                    <td className="px-5 py-3.5 font-mono font-bold text-brand-600">
                      {rev.review_code}
                    </td>
                    <td className="px-5 py-3.5 space-y-0.5">
                      <div className="font-bold text-slate-900">{rev.employee_name}</div>
                      <div className="text-[11px] text-slate-600">{rev.role_name}</div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        rev.risk_flag === 'high' || rev.risk_flag === 'critical'
                          ? 'bg-brand-50 text-brand-700 border border-slate-200'
                          : 'bg-brand-50 text-brand-700 border border-slate-200'
                      }`}>
                        {rev.risk_flag}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-slate-800 max-w-xs font-medium">
                      {rev.flag_reason}
                    </td>
                    <td className="px-5 py-3.5 text-brand-700 font-mono text-[11px]">
                      {rev.source_reference}
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={rev.status} />
                    </td>
                    <td className="px-5 py-3.5 text-right space-x-2">
                      <button
                        onClick={() => {
                          setSelectedReview(rev);
                          setActionType('approve');
                        }}
                        className="px-3 py-1.5 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-xs font-semibold transition shadow-sm"
                      >
                        Review
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Action Modal */}
      {selectedReview && (
        <div className="fixed inset-0 z-50 bg-slate-50/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xl max-w-lg w-full p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Review & Decision: {selectedReview.review_code}
                </h3>
                <p className="text-xs text-slate-500">
                  {selectedReview.employee_name} ({selectedReview.role_name})
                </p>
              </div>
              <button
                onClick={() => setSelectedReview(null)}
                className="text-slate-600 hover:text-slate-700 text-xs font-bold"
              >
                Close
              </button>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-xs">
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-semibold block">Flag Reason</span>
                <p className="text-brand-800 font-medium">{selectedReview.flag_reason}</p>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-semibold block">Content Snippet</span>
                <p className="text-slate-700 font-mono">{selectedReview.ai_content_preview}</p>
              </div>
            </div>

            <form onSubmit={handleTakeAction} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Decision Action</label>
                <div className="grid grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => setActionType('approve')}
                    className={`py-2 text-xs font-semibold rounded-lg border transition ${
                      actionType === 'approve'
                        ? 'bg-brand-600 border-brand-500 text-white'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => setActionType('override')}
                    className={`py-2 text-xs font-semibold rounded-lg border transition ${
                      actionType === 'override'
                        ? 'bg-brand-600 border-brand-500 text-white'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    Override
                  </button>
                  <button
                    type="button"
                    onClick={() => setActionType('edit')}
                    className={`py-2 text-xs font-semibold rounded-lg border transition ${
                      actionType === 'edit'
                        ? 'bg-brand-600 border-brand-500 text-white'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => setActionType('reject')}
                    className={`py-2 text-xs font-semibold rounded-lg border transition ${
                      actionType === 'reject'
                        ? 'bg-brand-600 border-brand-500 text-white'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    Reject
                  </button>
                </div>
              </div>

              {actionType === 'override' && (
                <div>
                  <label className="block text-xs font-semibold text-brand-700 mb-1">
                    Mandatory Reviewer Override Rationale (Logged in Audit Trail)
                  </label>
                  <textarea
                    rows="2"
                    required
                    placeholder="Provide detailed justification for overriding policy warning..."
                    value={overrideReason}
                    onChange={(e) => setOverrideReason(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-brand-500 shadow-inner"
                  ></textarea>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Reviewer Note / Comment</label>
                <input
                  type="text"
                  placeholder="Optional review feedback..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-brand-600 shadow-inner"
                />
              </div>

              <button
                type="submit"
                disabled={processing}
                className="w-full py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-bold transition shadow-md shadow-brand-600/20"
              >
                {processing ? 'Logging Decision & Updating Plan...' : 'Confirm Decision & Log Audit Record'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
