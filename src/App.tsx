import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import About from "./pages/About";
import Contractors from "./pages/Contractors";
import Auth from "./pages/Auth";
import ContractorAuth from "./pages/ContractorAuth";
import ContractorOnboarding from "./pages/ContractorOnboarding";
import Dashboard from "./pages/Dashboard";
import Admin from "./pages/Admin";
import ContractorDashboard from "./pages/ContractorDashboard";
import PaymentSuccess from "./pages/PaymentSuccess";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import ProtectedRoute from "./components/auth/ProtectedRoute";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/about" element={<About />} />
          <Route path="/contractors" element={<Contractors />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/contractor-auth" element={<ContractorAuth />} />
          <Route path="/contractor-onboarding" element={<ContractorOnboarding />} />
          <Route path="/dashboard" element={
            <ProtectedRoute redirectTo="/auth">
              <Dashboard />
            </ProtectedRoute>
          } />
          <Route path="/admin" element={
            <ProtectedRoute requiredRole="admin" redirectTo="/dashboard">
              <Admin />
            </ProtectedRoute>
          } />
          <Route path="/contractor" element={
            <ProtectedRoute requiredRole="contractor" redirectTo="/dashboard">
              <ContractorDashboard />
            </ProtectedRoute>
          } />
          <Route path="/settings" element={
            <ProtectedRoute redirectTo="/auth">
              <Settings />
            </ProtectedRoute>
          } />
          <Route path="/payment-success" element={<PaymentSuccess />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
