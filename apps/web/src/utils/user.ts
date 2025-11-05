/**
 * Obtém o usuário atual, considerando personificação.
 * Se houver um usuário personificado, retorna ele.
 * Caso contrário, retorna o usuário original logado.
 */
export function getCurrentUser() {
  const impersonatedUserStr = localStorage.getItem("impersonatedUser");
  if (impersonatedUserStr) {
    return JSON.parse(impersonatedUserStr);
  }
  
  const userStr = localStorage.getItem("user");
  if (userStr) {
    return JSON.parse(userStr);
  }
  
  return null;
}

/**
 * Obtém o usuário original (sem personificação)
 */
export function getOriginalUser() {
  const userStr = localStorage.getItem("user");
  if (userStr) {
    return JSON.parse(userStr);
  }
  return null;
}

/**
 * Verifica se o usuário está personificando outro usuário
 */
export function isImpersonating() {
  return !!localStorage.getItem("impersonatedUser");
}

