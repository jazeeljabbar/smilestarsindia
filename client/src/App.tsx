import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Router, Route, Switch } from 'wouter';
import { Toaster } from '@/components/ui/toaster';
import { Layout } from '@/components/Layout';
import { Login } from '@/pages/Login';
import { SchoolLogin } from '@/pages/SchoolLogin';
import { ParentLogin } from '@/pages/ParentLogin';
import { AdminLogin } from '@/pages/AdminLogin';
import { DentistLogin } from '@/pages/DentistLogin';
import { Dashboard } from '@/pages/Dashboard';
import { Schools } from '@/pages/Schools';
import { Camps } from '@/pages/Camps';
import { Students } from '@/pages/Students';
import { Reports } from '@/pages/Reports';
import { ParentPortal } from '@/pages/ParentPortal';
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

  return (
    <Switch>
      {/* Public login routes */}
      <Route path="/login" component={Login} />
      <Route path="/school-login" component={SchoolLogin} />
      <Route path="/parent-login" component={ParentLogin} />
      <Route path="/admin-login" component={AdminLogin} />
      <Route path="/dentist-login" component={DentistLogin} />
      
      {/* Root route - show login if not authenticated */}
      <Route path="/">
        {() => {
          if (!user) {
            return <Login />;
          }
          return (
            <Layout>
              <Dashboard />
            </Layout>
          );
        }}
      </Route>
      
      {/* Protected routes */}
      <Route>
        {() => {
          if (!user) {
            return <Login />;
          }
          
          return (
            <Layout>
              <Switch>
                <Route path="/dashboard" component={Dashboard} />
                <Route path="/schools" component={Schools} />
                <Route path="/camps" component={Camps} />
                <Route path="/students" component={Students} />
                <Route path="/reports" component={Reports} />
                <Route path="/parent-portal" component={ParentPortal} />
                <Route component={NotFound} />
              </Switch>
            </Layout>
          );
        }}
      </Route>
    </Switch>
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
