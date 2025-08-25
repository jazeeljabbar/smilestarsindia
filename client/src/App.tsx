import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Router, Route, Switch } from 'wouter';
import { Toaster } from '@/components/ui/toaster';
import { Layout } from '@/components/Layout';
import { HomePage } from '@/pages/HomePage';
import { Login } from '@/pages/Login';
import { Dashboard } from '@/pages/Dashboard';
import { FranchiseeDashboard } from '@/pages/FranchiseeDashboard';
import SchoolAdminDashboard from '@/pages/SchoolAdminDashboard';
import { Schools } from '@/pages/Schools';
import { Camps } from '@/pages/Camps';
import { Students } from '@/pages/Students';
import { Reports } from '@/pages/Reports';
import { ParentPortal } from '@/pages/ParentPortal';
import { FranchiseAgreement } from '@/pages/FranchiseAgreement';
import { Franchisees } from '@/pages/Franchisees';
import NotFound from '@/pages/not-found';
import { AuthProvider, useAuth } from '@/lib/auth.tsx';

const queryClient = new QueryClient();

function AppRoutes() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  if (!user) {
    // Show public routes for unauthenticated users
    return (
      <Switch>
        <Route path="/" component={HomePage} />
        <Route path="/login" component={Login} />
        <Route path="/franchise/accept-agreement" component={FranchiseAgreement} />
        <Route component={HomePage} /> {/* Default to homepage */}
      </Switch>
    );
  }

  // Show protected routes for authenticated users
  const getDashboardComponent = () => {
    if (user?.role === 'franchisee') return FranchiseeDashboard;
    if (user?.role === 'school_admin') return SchoolAdminDashboard;
    return Dashboard;
  };

  return (
    <Layout>
      <Switch>
        <Route path="/" component={getDashboardComponent()} />
        <Route path="/dashboard" component={getDashboardComponent()} />
        <Route path="/franchisees" component={Franchisees} />
        <Route path="/schools" component={Schools} />
        <Route path="/camps" component={Camps} />
        <Route path="/students" component={Students} />
        <Route path="/reports" component={Reports} />
        <Route path="/parent-portal" component={ParentPortal} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <AppRoutes />
        </Router>
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}
