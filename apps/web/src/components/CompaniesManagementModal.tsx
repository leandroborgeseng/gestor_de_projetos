import CompaniesManagement from "../routes/CompaniesManagement.js";

interface CompaniesManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CompaniesManagementModal({
  isOpen,
  onClose,
}: CompaniesManagementModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 p-4">
      <div className="relative w-full max-w-6xl bg-surface-elevated border border-subtle rounded-xl shadow-elevated transition-colors duration-200">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-muted hover:text-primary"
          aria-label="Fechar administração de empresas"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <div className="max-h-[80vh] overflow-y-auto rounded-xl">
          <CompaniesManagement embedded />
        </div>
      </div>
    </div>
  );
}

