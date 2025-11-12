import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { valibotResolver } from "@hookform/resolvers/valibot";
import * as v from "valibot";
import api from "../lib/axios.js";

interface Comment {
  id: string;
  content: string;
  userId: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
  parentId?: string;
  replies?: Comment[];
  editedAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface CommentThreadProps {
  taskId: string;
}

const commentSchema = v.object({
  content: v.pipe(v.string(), v.minLength(1, "Comentário não pode estar vazio")),
});

type CommentFormData = v.InferInput<typeof commentSchema>;

export default function CommentThread({ taskId }: CommentThreadProps) {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const userStr = localStorage.getItem("user") || localStorage.getItem("impersonatedUser");
  const currentUser = userStr ? JSON.parse(userStr) : null;

  const { data: comments, isLoading } = useQuery<Comment[]>({
    queryKey: ["comments", taskId],
    queryFn: () => api.get(`/comments/tasks/${taskId}`).then((res) => res.data),
    enabled: !!taskId,
  });

  const createMutation = useMutation({
    mutationFn: (data: { content: string; parentId?: string }) =>
      api.post(`/comments/tasks/${taskId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comments", taskId] });
      queryClient.invalidateQueries({ queryKey: ["all-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, content }: { id: string; content: string }) =>
      api.patch(`/comments/${id}`, { content }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comments", taskId] });
      setEditingId(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/comments/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comments", taskId] });
      queryClient.invalidateQueries({ queryKey: ["all-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<CommentFormData>({
    resolver: valibotResolver(commentSchema),
    defaultValues: {
      content: "",
    },
  });

  const {
    register: registerReply,
    handleSubmit: handleSubmitReply,
    formState: { errors: errorsReply, isSubmitting: isSubmittingReply },
    reset: resetReply,
  } = useForm<CommentFormData>({
    resolver: valibotResolver(commentSchema),
    defaultValues: {
      content: "",
    },
  });

  // Form para edição (compartilhado, mas controlado por editingId)
  const {
    register: registerEdit,
    handleSubmit: handleSubmitEdit,
    formState: { errors: errorsEdit, isSubmitting: isSubmittingEdit },
    reset: resetEdit,
    setValue: setValueEdit,
  } = useForm<CommentFormData>({
    resolver: valibotResolver(commentSchema),
    defaultValues: {
      content: "",
    },
  });

  const onSubmit = async (data: CommentFormData) => {
    try {
      await createMutation.mutateAsync({ content: data.content });
      reset();
    } catch (error) {
      console.error("Erro ao criar comentário:", error);
    }
  };

  const onSubmitReply = async (data: CommentFormData, parentId: string) => {
    try {
      await createMutation.mutateAsync({ content: data.content, parentId });
      resetReply();
      setReplyingToId(null);
    } catch (error) {
      console.error("Erro ao responder comentário:", error);
    }
  };


  const handleDelete = (id: string) => {
    if (!window.confirm("Tem certeza que deseja excluir este comentário?")) return;
    deleteMutation.mutate(id);
  };

  // Processar menções (@nome)
  const processMentions = (content: string) => {
    const mentionRegex = /@(\w+)/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = mentionRegex.exec(content)) !== null) {
      // Adicionar texto antes da menção
      if (match.index > lastIndex) {
        parts.push({ type: "text", content: content.substring(lastIndex, match.index) });
      }
      // Adicionar menção
      parts.push({ type: "mention", content: match[1], full: match[0] });
      lastIndex = mentionRegex.lastIndex;
    }

    // Adicionar texto restante
    if (lastIndex < content.length) {
      parts.push({ type: "text", content: content.substring(lastIndex) });
    }

    if (parts.length === 0) {
      return [{ type: "text", content }];
    }

    return parts;
  };

  const renderCommentContent = (content: string) => {
    const parts = processMentions(content);
    return (
      <span>
        {parts.map((part, idx) => {
          if (part.type === "mention") {
            return (
              <span key={idx} className="text-indigo-400 font-medium">
                {part.full}
              </span>
            );
          }
          // Preservar quebras de linha
          const lines = part.content.split("\n");
          return (
            <span key={idx}>
              {lines.map((line, lineIdx) => (
                <span key={lineIdx}>
                  {line}
                  {lineIdx < lines.length - 1 && <br />}
                </span>
              ))}
            </span>
          );
        })}
      </span>
    );
  };

  const handleEditClick = (comment: Comment) => {
    setEditingId(comment.id);
    setValueEdit("content", comment.content);
  };

  const handleCancelEditClick = () => {
    setEditingId(null);
    resetEdit();
  };

  const CommentItem = ({ comment, isReply = false }: { comment: Comment; isReply?: boolean }) => {
    const isOwner = currentUser?.id === comment.userId;
    const isEditing = editingId === comment.id;

    return (
      <div className={`${isReply ? "ml-8 mt-2" : ""}`}>
        <div className="flex items-start gap-3 p-3 bg-gray-700 rounded-md hover:bg-gray-600 transition-colors">
          <div className="flex-shrink-0">
            <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-bold">
              {comment.user.name.charAt(0).toUpperCase()}
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-medium text-gray-100">{comment.user.name}</span>
              <span className="text-xs text-gray-400">
                {new Date(comment.createdAt).toLocaleDateString("pt-BR", {
                  dateStyle: "short",
                  timeStyle: "short",
                })}
              </span>
              {comment.editedAt && (
                <span className="text-xs text-gray-500">(editado)</span>
              )}
            </div>

            {isEditing ? (
              <form
                onSubmit={handleSubmitEdit(async (data) => {
                  await updateMutation.mutateAsync({ id: comment.id, content: data.content });
                })}
                className="space-y-2"
              >
                <textarea
                  {...registerEdit("content")}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-800 text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Digite seu comentário..."
                />
                {errorsEdit.content && (
                  <p className="text-xs text-red-400">{errorsEdit.content.message}</p>
                )}
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={isSubmittingEdit || updateMutation.isPending}
                    className="px-3 py-1 text-xs bg-indigo-700 text-white rounded-md hover:bg-indigo-600 disabled:opacity-50"
                  >
                    Salvar
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelEditClick}
                    className="px-3 py-1 text-xs border border-gray-600 text-gray-300 rounded-md hover:bg-gray-700"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            ) : (
              <>
                <div className="text-sm text-gray-300 whitespace-pre-wrap">
                  {renderCommentContent(comment.content)}
                </div>
                <div className="flex items-center gap-2 mt-2">
                  {!isReply && (
                    <button
                      onClick={() => setReplyingToId(comment.id)}
                      className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                    >
                      Responder
                    </button>
                  )}
                  {isOwner && (
                    <>
                      <button
                        onClick={() => handleEditClick(comment)}
                        className="text-xs text-gray-400 hover:text-gray-300 transition-colors"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDelete(comment.id)}
                        disabled={deleteMutation.isPending}
                        className="text-xs text-red-400 hover:text-red-300 transition-colors disabled:opacity-50"
                      >
                        Excluir
                      </button>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Formulário de resposta */}
        {replyingToId === comment.id && (
          <form
            onSubmit={handleSubmitReply((data) => onSubmitReply(data, comment.id))}
            className="ml-8 mt-2 space-y-2"
          >
            <textarea
              {...registerReply("content")}
              rows={2}
              className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-800 text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Digite sua resposta..."
            />
            {errorsReply.content && (
              <p className="text-xs text-red-400">{errorsReply.content.message}</p>
            )}
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={isSubmittingReply}
                className="px-3 py-1 text-xs bg-indigo-700 text-white rounded-md hover:bg-indigo-600 disabled:opacity-50"
              >
                Responder
              </button>
              <button
                type="button"
                onClick={() => {
                  setReplyingToId(null);
                  resetReply();
                }}
                className="px-3 py-1 text-xs border border-gray-600 text-gray-300 rounded-md hover:bg-gray-700"
              >
                Cancelar
              </button>
            </div>
          </form>
        )}

        {/* Respostas */}
        {comment.replies && comment.replies.length > 0 && (
          <div className="mt-2">
            {comment.replies.map((reply) => (
              <CommentItem key={reply.id} comment={reply} isReply={true} />
            ))}
          </div>
        )}
      </div>
    );
  };

  if (isLoading) {
    return <div className="text-sm text-gray-400">Carregando comentários...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-300">
          Comentários {comments && comments.length > 0 && `(${comments.length})`}
        </h3>
      </div>

      {/* Formulário de novo comentário */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-2">
        <textarea
          {...register("content")}
          rows={3}
          className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
          placeholder="Digite seu comentário... (use @nome para mencionar usuários)"
        />
        {errors.content && (
          <p className="text-xs text-red-400">{errors.content.message}</p>
        )}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting || createMutation.isPending}
            className="px-4 py-2 text-sm bg-indigo-700 text-white rounded-md hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting || createMutation.isPending ? "Enviando..." : "Comentar"}
          </button>
        </div>
      </form>

      {/* Lista de comentários */}
      {comments && comments.length > 0 ? (
        <div className="space-y-3">
          {comments.map((comment) => (
            <CommentItem key={comment.id} comment={comment} />
          ))}
        </div>
      ) : (
        <div className="text-sm text-gray-500 text-center py-4">
          Nenhum comentário ainda. Seja o primeiro a comentar!
        </div>
      )}
    </div>
  );
}

