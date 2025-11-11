import { useState, useEffect, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../lib/axios.js";

interface TimerState {
  taskId: string;
  startTime: number;
  elapsedSeconds: number;
  isRunning: boolean;
}

const STORAGE_KEY = "activeTaskTimers";

export function useTaskTimer(taskId: string) {
  const queryClient = useQueryClient();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const [timerState, setTimerState] = useState<TimerState | null>(() => {
    // Recuperar do localStorage
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const timers: Record<string, TimerState> = JSON.parse(stored);
      return timers[taskId] || null;
    }
    return null;
  });

  const saveTimerMutation = useMutation({
    mutationFn: async ({ hours, notes }: { hours: number; notes?: string }) => {
      return api.post("/time", {
        taskId,
        hours,
        date: new Date().toISOString(),
        notes,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["time-entries"] });
    },
  });

  // Salvar no localStorage sempre que o estado mudar
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    const timers: Record<string, TimerState> = stored ? JSON.parse(stored) : {};
    
    if (timerState) {
      timers[taskId] = timerState;
    } else {
      delete timers[taskId];
    }
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(timers));
  }, [timerState, taskId]);

  // Atualizar timer a cada segundo quando estiver rodando (força re-render)
  const [, forceUpdate] = useState(0);
  useEffect(() => {
    if (timerState?.isRunning) {
      intervalRef.current = setInterval(() => {
        // Força re-render para atualizar o tempo exibido
        forceUpdate((prev) => prev + 1);
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [timerState?.isRunning]);

  const startTimer = () => {
    const now = Date.now();
    setTimerState((prev) => ({
      taskId,
      startTime: now,
      elapsedSeconds: prev?.elapsedSeconds || 0,
      isRunning: true,
    }));
  };

  const pauseTimer = () => {
    if (timerState) {
      const now = Date.now();
      const additionalSeconds = Math.floor((now - timerState.startTime) / 1000);
      setTimerState({
        ...timerState,
        elapsedSeconds: timerState.elapsedSeconds + additionalSeconds,
        isRunning: false,
      });
    }
  };

  const stopTimer = async (notes?: string) => {
    if (!timerState) return;

    const now = Date.now();
    const additionalSeconds = Math.floor((now - timerState.startTime) / 1000);
    const totalSeconds = timerState.elapsedSeconds + additionalSeconds;
    const totalHours = totalSeconds / 3600;

    // Salvar no backend
    if (totalHours > 0) {
      await saveTimerMutation.mutateAsync({ hours: totalHours, notes });
    }

    // Limpar timer
    setTimerState(null);
  };

  const resetTimer = () => {
    setTimerState(null);
  };

  // Calcular tempo decorrido atual
  const getElapsedTime = () => {
    if (!timerState) return 0;
    
    if (timerState.isRunning) {
      const now = Date.now();
      const additionalSeconds = Math.floor((now - timerState.startTime) / 1000);
      return timerState.elapsedSeconds + additionalSeconds;
    }
    
    return timerState.elapsedSeconds;
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  return {
    isRunning: timerState?.isRunning || false,
    elapsedSeconds: getElapsedTime(),
    formattedTime: formatTime(getElapsedTime()),
    startTimer,
    pauseTimer,
    stopTimer,
    resetTimer,
    isLoading: saveTimerMutation.isPending,
  };
}

