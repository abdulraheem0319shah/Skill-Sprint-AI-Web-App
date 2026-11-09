import React, { useEffect, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, BriefcaseBusiness, GraduationCap, LockKeyhole, ShieldCheck, UserRound, UserCheck, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/api';
import logo from '../assets/logo.png';

const portals = {
  admin: { title: 'Administrator sign in', description: 'Secure access for system administrators.', icon: ShieldCheck },
  manager: { title: 'Manager sign in', description: 'Access onboarding and team management tools.', icon: Users },
  reviewer: { title: 'Reviewer sign in', description: 'Access assigned reviews and verification tools.', icon: UserCheck },
  employee: { title: 'Employee sign in', description: 'Continue to your personal onboarding journey.', icon: GraduationCap },
};

const portalHome = (role) => role === 'employee' ? '/employee' : '/';

const LoginCard = ({ portal, registeredEmail }) => {
  const { currentUser, login } = useAuth();
  const navigate = useNavigate();
  const config = portals[portal];
  const PortalIcon = config.icon;
  const [username, setUsername] = useState(registeredEmail || '');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (currentUser) return <Navigate to={portalHome(currentUser.role)} replace />;

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    const result = await login(username, password, portal);
    setLoading(false);

    if (result.success) {
      navigate(portalHome(result.user.role), { replace: true });
    } else {
      setError(result.error);
    }
  };

  return (
    <section className="glass-panel w-full max-w-md space-y-5 border border-slate-200/20 p-6 shadow-xl">
      <Link to="/login" className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-brand-600">
        <ArrowLeft className="h-4 w-4" /> All sign-in options
      </Link>
      <div className="flex items-center gap-3">
        <span className="rounded-xl bg-brand-50 p-3 text-brand-600"><PortalIcon className="h-5 w-5" /></span>
        <div>
          <h2 className="text-lg font-bold text-slate-900">{config.title}</h2>
          <p className="text-xs text-slate-500">{config.description}</p>
        </div>
      </div>

      {registeredEmail && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-medium text-emerald-800">
          Account created successfully. Sign in with your new account.
        </div>
      )}
      {error && (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block text-xs font-semibold text-slate-600">
          {portal === 'employee' ? 'Email address' : 'Username or email'}
          <span className="relative mt-1 block">
            <UserRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type={portal === 'employee' ? 'email' : 'text'}
              autoComplete="username"
              required
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-9 pr-4 text-sm text-slate-900 outline-none focus:border-brand-500"
            />
          </span>
        </label>
        <label className="block text-xs font-semibold text-slate-600">
          Password
          <span className="relative mt-1 block">
            <LockKeyhole className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-9 pr-4 text-sm text-slate-900 outline-none focus:border-brand-500"
            />
          </span>
        </label>
        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 py-3 text-sm font-bold text-white transition hover:bg-brand-700 disabled:cursor-wait disabled:opacity-60"
        >
          {loading ? 'Signing in...' : 'Sign in'} <ArrowRight className="h-4 w-4" />
        </button>
      </form>
      {portal === 'employee' && (
        <p className="text-center text-xs text-slate-600">
          New employee? <Link to="/register/employee" className="font-bold text-brand-600 hover:underline">Create your account</Link>
        </p>
      )}
    </section>
  );
};

const EmployeeRegistration = ({ onCreated }) => {
  const [roles, setRoles] = useState([]);
  const [rolesLoading, setRolesLoading] = useState(true);
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role_id: '',
    experience_level: 'Junior',
    location: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    authService.getEmployeeRoles()
      .then(({ data }) => {
        if (!active) return;
        setRoles(data.roles);
        if (data.roles.length) {
          setForm((current) => ({ ...current, role_id: String(data.roles[0].id) }));
        }
      })
      .catch((requestError) => {
        if (active) setError(requestError.response?.data?.detail || 'Could not load job roles.');
      })
      .finally(() => {
        if (active) setRolesLoading(false);
      });
    return () => { active = false; };
  }, []);

  const update = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await authService.registerEmployee({
        name: form.name,
        email: form.email,
        password: form.password,
        role_id: Number(form.role_id),
        experience_level: form.experience_level,
        location: form.location || 'Headquarters',
      });
      onCreated(form.email);
    } catch (requestError) {
      setError(requestError.response?.data?.detail || 'Account could not be created. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="glass-panel w-full max-w-lg space-y-5 border border-slate-200/20 p-6 shadow-xl">
      <Link to="/login/employee" className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-brand-600">
        <ArrowLeft className="h-4 w-4" /> Employee sign in
      </Link>
      <div>
        <h2 className="text-lg font-bold text-slate-900">Create employee account</h2>
        <p className="mt-1 text-xs text-slate-500">Your account and employee profile will be saved securely.</p>
      </div>
      {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700">{error}</div>}
      {!rolesLoading && roles.length === 0 && !error && (
        <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-semibold text-amber-800">
          No job roles are configured yet. Please contact an administrator.
        </div>
      )}
      <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
        <label className="text-xs font-semibold text-slate-600 sm:col-span-2">
          Full name
          <input required minLength="2" maxLength="120" autoComplete="name" value={form.name} onChange={update('name')} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-brand-500" />
        </label>
        <label className="text-xs font-semibold text-slate-600 sm:col-span-2">
          Work email
          <input type="email" required autoComplete="email" value={form.email} onChange={update('email')} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-brand-500" />
        </label>
        <label className="text-xs font-semibold text-slate-600">
          Job role
          <select required disabled={rolesLoading || roles.length === 0} value={form.role_id} onChange={update('role_id')} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-brand-500 disabled:bg-slate-100">
            {rolesLoading && <option value="">Loading job roles...</option>}
            {roles.map((role) => <option key={role.id} value={role.id}>{role.role_name}</option>)}
          </select>
        </label>
        <label className="text-xs font-semibold text-slate-600">
          Experience
          <select value={form.experience_level} onChange={update('experience_level')} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-brand-500">
            <option>Junior</option><option>Mid</option><option>Senior</option>
          </select>
        </label>
        <label className="text-xs font-semibold text-slate-600">
          Location
          <input maxLength="120" value={form.location} onChange={update('location')} placeholder="Headquarters" className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-brand-500" />
        </label>
        <label className="text-xs font-semibold text-slate-600">
          Password
          <input type="password" required minLength="8" maxLength="128" autoComplete="new-password" value={form.password} onChange={update('password')} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-brand-500" />
        </label>
        <label className="text-xs font-semibold text-slate-600 sm:col-span-2">
          Confirm password
          <input type="password" required minLength="8" maxLength="128" autoComplete="new-password" value={form.confirmPassword} onChange={update('confirmPassword')} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-brand-500" />
        </label>
        <button type="submit" disabled={loading || rolesLoading || roles.length === 0} className="flex items-center justify-center gap-2 rounded-xl bg-brand-600 py-3 text-sm font-bold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60 sm:col-span-2">
          {loading ? 'Creating account...' : 'Create account'} <ArrowRight className="h-4 w-4" />
        </button>
      </form>
    </section>
  );
};

export const Login = ({ mode }) => {
  const { portal } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [registeredEmail, setRegisteredEmail] = useState(location.state?.registeredEmail || '');

  if (portal && !portals[portal]) return <Navigate to="/login" replace />;
  if (currentUser) return <Navigate to={portalHome(currentUser.role)} replace />;

  const onCreated = (email) => {
    setRegisteredEmail(email);
    navigate('/login/employee', { replace: true, state: { registeredEmail: email } });
  };

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-slate-50 p-4">
      <div className="pointer-events-none absolute left-1/2 top-1/4 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-500/20 blur-3xl" />
      <div className="relative z-10 w-full max-w-2xl space-y-6">
        <header className="space-y-2 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-xl">
            <img src={logo} alt="SkillSprint logo" className="h-full w-full object-contain" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">SkillSprint AI</h1>
          <p className="text-xs text-slate-500">Choose your secure sign-in portal</p>
        </header>

        {mode === 'register' ? (
          <EmployeeRegistration onCreated={onCreated} />
        ) : portal ? (
          <LoginCard portal={portal} registeredEmail={portal === 'employee' ? registeredEmail : ''} />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <PortalLink to="/login/admin" icon={ShieldCheck} title="Admin" description="Administrator access" />
            <PortalLink to="/login/manager" icon={BriefcaseBusiness} title="Manager" description="Team and onboarding management" />
            <PortalLink to="/login/reviewer" icon={UserCheck} title="Reviewer" description="Review and verification queue" />
            <PortalLink to="/login/employee" icon={GraduationCap} title="Employee" description="Your training and onboarding" />
          </div>
        )}
      </div>
    </main>
  );
};

const PortalLink = ({ to, icon: Icon, title, description }) => (
  <Link to={to} className="group flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-lg">
    <span className="rounded-xl bg-brand-50 p-3 text-brand-600"><Icon className="h-5 w-5" /></span>
    <span className="flex-1">
      <span className="block text-sm font-bold text-slate-900">{title}</span>
      <span className="mt-1 block text-xs text-slate-500">{description}</span>
    </span>
    <ArrowRight className="h-4 w-4 text-slate-400 transition group-hover:translate-x-1 group-hover:text-brand-600" />
  </Link>
);
