import React from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import SuperAdminDashboard from './pages/SuperAdminDashboard';

function Landing() {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: '16px',import React from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import SuperAdminDashboard from './pages/SuperAdminDashboard';

function Landing() {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: '16px',
      fontFamily: 'system-ui, sans-serif', padding: '24px', textAlign: 'center'
    }}>
      <h1 style={{ color: '#8B3A3A', marginBottom: '8px' }}>PTag</h1>
      <p style={{ color: '#666', marginBottom: '16px' }}>Choose a dashboard</p>
      <Link to="/admin" style={{
        padding: '14px 32px', background: '#8B3A3A', color: '#fff',
        borderRadius: '10px', textDecoration: 'none', fontWeight: 600, width: '220px'
      }}>Branch Admin</Link>
      <Link to="/super-admin" style={{
        padding: '14px 32px', background: '#2a1010', color: '#fff',
        borderRadius: '10px', textDecoration: 'none', fontWeight: 600, width: '220px'
      }}>Super Admin</Link>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/admin" element={<Dashboard />} />
        <Route path="/super-admin" element={<SuperAdminDashboard />} />
        <Route path="*" element={<Landing />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
EOF

git add . && git commit -m "Add landing screen to navigate between dashboards" && git push

This gives you a simple picker screen on app launch with two buttons — Branch Admin and Super Admin — so you can reach both dashboards. Longer-term, once you have real login/auth wired up, this landing page would ideally be replaced by a proper login screen that routes based on the logged-in user's role — but this gets you unblocked immediately. Push it and the new build should let you reach the super admin dashboard.
      fontFamily: 'system-ui, sans-serif', padding: '24px', textAlign: 'center'
    }}>
      <h1 style={{ color: '#8B3A3A', marginBottom: '8px' }}>PTag</h1>
      <p style={{ color: '#666', marginBottom: '16px' }}>Choose a dashboard</p>
      <Link to="/admin" style={{
        padding: '14px 32px', background: '#8B3A3A', color: '#fff',
        borderRadius: '10px', textDecoration: 'none', fontWeight: 600, width: '220px'
      }}>Branch Admin</Link>
      <Link to="/super-admin" style={{
        padding: '14px 32px', background: '#2a1010', color: '#fff',
        borderRadius: '10px', textDecoration: 'none', fontWeight: 600, width: '220px'
      }}>Super Admin</Link>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/admin" element={<Dashboard />} />
        <Route path="/super-admin" element={<SuperAdminDashboard />} />
        <Route path="*" element={<Landing />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
This gives you a simple picker screen on app launch with two buttons — Branch Admin and Super Admin — so you can reach both dashboards. Longer-term, once you have real login/auth wired up, this landing page would ideally be replaced by a proper login screen that routes based on the logged-in user's role — but this gets you unblocked immediately. Push it and the new build should let you reach the super admin dashboard.
