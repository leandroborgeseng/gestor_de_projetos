import { useEffect, useState } from "react";
import { Outlet, Navigate } from "react-router-dom";
import { ensureActiveCompany, getCompanies } from "../utils/company.js";

export default function Protected() {
  const token = localStorage.getItem("accessToken");
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (!token) {
      return;
    }

    const companies = getCompanies();
    if (companies.length > 0) {
      ensureActiveCompany();
    }

    setInitialized(true);
  }, [token]);

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (!initialized) {
    return null;
  }

  return <Outlet />;
}

