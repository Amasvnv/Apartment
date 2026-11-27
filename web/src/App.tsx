import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import { useAuth } from "./auth/auth";
import AppFrame from "./components/AppFrame";
import Activity from "./pages/Activity";
import BillCheck from "./pages/BillCheck";
import Database from "./pages/Database";
import InvoicePrint from "./pages/InvoicePrint";
import Invoices from "./pages/Invoices";
import Login from "./pages/Login";
import Meter from "./pages/Meter";
import Overview from "./pages/Overview";
import ReceiptPrint from "./pages/ReceiptPrint";
import Repairs from "./pages/Repairs";
import Reports from "./pages/Reports";
import Rooms from "./pages/Rooms";
import SettingsPage from "./pages/Settings";
import Tenants from "./pages/Tenants";
import Users from "./pages/Users";

function RequireAuth() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <Outlet />;
}

function ProtectedLayout() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return (
    <AppFrame>
      <Outlet />
    </AppFrame>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/bill-check" element={<BillCheck />} />
      <Route element={<RequireAuth />}>
        <Route path="/invoices/:no/print" element={<InvoicePrint />} />
        <Route path="/invoices/:no/receipt" element={<ReceiptPrint />} />
      </Route>
      <Route element={<ProtectedLayout />}>
        <Route path="/" element={<Overview />} />
        <Route path="/meter" element={<Meter />} />
        <Route path="/rooms" element={<Rooms />} />
        <Route path="/tenants" element={<Tenants />} />
        <Route path="/invoices" element={<Invoices />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/repairs" element={<Repairs />} />
        <Route path="/activity" element={<Activity />} />
        <Route path="/users" element={<Users />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/database" element={<Database />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
