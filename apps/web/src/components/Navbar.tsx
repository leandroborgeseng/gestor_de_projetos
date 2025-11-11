import { useState, useRef, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useHotkeys } from "react-hotkeys-hook";
import EditProfileModal from "./EditProfileModal.js";
import ImpersonateUserModal from "./ImpersonateUserModal.js";
import HelpModal from "./HelpModal.js";
import NotificationCenter from "./NotificationCenter.js";
import GlobalSearch from "./GlobalSearch.js";
import KeyboardShortcutsModal from "./KeyboardShortcuts.js";
import CompanySwitcher from "./CompanySwitcher.js";
import CompaniesManagementModal from "./CompaniesManagementModal.js";
import api from "../lib/axios.js";
import {
  clearCompanyContext,
  COMPANY_CHANGED_EVENT,
  getActiveCompany,
  type CompanyInfo,
} from "../utils/company.js";
import { buildAssetUrl } from "../utils/api.js";
import { useUIStore, resolveThemePreference, type ThemePreference, type DensityPreference } from "../store/ui.js";

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isImpersonateModalOpen, setIsImpersonateModalOpen] = useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [isNotificationCenterOpen, setIsNotificationCenterOpen] = useState(false);
  const [isGlobalSearchOpen, setIsGlobalSearchOpen] = useState(false);
  const [isKeyboardShortcutsOpen, setIsKeyboardShortcutsOpen] = useState(false);
  const [isCompaniesModalOpen, setIsCompaniesModalOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [activeCompany, setActiveCompany] = useState<CompanyInfo | null>(() => getActiveCompany());
  const { theme, setTheme, density, setDensity } = useUIStore((state) => ({
    theme: state.theme,
    setTheme: state.setTheme,
    density: state.density,
    setDensity: state.setDensity,
  }));
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">(
    typeof window !== "undefined"
      ? ((document.documentElement.dataset.theme as "light" | "dark") ??
          resolveThemePreference(theme))
      : resolveThemePreference(theme)
  );

  const userStr = localStorage.getItem("user");
  const user = userStr ? JSON.parse(userStr) : null;
  
  // Verificar se há um usuário personificado
  const impersonatedUserStr = localStorage.getItem("impersonatedUser");
  const impersonatedUser = impersonatedUserStr ? JSON.parse(impersonatedUserStr) : null;
  
  // Usar o usuário personificado se existir, senão usar o usuário original
  const displayUser = impersonatedUser || user;
  const isImpersonating = !!impersonatedUser;
  const isSuperAdmin = displayUser?.role === "SUPERADMIN";
  const isAdmin = displayUser?.role === "ADMIN" || isSuperAdmin;

  // Buscar contagem de notificações não lidas
  const { data: unreadCountData } = useQuery<{ count: number }>({
    queryKey: ["notifications", "unread-count"],
    queryFn: () => api.get("/notifications/unread-count").then((res) => res.data),
    refetchInterval: 30000, // Atualizar a cada 30 segundos
  });

  const unreadCount = unreadCountData?.count || 0;

  // Atalho Ctrl+K para abrir busca global
  useHotkeys("ctrl+k, cmd+k", (e) => {
    e.preventDefault();
    setIsGlobalSearchOpen(true);
  });

  // Atalho ? para abrir atalhos de teclado
  useHotkeys("shift+?", (e) => {
    e.preventDefault();
    setIsKeyboardShortcutsOpen(true);
  });

  // Atalho / para focar em busca (quando não estiver digitando)
  useHotkeys(
    "/",
    (e) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }
      e.preventDefault();
      setIsGlobalSearchOpen(true);
    }
  );

  // Fechar menu ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    if (isMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isMenuOpen]);

  useEffect(() => {
    const updateActiveCompany = () => {
      setActiveCompany(getActiveCompany());
    };

    window.addEventListener("storage", updateActiveCompany);
    window.addEventListener(COMPANY_CHANGED_EVENT, updateActiveCompany);

    return () => {
      window.removeEventListener("storage", updateActiveCompany);
      window.removeEventListener(COMPANY_CHANGED_EVENT, updateActiveCompany);
    };
  }, []);

  useEffect(() => {
    setResolvedTheme(resolveThemePreference(theme));
  }, [theme]);

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ resolved: "light" | "dark" }>).detail;
      if (detail?.resolved) {
        setResolvedTheme(detail.resolved);
      } else {
        setResolvedTheme(resolveThemePreference(theme));
      }
    };
    window.addEventListener("theme-change", handler);
    return () => window.removeEventListener("theme-change", handler);
  }, [theme]);

  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
    localStorage.removeItem("impersonatedUser");
    clearCompanyContext();
    window.location.href = "/login";
  };

  const handleImpersonate = (targetUser: any) => {
    localStorage.setItem("impersonatedUser", JSON.stringify(targetUser));
    // Recarregar a página para atualizar todas as referências ao usuário
    window.location.reload();
  };

  const handleStopImpersonating = () => {
    localStorage.removeItem("impersonatedUser");
    // Recarregar a página para voltar ao perfil original
    window.location.reload();
  };

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      SUPERADMIN: "Super Admin",
      ADMIN: "Administrador",
      MANAGER: "Gerente",
      MEMBER: "Membro",
    };
    return labels[role] || role;
  };

  const brandName = activeCompany?.name ?? "Agile Project Manager";
  const brandLogoUrl = useMemo(() => {
    const logo =
      resolvedTheme === "light"
        ? activeCompany?.lightLogoUrl ?? activeCompany?.logoUrl
        : activeCompany?.logoUrl;
    return logo ? buildAssetUrl(logo) : null;
  }, [activeCompany?.lightLogoUrl, activeCompany?.logoUrl, resolvedTheme]);
  const themeOptions: Array<{ id: ThemePreference; label: string }> = [
    { id: "light", label: "Claro" },
    { id: "dark", label: "Escuro" },
    { id: "system", label: "Automático" },
  ];
  const densityOptions: Array<{ id: DensityPreference; label: string; icon: string }> = [
    { id: "compact", label: "Compacto", icon: "M4 6h16M4 10h16M4 14h16M4 18h16" },
    { id: "normal", label: "Normal", icon: "M4 8h16M4 12h16M4 16h16" },
    { id: "comfortable", label: "Confortável", icon: "M4 10h16M4 14h16M4 18h16" },
  ];

  return (
    <>
      <nav className="bg-navbar shadow-soft transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link to="/" className="flex items-center gap-3">
                {brandLogoUrl ? (
                  <img
                    src={brandLogoUrl}
                    alt={`Logo ${brandName}`}
                    className="h-10 w-10 object-contain rounded-md border border-subtle bg-surface p-1"
                  />
                ) : (
                  <div
                    className="h-10 w-10 flex items-center justify-center rounded-md border border-subtle bg-surface-muted text-sm font-semibold"
                    style={{ color: "var(--brand-primary-contrast)" }}
                  >
                    APM
                  </div>
                )}
                <span className="text-xl font-bold" style={{ color: "var(--brand-primary)" }}>
                  {brandName}
                </span>
              </Link>
            </div>
            {user && (
              <div className="flex items-center gap-3">
                <CompanySwitcher />
                <button
                  onClick={() => setIsGlobalSearchOpen(true)}
                  className="flex items-center gap-2 px-3 py-2 rounded-md text-secondary hover:bg-surface-muted/80 transition-colors"
                  title="Busca Global (Ctrl+K)"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                  <span className="hidden md:inline text-sm font-medium">Buscar</span>
                </button>
                <button
                  onClick={() => setIsKeyboardShortcutsOpen(true)}
                  className="flex items-center gap-2 px-3 py-2 rounded-md text-secondary hover:bg-surface-muted/80 transition-colors"
                  title="Atalhos de Teclado"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
                    />
                  </svg>
                  <span className="hidden md:inline text-sm font-medium">Atalhos</span>
                </button>
                <button
                  onClick={() => setIsHelpModalOpen(true)}
                  className="flex items-center gap-2 px-3 py-2 rounded-md text-secondary hover:bg-surface-muted/80 transition-colors"
                  title="Ajuda / Manual do Usuário"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <span className="hidden md:inline text-sm font-medium">Ajuda</span>
                </button>
                <button
                  onClick={() => setIsNotificationCenterOpen(!isNotificationCenterOpen)}
                  className="relative flex items-center gap-2 px-3 py-2 rounded-md text-secondary hover:bg-surface-muted/80 transition-colors"
                  title="Notificações"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                    />
                  </svg>
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                  <span className="hidden md:inline text-sm font-medium">Notificações</span>
                </button>
                <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-surface-muted/80 transition-colors"
                >
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold text-sm ${
                        isImpersonating ? "bg-yellow-600" : "bg-indigo-600"
                      }`}>
                        {displayUser.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="text-left hidden md:block">
                      <div className="text-sm font-medium text-primary">
                          {displayUser.name}
                          {isImpersonating && (
                            <span className="ml-2 text-xs text-yellow-400">(Personificando)</span>
                          )}
                        </div>
                      <div className="text-xs text-muted">{getRoleLabel(displayUser.role)}</div>
                      </div>
                    </div>
                  <svg
                    className={`w-4 h-4 text-muted transition-transform ${
                      isMenuOpen ? "rotate-180" : ""
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>

                {isMenuOpen && (
                  <div className="absolute right-0 top-full mt-1 w-60 rounded-lg shadow-elevated py-1 z-50 border border-subtle bg-surface-elevated">
                    <div className="px-4 py-2 border-b border-subtle">
                      <div className="text-sm font-medium text-primary">
                        {displayUser.name}
                        {isImpersonating && (
                          <span className="ml-2 text-xs text-amber-400">(Personificando)</span>
                        )}
                      </div>
                      <div className="text-xs text-muted truncate">{displayUser.email}</div>
                      {isImpersonating && (
                        <div className="text-xs text-amber-300 mt-1">Original: {user.name}</div>
                      )}
                    </div>
                    <div className="px-4 py-3 border-b border-subtle">
                      <div className="text-xs font-semibold text-muted uppercase tracking-wide">Tema</div>
                      <div className="mt-2 space-y-1">
                        {themeOptions.map((option) => (
                          <button
                            key={option.id}
                            onClick={() => setTheme(option.id)}
                            className={`w-full flex items-center justify-between px-3 py-1.5 rounded-md text-sm transition-colors ${
                              theme === option.id
                                ? "bg-surface-muted text-primary"
                                : "text-secondary hover:bg-surface-muted"
                            }`}
                          >
                            <span>{option.label}</span>
                            {theme === option.id && (
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="px-4 py-3 border-b border-subtle">
                      <div className="text-xs font-semibold text-muted uppercase tracking-wide">Densidade</div>
                      <div className="mt-2 space-y-1">
                        {densityOptions.map((option) => (
                          <button
                            key={option.id}
                            onClick={() => setDensity(option.id)}
                            className={`w-full flex items-center justify-between px-3 py-1.5 rounded-md text-sm transition-colors ${
                              density === option.id
                                ? "bg-surface-muted text-primary"
                                : "text-secondary hover:bg-surface-muted"
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={option.icon} />
                              </svg>
                              <span>{option.label}</span>
                            </div>
                            {density === option.id && (
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                    {isAdmin && (
                      <>
                        {isSuperAdmin && (
                          <button
                            onClick={() => {
                              setIsCompaniesModalOpen(true);
                              setIsMenuOpen(false);
                            }}
                            className="w-full text-left px-4 py-2 text-sm text-secondary hover:bg-surface-muted transition-colors flex items-center gap-2"
                          >
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M3 7l9-4 9 4M4 10h16v10H4z"
                              />
                            </svg>
                            Empresas
                          </button>
                        )}
                        {isImpersonating ? (
                          <button
                            onClick={() => {
                              handleStopImpersonating();
                              setIsMenuOpen(false);
                            }}
                            className="w-full text-left px-4 py-2 text-sm text-amber-400 hover:bg-surface-muted transition-colors flex items-center gap-2"
                          >
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                              />
                            </svg>
                            Voltar ao meu perfil
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              setIsImpersonateModalOpen(true);
                              setIsMenuOpen(false);
                            }}
                            className="w-full text-left px-4 py-2 text-sm text-indigo-300 hover:bg-surface-muted transition-colors flex items-center gap-2"
                          >
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                              />
                            </svg>
                            Personificar Usuário
                          </button>
                        )}
                        <Link
                          to="/settings"
                          onClick={() => setIsMenuOpen(false)}
                          className="w-full text-left px-4 py-2 text-sm text-secondary hover:bg-surface-muted transition-colors flex items-center gap-2"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                          </svg>
                          Configurações
                        </Link>
                      </>
                    )}
                    <button
                      onClick={() => {
                        setIsEditModalOpen(true);
                        setIsMenuOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-secondary hover:bg-surface-muted transition-colors flex items-center gap-2"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                        />
                      </svg>
                      Editar Conta
                    </button>
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-surface-muted transition-colors flex items-center gap-2"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                        />
                      </svg>
                      Sair
                    </button>
                  </div>
                )}
                </div>
              </div>
            )}
          </div>
        </div>
      </nav>

      <HelpModal
        isOpen={isHelpModalOpen}
        onClose={() => setIsHelpModalOpen(false)}
      />

      <EditProfileModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
      />

      {isAdmin && (
        <ImpersonateUserModal
          isOpen={isImpersonateModalOpen}
          onClose={() => setIsImpersonateModalOpen(false)}
          onImpersonate={handleImpersonate}
        />
      )}

      <NotificationCenter
        isOpen={isNotificationCenterOpen}
        onClose={() => setIsNotificationCenterOpen(false)}
      />

      <GlobalSearch
        isOpen={isGlobalSearchOpen}
        onClose={() => setIsGlobalSearchOpen(false)}
      />

      <KeyboardShortcutsModal
        isOpen={isKeyboardShortcutsOpen}
        onClose={() => setIsKeyboardShortcutsOpen(false)}
      />

      {isSuperAdmin && (
        <CompaniesManagementModal
          isOpen={isCompaniesModalOpen}
          onClose={() => setIsCompaniesModalOpen(false)}
        />
      )}
    </>
  );
}

