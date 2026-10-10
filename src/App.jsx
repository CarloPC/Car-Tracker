import { useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { DataProvider } from "./context/DataContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Sidebar from "./components/Sidebar";
import BottomNav from "./components/BottomNav";
import Dashboard from "./pages/Dashboard";
import Entries from "./pages/Entries";
import Statistics from "./pages/Statistics";
import Vehicles from "./pages/Vehicles";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import PublicVehicle from "./pages/PublicVehicle";
import PublicGarage from "./pages/PublicGarage";
import { ToastProvider } from "./components/Toast";

function AppShell() {
  return (
    <DataProvider>
      <div className="flex min-h-screen w-full overflow-x-hidden bg-base text-ink">
        <Sidebar />
        <div className="min-w-0 flex-1 pb-16 lg:pb-0">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/entries" element={<Entries />} />
            <Route path="/statistics" element={<Statistics />} />
            <Route path="/vehicles" element={<Vehicles />} />
          </Routes>
        </div>
        <BottomNav />
      </div>
    </DataProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
      <BrowserRouter>
        <Routes>
          {/* Public, no login needed */}
          <Route path="/v/:id" element={<PublicVehicle />} />
          <Route path="/stock/:ownerId" element={<PublicGarage />} />
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
      </ToastProvider>
    </AuthProvider>
  );
}
