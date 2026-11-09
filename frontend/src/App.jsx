import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';

// Pages
import { Login } from './pages/Login';
import { AdminDashboard } from './pages/AdminDashboard';
import { EmployeeDashboard } from './pages/EmployeeDashboard';
import { Documents } from './pages/Documents';
import { DocumentDetails } from './pages/DocumentDetails';
import { Employees } from './pages/Employees';
import { EmployeeDetails } from './pages/EmployeeDetails';
import { Roles } from './pages/Roles';
import { RoleRequirementMatrix } from './pages/RoleRequirementMatrix';
import { GeneratePlan } from './pages/GeneratePlan';
import { PlanDetails } from './pages/PlanDetails';
import { ValidationDashboard } from './pages/ValidationDashboard';
import { ComparisonResults } from './pages/ComparisonResults';
import { HumanReviewQueue } from './pages/HumanReviewQueue';
import { ApprovedPlans } from './pages/ApprovedPlans';
import { PolicyUpdates } from './pages/PolicyUpdates';
import { Reports } from './pages/Reports';
import { PromptTemplates } from './pages/PromptTemplates';
import { AuditTrail } from './pages/AuditTrail';
import { Settings } from './pages/Settings';

const Layout = ({ children }) => {
  const { currentUser } = useAuth();
  const { pathname } = useLocation();
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  const rolePages = {
    employee: ['/employee'],
    reviewer: ['/validation', '/comparison', '/reviews', '/approved-plans', '/reports', '/audit'],
    training_manager: ['/documents', '/roles', '/matrix', '/employees', '/generate', '/plans', '/validation', '/reviews', '/approved-plans', '/policy-updates', '/reports'],
  };
  const allowedPages = rolePages[currentUser.role];
  if (allowedPages && pathname !== '/' && !allowedPages.some((page) => pathname.startsWith(page))) {
    return <Navigate to={currentUser.role === 'employee' ? '/employee' : currentUser.role === 'reviewer' ? '/reviews' : '/'} replace />;
  }
  if (currentUser.role === 'employee' && pathname === '/') {
    return <Navigate to="/employee" replace />;
  }
  if (currentUser.role !== 'employee' && pathname.startsWith('/employee')) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-100 text-slate-800 selection:bg-brand-500 selection:text-white">
      <Navbar />
      <div className="flex flex-1 overflow-hidden pt-20">
        <Sidebar />
        <main className="flex-1 p-6 md:p-8 overflow-y-auto bg-white">
          {children}
        </main>
      </div>
    </div>
  );
};

export const App = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/login/:portal" element={<Login />} />
          <Route path="/register/employee" element={<Login mode="register" />} />

          {/* Protected Routes inside Main Layout */}
          <Route path="/" element={<Layout><AdminDashboard /></Layout>} />
          <Route path="/employee" element={<Layout><EmployeeDashboard /></Layout>} />
          <Route path="/documents" element={<Layout><Documents /></Layout>} />
          <Route path="/documents/:id" element={<Layout><DocumentDetails /></Layout>} />
          <Route path="/employees" element={<Layout><Employees /></Layout>} />
          <Route path="/employees/:id" element={<Layout><EmployeeDetails /></Layout>} />
          <Route path="/roles" element={<Layout><Roles /></Layout>} />
          <Route path="/matrix" element={<Layout><RoleRequirementMatrix /></Layout>} />
          <Route path="/generate" element={<Layout><GeneratePlan /></Layout>} />
          <Route path="/plans/:id" element={<Layout><PlanDetails /></Layout>} />
          <Route path="/validation" element={<Layout><ValidationDashboard /></Layout>} />
          <Route path="/comparison" element={<Layout><ComparisonResults /></Layout>} />
          <Route path="/reviews" element={<Layout><HumanReviewQueue /></Layout>} />
          <Route path="/approved-plans" element={<Layout><ApprovedPlans /></Layout>} />
          <Route path="/policy-updates" element={<Layout><PolicyUpdates /></Layout>} />
          <Route path="/reports" element={<Layout><Reports /></Layout>} />
          <Route path="/prompts" element={<Layout><PromptTemplates /></Layout>} />
          <Route path="/audit" element={<Layout><AuditTrail /></Layout>} />
          <Route path="/settings" element={<Layout><Settings /></Layout>} />

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
