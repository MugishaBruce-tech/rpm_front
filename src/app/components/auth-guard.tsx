import { Navigate, Outlet } from "react-router";
import { authService } from "../services/authService";

export const AuthGuard = () => {
  if (!authService.isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
};
