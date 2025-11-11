import { useQuery } from "@tanstack/react-query";
import api from "../lib/axios.js";

interface Tag {
  id: string;
  name: string;
  color: string;
  projectId?: string;
}

interface TagFilterProps {
  projectId: string;
  selectedTagIds: string[];
  onTagToggle: (tagId: string) => void;
  onClearAll: () => void;
}

export default function TagFilter({
  projectId,
  selectedTagIds,
  onTagToggle,
  onClearAll,
}: TagFilterProps) {
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

  const allTags = [
    ...(projectTags || []),
    ...(globalTags || []).filter((gt) => !projectTags?.some((pt) => pt.id === gt.id)),
  ];

  if (isLoadingProject || isLoadingGlobal) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-400">
        <span>Filtrar por tags:</span>
        <span>Carregando...</span>
      </div>
    );
  }

  if (allTags.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-sm text-gray-300 font-medium">Filtrar por tags:</span>
      <div className="flex items-center gap-2 flex-wrap">
        {allTags.map((tag) => {
          const isSelected = selectedTagIds.includes(tag.id);
          return (
            <button
              key={tag.id}
              type="button"
              onClick={() => onTagToggle(tag.id)}
              className={`px-2 py-1 text-xs rounded-md transition-all ${
                isSelected
                  ? "ring-2 ring-indigo-400 ring-offset-2 ring-offset-gray-800"
                  : "opacity-60 hover:opacity-100"
              }`}
              style={{
                backgroundColor: isSelected ? tag.color : `${tag.color}40`,
                color: isSelected ? "#fff" : tag.color,
              }}
            >
              {tag.name}
            </button>
          );
        })}
        {selectedTagIds.length > 0 && (
          <button
            type="button"
            onClick={onClearAll}
            className="px-2 py-1 text-xs text-gray-400 hover:text-gray-300 transition-colors"
          >
            Limpar filtros
          </button>
        )}
      </div>
    </div>
  );
}

