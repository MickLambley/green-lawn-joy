import { useState, useEffect, ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: AppRole;
  redirectTo?: string;
}

const ProtectedRoute = ({ 
  children, 
  requiredRole, 
  redirectTo = "/auth" 
}: ProtectedRouteProps) => {
  const [authorized, setAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    checkAuthorization();
  }, []);

  const checkAuthorization = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setAuthorized(false);
        return;
      }

      // If no specific role required, just check if logged in
      if (!requiredRole) {
        setAuthorized(true);
        return;
      }

      // Check if user has the required role
      const { data: roles, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", requiredRole);

      if (error) {
        console.error("Error checking role:", error);
        setAuthorized(false);
        return;
      }

      setAuthorized(roles && roles.length > 0);
    } catch (error) {
      console.error("Authorization check failed:", error);
      setAuthorized(false);
    }
  };

  // Show loading state while checking
  if (authorized === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-12 h-12 rounded-xl gradient-hero animate-pulse" />
      </div>
    );
  }

  // Redirect if not authorized
  if (!authorized) {
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
