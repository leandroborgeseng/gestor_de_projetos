import { Outlet, Navigate } from "react-router-dom";

export default function Protected() {
  const token = localStorage.getItem("accessToken");

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

