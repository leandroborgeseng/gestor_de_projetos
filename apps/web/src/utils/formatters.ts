// Função para formatar CEP
export function formatCep(value: string): string {
  const cleanValue = value.replace(/\D/g, "");
  if (cleanValue.length <= 5) {
    return cleanValue;
  }
  return `${cleanValue.slice(0, 5)}-${cleanValue.slice(5, 8)}`;
}

// Função para formatar telefone (fixo ou celular)
export function formatPhone(value: string): string {
  const cleanValue = value.replace(/\D/g, "");
  if (cleanValue.length <= 2) {
    return cleanValue ? `(${cleanValue}` : "";
  }
  if (cleanValue.length <= 6) {
    return `(${cleanValue.slice(0, 2)}) ${cleanValue.slice(2)}`;
  }
  if (cleanValue.length <= 10) {
    return `(${cleanValue.slice(0, 2)}) ${cleanValue.slice(2, 6)}-${cleanValue.slice(6)}`;
  }
  // Celular (11 dígitos)
  return `(${cleanValue.slice(0, 2)}) ${cleanValue.slice(2, 7)}-${cleanValue.slice(7, 11)}`;
}

// Função para limpar formatação
export function cleanPhone(value: string): string {
  return value.replace(/\D/g, "");
}

export function cleanCep(value: string): string {
  return value.replace(/\D/g, "");
}

