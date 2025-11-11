import { useState } from "react";
import { useTaskTimer } from "../hooks/useTaskTimer.js";

interface TaskTimerProps {
  taskId: string;
  taskTitle?: string;
  compact?: boolean;
}

export default function TaskTimer({ taskId, taskTitle, compact = false }: TaskTimerProps) {
  const { isRunning, formattedTime, startTimer, pauseTimer, stopTimer, isLoading } = useTaskTimer(taskId);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [notes, setNotes] = useState("");

  const handleStop = async () => {
    if (isRunning) {
      setShowNotesModal(true);
    } else {
      await stopTimer();
    }
  };

  const handleConfirmStop = async () => {
    await stopTimer(notes || undefined);
    setShowNotesModal(false);
    setNotes("");
  };

  if (compact) {
    return (
      <>
        <div className="flex items-center gap-2">
          {isRunning && (
            <span className="flex items-center gap-1 text-xs text-green-400">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
              {formattedTime}
            </span>
          )}
          {!isRunning && (
            <button
              onClick={startTimer}
              disabled={isLoading}
              className="px-2 py-1 text-xs bg-green-700 text-white rounded hover:bg-green-600 disabled:opacity-50"
              title="Iniciar cronômetro"
            >
              ▶ Iniciar
            </button>
          )}
          {isRunning && (
            <>
              <button
                onClick={pauseTimer}
                disabled={isLoading}
                className="px-2 py-1 text-xs bg-yellow-700 text-yellow-100 rounded hover:bg-yellow-600 disabled:opacity-50"
                title="Pausar cronômetro"
              >
                ⏸ Pausar
              </button>
              <button
                onClick={handleStop}
                disabled={isLoading}
                className="px-2 py-1 text-xs bg-red-700 text-white rounded hover:bg-red-600 disabled:opacity-50"
                title="Parar e salvar tempo"
              >
                ⏹ Parar
              </button>
            </>
          )}
        </div>

        {/* Modal para adicionar notas ao parar */}
        {showNotesModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[200]">
            <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-md m-4">
              <div className="flex justify-between items-center p-6 border-b border-gray-700">
                <h2 className="text-xl font-bold text-gray-100">Salvar Tempo Trabalhado</h2>
                <button
                  onClick={() => {
                    setShowNotesModal(false);
                    setNotes("");
                  }}
                  className="text-gray-400 hover:text-gray-300"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="p-6">
                <div className="mb-4">
                  <p className="text-gray-300 mb-2">
                    Tempo trabalhado: <span className="font-bold text-indigo-400">{formattedTime}</span>
                  </p>
                  {taskTitle && (
                    <p className="text-sm text-gray-400">Tarefa: {taskTitle}</p>
                  )}
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Notas (opcional)
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    rows={3}
                    placeholder="Adicione notas sobre o trabalho realizado..."
                  />
                </div>
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => {
                      setShowNotesModal(false);
                      setNotes("");
                    }}
                    className="px-4 py-2 border border-gray-600 text-gray-300 rounded-md hover:bg-gray-700"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleConfirmStop}
                    disabled={isLoading}
                    className="px-4 py-2 bg-indigo-700 text-white rounded-md hover:bg-indigo-600 disabled:opacity-50"
                  >
                    {isLoading ? "Salvando..." : "Salvar Tempo"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-2 p-3 bg-gray-800 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-400">Tempo trabalhado</p>
            <p className={`text-2xl font-bold ${isRunning ? "text-green-400" : "text-gray-300"}`}>
              {formattedTime}
            </p>
          </div>
          {isRunning && (
            <span className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></span>
          )}
        </div>
        
        <div className="flex gap-2">
          {!isRunning ? (
            <button
              onClick={startTimer}
              disabled={isLoading}
              className="flex-1 px-4 py-2 bg-green-700 text-white rounded-md hover:bg-green-600 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
              </svg>
              Iniciar
            </button>
          ) : (
            <>
              <button
                onClick={pauseTimer}
                disabled={isLoading}
                className="flex-1 px-4 py-2 bg-yellow-700 text-yellow-100 rounded-md hover:bg-yellow-600 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                Pausar
              </button>
              <button
                onClick={handleStop}
                disabled={isLoading}
                className="flex-1 px-4 py-2 bg-red-700 text-white rounded-md hover:bg-red-600 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" />
                </svg>
                Parar
              </button>
            </>
          )}
        </div>
      </div>

      {/* Modal para adicionar notas ao parar */}
      {showNotesModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[200]">
          <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-md m-4">
            <div className="flex justify-between items-center p-6 border-b border-gray-700">
              <h2 className="text-xl font-bold text-gray-100">Salvar Tempo Trabalhado</h2>
              <button
                onClick={() => {
                  setShowNotesModal(false);
                  setNotes("");
                }}
                className="text-gray-400 hover:text-gray-300"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6">
              <div className="mb-4">
                <p className="text-gray-300 mb-2">
                  Tempo trabalhado: <span className="font-bold text-indigo-400">{formattedTime}</span>
                </p>
                {taskTitle && (
                  <p className="text-sm text-gray-400">Tarefa: {taskTitle}</p>
                )}
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Notas (opcional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  rows={3}
                  placeholder="Adicione notas sobre o trabalho realizado..."
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowNotesModal(false);
                    setNotes("");
                  }}
                  className="px-4 py-2 border border-gray-600 text-gray-300 rounded-md hover:bg-gray-700"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmStop}
                  disabled={isLoading}
                  className="px-4 py-2 bg-indigo-700 text-white rounded-md hover:bg-indigo-600 disabled:opacity-50"
                >
                  {isLoading ? "Salvando..." : "Salvar Tempo"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

