/**
 * Builds the externally visible push presentation without exposing financial data.
 * Kept free of runtime-specific dependencies so Node and Deno can test the same logic.
 */
export function buildPushPresentation(event) {
  const type = String(event?.type ?? "").toLowerCase();
  const isMessage = type.startsWith("resa.message");
  const isCall = type.includes("call") || type.includes("chamada");
  const isBank = type.includes("bank") || type.includes("payment") ||
    type.includes("transaction") || type.includes("finance");
  const category = isCall ? "call" : isBank ? "bank" : isMessage ? "message" : "general";

  return {
    category,
    isCall,
    isMessage,
    isBank,
    title: isCall
      ? (type.includes("video") ? "Videochamada recebida no RESA" : "Chamada recebida no RESA")
      : isBank
        ? "Alerta financeiro ZION"
        : isMessage ? "Nova mensagem no RESA" : (event?.title || "Notificação RESA"),
    body: isCall
      ? "Toca para abrir o RESA e atender."
      : isBank
        ? "Inicia sessão no ZION para consultar este alerta."
        : isMessage ? "Recebeste uma nova mensagem." : (event?.body || "Tens uma nova notificação."),
    priority: isCall || isBank ? "critical" : isMessage ? "high" : "normal",
  };
}
