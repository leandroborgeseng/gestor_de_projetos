import { useHotkeys } from "react-hotkeys-hook";

interface KeyboardShortcutsProps {
  onNewTask?: () => void;
  onSave?: () => void;
  onClose?: () => void;
  onSearch?: () => void;
  enabled?: boolean;
}

export function useKeyboardShortcuts({
  onNewTask,
  onSave,
  onClose,
  onSearch,
  enabled = true,
}: KeyboardShortcutsProps) {
  // Ctrl+N: Nova tarefa
  useHotkeys(
    "ctrl+n, cmd+n",
    (e) => {
      e.preventDefault();
      onNewTask?.();
    },
    { enabled: enabled && !!onNewTask }
  );

  // Ctrl+S: Salvar
  useHotkeys(
    "ctrl+s, cmd+s",
    (e) => {
      e.preventDefault();
      onSave?.();
    },
    { enabled: enabled && !!onSave }
  );

  // Esc: Fechar
  useHotkeys(
    "escape",
    (e) => {
      e.preventDefault();
      onClose?.();
    },
    { enabled: enabled && !!onClose }
  );

  // /: Foco em busca
  useHotkeys(
    "/",
    (e) => {
      // Só ativar se não estiver digitando em um input
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }
      e.preventDefault();
      onSearch?.();
    },
    { enabled: enabled && !!onSearch }
  );
}

export default function KeyboardShortcutsModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  if (!isOpen) return null;

  const shortcuts = [
    {
      category: "Navegação",
      items: [
        { keys: ["Ctrl", "K"], description: "Abrir busca global", mac: ["Cmd", "K"] },
        { keys: ["/"], description: "Focar em busca (na página atual)", mac: ["/"] },
        { keys: ["Esc"], description: "Fechar modal/dialog", mac: ["Esc"] },
      ],
    },
    {
      category: "Ações",
      items: [
        { keys: ["Ctrl", "N"], description: "Nova tarefa (Board/Tasks)", mac: ["Cmd", "N"] },
        { keys: ["Ctrl", "S"], description: "Salvar formulário", mac: ["Cmd", "S"] },
      ],
    },
    {
      category: "Contextuais",
      items: [
        { keys: ["?"], description: "Abrir este menu de atalhos", mac: ["?"] },
      ],
    },
  ];

  const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center"
      onClick={onClose}
    >
      <div
        className="bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-gray-700">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-100">Atalhos de Teclado</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-100"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {shortcuts.map((category, idx) => (
              <div key={idx}>
                <h3 className="text-lg font-semibold text-gray-200 mb-3">
                  {category.category}
                </h3>
                <div className="space-y-3">
                  {category.items.map((item, itemIdx) => {
                    const displayKeys = isMac ? item.mac || item.keys : item.keys;
                    return (
                      <div
                        key={itemIdx}
                        className="flex items-center justify-between py-2 border-b border-gray-700"
                      >
                        <span className="text-gray-300">{item.description}</span>
                        <div className="flex items-center gap-1">
                          {displayKeys.map((key, keyIdx) => (
                            <span key={keyIdx}>
                              <kbd className="px-2 py-1 bg-gray-700 text-gray-200 rounded text-sm font-mono border border-gray-600">
                                {key}
                              </kbd>
                              {keyIdx < displayKeys.length - 1 && (
                                <span className="mx-1 text-gray-500">+</span>
                              )}
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 border-t border-gray-700 bg-gray-750">
          <p className="text-sm text-gray-400 text-center">
            Dica: Os atalhos funcionam globalmente quando não estiver digitando em um campo de texto
          </p>
        </div>
      </div>
    </div>
  );
}

