import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import { useAuth } from "./auth/auth";
import AppFrame from "./components/AppFrame";
import ComingSoon from "./pages/ComingSoon";
import Login from "./pages/Login";
import Overview from "./pages/Overview";

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
      <Route element={<ProtectedLayout />}>
        <Route path="/" element={<Overview />} />
        <Route path="/meter" element={<ComingSoon title="ຈົດມິເຕີ ແລະ ຄິດໄລ່ຄ່າບໍລິການ" />} />
        <Route path="/rooms" element={<ComingSoon title="ຈັດການຫ້ອງພັກ" />} />
        <Route path="/tenants" element={<ComingSoon title="ທະບຽນຜູ້ເຊົ່າ" />} />
        <Route path="/invoices" element={<ComingSoon title="ໃບບີນເກັບເງິນ" />} />
        <Route path="/bill-check" element={<ComingSoon title="ກວດເບິ່ງບີນ" />} />
        <Route path="/repairs" element={<ComingSoon title="ຈັດການວຽກສ້ອມແປງ" />} />
        <Route path="/activity" element={<ComingSoon title="ການເຄື່ອນໄຫວ" />} />
        <Route path="/users" element={<ComingSoon title="ຜູ້ໃຊ້" />} />
        <Route path="/settings" element={<ComingSoon title="ຕັ້ງຄ່າອັດຕາຄ່າບໍລິການ" />} />
        <Route path="/database" element={<ComingSoon title="ເຊື່ອມຕໍ່ຖານຂໍ້ມູນ" />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
