import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../lib/axios.js";
import { cleanCep, cleanPhone, formatPhone } from "../utils/formatters.js";

interface ImportUsersModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface ParsedUser {
  name: string;
  lastName?: string;
  email: string;
  password: string;
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
  role: "ADMIN" | "MANAGER" | "MEMBER";
  hourlyRate?: number;
  rowNumber: number;
  errors?: string[];
}

export default function ImportUsersModal({
  isOpen,
  onClose,
  onSuccess,
}: ImportUsersModalProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [csvData, setCsvData] = useState<string>("");
  const [parsedUsers, setParsedUsers] = useState<ParsedUser[]>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isValidating, setIsValidating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const importUsersMutation = useMutation({
    mutationFn: (users: any[]) => api.post("/users/bulk", { users }),
    onSuccess: (response) => {
      const data = response.data;
      const message = data.message || `${data.success} usuário(s) importado(s) com sucesso`;
      const hasErrors = data.errors > 0;
      
      if (hasErrors) {
        alert(`${message}\n\n${data.errors} erro(s) encontrado(s). Verifique os detalhes no console.`);
        console.log("Detalhes da importação:", data.details);
      } else {
        alert(message);
      }
      
      queryClient.invalidateQueries({ queryKey: ["users"] });
      onSuccess();
      handleClose();
    },
    onError: (err: any) => {
      const errorMessage = err.response?.data?.error?.message ||
        err.response?.data?.message ||
        "Erro ao importar usuários. Verifique os dados e tente novamente.";
      alert(errorMessage);
      setIsImporting(false);
    },
  });

  const handleClose = () => {
    setCsvData("");
    setParsedUsers([]);
    setValidationErrors([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    onClose();
  };

  const downloadExampleCSV = () => {
    const headers = [
      "name",
      "lastName",
      "email",
      "password",
      "position",
      "cep",
      "address",
      "addressNumber",
      "addressComplement",
      "neighborhood",
      "city",
      "state",
      "phone",
      "cellphone",
      "role",
      "hourlyRate",
    ];

    const exampleData = [
      {
        name: "João",
        lastName: "Silva",
        email: "joao.silva@example.com",
        password: "senha123",
        position: "Desenvolvedor",
        cep: "01310-100",
        address: "Avenida Paulista",
        addressNumber: "1000",
        addressComplement: "Apto 101",
        neighborhood: "Bela Vista",
        city: "São Paulo",
        state: "SP",
        phone: "(11) 1234-5678",
        cellphone: "(11) 98765-4321",
        role: "MEMBER",
        hourlyRate: "100.00",
      },
      {
        name: "Maria",
        lastName: "Santos",
        email: "maria.santos@example.com",
        password: "senha456",
        position: "Designer",
        cep: "20040-020",
        address: "Rua do Ouvidor",
        addressNumber: "50",
        addressComplement: "",
        neighborhood: "Centro",
        city: "Rio de Janeiro",
        state: "RJ",
        phone: "(21) 2345-6789",
        cellphone: "(21) 99876-5432",
        role: "MANAGER",
        hourlyRate: "150.00",
      },
    ];

    const csvContent = [
      headers.join(","),
      ...exampleData.map((row) =>
        headers.map((header) => {
          const value = row[header as keyof typeof row] || "";
          // Se o valor contém vírgula ou quebra de linha, envolver em aspas
          if (value.toString().includes(",") || value.toString().includes("\n")) {
            return `"${value.toString().replace(/"/g, '""')}"`;
          }
          return value;
        }).join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "exemplo_importacao_usuarios.csv");
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setCsvData(content);
    };
    reader.readAsText(file, "UTF-8");
  };

  const parseCSV = (csvText: string): string[][] => {
    const lines: string[][] = [];
    let currentLine: string[] = [];
    let currentField = "";
    let inQuotes = false;

    for (let i = 0; i < csvText.length; i++) {
      const char = csvText[i];
      const nextChar = csvText[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          currentField += '"';
          i++; // Skip next quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === "," && !inQuotes) {
        currentLine.push(currentField.trim());
        currentField = "";
      } else if ((char === "\n" || char === "\r") && !inQuotes) {
        if (currentField || currentLine.length > 0) {
          currentLine.push(currentField.trim());
          currentField = "";
        }
        if (currentLine.length > 0) {
          lines.push(currentLine);
          currentLine = [];
        }
      } else {
        currentField += char;
      }
    }

    // Add last field and line
    if (currentField || currentLine.length > 0) {
      currentLine.push(currentField.trim());
    }
    if (currentLine.length > 0) {
      lines.push(currentLine);
    }

    return lines;
  };

  const validateUsers = () => {
    if (!csvData.trim()) {
      alert("Por favor, faça upload de um arquivo CSV primeiro.");
      return;
    }

    setIsValidating(true);
    setValidationErrors([]);

    try {
      const lines = parseCSV(csvData);
      if (lines.length < 2) {
        setValidationErrors(["O arquivo CSV deve conter pelo menos um cabeçalho e uma linha de dados."]);
        setIsValidating(false);
        return;
      }

      const headers = lines[0].map((h) => h.toLowerCase().trim());
      const requiredHeaders = ["name", "email", "password"];
      const missingHeaders = requiredHeaders.filter(
        (h) => !headers.includes(h)
      );

      if (missingHeaders.length > 0) {
        setValidationErrors([
          `Cabeçalhos obrigatórios faltando: ${missingHeaders.join(", ")}`,
        ]);
        setIsValidating(false);
        return;
      }

      const users: ParsedUser[] = [];
      const errors: string[] = [];

      for (let i = 1; i < lines.length; i++) {
        const row = lines[i];
        const rowNumber = i + 1;
        const user: ParsedUser = {
          name: "",
          email: "",
          password: "",
          role: "MEMBER",
          rowNumber,
        };
        const rowErrors: string[] = [];

        // Mapear campos
        headers.forEach((header, index) => {
          const value = row[index] || "";
          const cleanValue = value.trim();

          switch (header) {
            case "name":
              user.name = cleanValue;
              if (!cleanValue) rowErrors.push("Nome é obrigatório");
              break;
            case "lastname":
              user.lastName = cleanValue || undefined;
              break;
            case "email":
              user.email = cleanValue;
              if (!cleanValue) {
                rowErrors.push("Email é obrigatório");
              } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanValue)) {
                rowErrors.push("Email inválido");
              }
              break;
            case "password":
              user.password = cleanValue;
              if (!cleanValue) {
                rowErrors.push("Senha é obrigatória");
              } else if (cleanValue.length < 6) {
                rowErrors.push("Senha deve ter pelo menos 6 caracteres");
              }
              break;
            case "position":
              user.position = cleanValue || undefined;
              break;
            case "cep":
              if (cleanValue) {
                const cleanCepValue = cleanCep(cleanValue);
                if (cleanCepValue.length === 8) {
                  user.cep = cleanValue;
                } else {
                  rowErrors.push("CEP inválido");
                }
              }
              break;
            case "address":
              user.address = cleanValue || undefined;
              break;
            case "addressnumber":
              user.addressNumber = cleanValue || undefined;
              break;
            case "addresscomplement":
              user.addressComplement = cleanValue || undefined;
              break;
            case "neighborhood":
              user.neighborhood = cleanValue || undefined;
              break;
            case "city":
              user.city = cleanValue || undefined;
              break;
            case "state":
              user.state = cleanValue ? cleanValue.toUpperCase().substring(0, 2) : undefined;
              break;
            case "phone":
              if (cleanValue) {
                const cleanPhoneValue = cleanPhone(cleanValue);
                if (cleanPhoneValue.length >= 10) {
                  user.phone = formatPhone(cleanPhoneValue);
                } else {
                  rowErrors.push("Telefone inválido");
                }
              }
              break;
            case "cellphone":
              if (cleanValue) {
                const cleanPhoneValue = cleanPhone(cleanValue);
                if (cleanPhoneValue.length >= 10) {
                  user.cellphone = formatPhone(cleanPhoneValue);
                } else {
                  rowErrors.push("Celular inválido");
                }
              }
              break;
            case "role":
              const roleUpper = cleanValue.toUpperCase();
              if (["ADMIN", "MANAGER", "MEMBER"].includes(roleUpper)) {
                user.role = roleUpper as "ADMIN" | "MANAGER" | "MEMBER";
              } else if (cleanValue) {
                rowErrors.push("Role deve ser ADMIN, MANAGER ou MEMBER");
              }
              break;
            case "hourlyrate":
              if (cleanValue) {
                const rate = parseFloat(cleanValue.replace(",", "."));
                if (!isNaN(rate) && rate >= 0) {
                  user.hourlyRate = rate;
                } else {
                  rowErrors.push("Taxa horária inválida");
                }
              }
              break;
          }
        });

        if (rowErrors.length > 0) {
          user.errors = rowErrors;
          errors.push(`Linha ${rowNumber}: ${rowErrors.join(", ")}`);
        }

        users.push(user);
      }

      setParsedUsers(users);
      setValidationErrors(errors);
      setIsValidating(false);

      if (errors.length === 0) {
        // Auto-scroll para preview
        setTimeout(() => {
          const previewSection = document.getElementById("users-preview");
          previewSection?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 100);
      }
    } catch (error: any) {
      setValidationErrors([`Erro ao processar CSV: ${error.message}`]);
      setIsValidating(false);
    }
  };

  const handleImport = () => {
    const validUsers = parsedUsers.filter((u) => !u.errors || u.errors.length === 0);
    
    if (validUsers.length === 0) {
      alert("Não há usuários válidos para importar. Corrija os erros primeiro.");
      return;
    }

    if (!window.confirm(`Deseja importar ${validUsers.length} usuário(s)?`)) {
      return;
    }

    setIsImporting(true);
    // Remover rowNumber antes de enviar
    const usersToImport = validUsers.map(({ rowNumber, errors, ...user }) => user);
    importUsersMutation.mutate(usersToImport);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
      <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl m-4 my-8">
        <div className="flex justify-between items-center p-6 border-b border-gray-700">
          <h2 className="text-2xl font-bold text-gray-100">Importar Usuários</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-300 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Instruções */}
          <div className="bg-indigo-900/20 border border-indigo-700 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-indigo-300 mb-2">Como importar:</h3>
            <ol className="list-decimal list-inside space-y-1 text-gray-300 text-sm">
              <li>Baixe o arquivo CSV de exemplo</li>
              <li>Preencha com os dados dos usuários</li>
              <li>Faça upload do arquivo CSV</li>
              <li>Valide os dados</li>
              <li>Revise e importe</li>
            </ol>
          </div>

          {/* Download exemplo */}
          <div>
            <button
              onClick={downloadExampleCSV}
              className="px-4 py-2 bg-green-700 text-white rounded-md hover:bg-green-600 flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Baixar Arquivo CSV de Exemplo
            </button>
          </div>

          {/* Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Selecionar Arquivo CSV
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            {csvData && (
              <p className="mt-2 text-sm text-gray-400">
                Arquivo carregado com sucesso!
              </p>
            )}
          </div>

          {/* Botão validar */}
          <div>
            <button
              onClick={validateUsers}
              disabled={!csvData || isValidating}
              className="px-4 py-2 bg-indigo-700 text-white rounded-md hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isValidating ? "Validando..." : "Validar Dados"}
            </button>
          </div>

          {/* Erros de validação */}
          {validationErrors.length > 0 && (
            <div className="bg-red-900/20 border border-red-800 rounded-lg p-4 max-h-48 overflow-y-auto">
              <h4 className="text-red-400 font-semibold mb-2">Erros encontrados:</h4>
              <ul className="list-disc list-inside space-y-1 text-red-300 text-sm">
                {validationErrors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Preview de usuários válidos */}
          {parsedUsers.length > 0 && (
            <div id="users-preview" className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-200">
                  Preview dos Usuários ({parsedUsers.filter((u) => !u.errors || u.errors.length === 0).length} válidos de {parsedUsers.length})
                </h3>
                {parsedUsers.filter((u) => !u.errors || u.errors.length === 0).length > 0 && (
                  <button
                    onClick={handleImport}
                    disabled={isImporting || importUsersMutation.isPending}
                    className="px-4 py-2 bg-green-700 text-white rounded-md hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isImporting || importUsersMutation.isPending ? "Importando..." : "Importar Usuários"}
                  </button>
                )}
              </div>

              <div className="bg-gray-700 rounded-lg overflow-hidden max-h-96 overflow-y-auto">
                <table className="min-w-full divide-y divide-gray-600">
                  <thead className="bg-gray-600 sticky top-0">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-300 uppercase">Linha</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-300 uppercase">Nome</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-300 uppercase">Email</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-300 uppercase">Role</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-300 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="bg-gray-800 divide-y divide-gray-600">
                    {parsedUsers.map((user, index) => {
                      const isValid = !user.errors || user.errors.length === 0;
                      return (
                        <tr
                          key={index}
                          className={isValid ? "bg-gray-800" : "bg-red-900/20"}
                        >
                          <td className="px-4 py-2 text-sm text-gray-400">{user.rowNumber}</td>
                          <td className="px-4 py-2 text-sm text-gray-100">
                            {user.name} {user.lastName || ""}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-300">{user.email}</td>
                          <td className="px-4 py-2 text-sm">
                            <span className={`px-2 py-1 rounded text-xs ${
                              user.role === "ADMIN" ? "bg-red-900/30 text-red-300" :
                              user.role === "MANAGER" ? "bg-yellow-900/30 text-yellow-300" :
                              "bg-blue-900/30 text-blue-300"
                            }`}>
                              {user.role}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-sm">
                            {isValid ? (
                              <span className="text-green-400">✓ Válido</span>
                            ) : (
                              <span className="text-red-400">✗ Erros</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Botões de ação */}
          <div className="flex justify-end gap-4 pt-4 border-t border-gray-700">
            <button
              onClick={handleClose}
              className="px-6 py-2 border border-gray-600 text-gray-300 rounded-md hover:bg-gray-700"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

