import { useRouteError, isRouteErrorResponse, useNavigate } from "react-router-dom";

export default function ErrorPage() {
  const error = useRouteError();
  const navigate = useNavigate();

  let errorMessage = "Algo deu errado!";
  let errorStatus = 500;

  if (isRouteErrorResponse(error)) {
    errorStatus = error.status;
    if (error.status === 404) {
      errorMessage = "Página não encontrada";
    } else if (error.status === 403) {
      errorMessage = "Você não tem permissão para acessar esta página";
    } else if (error.status === 401) {
      errorMessage = "Não autorizado. Faça login novamente.";
    } else {
      errorMessage = error.statusText || errorMessage;
    }
  } else if (error instanceof Error) {
    errorMessage = error.message;
  }

  return (
    <div className="min-h-screen bg-surface text-primary transition-colors duration-200 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="mb-8">
          <h1 className="text-9xl font-bold text-indigo-600">{errorStatus}</h1>
          <h2 className="text-3xl font-bold text-primary mt-4">{errorMessage}</h2>
          <p className="text-muted mt-4">
            {errorStatus === 404
              ? "A página que você está procurando não existe ou foi movida."
              : "Ocorreu um erro inesperado. Por favor, tente novamente."}
          </p>
        </div>
        
        <div className="flex gap-4 justify-center">
          <button
            onClick={() => navigate(-1)}
            className="px-6 py-3 bg-surface-muted text-primary rounded-md hover:bg-surface-elevated transition-colors border border-subtle"
          >
            Voltar
          </button>
          <button
            onClick={() => navigate("/")}
            className="px-6 py-3 bg-indigo-700 text-white rounded-md hover:bg-indigo-600 transition-colors"
          >
            Ir para Início
          </button>
        </div>

        {process.env.NODE_ENV === "development" && error instanceof Error && (
          <div className="mt-8 p-4 bg-surface-elevated border border-subtle rounded-md text-left">
            <p className="text-red-400 text-sm font-mono">{error.stack}</p>
          </div>
        )}
      </div>
    </div>
  );
}

