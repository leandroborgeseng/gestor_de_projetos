export interface CompanyInfo {
  id: string;
  name: string;
  slug?: string;
  plan?: string;
  isActive?: boolean;
  maxUsers?: number | null;
  maxProjects?: number | null;
  maxStorageMb?: number | null;
  role?: string;
  primaryColor?: string | null;
  secondaryColor?: string | null;
  accentColor?: string | null;
  backgroundColor?: string | null;
  logoUrl?: string | null;
  logoKey?: string | null;
  lightPrimaryColor?: string | null;
  lightSecondaryColor?: string | null;
  lightAccentColor?: string | null;
  lightBackgroundColor?: string | null;
  lightLogoUrl?: string | null;
  lightLogoKey?: string | null;
}

const STORAGE_COMPANIES = "companies";
const STORAGE_ACTIVE_COMPANY = "activeCompanyId";
export const COMPANY_CHANGED_EVENT = "company-changed";

function parseCompanies(value: string | null): CompanyInfo[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    return [];
  } catch (error) {
    console.warn("Falha ao analisar lista de empresas do localStorage", error);
    return [];
  }
}

export function getCompanies(): CompanyInfo[] {
  return parseCompanies(localStorage.getItem(STORAGE_COMPANIES));
}

export function getActiveCompanyId(): string | null {
  return localStorage.getItem(STORAGE_ACTIVE_COMPANY);
}

export function getActiveCompany(): CompanyInfo | null {
  const companies = getCompanies();
  const activeId = getActiveCompanyId();
  if (!activeId) return null;
  return companies.find((company) => company.id === activeId) ?? null;
}

export function setCompanies(companies: CompanyInfo[]) {
  localStorage.setItem(STORAGE_COMPANIES, JSON.stringify(companies));
}

export function setActiveCompanyId(companyId: string) {
  localStorage.setItem(STORAGE_ACTIVE_COMPANY, companyId);
  window.dispatchEvent(new Event(COMPANY_CHANGED_EVENT));
}

export function syncCompanyContext(companies?: CompanyInfo[], activeCompanyId?: string | null) {
  if (companies) {
    setCompanies(companies);
  }

  if (activeCompanyId) {
    localStorage.setItem(STORAGE_ACTIVE_COMPANY, activeCompanyId);
  } else if (activeCompanyId === null) {
    localStorage.removeItem(STORAGE_ACTIVE_COMPANY);
  }

  window.dispatchEvent(new Event(COMPANY_CHANGED_EVENT));
}

export function ensureActiveCompany() {
  const companies = getCompanies();
  const activeId = getActiveCompanyId();

  if (!activeId && companies.length > 0) {
    setActiveCompanyId(companies[0].id);
  }
}

export function clearCompanyContext() {
  localStorage.removeItem(STORAGE_COMPANIES);
  localStorage.removeItem(STORAGE_ACTIVE_COMPANY);
  window.dispatchEvent(new Event(COMPANY_CHANGED_EVENT));
}
