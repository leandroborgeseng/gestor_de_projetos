import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { valibotResolver } from "@hookform/resolvers/valibot";
import * as v from "valibot";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "../lib/axios.js";
import { formatCep, formatPhone, cleanCep, cleanPhone } from "../utils/formatters.js";

interface User {
  id: string;
  name: string;
  lastName?: string;
  email: string;
  position?: string;
  cep?: string;
  address?: string;
  addressNumber?: string;
  addressComplement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  phone?: string;
  cellphone?: string;
  role: string;
  hourlyRate?: number;
}

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const userProfileSchema = v.object({
  name: v.pipe(v.string(), v.minLength(1, "Nome é obrigatório")),
  lastName: v.optional(v.string()),
  email: v.pipe(v.string(), v.email("Email inválido")),
  position: v.optional(v.string()),
  cep: v.optional(v.string()),
  address: v.optional(v.string()),
  addressNumber: v.optional(v.string()),
  addressComplement: v.optional(v.string()),
  neighborhood: v.optional(v.string()),
  city: v.optional(v.string()),
  state: v.optional(v.string()),
  phone: v.optional(v.string()),
  cellphone: v.optional(v.string()),
  hourlyRate: v.optional(v.pipe(v.string(), v.transform((val) => val === "" ? undefined : parseFloat(val)), v.optional(v.number()))),
});

type UserProfileFormData = v.InferInput<typeof userProfileSchema>;

export default function EditProfileModal({ isOpen, onClose }: EditProfileModalProps) {
  const queryClient = useQueryClient();
  const [loadingCep, setLoadingCep] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    setValue,
    watch,
  } = useForm<UserProfileFormData>({
    resolver: valibotResolver(userProfileSchema),
    defaultValues: {
      name: "",
      lastName: "",
      email: "",
      position: "",
      cep: "",
      address: "",
      addressNumber: "",
      addressComplement: "",
      neighborhood: "",
      city: "",
      state: "",
      phone: "",
      cellphone: "",
      hourlyRate: "",
    },
  });

  const { data: currentUser, isLoading } = useQuery<User>({
    queryKey: ["current-user"],
    queryFn: () => api.get("/users/me").then((res) => res.data),
    enabled: isOpen,
  });

  useEffect(() => {
    if (currentUser && isOpen) {
      reset({
        name: currentUser.name || "",
        lastName: currentUser.lastName || "",
        email: currentUser.email || "",
        position: currentUser.position || "",
        cep: currentUser.cep || "",
        address: currentUser.address || "",
        addressNumber: currentUser.addressNumber || "",
        addressComplement: currentUser.addressComplement || "",
        neighborhood: currentUser.neighborhood || "",
        city: currentUser.city || "",
        state: currentUser.state || "",
        phone: currentUser.phone || "",
        cellphone: currentUser.cellphone || "",
        hourlyRate: currentUser.hourlyRate?.toString() || "",
      });
    }
  }, [currentUser, isOpen, reset]);

  const cepValue = watch("cep");
  const phoneValue = watch("phone");
  const cellphoneValue = watch("cellphone");
  const stateValue = watch("state");

  const handleCepBlur = async () => {
    const cleanCepValue = cleanCep(cepValue || "");
    if (cleanCepValue.length === 8) {
      setLoadingCep(true);
      try {
        const response = await api.get(`/users/cep?cep=${cleanCepValue}`);
        const data = response.data;
        if (data.address) setValue("address", data.address);
        if (data.neighborhood) setValue("neighborhood", data.neighborhood);
        if (data.city) setValue("city", data.city);
        if (data.state) setValue("state", data.state);
        if (data.cep) setValue("cep", data.cep);
      } catch (err) {
        // CEP não encontrado ou erro - não fazer nada
      } finally {
        setLoadingCep(false);
      }
    }
  };

  const updateUserMutation = useMutation({
    mutationFn: (data: any) => api.patch("/users/me", data),
    onSuccess: (response) => {
      const updatedUserData = response.data;
      // Atualizar localStorage com os novos dados
      const userStr = localStorage.getItem("user");
      if (userStr) {
        const user = JSON.parse(userStr);
        const updatedUser = {
          ...user,
          name: updatedUserData.name,
          lastName: updatedUserData.lastName,
          email: updatedUserData.email,
          position: updatedUserData.position,
          hourlyRate: updatedUserData.hourlyRate,
        };
        localStorage.setItem("user", JSON.stringify(updatedUser));
      }
      
      queryClient.invalidateQueries({ queryKey: ["current-user"] });
      onClose();
      // Forçar reload da página para atualizar o Navbar
      window.location.reload();
    },
    onError: (err: any) => {
      // Error handling será feito pelo setError do react-hook-form
    },
  });

  const onSubmit = async (data: UserProfileFormData) => {
    const submitData: any = {
      name: data.name,
      lastName: data.lastName || undefined,
      email: data.email,
      position: data.position || undefined,
      cep: cleanCep(data.cep || "") || undefined,
      address: data.address || undefined,
      addressNumber: data.addressNumber || undefined,
      addressComplement: data.addressComplement || undefined,
      neighborhood: data.neighborhood || undefined,
      city: data.city || undefined,
      state: data.state || undefined,
      phone: cleanPhone(data.phone || "") ? formatPhone(cleanPhone(data.phone || "")) : undefined,
      cellphone: cleanPhone(data.cellphone || "") ? formatPhone(cleanPhone(data.cellphone || "")) : undefined,
    };

    if (data.hourlyRate !== undefined && data.hourlyRate !== "") {
      submitData.hourlyRate = parseFloat(data.hourlyRate as string);
    } else {
      submitData.hourlyRate = null;
    }

    updateUserMutation.mutate(submitData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
      <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl m-4 my-8">
        <div className="flex justify-between items-center p-6 border-b border-gray-700">
          <h3 className="text-xl font-semibold text-gray-100">Editar Perfil</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-100 transition-colors"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {isLoading ? (
          <div className="p-6 text-center text-gray-400">Carregando...</div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
            {errors.root && (
              <div className="bg-red-900/20 text-red-400 p-3 rounded-md text-sm">
                {errors.root.message}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-2">
                  Nome <span className="text-red-400">*</span>
                </label>
                <input
                  id="name"
                  type="text"
                  {...register("name")}
                  className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-400">{errors.name.message}</p>
                )}
              </div>
              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-gray-300 mb-2">
                  Sobrenome
                </label>
                <input
                  id="lastName"
                  type="text"
                  {...register("lastName")}
                  className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                />
                {errors.lastName && (
                  <p className="mt-1 text-sm text-red-400">{errors.lastName.message}</p>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                Email <span className="text-red-400">*</span>
              </label>
              <input
                id="email"
                type="email"
                {...register("email")}
                className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-400">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="position" className="block text-sm font-medium text-gray-300 mb-2">
                Cargo
              </label>
              <input
                id="position"
                type="text"
                {...register("position")}
                className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Ex: Desenvolvedor, Designer, Gerente..."
              />
              {errors.position && (
                <p className="mt-1 text-sm text-red-400">{errors.position.message}</p>
              )}
            </div>

            {/* Endereço */}
            <div className="border-t border-gray-700 pt-4">
              <h4 className="text-sm font-semibold text-gray-300 mb-4">Endereço</h4>
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-1">
                  <label htmlFor="cep" className="block text-sm font-medium text-gray-300 mb-2">
                    CEP
                  </label>
                  <div className="relative">
                    <input
                      id="cep"
                      type="text"
                      maxLength={9}
                      {...register("cep")}
                      value={cepValue || ""}
                      onChange={(e) => {
                        const formatted = formatCep(e.target.value);
                        setValue("cep", formatted);
                      }}
                      onBlur={handleCepBlur}
                      className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="00000-000"
                    />
                    {loadingCep && (
                      <div className="absolute right-3 top-2.5">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-400"></div>
                      </div>
                    )}
                  </div>
                  {errors.cep && (
                    <p className="mt-1 text-sm text-red-400">{errors.cep.message}</p>
                  )}
                </div>
                <div className="col-span-2">
                  <label htmlFor="address" className="block text-sm font-medium text-gray-300 mb-2">
                    Logradouro
                  </label>
                  <input
                    id="address"
                    type="text"
                    {...register("address")}
                    className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  {errors.address && (
                    <p className="mt-1 text-sm text-red-400">{errors.address.message}</p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 mt-4">
                <div>
                  <label htmlFor="addressNumber" className="block text-sm font-medium text-gray-300 mb-2">
                    Número
                  </label>
                  <input
                    id="addressNumber"
                    type="text"
                    {...register("addressNumber")}
                    className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  {errors.addressNumber && (
                    <p className="mt-1 text-sm text-red-400">{errors.addressNumber.message}</p>
                  )}
                </div>
                <div className="col-span-2">
                  <label htmlFor="addressComplement" className="block text-sm font-medium text-gray-300 mb-2">
                    Complemento
                  </label>
                  <input
                    id="addressComplement"
                    type="text"
                    {...register("addressComplement")}
                    className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  {errors.addressComplement && (
                    <p className="mt-1 text-sm text-red-400">{errors.addressComplement.message}</p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 mt-4">
                <div>
                  <label htmlFor="neighborhood" className="block text-sm font-medium text-gray-300 mb-2">
                    Bairro
                  </label>
                  <input
                    id="neighborhood"
                    type="text"
                    {...register("neighborhood")}
                    className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  {errors.neighborhood && (
                    <p className="mt-1 text-sm text-red-400">{errors.neighborhood.message}</p>
                  )}
                </div>
                <div>
                  <label htmlFor="city" className="block text-sm font-medium text-gray-300 mb-2">
                    Cidade
                  </label>
                  <input
                    id="city"
                    type="text"
                    {...register("city")}
                    className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  {errors.city && (
                    <p className="mt-1 text-sm text-red-400">{errors.city.message}</p>
                  )}
                </div>
                <div>
                  <label htmlFor="state" className="block text-sm font-medium text-gray-300 mb-2">
                    Estado
                  </label>
                  <input
                    id="state"
                    type="text"
                    maxLength={2}
                    {...register("state")}
                    value={stateValue || ""}
                    onChange={(e) => setValue("state", e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="UF"
                  />
                  {errors.state && (
                    <p className="mt-1 text-sm text-red-400">{errors.state.message}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Telefones */}
            <div className="border-t border-gray-700 pt-4">
              <h4 className="text-sm font-semibold text-gray-300 mb-4">Contato</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-300 mb-2">
                    Telefone Fixo
                  </label>
                  <input
                    id="phone"
                    type="text"
                    maxLength={14}
                    {...register("phone")}
                    value={phoneValue || ""}
                    onChange={(e) => {
                      const formatted = formatPhone(e.target.value);
                      setValue("phone", formatted);
                    }}
                    className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="(00) 0000-0000"
                  />
                  {errors.phone && (
                    <p className="mt-1 text-sm text-red-400">{errors.phone.message}</p>
                  )}
                </div>
                <div>
                  <label htmlFor="cellphone" className="block text-sm font-medium text-gray-300 mb-2">
                    Celular
                  </label>
                  <input
                    id="cellphone"
                    type="text"
                    maxLength={15}
                    {...register("cellphone")}
                    value={cellphoneValue || ""}
                    onChange={(e) => {
                      const formatted = formatPhone(e.target.value);
                      setValue("cellphone", formatted);
                    }}
                    className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="(00) 00000-0000"
                  />
                  {errors.cellphone && (
                    <p className="mt-1 text-sm text-red-400">{errors.cellphone.message}</p>
                  )}
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="hourlyRate" className="block text-sm font-medium text-gray-300 mb-2">
                Taxa Horária (R$)
              </label>
              <input
                id="hourlyRate"
                type="number"
                step="0.01"
                min="0"
                {...register("hourlyRate")}
                className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Ex: 100.00"
              />
              {errors.hourlyRate && (
                <p className="mt-1 text-sm text-red-400">{errors.hourlyRate.message}</p>
              )}
            </div>

            <div className="flex justify-end gap-4 pt-4 border-t border-gray-700">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2 border border-gray-600 text-gray-300 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting || updateUserMutation.isPending}
                className="px-6 py-2 bg-indigo-700 text-white rounded-md hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting || updateUserMutation.isPending ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

