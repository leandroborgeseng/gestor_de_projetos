import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../lib/axios.js";

interface Tag {
  id: string;
  name: string;
  color: string;
  projectId?: string;
  _count?: {
    tasks: number;
  };
}

interface TagSelectorProps {
  projectId: string;
  taskId: string;
  selectedTagIds?: string[];
  onTagsChange?: (tagIds: string[]) => void;
  readOnly?: boolean;
  preSelectMode?: boolean; // Modo para pré-seleção antes de criar a tarefa
}

export default function TagSelector({
  projectId,
  taskId,
  selectedTagIds = [],
  onTagsChange,
  readOnly = false,
  preSelectMode = false,
}: TagSelectorProps) {
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState("#6366f1");

  // Buscar tags do projeto e globais
  const { data: projectTags, isLoading: isLoadingProject } = useQuery<Tag[]>({
    queryKey: ["tags", projectId],
    queryFn: () => api.get(`/tags?projectId=${projectId}`).then((res) => res.data),
    enabled: !!projectId,
  });

  const { data: globalTags, isLoading: isLoadingGlobal } = useQuery<Tag[]>({
    queryKey: ["tags", "global"],
    queryFn: () => api.get("/tags").then((res) => res.data),
  });

  const createTagMutation = useMutation({
    mutationFn: (data: { name: string; color: string; projectId?: string }) =>
      api.post("/tags", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tags"] });
      setIsCreating(false);
      setNewTagName("");
    },
  });

  const addTagMutation = useMutation({
    mutationFn: (tagIdToAdd: string) => api.post(`/tags/tasks/${taskId}`, { tagId: tagIdToAdd }),
    onSuccess: (_, tagIdToAdd) => {
      queryClient.invalidateQueries({ queryKey: ["tags", "tasks", taskId] });
      queryClient.invalidateQueries({ queryKey: ["all-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      if (onTagsChange) {
        onTagsChange([...selectedTagIds, tagIdToAdd]);
      }
    },
  });

  const removeTagMutation = useMutation({
    mutationFn: (tagIdToRemove: string) => api.delete(`/tags/tasks/${taskId}/${tagIdToRemove}`),
    onSuccess: (_, tagIdToRemove) => {
      queryClient.invalidateQueries({ queryKey: ["tags", "tasks", taskId] });
      queryClient.invalidateQueries({ queryKey: ["all-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      if (onTagsChange) {
        onTagsChange(selectedTagIds.filter((id) => id !== tagIdToRemove));
      }
    },
  });

  const handleToggleTag = (tagId: string) => {
    if (readOnly) return;

    // Modo pré-seleção (para CreateTaskModal)
    if (preSelectMode || taskId === "temp") {
      if (onTagsChange) {
        if (selectedTagIds.includes(tagId)) {
          onTagsChange(selectedTagIds.filter((id) => id !== tagId));
        } else {
          onTagsChange([...selectedTagIds, tagId]);
        }
      }
      return;
    }

    // Modo normal (para EditTaskModal)
    if (selectedTagIds.includes(tagId)) {
      removeTagMutation.mutate(tagId);
    } else {
      addTagMutation.mutate(tagId);
    }
  };

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return;

    try {
      const result = await createTagMutation.mutateAsync({
        name: newTagName.trim(),
        color: newTagColor,
        projectId,
      });
      // Adicionar automaticamente a tag criada à tarefa
      if (result.data?.id) {
        await addTagMutation.mutateAsync(result.data.id);
      }
      setNewTagName("");
      setNewTagColor("#6366f1");
    } catch (error) {
      console.error("Erro ao criar tag:", error);
    }
  };

  const allTags = [
    ...(projectTags || []),
    ...(globalTags || []).filter((gt) => !projectTags?.some((pt) => pt.id === gt.id)),
  ];

  if (isLoadingProject || isLoadingGlobal) {
    return <div className="text-xs text-gray-400">Carregando tags...</div>;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-300">Tags</label>
        {!readOnly && (
          <button
            type="button"
            onClick={() => setIsCreating(!isCreating)}
            className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            {isCreating ? "Cancelar" : "+ Nova Tag"}
          </button>
        )}
      </div>

      {/* Formulário de criação de tag */}
      {isCreating && (
        <div className="p-3 bg-gray-700 rounded-md space-y-2">
          <input
            type="text"
            value={newTagName}
            onChange={(e) => setNewTagName(e.target.value)}
            placeholder="Nome da tag"
            className="w-full px-2 py-1 text-sm border border-gray-600 rounded bg-gray-800 text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={newTagColor}
              onChange={(e) => setNewTagColor(e.target.value)}
              className="w-8 h-8 rounded border border-gray-600 cursor-pointer"
            />
            <button
              type="button"
              onClick={handleCreateTag}
              disabled={!newTagName.trim() || createTagMutation.isPending}
              className="px-3 py-1 text-xs bg-indigo-700 text-white rounded hover:bg-indigo-600 disabled:opacity-50"
            >
              {createTagMutation.isPending ? "Criando..." : "Criar"}
            </button>
          </div>
        </div>
      )}

      {/* Lista de tags disponíveis */}
      {allTags.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {allTags.map((tag) => {
            const isSelected = selectedTagIds.includes(tag.id);
            return (
              <button
                key={tag.id}
                type="button"
                onClick={() => handleToggleTag(tag.id)}
                disabled={readOnly || addTagMutation.isPending || removeTagMutation.isPending}
                className={`px-2 py-1 text-xs rounded-md transition-all ${
                  isSelected
                    ? "ring-2 ring-indigo-400 ring-offset-2 ring-offset-gray-800"
                    : "opacity-60 hover:opacity-100"
                } ${readOnly ? "cursor-default" : "cursor-pointer"}`}
                style={{
                  backgroundColor: isSelected ? tag.color : `${tag.color}40`,
                  color: isSelected ? "#fff" : tag.color,
                }}
              >
                {tag.name}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="text-xs text-gray-500">
          Nenhuma tag disponível. {!readOnly && "Crie uma tag para começar."}
        </div>
      )}
    </div>
  );
}

