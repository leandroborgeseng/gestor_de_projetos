import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import EditProfileModal from "./EditProfileModal.js";
import ImpersonateUserModal from "./ImpersonateUserModal.js";
import HelpModal from "./HelpModal.js";

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isImpersonateModalOpen, setIsImpersonateModalOpen] = useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const userStr = localStorage.getItem("user");
  const user = userStr ? JSON.parse(userStr) : null;
  
  // Verificar se há um usuário personificado
  const impersonatedUserStr = localStorage.getItem("impersonatedUser");
  const impersonatedUser = impersonatedUserStr ? JSON.parse(impersonatedUserStr) : null;
  
  // Usar o usuário personificado se existir, senão usar o usuário original
  const displayUser = impersonatedUser || user;
  const isImpersonating = !!impersonatedUser;
  const isAdmin = user?.role === "ADMIN";

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

  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
    localStorage.removeItem("impersonatedUser");
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
      ADMIN: "Administrador",
      MANAGER: "Gerente",
      MEMBER: "Membro",
    };
    return labels[role] || role;
  };

  return (
    <>
      <nav className="bg-gray-800 shadow-sm border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link to="/" className="text-xl font-bold text-indigo-400">
                Agile Project Manager
              </Link>
            </div>
            {user && (
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsHelpModalOpen(true)}
                  className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-gray-700 transition-colors text-gray-300 hover:text-white"
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
                <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-gray-700 transition-colors"
                >
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold text-sm ${
                        isImpersonating ? "bg-yellow-600" : "bg-indigo-600"
                      }`}>
                        {displayUser.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="text-left hidden md:block">
                        <div className="text-sm font-medium text-gray-100">
                          {displayUser.name}
                          {isImpersonating && (
                            <span className="ml-2 text-xs text-yellow-400">(Personificando)</span>
                          )}
                        </div>
                        <div className="text-xs text-gray-400">{getRoleLabel(displayUser.role)}</div>
                      </div>
                    </div>
                  <svg
                    className={`w-4 h-4 text-gray-400 transition-transform ${
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
                  <div className="absolute right-0 top-full mt-1 w-56 bg-gray-700 rounded-md shadow-lg py-1 z-50 border border-gray-600">
                    <div className="px-4 py-2 border-b border-gray-600">
                      <div className="text-sm font-medium text-gray-100">
                        {displayUser.name}
                        {isImpersonating && (
                          <span className="ml-2 text-xs text-yellow-400">(Personificando)</span>
                        )}
                      </div>
                      <div className="text-xs text-gray-400 truncate">{displayUser.email}</div>
                      {isImpersonating && (
                        <div className="text-xs text-yellow-400 mt-1">
                          Original: {user.name}
                        </div>
                      )}
                    </div>
                    {isAdmin && (
                      <>
                        {isImpersonating ? (
                          <button
                            onClick={() => {
                              handleStopImpersonating();
                              setIsMenuOpen(false);
                            }}
                            className="w-full text-left px-4 py-2 text-sm text-yellow-400 hover:bg-gray-600 transition-colors flex items-center gap-2"
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
                            className="w-full text-left px-4 py-2 text-sm text-indigo-400 hover:bg-gray-600 transition-colors flex items-center gap-2"
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
                          className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-600 transition-colors flex items-center gap-2"
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
                      className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-600 transition-colors flex items-center gap-2"
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
                      className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-gray-600 transition-colors flex items-center gap-2"
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
    </>
  );
}

