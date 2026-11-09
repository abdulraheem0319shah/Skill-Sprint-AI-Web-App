import React, { useEffect, useState } from 'react';
import { employeeService, roleService } from '../services/api';
import { StatusBadge } from '../components/StatusBadge';
import { Link } from 'react-router-dom';
import {
  Users,
  Plus,
  Search,
  Eye,
  Trash2,
  Edit2
} from 'lucide-react';

export const Employees = () => {
  const [employees, setEmployees] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  // Add/Edit Employee Modal
  const [showModal, setShowModal] = useState(false);
  const [editingEmp, setEditingEmp] = useState(null);
  const [formData, setFormData] = useState({
    employee_code: '',
    name: '',
    email: '',
    role_id: 1,
    role_name: 'Software Support Engineer',
    department: 'Engineering & IT Support',
    experience_level: 'Junior',
    location: 'Karachi HQ',
    joining_date: new Date().toISOString().split('T')[0],
    reporting_manager: 'Senior Tech Lead'
  });

  const fetchEmployeesAndRoles = async () => {
    try {
      setLoading(true);
      const [eRes, rRes] = await Promise.all([
        employeeService.getAll(),
        roleService.getAll()
      ]);
      setEmployees(eRes.data.employees || []);
      setRoles(rRes.data.roles || []);
    } catch (err) {
      console.error('Failed to load employees:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployeesAndRoles();
  }, []);

  const handleOpenAdd = () => {
    setEditingEmp(null);
    setFormData({
      employee_code: `EMP-${Math.floor(100 + Math.random() * 900)}`,
      name: '',
      email: '',
      role_id: roles[0]?.id || 1,
      role_name: roles[0]?.role_name || 'Software Support Engineer',
      department: roles[0]?.department || 'Engineering & IT Support',
      experience_level: 'Junior',
      location: 'Karachi HQ',
      joining_date: new Date().toISOString().split('T')[0],
      reporting_manager: 'Senior Tech Lead'
    });
    setShowModal(true);
  };

  const handleOpenEdit = (emp) => {
    setEditingEmp(emp);
    setFormData({
      employee_code: emp.employee_code,
      name: emp.name,
      email: emp.email,
      role_id: emp.role_id,
      role_name: emp.role_name,
      department: emp.department,
      experience_level: emp.experience_level,
      location: emp.location,
      joining_date: emp.joining_date,
      reporting_manager: emp.reporting_manager || 'Senior Tech Lead',
      training_status: emp.training_status,
      plan_progress: emp.plan_progress
    });
    setShowModal(true);
  };

  const handleRoleSelect = (roleName) => {
    const selected = roles.find((r) => r.role_name === roleName);
    if (selected) {
      setFormData({
        ...formData,
        role_id: selected.id,
        role_name: selected.role_name,
        department: selected.department
      });
    }
  };

  const handleSaveEmployee = async (e) => {
    e.preventDefault();
    try {
      if (editingEmp) {
        await employeeService.update(editingEmp.id, formData);
      } else {
        await employeeService.create(formData);
      }
      setShowModal(false);
      fetchEmployeesAndRoles();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to save employee');
    }
  };

  const handleDeleteEmployee = async (id) => {
    if (!window.confirm('Are you sure you want to delete this employee?')) return;
    try {
      await employeeService.delete(id);
      fetchEmployeesAndRoles();
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  const filteredEmployees = employees.filter((emp) => {
    const s = searchTerm.toLowerCase();
    const matchesSearch =
      emp.name?.toLowerCase().includes(s) ||
      emp.employee_code?.toLowerCase().includes(s) ||
      emp.email?.toLowerCase().includes(s);
    const matchesRole = !roleFilter || emp.role_name === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-950 tracking-tight flex items-center gap-2.5">
            <Users className="w-5 h-5 text-brand-600" />
            Employee Onboarding Directory
          </h1>
          <p className="text-xs text-slate-600 mt-1">
            Track onboarding progress, generated curriculums, and role compliance across the workforce
          </p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-lg shadow-brand-600/20 transition"
        >
          <Plus className="w-4 h-4" />
          Enroll New Employee
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white/80 backdrop-blur-md border border-slate-200/80 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600" />
          <input
            type="text"
            placeholder="Search by Employee Name, Code or Email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-brand-600 shadow-inner"
          />
        </div>

        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-brand-600 font-medium shadow-inner"
        >
          <option value="">All Job Roles</option>
          {roles.map((r) => (
            <option key={r.id} value={r.role_name}>{r.role_name}</option>
          ))}
        </select>
      </div>

      {/* Employees Table */}
      <div className="bg-white/80 backdrop-blur-md overflow-hidden border border-slate-200/80 rounded-2xl shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-white text-slate-500 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-5 py-3.5">Code</th>
                <th className="px-5 py-3.5">Employee Name & Email</th>
                <th className="px-5 py-3.5">Role & Department</th>
                <th className="px-5 py-3.5">Experience & Location</th>
                <th className="px-5 py-3.5">Training Status</th>
                <th className="px-5 py-3.5">Progress</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="7" className="text-center py-12 text-slate-500">
                    Loading employees from database...
                  </td>
                </tr>
              ) : filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-12 text-slate-500">
                    No employees found. Enroll a new employee to get started.
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-slate-50 transition">
                    <td className="px-5 py-3.5 font-mono font-bold text-brand-600">
                      {emp.employee_code}
                    </td>
                    <td className="px-5 py-3.5 space-y-0.5">
                      <div className="font-bold text-slate-900">{emp.name}</div>
                      <div className="text-[11px] text-slate-500">{emp.email}</div>
                    </td>
                    <td className="px-5 py-3.5 space-y-0.5">
                      <div className="font-semibold text-slate-800">{emp.role_name}</div>
                      <div className="text-[11px] text-slate-500">{emp.department}</div>
                    </td>
                    <td className="px-5 py-3.5 text-slate-600 text-[11px]">
                      <div>{emp.experience_level} Level</div>
                      <div>{emp.location}</div>
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={emp.training_status} />
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="w-24 bg-slate-200 rounded-full h-2 overflow-hidden shadow-inner">
                        <div
                          className="bg-brand-600 h-2 rounded-full"
                          style={{ width: `${emp.plan_progress || 0}%` }}
                        ></div>
                      </div>
                      <span className="text-[10px] text-slate-500 mt-1 block">
                        {emp.plan_progress || 0}% Complete
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right space-x-2">
                      <Link
                        to={`/employees/${emp.id}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-brand-600 text-slate-700 hover:text-white transition font-medium border border-slate-200"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Profile
                      </Link>
                      <Link
                        to={`/generate?empId=${emp.id}`}
                        className="px-2.5 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white font-semibold transition text-[11px] shadow-md shadow-brand-600/20"
                      >
                        Generate Plan
                      </Link>
                      <button
                        onClick={() => handleOpenEdit(emp)}
                        className="p-1.5 rounded-lg text-slate-600 hover:text-brand-600 hover:bg-slate-100 transition"
                        title="Edit Employee"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteEmployee(emp.id)}
                        className="p-1.5 rounded-lg text-slate-600 hover:text-brand-600 hover:bg-brand-50 transition"
                        title="Delete Employee"
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

      {/* Add / Edit Employee Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-50/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">
                {editingEmp ? 'Edit Employee Details' : 'Enroll New Employee'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-600 hover:text-slate-700 text-xs font-bold"
              >
                Close
              </button>
            </div>

            <form onSubmit={handleSaveEmployee} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Employee Code</label>
                  <input
                    type="text"
                    required
                    value={formData.employee_code}
                    onChange={(e) => setFormData({ ...formData, employee_code: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-brand-600 font-mono shadow-inner"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sarah Jenkins"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-brand-600 shadow-inner"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Corporate Email</label>
                <input
                  type="email"
                  required
                  placeholder="sarah.jenkins@company.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-brand-600 shadow-inner"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Target Job Role</label>
                  <select
                    value={formData.role_name}
                    onChange={(e) => handleRoleSelect(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-brand-600 shadow-inner"
                  >
                    {roles.map((r) => (
                      <option key={r.id} value={r.role_name}>{r.role_name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Experience Level</label>
                  <select
                    value={formData.experience_level}
                    onChange={(e) => setFormData({ ...formData, experience_level: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-brand-600 shadow-inner"
                  >
                    <option value="Junior">Junior</option>
                    <option value="Mid">Mid-Level</option>
                    <option value="Senior">Senior</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Location</label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-brand-600 shadow-inner"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Joining Date</label>
                  <input
                    type="date"
                    value={formData.joining_date}
                    onChange={(e) => setFormData({ ...formData, joining_date: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-brand-600 shadow-inner"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-brand-600/30"
              >
                {editingEmp ? 'Update Employee Record' : 'Enroll Employee in System'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
