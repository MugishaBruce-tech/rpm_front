import { Navigate, Outlet } from "react-router";
import { authService } from "../services/authService";

export const AuthGuard = () => {
  // Authentication restriction removed temporarily
  return <Outlet />;
};
