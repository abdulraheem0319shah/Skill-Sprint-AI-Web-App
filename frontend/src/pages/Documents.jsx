import React, { useEffect, useState } from 'react';
import { documentService } from '../services/api';
import { StatusBadge } from '../components/StatusBadge';
import { Link } from 'react-router-dom';
import {
  Files,
  UploadCloud,
  Search,
  Filter,
  Trash2,
  Eye,
  ShieldAlert,
  FileCheck,
  AlertTriangle,
  Layers,
  Sparkles,
  CheckCircle2
} from 'lucide-react';

export const Documents = () => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Upload Modal State
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [customCategory, setCustomCategory] = useState('Policy');
  const [customVersion, setCustomVersion] = useState('1.0');
  const [uploading, setUploading] = useState(false);
  const [uploadFeedback, setUploadFeedback] = useState(null);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const params = {};
      if (categoryFilter) params.category = categoryFilter;
      if (statusFilter) params.status = statusFilter;
      const res = await documentService.getAll(params);
      setDocuments(res.data.documents || []);
    } catch (err) {
      console.error('Failed to load documents:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [categoryFilter, statusFilter]);

  const handleFileUpload = async (e) => {
    e.preventDefault();
    if (!selectedFile) return;

    try {
      setUploading(true);
      setUploadFeedback(null);
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('category', customCategory);
      formData.append('version', customVersion);

      const res = await documentService.upload(formData);
      setUploadFeedback(res.data);
      fetchDocuments();
      setSelectedFile(null);
    } catch (err) {
      setUploadFeedback({
        error: err.response?.data?.detail || 'Document processing failed.',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this document and all its chunks?')) return;
    try {
      await documentService.delete(id);
      fetchDocuments();
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  const handleStatusToggle = async (doc) => {
    const nextStatus = doc.status === 'active' ? 'obsolete' : 'active';
    try {
      await documentService.updateStatus(doc.id, nextStatus);
      fetchDocuments();
    } catch (err) {
      console.error('Status toggle error:', err);
    }
  };

  const filteredDocs = documents.filter((doc) => {
    const matchesSearch =
      doc.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.doc_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.file_name?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="space-y-6 animate-fadeIn bg-white rounded-2xl p-2">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Files className="w-5 h-5 text-brand-600" />
            Company Knowledge Sources & Document Repository
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage policies, SOPs, FAQs, and adversarial test documents with chunk traceability
          </p>
        </div>
        <button
          onClick={() => {
            setShowUploadModal(true);
            setUploadFeedback(null);
          }}
          className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-lg shadow-brand-600/20 transition"
        >
          <UploadCloud className="w-4 h-4" />
          Upload Document (PDF, DOCX, TXT)
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="border border-slate-200 bg-white p-4 rounded-xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600" />
          <input
            type="text"
            placeholder="Search by Document ID, Title or File Name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-500 focus:outline-none focus:border-brand-500"
          />
        </div>

        <div className="flex items-center gap-3">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:border-brand-500"
          >
            <option value="">All Categories</option>
            <option value="Policy">Policies</option>
            <option value="SOP">Department SOPs</option>
            <option value="Handbook">Handbooks</option>
            <option value="Role">Role</option>
            <option value="Employee Process">Employee Process</option>
            <option value="FAQ">FAQs</option>
            <option value="Compliance">Compliance</option>
            <option value="Adversarial">Adversarial Test Files</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:border-brand-500"
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="obsolete">Obsolete</option>
            <option value="quarantined">Quarantined</option>
          </select>
        </div>
      </div>

      {/* Documents Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-500 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-5 py-3.5">Doc ID</th>
                <th className="px-5 py-3.5">Title & Category</th>
                <th className="px-5 py-3.5">Version</th>
                <th className="px-5 py-3.5">Type & Size</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan="6" className="text-center py-12 text-slate-500">
                    Loading company knowledge sources...
                  </td>
                </tr>
              ) : filteredDocs.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-12 text-slate-500">
                    No documents matching selected filter criteria.
                  </td>
                </tr>
              ) : (
                filteredDocs.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-50 transition">
                    <td className="px-5 py-3.5 font-mono font-bold text-brand-600">
                      {doc.doc_code}
                    </td>
                    <td className="px-5 py-3.5 space-y-0.5">
                      <div className="font-bold text-slate-900">{doc.title}</div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-2">
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                          {doc.category}
                        </span>
                        <span>{doc.file_name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 font-semibold text-slate-700">
                      v{doc.version}
                    </td>
                    <td className="px-5 py-3.5 text-slate-500 uppercase">
                      {doc.file_type} • {Math.round((doc.file_size || 0) / 1024)} KB
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={doc.status} />
                    </td>
                    <td className="px-5 py-3.5 text-right space-x-2">
                      <Link
                        to={`/documents/${doc.id}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-brand-600 text-slate-700 hover:text-white transition font-medium"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Inspect
                      </Link>
                      <button
                        onClick={() => handleStatusToggle(doc)}
                        title="Toggle Active/Obsolete"
                        className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition text-[11px]"
                      >
                        {doc.status === 'active' ? 'Archive' : 'Activate'}
                      </button>
                      <button
                        onClick={() => handleDelete(doc.id)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-slate-9000 hover:bg-brand-50 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Upload Document Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 bg-white/20 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-lg w-full p-6 space-y-5 bg-white border border-slate-200 rounded-xl shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <UploadCloud className="w-4 h-4 text-brand-600" />
                Upload New Company Document
              </h3>
              <button
                onClick={() => setShowUploadModal(false)}
                className="text-slate-500 hover:text-slate-800 text-xs font-bold"
              >
                Close
              </button>
            </div>

            {uploadFeedback && (
              <div
                className={`p-3.5 rounded-xl border text-xs space-y-1 ${
                  uploadFeedback.error
                    ? 'bg-brand-50 border-slate-200 text-brand-700'
                    : 'bg-brand-50 border-slate-200 text-brand-700'
                }`}
              >
                <div className="font-bold">
                  {uploadFeedback.error ? 'Validation Failed' : 'Document Ingested Successfully'}
                </div>
                <div>{uploadFeedback.error || uploadFeedback.message}</div>
                {uploadFeedback.adversarial_threats_detected > 0 && (
                  <div className="text-brand-600 font-bold mt-1">
                    ⚠️ {uploadFeedback.adversarial_threats_detected} adversarial injection pattern(s) detected. Document quarantined.
                  </div>
                )}
              </div>
            )}

            <form onSubmit={handleFileUpload} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Select File (PDF, DOCX, TXT, MD, CSV)
                </label>
                <input
                  type="file"
                  required
                  accept=".pdf,.docx,.txt,.md,.csv"
                  onChange={(e) => setSelectedFile(e.target.files[0])}
                  className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-brand-600 file:text-white hover:file:bg-brand-500 cursor-pointer bg-slate-50 p-2 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Category</label>
                  <select
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:border-brand-500"
                  >
                    <option value="Policy">Policy</option>
                    <option value="SOP">SOP</option>
                    <option value="Handbook">Handbook</option>
                    <option value="Role">Role</option>
                    <option value="Employee Process">Employee Process</option>
                    <option value="FAQ">FAQ</option>
                    <option value="Compliance">Compliance</option>
                    <option value="Adversarial">Adversarial Test</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Version</label>
                  <input
                    type="text"
                    value={customVersion}
                    onChange={(e) => setCustomVersion(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={uploading || !selectedFile}
                className="w-full py-2.5 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-brand-600/30"
              >
                {uploading ? 'Parsing, Chunking & Validating...' : 'Upload and Ingest Document'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
