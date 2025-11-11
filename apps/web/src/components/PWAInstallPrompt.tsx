import { useState, useEffect } from "react";

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [offlineReady, setOfflineReady] = useState(false);
  const [needRefresh, setNeedRefresh] = useState(false);

  useEffect(() => {
    // Verificar se já está instalado
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
      return;
    }

    // Listener para o evento beforeinstallprompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallPrompt(true);
    };

    window.addEventListener("beforeinstallprompt", handler);

    // Listener para atualizações do service worker
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        setNeedRefresh(true);
      });
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  const updateServiceWorker = async (reloadPage: boolean) => {
    if ("serviceWorker" in navigator) {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration && registration.waiting) {
        registration.waiting.postMessage({ type: "SKIP_WAITING" });
        if (reloadPage) {
          window.location.reload();
        }
      }
    }
    setNeedRefresh(false);
  };

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      setIsInstalled(true);
      setShowInstallPrompt(false);
    }

    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowInstallPrompt(false);
    setDeferredPrompt(null);
  };

  if (isInstalled) return null;

  return (
    <>
      {/* Banner de instalação */}
      {showInstallPrompt && (
        <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-indigo-700 text-white p-4 rounded-lg shadow-lg z-50 flex items-center justify-between gap-4">
          <div className="flex-1">
            <p className="font-semibold">Instalar Agile PM</p>
            <p className="text-sm text-indigo-200">
              Instale o app para acesso rápido e offline
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleInstallClick}
              className="px-4 py-2 bg-white text-indigo-700 rounded-md hover:bg-indigo-50 font-medium text-sm"
            >
              Instalar
            </button>
            <button
              onClick={handleDismiss}
              className="px-4 py-2 bg-indigo-600 rounded-md hover:bg-indigo-500 text-sm"
            >
              Depois
            </button>
          </div>
        </div>
      )}

      {/* Notificação de atualização disponível */}
      {needRefresh && (
        <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-green-700 text-white p-4 rounded-lg shadow-lg z-50 flex items-center justify-between gap-4">
          <div className="flex-1">
            <p className="font-semibold">Nova versão disponível</p>
            <p className="text-sm text-green-200">
              Uma nova versão do app está disponível
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => updateServiceWorker(true)}
              className="px-4 py-2 bg-white text-green-700 rounded-md hover:bg-green-50 font-medium text-sm"
            >
              Atualizar
            </button>
            <button
              onClick={() => setNeedRefresh(false)}
              className="px-4 py-2 bg-green-600 rounded-md hover:bg-green-500 text-sm"
            >
              Depois
            </button>
          </div>
        </div>
      )}

      {/* Notificação de modo offline */}
      {offlineReady && (
        <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-blue-700 text-white p-4 rounded-lg shadow-lg z-50 flex items-center justify-between gap-4">
          <div className="flex-1">
            <p className="font-semibold">App pronto para uso offline</p>
            <p className="text-sm text-blue-200">
              O app agora funciona sem conexão com a internet
            </p>
          </div>
          <button
            onClick={() => setOfflineReady(false)}
            className="px-4 py-2 bg-blue-600 rounded-md hover:bg-blue-500 text-sm"
          >
            OK
          </button>
        </div>
      )}
    </>
  );
}

