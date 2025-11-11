import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  COMPANY_CHANGED_EVENT,
  CompanyInfo,
  getActiveCompanyId,
  getCompanies,
  ensureActiveCompany,
  setActiveCompanyId,
  syncCompanyContext,
} from "../utils/company.js";
import { applyCompanyTheme } from "../utils/theme.js";
import api from "../lib/axios.js";

export default function CompanySwitcher() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [companies, setCompanies] = useState<CompanyInfo[]>(() => getCompanies());
  const [activeCompanyId, setActiveCompanyIdState] = useState<string | null>(() => getActiveCompanyId());

  const { data: companiesFromApi } = useQuery<CompanyInfo[]>({
    queryKey: ["companies", "context"],
    queryFn: () => api.get("/companies").then((res) => res.data),
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (!companiesFromApi) return;
    const stored = getCompanies();
    const changed =
      stored.length !== companiesFromApi.length ||
      companiesFromApi.some((company) => {
        const match = stored.find((item) => item.id === company.id);
        return !match || JSON.stringify(match) !== JSON.stringify(company);
      });

    if (changed) {
      syncCompanyContext(companiesFromApi);
    }
  }, [companiesFromApi]);

  useEffect(() => {
    const updateState = () => {
      ensureActiveCompany();
      const nextCompanies = getCompanies();
      const nextActiveId = getActiveCompanyId();
      setCompanies(nextCompanies);
      setActiveCompanyIdState(nextActiveId);
    };

    const companyListener = updateState as EventListener;

    window.addEventListener("storage", updateState);
    window.addEventListener(COMPANY_CHANGED_EVENT, companyListener);

    return () => {
      window.removeEventListener("storage", updateState);
      window.removeEventListener(COMPANY_CHANGED_EVENT, companyListener);
    };
  }, []);

  useEffect(() => {
    const activeCompany =
      companies.find((company) => company.id === activeCompanyId) ??
      (companies.length > 0 ? companies[0] : null);
    applyCompanyTheme(activeCompany);
  }, [companies, activeCompanyId]);

  if (companies.length <= 1 || !activeCompanyId) {
    return companies.length === 1 ? (
      <div className="hidden md:flex flex-col text-xs text-gray-400">
        <span className="text-gray-300 font-medium">Empresa</span>
        <span className="text-gray-200 font-semibold">{companies[0].name}</span>
      </div>
    ) : null;
  }

  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newCompanyId = event.target.value;
    if (!newCompanyId || newCompanyId === activeCompanyId) {
      return;
    }

    setActiveCompanyId(newCompanyId);
    setActiveCompanyIdState(newCompanyId);
    queryClient.clear();
    navigate("/");
  };

  return (
    <label className="flex flex-col text-xs text-gray-400">
      <span className="text-gray-300 font-medium">Empresa</span>
      <select
        value={activeCompanyId ?? ""}
        onChange={handleChange}
        className="bg-gray-700 border border-gray-600 text-gray-100 text-sm rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
      >
        {companies.map((company) => (
          <option key={company.id} value={company.id}>
            {company.name} {company.role ? `(${company.role})` : ""}
          </option>
        ))}
      </select>
    </label>
  );
}
