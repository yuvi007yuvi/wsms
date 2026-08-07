import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import DashboardLayout from './components/layout/DashboardLayout';
import ProtectedRoute from './components/layout/ProtectedRoute';
import Login from './components/Login';
import SubscriptionExpired from './components/SubscriptionExpired';
import Weighment from './components/Weighment';
import { Toaster } from './components/ui/toaster';
import './i18n';

import Vehicles from './components/Vehicles';
import VehicleTypes from './components/VehicleTypes';
import Dashboard from './components/Dashboard';
import Materials from './components/Materials';
import Sources from './components/Sources';
import Destinations from './components/Destinations';
import Users from './components/Users';
import Settings from './components/Settings';
import Reports from './components/Reports';
import Pricing from './components/Pricing';
import Superadmin from './components/Superadmin';
import Billing from './components/Billing';
import Diagnostics from './components/Diagnostics';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/subscription-expired" element={<SubscriptionExpired />} />
        
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<DashboardLayout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="weighment" element={<Weighment />} />
            <Route path="vehicles" element={<Vehicles />} />
            <Route path="vehicle-types" element={<VehicleTypes />} />
            <Route path="materials" element={<Materials />} />
            <Route path="sources" element={<Sources />} />
            <Route path="destinations" element={<Destinations />} />
            <Route path="reports" element={<Reports />} />
            <Route path="pricing" element={<Pricing />} />
            <Route path="users" element={<Users />} />
            <Route path="settings" element={<Settings />} />
            <Route path="superadmin" element={<Superadmin />} />
            <Route path="billing" element={<Billing />} />
            <Route path="diagnostics" element={<Diagnostics />} />
          </Route>
        </Route>
      </Routes>
      <Toaster />
    </BrowserRouter>
  );
}

export default App;
