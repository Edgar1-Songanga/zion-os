const assert = require("node:assert/strict");
const test = require("node:test");
const presentationModule = import("./presentation.mjs");

const sensitiveEvent = (type) => ({
  type,
  title: "Saldo: 987654 Kz — transferência para João",
  body: "Conta 1234 recebeu 987654 Kz; referência confidencial",
});

test("financial event types never expose supplied title or body", async () => {
  const { buildPushPresentation } = await presentationModule;
  for (const type of ["bank.transfer", "payment.completed", "transaction.created", "finance.alert"]) {
    const event = sensitiveEvent(type);
    const presentation = buildPushPresentation(event);
    assert.equal(presentation.category, "bank", type);
    assert.equal(presentation.title, "Alerta financeiro ZION", type);
    assert.equal(presentation.body, "Inicia sessão no ZION para consultar este alerta.", type);
    assert.equal(presentation.priority, "critical", type);
    assert.equal(JSON.stringify(presentation).includes("987654"), false, type);
    assert.equal(JSON.stringify(presentation).includes("João"), false, type);
  }
});

test("RESA messages retain generic privacy-safe copy", async () => {
  const { buildPushPresentation } = await presentationModule;
  const presentation = buildPushPresentation(sensitiveEvent("resa.message.new"));
  assert.equal(presentation.category, "message");
  assert.equal(presentation.title, "Nova mensagem no RESA");
  assert.equal(presentation.body, "Recebeste uma nova mensagem.");
  assert.equal(presentation.priority, "high");
});

test("calls retain incoming-call presentation and precedence", async () => {
  const { buildPushPresentation } = await presentationModule;
  const presentation = buildPushPresentation(sensitiveEvent("video_call.incoming"));
  assert.equal(presentation.category, "call");
  assert.equal(presentation.title, "Videochamada recebida no RESA");
  assert.equal(presentation.body, "Toca para abrir o RESA e atender.");
});

test("ordinary notifications preserve their authored copy", async () => {
  const { buildPushPresentation } = await presentationModule;
  const presentation = buildPushPresentation({
    type: "zion.announcement",
    title: "Reunião às 18h",
    body: "Consulta os detalhes no ZION.",
  });
  assert.equal(presentation.category, "general");
  assert.equal(presentation.title, "Reunião às 18h");
  assert.equal(presentation.body, "Consulta os detalhes no ZION.");
  assert.equal(presentation.priority, "normal");
});
