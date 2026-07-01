import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import DashboardEmploye from './pages/DashboardEmploye';
import DashboardResponsable from './pages/DashboardResponsable';
import DashboardResponsableDemandes from './pages/DashboardResponsableDemandes';
import DashboardAdmin from './pages/DashboardAdmin';
import DashboardDirecteur from './pages/DashboardDirecteur';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard-employe" element={<DashboardEmploye />} />
        <Route path="/dashboard-responsable" element={<DashboardResponsable />} />
        <Route path="/dashboard-responsable/demandes" element={<DashboardResponsableDemandes />} />
        <Route path="/dashboard-admin" element={<DashboardAdmin />} />
        <Route path="/dashboard-directeur" element={<DashboardDirecteur />} />
        <Route path="/reset-password" element={<Login />} />
      </Routes>
    </Router>
  );
}

export default App;