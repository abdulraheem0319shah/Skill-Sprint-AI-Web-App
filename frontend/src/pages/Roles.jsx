import React, { useEffect, useState } from 'react';
import { roleService } from '../services/api';
import {
  Briefcase,
  Plus,
  Layers,
  Edit2,
  Trash2
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const Roles = () => {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [formData, setFormData] = useState({
    role_code: '',
    role_name: '',
    department: '',
    description: '',
    clearance_level: 'Level 2 - Operations',
    conflict_precedence_rules: '',
    adversarial_protection: ''
  });

  const fetchRoles = async () => {
    try {
      setLoading(true);
      const res = await roleService.getAll();
      setRoles(res.data.roles || []);
    } catch (err) {
      console.error('Failed to load roles:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  const handleOpenAdd = () => {
    setEditingRole(null);
    setFormData({
      role_code: `ROLE-${Math.floor(10 + Math.random() * 90)}`,
      role_name: '',
      department: '',
      description: '',
      clearance_level: 'Level 2 - Operations',
      conflict_precedence_rules: 'Corporate Policy v2.0 takes precedence over SOPs and FAQs.',
      adversarial_protection: 'Standard Heuristic & Regex Injection Defense'
    });
    setShowModal(true);
  };

  const handleOpenEdit = (role) => {
    setEditingRole(role);
    setFormData({
      role_code: role.role_code,
      role_name: role.role_name,
      department: role.department,
      description: role.description || '',
      clearance_level: role.clearance_level || 'Level 2 - Operations',
      conflict_precedence_rules: role.conflict_precedence_rules || '',
      adversarial_protection: role.adversarial_protection || ''
    });
    setShowModal(true);
  };

  const handleSaveRole = async (e) => {
    e.preventDefault();
    try {
      if (editingRole) {
        await roleService.update(editingRole.id, formData);
      } else {
        await roleService.create(formData);
      }
      setShowModal(false);
      fetchRoles();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to save role');
    }
  };

  const handleDeleteRole = async (id) => {
    if (!window.confirm('Are you sure you want to delete this role and its requirement mappings?')) return;
    try {
      await roleService.delete(id);
      fetchRoles();
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Briefcase className="w-5 h-5 text-brand-600" />
            Standard Job Roles & Organizational Governance
          </h1>
          <p className="text-xs text-slate-600 mt-1">
            Configure clearance levels, policy precedence hierarchies, and ground-truth matrix mappings
          </p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-lg shadow-brand-600/20 transition"
        >
          <Plus className="w-4 h-4" />
          Add Job Role
        </button>
      </div>

      {/* Role Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loading ? (
          <div className="col-span-2 text-center py-12 text-slate-500 text-xs">
            Loading roles from database...
          </div>
        ) : roles.length === 0 ? (
          <div className="col-span-2 text-center py-12 text-slate-500 text-xs bg-white/50 border border-slate-200 rounded-2xl shadow-sm">
            No roles found. Create a new job role to establish governance.
          </div>
        ) : (
          roles.map((role) => (
            <div key={role.id} className="bg-white/80 backdrop-blur-md border border-slate-200/80 rounded-2xl p-5 space-y-3.5 shadow-sm hover:border-brand-300 transition">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] font-bold text-brand-600 bg-brand-50 px-2 py-0.5 rounded border border-slate-200">
                      {role.role_code}
                    </span>
                    <span className="text-xs font-bold text-slate-900">{role.role_name}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5 font-medium">{role.department}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-semibold px-2 py-1 rounded bg-white text-slate-500 shadow-inner">
                    {role.clearance_level || 'Standard'}
                  </span>
                  <button
                    onClick={() => handleOpenEdit(role)}
                    className="p-1 rounded text-slate-600 hover:text-brand-600 hover:bg-slate-100 transition"
                    title="Edit Role"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteRole(role.id)}
                    className="p-1 rounded text-slate-600 hover:text-brand-600 hover:bg-brand-50 transition"
                    title="Delete Role"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <p className="text-xs text-slate-700 line-clamp-2">{role.description}</p>

              <div className="space-y-1.5 pt-2 border-t border-slate-100 text-[11px]">
                <div className="text-slate-600">
                  <strong className="text-slate-900">Precedence Rule:</strong> {role.conflict_precedence_rules || 'Corporate Policy v2.0 takes precedence over SOPs and FAQs.'}
                </div>
                {role.adversarial_protection && (
                  <div className="text-slate-600">
                    <strong className="text-brand-600">Adversarial Defense:</strong> {role.adversarial_protection}
                  </div>
                )}
              </div>

              <div className="pt-2 flex items-center justify-between">
                <Link
                  to={`/matrix?role=${encodeURIComponent(role.role_name)}`}
                  className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1"
                >
                  <Layers className="w-3.5 h-3.5" /> View Requirement Matrix
                </Link>
                <Link
                  to={`/generate?role=${encodeURIComponent(role.role_name)}`}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-brand-600 text-slate-700 hover:text-white rounded-lg text-xs font-medium transition border border-slate-200 shadow-inner"
                >
                  Generate Plan
                </Link>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add / Edit Role Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-50/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">
                {editingRole ? 'Edit Enterprise Role' : 'Create New Enterprise Role'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-600 hover:text-slate-700 text-xs font-bold"
              >
                Close
              </button>
            </div>

            <form onSubmit={handleSaveRole} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Role Code</label>
                  <input
                    type="text"
                    required
                    placeholder="ROLE-011"
                    value={formData.role_code}
                    onChange={(e) => setFormData({ ...formData, role_code: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-brand-600 font-mono shadow-inner"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Role Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. AI Prompt Engineer"
                    value={formData.role_name}
                    onChange={(e) => setFormData({ ...formData, role_name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-brand-600 shadow-inner"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Department</label>
                <input
                  type="text"
                  required
                  placeholder="AI & Innovation Lab"
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-brand-600 shadow-inner"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
                <textarea
                  rows="2"
                  placeholder="Role responsibilities and core mission..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-brand-600 shadow-inner"
                ></textarea>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Conflict Precedence Rules</label>
                <input
                  type="text"
                  placeholder="e.g. Corporate Policy v2.0 takes precedence over SOPs and FAQs."
                  value={formData.conflict_precedence_rules}
                  onChange={(e) => setFormData({ ...formData, conflict_precedence_rules: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-brand-600 shadow-inner"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-brand-600/30"
              >
                {editingRole ? 'Update Role Definition' : 'Create Role & Register in Matrix'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
