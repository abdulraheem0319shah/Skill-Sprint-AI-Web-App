import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { matrixService, roleService } from '../services/api';
import {
  Grid3X3,
  Search,
  Plus,
  Trash2,
  Edit2
} from 'lucide-react';

export const RoleRequirementMatrix = () => {
  const [searchParams] = useSearchParams();
  const initialRole = searchParams.get('role') || '';

  const [matrix, setMatrix] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRole, setSelectedRole] = useState(initialRole);
  const [selectedStage, setSelectedStage] = useState('');
  const [mandatoryFilter, setMandatoryFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Add/Edit Modal
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    req_code: '',
    role_name: '',
    policy_requirement: '',
    competency: '',
    is_mandatory: true,
    priority: 'High',
    source_doc_code: '',
    source_section: '',
    due_stage: 'Day 1',
    assessment_topic: ''
  });

  const fetchRolesAndMatrix = async () => {
    try {
      setLoading(true);
      const [rRes, mRes] = await Promise.all([
        roleService.getAll(),
        matrixService.getMatrix({
          role_name: selectedRole || undefined,
          due_stage: selectedStage || undefined,
          is_mandatory: mandatoryFilter !== '' ? parseInt(mandatoryFilter) : undefined
        })
      ]);
      setRoles(rRes.data.roles || []);
      setMatrix(mRes.data.matrix || []);
    } catch (err) {
      console.error('Failed to load matrix data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRolesAndMatrix();
  }, [selectedRole, selectedStage, mandatoryFilter]);

  const handleOpenAdd = () => {
    setEditingItem(null);
    setFormData({
      req_code: `REQ-${Math.floor(1000 + Math.random() * 9000)}`,
      role_name: selectedRole || (roles[0]?.role_name || ''),
      policy_requirement: '',
      competency: '',
      is_mandatory: true,
      priority: 'High',
      source_doc_code: '',
      source_section: 'Section 1',
      due_stage: 'Day 1',
      assessment_topic: ''
    });
    setShowModal(true);
  };

  const handleSaveRequirement = async (e) => {
    e.preventDefault();
    try {
      if (editingItem) {
        await matrixService.updateRequirement(editingItem.id, formData);
      } else {
        await matrixService.addRequirement(formData);
      }
      setShowModal(false);
      fetchRolesAndMatrix();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to save requirement');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this matrix requirement?')) return;
    try {
      await matrixService.deleteRequirement(id);
      fetchRolesAndMatrix();
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  const filteredMatrix = matrix.filter((item) => {
    const s = searchTerm.toLowerCase();
    return (
      item.req_code?.toLowerCase().includes(s) ||
      item.policy_requirement?.toLowerCase().includes(s) ||
      item.competency?.toLowerCase().includes(s) ||
      item.source_doc_code?.toLowerCase().includes(s)
    );
  });

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Grid3X3 className="w-5 h-5 text-brand-600" />
            Ground-Truth Role Requirement Matrix
          </h1>
          <p className="text-xs text-slate-600 mt-1">
            Official benchmark mapping roles to mandatory/optional competencies and source documents
          </p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-lg shadow-brand-600/20 transition"
        >
          <Plus className="w-4 h-4" />
          Add Matrix Requirement
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white/80 backdrop-blur-md border border-slate-200/80 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600" />
          <input
            type="text"
            placeholder="Search requirement, competency or source code..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-brand-600 shadow-inner"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-brand-600 font-medium shadow-inner"
          >
            <option value="">All Job Roles</option>
            {roles.map((r) => (
              <option key={r.id} value={r.role_name}>{r.role_name}</option>
            ))}
          </select>

          <select
            value={selectedStage}
            onChange={(e) => setSelectedStage(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-brand-600 shadow-inner"
          >
            <option value="">All Stages</option>
            <option value="Day 1">Day 1</option>
            <option value="Week 1">Week 1</option>
            <option value="Week 2">Week 2</option>
            <option value="First 30 Days">First 30 Days</option>
            <option value="60 Days">60 Days</option>
            <option value="90 Days">90 Days</option>
          </select>

          <select
            value={mandatoryFilter}
            onChange={(e) => setMandatoryFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-brand-600 shadow-inner"
          >
            <option value="">All Types</option>
            <option value="1">Mandatory Only</option>
            <option value="0">Optional Only</option>
          </select>
        </div>
      </div>

      {/* Matrix Table */}
      <div className="bg-white/80 backdrop-blur-md overflow-hidden border border-slate-200/80 rounded-2xl shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-white text-slate-500 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-5 py-3.5">Req Code</th>
                <th className="px-5 py-3.5">Job Role</th>
                <th className="px-5 py-3.5">Policy Requirement</th>
                <th className="px-5 py-3.5">Competency Area</th>
                <th className="px-5 py-3.5">Type & Priority</th>
                <th className="px-5 py-3.5">Due Stage</th>
                <th className="px-5 py-3.5">Source Doc</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="8" className="text-center py-12 text-slate-500">
                    Loading matrix requirements...
                  </td>
                </tr>
              ) : filteredMatrix.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-12 text-slate-500">
                    No matrix requirements found. Upload a document or add requirements to get started.
                  </td>
                </tr>
              ) : (
                filteredMatrix.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition">
                    <td className="px-5 py-3.5 font-mono font-bold text-brand-600">
                      {item.req_code}
                    </td>
                    <td className="px-5 py-3.5 font-bold text-slate-900">
                      {item.role_name}
                    </td>
                    <td className="px-5 py-3.5 text-slate-800 max-w-xs leading-relaxed font-medium">
                      {item.policy_requirement}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 text-[10px] shadow-inner">
                        {item.competency}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 space-y-1">
                      <div>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          item.is_mandatory ? 'bg-brand-50 text-brand-700 border border-slate-200' : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}>
                          {item.is_mandatory ? 'MANDATORY' : 'OPTIONAL'}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-500 font-semibold">{item.priority} Priority</div>
                    </td>
                    <td className="px-5 py-3.5 font-semibold text-brand-600">
                      {item.due_stage}
                    </td>
                    <td className="px-5 py-3.5 text-slate-600 font-mono text-[11px]">
                      <div>{item.source_doc_code}</div>
                      <div className="text-[10px] text-slate-600">{item.source_section}</div>
                    </td>
                    <td className="px-5 py-3.5 text-right space-x-2">
                      <button
                        onClick={() => {
                          setEditingItem(item);
                          setFormData({ ...item, is_mandatory: Boolean(item.is_mandatory) });
                          setShowModal(true);
                        }}
                        className="p-1.5 rounded-lg text-slate-600 hover:text-brand-600 hover:bg-slate-100 transition"
                        title="Edit Requirement"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="p-1.5 rounded-lg text-slate-600 hover:text-brand-600 hover:bg-brand-50 transition"
                        title="Delete Requirement"
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

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-50/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">
                {editingItem ? 'Edit Ground-Truth Requirement' : 'Add Ground-Truth Matrix Item'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-600 hover:text-slate-700 text-xs font-bold"
              >
                Close
              </button>
            </div>

            <form onSubmit={handleSaveRequirement} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Requirement Code</label>
                  <input
                    type="text"
                    required
                    value={formData.req_code}
                    onChange={(e) => setFormData({ ...formData, req_code: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-brand-600 font-mono shadow-inner"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Role Name</label>
                  <select
                    value={formData.role_name}
                    onChange={(e) => setFormData({ ...formData, role_name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-brand-600 shadow-inner"
                  >
                    {roles.map((r) => (
                      <option key={r.id} value={r.role_name}>{r.role_name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Policy / Task Requirement</label>
                <textarea
                  rows="2"
                  required
                  placeholder="e.g. Health & Safety Fire Evacuation SOP Assembly Point"
                  value={formData.policy_requirement}
                  onChange={(e) => setFormData({ ...formData, policy_requirement: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-brand-600 shadow-inner"
                ></textarea>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Competency Area</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Workplace Safety & Emergency"
                    value={formData.competency}
                    onChange={(e) => setFormData({ ...formData, competency: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-brand-600 shadow-inner"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Due Stage</label>
                  <select
                    value={formData.due_stage}
                    onChange={(e) => setFormData({ ...formData, due_stage: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-brand-600 shadow-inner"
                  >
                    <option value="Day 1">Day 1</option>
                    <option value="Week 1">Week 1</option>
                    <option value="Week 2">Week 2</option>
                    <option value="First 30 Days">First 30 Days</option>
                    <option value="60 Days">60 Days</option>
                    <option value="90 Days">90 Days</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Source Document Code</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. DOC-POL-001"
                    value={formData.source_doc_code}
                    onChange={(e) => setFormData({ ...formData, source_doc_code: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-brand-600 font-mono shadow-inner"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Source Section</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Section 2.1"
                    value={formData.source_section}
                    onChange={(e) => setFormData({ ...formData, source_section: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-brand-600 shadow-inner"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 items-center">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Priority</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-brand-600 shadow-inner"
                  >
                    <option value="Critical">Critical</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
                <div className="flex items-center gap-2 mt-4">
                  <input
                    type="checkbox"
                    id="is_mandatory"
                    checked={formData.is_mandatory}
                    onChange={(e) => setFormData({ ...formData, is_mandatory: e.target.checked })}
                    className="rounded bg-slate-50 border-slate-300 text-brand-600 focus:ring-0 cursor-pointer"
                  />
                  <label htmlFor="is_mandatory" className="text-xs font-semibold text-slate-700 cursor-pointer">
                    Mandatory Requirement
                  </label>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-brand-600/30"
              >
                {editingItem ? 'Update Matrix Requirement' : 'Save Requirement to Matrix'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
