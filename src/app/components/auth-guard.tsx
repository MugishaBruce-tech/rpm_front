import { Navigate, Outlet } from "react-router";
import { authService } from "../services/authService";
import { toast } from "sonner";

export const AuthGuard = () => {
  const isAuth = authService.isAuthenticated();
  console.log('[AuthGuard] Checking authentication:', isAuth);
  
  if (!isAuth) {
    console.log('[AuthGuard] Not authenticated, redirecting to /login');
    toast.error('Veuillez vous connecter pour accéder à cette page.');
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
};
