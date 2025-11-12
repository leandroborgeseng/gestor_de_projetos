import { useEffect, useMemo, useRef, useState } from "react";
import { useForm, type UseFormRegisterReturn } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "../lib/axios.js";
import {
  getActiveCompanyId,
  getCompanies,
  syncCompanyContext,
  type CompanyInfo,
} from "../utils/company.js";
import { applyCompanyTheme } from "../utils/theme.js";
import { buildAssetUrl } from "../utils/api.js";

type CompanyPlan = "FREE" | "PRO" | "ENTERPRISE";

interface Company extends CompanyInfo {
  slug: string;
  plan: CompanyPlan;
  isActive: boolean;
  maxUsers?: number | null;
  maxProjects?: number | null;
  maxStorageMb?: number | null;
  createdAt: string;
  _count?: {
    projects: number;
    users: number;
  };
}

interface UserSummary {
  id: string;
  name: string;
  email: string;
}

type NumberLike = number | null | undefined;

interface CreateCompanyFormValues {
  name: string;
  slug: string;
  ownerUserId: string;
  plan: CompanyPlan;
  maxUsers?: string;
  maxProjects?: string;
  maxStorageMb?: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  lightPrimaryColor: string;
  lightSecondaryColor: string;
  lightAccentColor: string;
  lightBackgroundColor: string;
}

interface EditCompanyFormValues {
  name: string;
  slug: string;
  plan: CompanyPlan;
  isActive: boolean;
  maxUsers?: string;
  maxProjects?: string;
  maxStorageMb?: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  lightPrimaryColor: string;
  lightSecondaryColor: string;
  lightAccentColor: string;
  lightBackgroundColor: string;
}

const PLAN_OPTIONS: CompanyPlan[] = ["FREE", "PRO", "ENTERPRISE"];

export default function CompaniesManagement({ embedded = false }: { embedded?: boolean } = {}) {
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [deletingCompany, setDeletingCompany] = useState<Company | null>(null);
  const [userRole, setUserRole] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const stored = localStorage.getItem("user");
      return stored ? (JSON.parse(stored).role as string | undefined) ?? null : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const updateUserRole = () => {
      try {
        const stored = localStorage.getItem("user");
        setUserRole(stored ? (JSON.parse(stored).role as string | undefined) ?? null : null);
      } catch {
        setUserRole(null);
      }
    };
    window.addEventListener("storage", updateUserRole);
    return () => {
      window.removeEventListener("storage", updateUserRole);
    };
  }, []);

  const { data: companies, isLoading, isError, error } = useQuery<Company[]>({
    queryKey: ["companies", "admin"],
    queryFn: () => api.get("/companies").then((res) => res.data),
  });

  const { data: usersResponse } = useQuery<{ data: UserSummary[] }>({
    queryKey: ["users", "admin"],
    queryFn: () => api.get("/users", { params: { limit: 100, page: 1 } }).then((res) => res.data),
  });

  const availableOwners = useMemo(() => usersResponse?.data ?? [], [usersResponse]);

  const membershipMap = useMemo(() => {
    if (typeof window === "undefined") {
      return new Map<string, string | undefined>();
    }
    const stored = getCompanies();
    return new Map(stored.map((company) => [company.id, company.role]));
  }, [companies]);

  const isSuperAdmin = userRole === "SUPERADMIN";

  const syncContext = async () => {
    const latest = await queryClient.fetchQuery({
      queryKey: ["companies", "admin"],
      queryFn: () => api.get<Company[]>("/companies").then((res) => res.data),
    });

    queryClient.setQueryData(["companies", "context"], latest);
    syncCompanyContext(latest as CompanyInfo[], getActiveCompanyId());

    const activeId = getActiveCompanyId();
    const activeCompany =
      (activeId ? latest.find((company) => company.id === activeId) : null) ?? latest[0] ?? null;
    applyCompanyTheme(activeCompany ?? null);
  };

  const createCompany = useMutation({
    mutationFn: (payload: CreateCompanyFormValues) =>
      api.post("/companies", {
        ...payload,
        maxUsers: parseOptionalNumber(payload.maxUsers),
        maxProjects: parseOptionalNumber(payload.maxProjects),
        maxStorageMb: parseOptionalNumber(payload.maxStorageMb),
      }),
    onSuccess: async () => {
      await syncContext();
      setIsCreateOpen(false);
    },
    onError: (err: any) => {
      alert(err?.response?.data?.error ?? "Não foi possível criar a empresa.");
    },
  });

  const updateCompany = useMutation({
    mutationFn: ({ id, values }: { id: string; values: EditCompanyFormValues }) =>
      api.patch(`/companies/${id}`, {
        ...values,
        maxUsers: parseOptionalNumber(values.maxUsers),
        maxProjects: parseOptionalNumber(values.maxProjects),
        maxStorageMb: parseOptionalNumber(values.maxStorageMb),
      }),
    onSuccess: async () => {
      await syncContext();
      setEditingCompany(null);
    },
    onError: (err: any) => {
      alert(err?.response?.data?.error ?? "Não foi possível atualizar a empresa.");
    },
  });

  const deleteCompany = useMutation({
    mutationFn: (id: string) => api.delete(`/companies/${id}`),
    onSuccess: async () => {
      await syncContext();
      setDeletingCompany(null);
    },
    onError: (err: any) => {
      alert(err?.response?.data?.error ?? "Não foi possível apagar a empresa.");
    },
  });

  return (
    <div className={`${embedded ? "p-4" : "p-6"} space-y-6`}>
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-primary">Empresas</h1>
          <p className="text-sm text-muted mt-1">
            Cadastre, edite ou remova empresas. As ações afetam o contexto multi-tenant da plataforma.
          </p>
        </div>
        {isSuperAdmin && (
        <button
          onClick={() => setIsCreateOpen(true)}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-md transition-colors"
        >
          + Nova Empresa
        </button>
        )}
      </header>

      {isLoading ? (
        <div className="text-muted">Carregando empresas...</div>
      ) : isError ? (
        <div className="text-red-400">Falha ao carregar empresas: {(error as any)?.message ?? ""}</div>
      ) : companies && companies.length > 0 ? (
        <div className="bg-surface-elevated border border-subtle rounded-lg overflow-hidden transition-colors duration-200">
          <table className="min-w-full divide-y divide-gray-700">
            <thead className="bg-surface-muted">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted">
                  Empresa
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted">
                  Plano
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted">
                  Limites
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted">
                  Projetos / Usuários
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[color:var(--color-border)] transition-colors">
              {companies.map((company) => {
                const membershipRole = membershipMap.get(company.id);
                const canManageCompany =
                  isSuperAdmin || membershipRole === "OWNER" || membershipRole === "ADMIN";
                const darkLogoUrl = company.logoUrl ? buildAssetUrl(company.logoUrl) : null;
                const lightLogoUrl = company.lightLogoUrl
                  ? buildAssetUrl(company.lightLogoUrl)
                  : company.logoUrl
                  ? buildAssetUrl(company.logoUrl)
                  : null;

                return (
                  <tr key={company.id} className="hover:bg-surface-muted transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-3">
                        <div className="flex items-start gap-4">
                          <div className="flex flex-col gap-3">
                            <LogoPreview
                              label="Tema escuro"
                              url={darkLogoUrl ?? null}
                              backgroundColor={company.backgroundColor ?? "#0F172A"}
                            />
                            <LogoPreview
                              label="Tema claro"
                              url={lightLogoUrl ?? null}
                              backgroundColor={
                                company.lightBackgroundColor ?? company.backgroundColor ?? "#F8FAFC"
                              }
                            />
                        </div>
                          <div className="text-sm">
                            <div className="text-sm text-primary font-semibold">{company.name}</div>
                            <div className="text-xs text-muted">Slug: {company.slug}</div>
                            <div className="text-xs text-muted">
                          Criada em {new Date(company.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                        <div className="space-y-2 text-xs">
                          <ThemePalettePreview
                            variant="dark"
                            colors={[
                              { label: "Primária", value: company.primaryColor },
                              { label: "Secundária", value: company.secondaryColor },
                              { label: "Destaque", value: company.accentColor },
                              { label: "Fundo", value: company.backgroundColor },
                            ]}
                          />
                          <ThemePalettePreview
                            variant="light"
                            colors={[
                              { label: "Primária", value: company.lightPrimaryColor ?? company.primaryColor },
                              { label: "Secundária", value: company.lightSecondaryColor ?? company.secondaryColor },
                              { label: "Destaque", value: company.lightAccentColor ?? company.accentColor },
                              { label: "Fundo", value: company.lightBackgroundColor },
                            ]}
                          />
                        </div>
                    </div>
                  </td>
                    <td className="px-6 py-4 text-sm text-secondary">{company.plan}</td>
                    <td className="px-6 py-4 text-sm text-secondary">
                      <div>Usuários: {formatLimit(company.maxUsers)}</div>
                      <div>Projetos: {formatLimit(company.maxProjects)}</div>
                      <div>Storage: {formatStorage(company.maxStorageMb)}</div>
                  </td>
                    <td className="px-6 py-4 text-sm text-secondary">
                    <div>Projetos: {company._count?.projects ?? 0}</div>
                      <div>Membros: {company._count?.users ?? 0}</div>
                  </td>
                    <td className="px-6 py-4">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        company.isActive
                          ? "bg-green-900/30 text-green-300"
                            : "bg-surface-muted text-secondary"
                      }`}
                    >
                      {company.isActive ? "Ativa" : "Inativa"}
                    </span>
                  </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        {canManageCompany && (
                          <>
                    <button
                      onClick={() => setEditingCompany(company)}
                              className="px-3 py-1.5 text-sm bg-indigo-700 text-white rounded-md hover:bg-indigo-600 transition-colors"
                    >
                      Editar
                    </button>
                    <button
                              onClick={() => setDeletingCompany(company)}
                              className="px-3 py-1.5 text-sm bg-red-700 text-white rounded-md hover:bg-red-600 transition-colors"
                    >
                      Apagar
                    </button>
                          </>
                        )}
                      </div>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-muted">Nenhuma empresa cadastrada.</div>
      )}

      {isCreateOpen && (
        <CompanyModal title="Nova empresa" onClose={() => setIsCreateOpen(false)}>
          <CreateCompanyForm
            owners={availableOwners}
            isSubmitting={createCompany.isPending}
            onSubmit={(values) => createCompany.mutate(values)}
          />
        </CompanyModal>
      )}

      {editingCompany && (
        <CompanyModal title={`Editar ${editingCompany.name}`} onClose={() => setEditingCompany(null)}>
          <>
            <EditCompanyForm
          company={editingCompany}
              isSubmitting={updateCompany.isPending}
              onSubmit={(values) => updateCompany.mutate({ id: editingCompany.id, values })}
            />
            <CompanyBrandingLogos
              company={editingCompany}
              onLogosChange={(next) =>
                setEditingCompany((prev) =>
                  prev ? { ...prev, logoUrl: next.dark, lightLogoUrl: next.light } : prev
                )
              }
              onSyncContext={syncContext}
            />
          </>
        </CompanyModal>
      )}

      {deletingCompany && (
        <CompanyModal title="Confirmar exclusão" onClose={() => setDeletingCompany(null)} size="sm">
          <div className="space-y-4">
            <p className="text-sm text-secondary">
              Tem certeza que deseja remover <span className="font-semibold">{deletingCompany.name}</span>? Essa ação
              não pode ser desfeita.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeletingCompany(null)}
                className="px-4 py-2 border border-subtle text-secondary rounded-md hover:bg-surface-muted"
              >
                Cancelar
              </button>
              <button
                onClick={() => deleteCompany.mutate(deletingCompany.id)}
                disabled={deleteCompany.isPending}
                className="px-4 py-2 bg-red-700 text-white rounded-md hover:bg-red-600 disabled:opacity-50"
              >
                {deleteCompany.isPending ? "Removendo..." : "Apagar"}
              </button>
            </div>
          </div>
        </CompanyModal>
      )}
    </div>
  );
}

function CreateCompanyForm({
  owners,
  onSubmit,
  isSubmitting,
}: {
  owners: UserSummary[];
  onSubmit: (values: CreateCompanyFormValues) => void;
  isSubmitting: boolean;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<CreateCompanyFormValues>({
    defaultValues: {
      name: "",
      slug: "",
      ownerUserId: "",
      plan: "FREE",
      primaryColor: "#4F46E5",
      secondaryColor: "#312E81",
      accentColor: "#F97316",
      backgroundColor: "#0F172A",
      lightPrimaryColor: "#4338CA",
      lightSecondaryColor: "#6366F1",
      lightAccentColor: "#F97316",
      lightBackgroundColor: "#F8FAFC",
    },
  });

  const primaryColorValue = watch("primaryColor");
  const secondaryColorValue = watch("secondaryColor");
  const accentColorValue = watch("accentColor");
  const backgroundColorValue = watch("backgroundColor");
  const lightPrimaryColorValue = watch("lightPrimaryColor");
  const lightSecondaryColorValue = watch("lightSecondaryColor");
  const lightAccentColorValue = watch("lightAccentColor");
  const lightBackgroundColorValue = watch("lightBackgroundColor");

  const colorValidation = {
    required: "Informe a cor",
    pattern: {
      value: /^#[0-9a-fA-F]{3}(?:[0-9a-fA-F]{3})?$/,
      message: "Use um código hexadecimal válido",
    },
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <InputField label="Nome *" error={errors.name?.message}>
            <input
            {...register("name", { required: "Informe o nome da empresa" })}
            className="w-full bg-surface-muted border border-subtle rounded px-3 py-2 text-primary focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors"
              placeholder="Nome da empresa"
            autoFocus
          />
        </InputField>
        <InputField label="Slug *" error={errors.slug?.message}>
            <input
            {...register("slug", {
              required: "Informe o slug",
              pattern: {
                value: /^[a-z0-9-]+$/,
                message: "Use apenas letras minúsculas, números e hífens",
              },
            })}
            className="w-full bg-surface-muted border border-subtle rounded px-3 py-2 text-primary focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors"
              placeholder="ex: minha-empresa"
            />
        </InputField>
        </div>

      <InputField label="Proprietário *" error={errors.ownerUserId?.message}>
            <select
          {...register("ownerUserId", { required: "Selecione o usuário proprietário" })}
          className="w-full bg-surface-muted border border-subtle rounded px-3 py-2 text-primary focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors"
            >
          <option value="">Selecione um usuário</option>
          {owners.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name} - {user.email}
                </option>
              ))}
            </select>
      </InputField>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <InputField label="Plano">
            <select
              {...register("plan")}
            className="w-full bg-surface-muted border border-subtle rounded px-3 py-2 text-primary focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors"
          >
            {PLAN_OPTIONS.map((plan) => (
              <option key={plan} value={plan}>
                {plan}
              </option>
            ))}
            </select>
        </InputField>
        <NumberInputField label="Máx. Usuários" register={register("maxUsers")} />
        <NumberInputField label="Máx. Projetos" register={register("maxProjects")} />
        <NumberInputField label="Máx. Storage (MB)" register={register("maxStorageMb")} />
        </div>

      <div className="border border-subtle rounded-lg p-4 space-y-3 bg-surface-elevated transition-colors duration-200">
        <h3 className="text-sm font-semibold text-primary uppercase tracking-wide">Identidade visual — Tema Escuro</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <ColorInput
              label="Cor primária"
            register={register("primaryColor", colorValidation)}
              error={errors.primaryColor?.message}
              value={primaryColorValue}
            />
            <ColorInput
              label="Cor secundária"
            register={register("secondaryColor", colorValidation)}
              error={errors.secondaryColor?.message}
              value={secondaryColorValue}
            />
            <ColorInput
              label="Cor de destaque"
            register={register("accentColor", colorValidation)}
              error={errors.accentColor?.message}
              value={accentColorValue}
            />
            <ColorInput
              label="Cor de fundo"
            register={register("backgroundColor", colorValidation)}
              error={errors.backgroundColor?.message}
              value={backgroundColorValue}
            />
          </div>
        </div>

      <div className="border border-subtle rounded-lg p-4 space-y-3 bg-surface-elevated transition-colors duration-200">
        <h3 className="text-sm font-semibold text-primary uppercase tracking-wide">Identidade visual — Tema Claro</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <ColorInput
            label="Cor primária (claro)"
            register={register("lightPrimaryColor", colorValidation)}
            error={errors.lightPrimaryColor?.message}
            value={lightPrimaryColorValue}
          />
          <ColorInput
            label="Cor secundária (claro)"
            register={register("lightSecondaryColor", colorValidation)}
            error={errors.lightSecondaryColor?.message}
            value={lightSecondaryColorValue}
          />
          <ColorInput
            label="Cor de destaque (claro)"
            register={register("lightAccentColor", colorValidation)}
            error={errors.lightAccentColor?.message}
            value={lightAccentColorValue}
          />
          <ColorInput
            label="Cor de fundo (claro)"
            register={register("lightBackgroundColor", colorValidation)}
            error={errors.lightBackgroundColor?.message}
            value={lightBackgroundColorValue}
          />
        </div>
      </div>

      <div className="flex justify-end gap-3">
          <button
            type="submit"
          disabled={isSubmitting}
          className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-500 disabled:opacity-50"
          >
          {isSubmitting ? "Salvando..." : "Criar empresa"}
          </button>
        </div>
      </form>
  );
}

function EditCompanyForm({
  company,
  onSubmit,
  isSubmitting,
}: {
  company: Company;
  onSubmit: (values: EditCompanyFormValues) => void;
  isSubmitting: boolean;
}) {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<EditCompanyFormValues>({
    defaultValues: {
      name: company.name,
      slug: company.slug,
      plan: company.plan,
      isActive: company.isActive,
      maxUsers: formatNumberInput(company.maxUsers),
      maxProjects: formatNumberInput(company.maxProjects),
      maxStorageMb: formatNumberInput(company.maxStorageMb),
      primaryColor: company.primaryColor ?? "#4F46E5",
      secondaryColor: company.secondaryColor ?? "#312E81",
      accentColor: company.accentColor ?? "#F97316",
      backgroundColor: company.backgroundColor ?? "#0F172A",
      lightPrimaryColor: company.lightPrimaryColor ?? company.primaryColor ?? "#4338CA",
      lightSecondaryColor: company.lightSecondaryColor ?? company.secondaryColor ?? "#6366F1",
      lightAccentColor: company.lightAccentColor ?? company.accentColor ?? "#F97316",
      lightBackgroundColor: company.lightBackgroundColor ?? "#F8FAFC",
    },
  });

  const primaryColorValue = watch("primaryColor");
  const secondaryColorValue = watch("secondaryColor");
  const accentColorValue = watch("accentColor");
  const backgroundColorValue = watch("backgroundColor");
  const lightPrimaryColorValue = watch("lightPrimaryColor");
  const lightSecondaryColorValue = watch("lightSecondaryColor");
  const lightAccentColorValue = watch("lightAccentColor");
  const lightBackgroundColorValue = watch("lightBackgroundColor");

  const colorValidation = {
    required: "Informe a cor",
    pattern: {
      value: /^#[0-9a-fA-F]{3}(?:[0-9a-fA-F]{3})?$/,
      message: "Use um código hexadecimal válido",
    },
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <InputField label="Nome *" error={errors.name?.message}>
            <input
            {...register("name", { required: "Informe o nome da empresa" })}
            className="w-full bg-surface-muted border border-subtle rounded px-3 py-2 text-primary focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors"
            placeholder="Nome da empresa"
            autoFocus
          />
        </InputField>
        <InputField label="Slug *" error={errors.slug?.message}>
            <input
            {...register("slug", {
              required: "Informe o slug",
              pattern: {
                value: /^[a-z0-9-]+$/,
                message: "Use apenas letras minúsculas, números e hífens",
              },
            })}
            className="w-full bg-surface-muted border border-subtle rounded px-3 py-2 text-primary focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors"
            placeholder="ex: minha-empresa"
          />
        </InputField>
        </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <InputField label="Plano">
            <select
              {...register("plan")}
            className="w-full bg-surface-muted border border-subtle rounded px-3 py-2 text-primary focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors"
          >
            {PLAN_OPTIONS.map((plan) => (
              <option key={plan} value={plan}>
                {plan}
              </option>
            ))}
            </select>
        </InputField>
        <NumberInputField label="Máx. Usuários" register={register("maxUsers")} />
        <NumberInputField label="Máx. Projetos" register={register("maxProjects")} />
        <NumberInputField label="Máx. Storage (MB)" register={register("maxStorageMb")} />
        </div>

      <div className="border border-subtle rounded-lg p-4 space-y-3 bg-surface-elevated transition-colors duration-200">
        <h3 className="text-sm font-semibold text-primary uppercase tracking-wide">Identidade visual — Tema Escuro</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <ColorInput
              label="Cor primária"
            register={register("primaryColor", colorValidation)}
              error={errors.primaryColor?.message}
              value={primaryColorValue}
            />
            <ColorInput
              label="Cor secundária"
            register={register("secondaryColor", colorValidation)}
              error={errors.secondaryColor?.message}
              value={secondaryColorValue}
            />
            <ColorInput
              label="Cor de destaque"
            register={register("accentColor", colorValidation)}
              error={errors.accentColor?.message}
              value={accentColorValue}
            />
            <ColorInput
              label="Cor de fundo"
            register={register("backgroundColor", colorValidation)}
              error={errors.backgroundColor?.message}
              value={backgroundColorValue}
            />
        </div>
          </div>

      <div className="border border-subtle rounded-lg p-4 space-y-3 bg-surface-elevated transition-colors duration-200">
        <h3 className="text-sm font-semibold text-primary uppercase tracking-wide">Identidade visual — Tema Claro</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <ColorInput
            label="Cor primária (claro)"
            register={register("lightPrimaryColor", colorValidation)}
            error={errors.lightPrimaryColor?.message}
            value={lightPrimaryColorValue}
          />
          <ColorInput
            label="Cor secundária (claro)"
            register={register("lightSecondaryColor", colorValidation)}
            error={errors.lightSecondaryColor?.message}
            value={lightSecondaryColorValue}
          />
          <ColorInput
            label="Cor de destaque (claro)"
            register={register("lightAccentColor", colorValidation)}
            error={errors.lightAccentColor?.message}
            value={lightAccentColorValue}
          />
          <ColorInput
            label="Cor de fundo (claro)"
            register={register("lightBackgroundColor", colorValidation)}
            error={errors.lightBackgroundColor?.message}
            value={lightBackgroundColorValue}
          />
                </div>
      </div>

      <div className="flex items-center gap-2">
                <input
          type="checkbox"
          id="company-is-active"
          {...register("isActive")}
          className="h-4 w-4 text-indigo-600 border-gray-600 rounded"
        />
        <label htmlFor="company-is-active" className="text-sm text-secondary">
          Empresa ativa
        </label>
        </div>

      <div className="flex justify-end gap-3">
          <button
            type="submit"
          disabled={isSubmitting}
          className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-500 disabled:opacity-50"
        >
          {isSubmitting ? "Salvando..." : "Salvar alterações"}
          </button>
        </div>
      </form>
  );
}

function CompanyBrandingLogos({
  company,
  onLogosChange,
  onSyncContext,
}: {
  company: Company;
  onLogosChange: (logos: { dark: string | null; light: string | null }) => void;
  onSyncContext: () => Promise<void>;
}) {
  const [logos, setLogos] = useState<{ dark: string | null; light: string | null }>({
    dark: company.logoUrl ?? null,
    light: company.lightLogoUrl ?? null,
  });
  const [errors, setErrors] = useState<{ dark: string | null; light: string | null }>({
    dark: null,
    light: null,
  });
  const [uploading, setUploading] = useState<"dark" | "light" | null>(null);
  const darkInputRef = useRef<HTMLInputElement>(null);
  const lightInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLogos({
      dark: company.logoUrl ?? null,
      light: company.lightLogoUrl ?? null,
    });
    setErrors({ dark: null, light: null });
  }, [company.id, company.logoUrl, company.lightLogoUrl]);

  const updateLogos = (next: { dark: string | null; light: string | null }) => {
    setLogos(next);
    onLogosChange(next);
  };

  const handleUpload = async (theme: "dark" | "light", file: File) => {
    const endpoint = `/companies/${company.id}/logo${theme === "light" ? "?theme=light" : ""}`;
    const formData = new FormData();
    formData.append("logo", file);
    setUploading(theme);
    setErrors((prev) => ({ ...prev, [theme]: null }));
    try {
      const response = await api.post(endpoint, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const next = {
        dark: response.data.logoUrl ?? logos.dark,
        light: response.data.lightLogoUrl ?? logos.light,
      };
      updateLogos(next);
      await onSyncContext();
    } catch (error: any) {
      setErrors((prev) => ({
        ...prev,
        [theme]: error?.response?.data?.error ?? "Falha ao enviar o logotipo. Tente novamente.",
      }));
    } finally {
      setUploading(null);
    }
  };

  const handleRemove = async (theme: "dark" | "light") => {
    const endpoint = `/companies/${company.id}/logo${theme === "light" ? "?theme=light" : ""}`;
    setUploading(theme);
    setErrors((prev) => ({ ...prev, [theme]: null }));
    try {
      await api.delete(endpoint);
      const next =
        theme === "dark" ? { dark: null, light: logos.light } : { dark: logos.dark, light: null };
      updateLogos(next);
      await onSyncContext();
    } catch (error: any) {
      setErrors((prev) => ({
        ...prev,
        [theme]: error?.response?.data?.error ?? "Falha ao remover o logotipo.",
      }));
    } finally {
      setUploading(null);
    }
  };

  const handleFileChange =
    (theme: "dark" | "light") => async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;
      await handleUpload(theme, file);
      event.target.value = "";
    };

  const cards = [
    {
      theme: "dark" as const,
      title: "Logotipo — Tema Escuro",
      description: "Usado quando o aplicativo está em modo escuro.",
      backgroundColor: company.backgroundColor ?? "#0F172A",
      inputRef: darkInputRef,
    },
    {
      theme: "light" as const,
      title: "Logotipo — Tema Claro",
      description: "Usado quando o aplicativo está em modo claro.",
      backgroundColor: company.lightBackgroundColor ?? company.backgroundColor ?? "#F8FAFC",
      inputRef: lightInputRef,
    },
  ];

  const getDisplayUrl = (value: string | null) => (value ? buildAssetUrl(value) : null);

  return (
    <div className="border border-subtle rounded-lg p-4 space-y-4 bg-surface-elevated transition-colors duration-200">
      <h3 className="text-sm font-semibold text-primary uppercase tracking-wide">Logotipos</h3>
      <p className="text-xs text-muted">
        Carregue versões diferentes do logotipo para temas escuro e claro. Utilize imagens com fundo transparente
        (PNG/SVG) para melhores resultados.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {cards.map(({ theme, title, description, backgroundColor, inputRef }) => {
          const url = getDisplayUrl(logos[theme]);
          return (
            <div key={theme} className="border border-subtle rounded-md p-4 space-y-3 bg-surface">
              <div>
                <h4 className="text-sm font-semibold text-primary">{title}</h4>
                <p className="text-xs text-muted mt-1">{description}</p>
        </div>
              <div
                className="h-20 border border-dashed border-subtle rounded-md flex items-center justify-center overflow-hidden"
                style={{ backgroundColor }}
              >
                {url ? (
                  <img src={url} alt={title} className="max-h-16 max-w-full object-contain" />
                ) : (
                  <span className="text-xs text-muted">Sem logotipo</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <input
                  ref={inputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange(theme)}
                  aria-label={`Selecionar logotipo ${theme === "dark" ? "escuro" : "claro"}`}
                />
                    <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  disabled={uploading === theme}
                  className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-500 disabled:opacity-50"
                >
                  {uploading === theme ? "Enviando..." : "Enviar logotipo"}
                    </button>
                {logos[theme] && (
            <button
                    type="button"
                    onClick={() => handleRemove(theme)}
                    disabled={uploading === theme}
                    className="px-3 py-1.5 text-sm border border-subtle text-secondary rounded-md hover:bg-surface-muted disabled:opacity-50"
                  >
                    Remover
            </button>
                )}
          </div>
              {errors[theme] && <p className="text-xs text-red-400">{errors[theme]}</p>}
      </div>
          );
        })}
      </div>
    </div>
  );
}

function LogoPreview({
  label,
  url,
  backgroundColor,
}: {
  label: string;
  url: string | null;
  backgroundColor: string;
}) {
  const displayLabel = label;
  return (
    <div className="flex flex-col gap-1 text-xs">
      <span className="font-semibold text-secondary">{displayLabel}</span>
      <div
        className="h-14 w-28 border border-subtle rounded-md flex items-center justify-center overflow-hidden"
        style={{ backgroundColor }}
      >
        {url ? (
          <img src={url} alt={displayLabel} className="max-h-12 max-w-full object-contain" />
        ) : (
          <span className="text-[10px] text-muted">Sem logo</span>
        )}
        </div>
      </div>
  );
}

function ThemePalettePreview({
  variant,
  colors,
}: {
  variant: "dark" | "light";
  colors: Array<{ label: string; value?: string | null }>;
}) {
  const title = variant === "dark" ? "Tema escuro" : "Tema claro";
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <span className="px-2 py-0.5 text-[11px] font-semibold border border-subtle rounded-full text-secondary">
        {title}
      </span>
      {colors
        .filter((entry) => !!entry.value)
        .map((entry) =>
          entry.value ? (
            <ColorDot key={`${variant}-${entry.label}`} color={entry.value} label={entry.label} />
          ) : null
        )}
    </div>
  );
}

function CompanyModal({
  title,
  children,
  onClose,
  size = "md",
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  size?: "sm" | "md" | "lg";
}) {
  const maxWidth = size === "sm" ? "max-w-md" : size === "lg" ? "max-w-4xl" : "max-w-2xl";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-6">
      <div className={`w-full ${maxWidth} bg-surface-elevated border border-subtle rounded-lg shadow-elevated transition-colors duration-200`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-subtle">
          <h2 className="text-lg font-semibold text-primary">{title}</h2>
        <button
          onClick={onClose}
            className="text-muted hover:text-primary transition-colors"
            aria-label="Fechar modal"
                    >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
        </button>
      </div>
        <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto text-secondary">
          {children}
          </div>
        </div>
      </div>
  );
}

function InputField({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-sm text-secondary space-y-1">
      <span>{label}</span>
      {children}
      {error && <span className="text-xs text-red-400">{error}</span>}
    </label>
  );
}

function NumberInputField({
  label,
  register,
  placeholder,
}: {
  label: string;
  register: UseFormRegisterReturn;
  placeholder?: string;
}) {
  return (
    <InputField label={label}>
      <input
        {...register}
        type="number"
        min="0"
        inputMode="numeric"
        placeholder={placeholder}
        className="w-full bg-surface-muted border border-subtle rounded px-3 py-2 text-primary focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors"
      />
    </InputField>
  );
}

function parseOptionalNumber(value?: string): NumberLike {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
}

function formatLimit(value: NumberLike) {
  if (value === undefined || value === null) return "∞";
  return value;
}

function formatStorage(value: NumberLike) {
  if (value === undefined || value === null) return "∞";
  return `${value} MB`;
}

function formatNumberInput(value: NumberLike) {
  if (value === undefined || value === null) return "";
  return value.toString();
}

function ColorInput({
  label,
  register,
  error,
  value,
}: {
  label: string;
  register: UseFormRegisterReturn;
  error?: string;
  value?: string;
}) {
  return (
    <label className="block text-sm text-secondary space-y-2">
      <span>{label}</span>
      <div className="flex items-center gap-3">
        <input
          type="color"
          {...register}
          className="h-10 w-14 rounded border border-subtle bg-transparent cursor-pointer"
        />
        <span className="text-xs text-muted font-mono uppercase">{value ? value.toUpperCase() : ""}</span>
      </div>
      {error && <span className="text-xs text-red-400">{error}</span>}
    </label>
  );
}

function ColorDot({ color, label }: { color: string; label: string }) {
  const normalized = color.toUpperCase();
  return (
    <span className="flex items-center gap-1 text-[11px] text-secondary">
      <span
        className="h-3 w-3 rounded-full border border-subtle"
        style={{ backgroundColor: normalized }}
        aria-hidden="true"
      ></span>
      <span>{label}</span>
      <span className="text-[10px] text-muted">{normalized}</span>
    </span>
  );
}
