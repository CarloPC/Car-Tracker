import { useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { DataProvider } from "./context/DataContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Sidebar from "./components/Sidebar";
import Dashboard from "./pages/Dashboard";
import Entries from "./pages/Entries";
import Statistics from "./pages/Statistics";
import Vehicles from "./pages/Vehicles";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";

function AppShell() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <DataProvider>
      <div className="flex min-h-screen bg-base text-ink">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <Routes>
          <Route path="/" element={<Dashboard onMenu={() => setSidebarOpen(true)} />} />
          <Route path="/entries" element={<Entries onMenu={() => setSidebarOpen(true)} />} />
          <Route path="/statistics" element={<Statistics onMenu={() => setSidebarOpen(true)} />} />
          <Route path="/vehicles" element={<Vehicles onMenu={() => setSidebarOpen(true)} />} />
        </Routes>
      </div>
    </DataProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <AppShell />
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
