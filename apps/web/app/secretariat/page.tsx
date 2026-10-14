"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { OrganizationSelector, type ZionOrganization } from "@/components/organization/OrganizationSelector";
import { resaRequest } from "@/lib/resa/api";

type Member = {
  id: string;
  organization_id: string;
  member_number: string | null;
  first_name: string;
  last_name: string;
  birth_date: string | null;
  gender: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  baptism_date: string | null;
  membership_status: "ACTIVE" | "TRANSFERRED" | "DECEASED" | "DISMISSED" | "INACTIVE";
  joined_on: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};
type BaptismRecord = {
  id: string;
  organization_id: string;
  member_record_id: string;
  baptism_date: string;
  location: string;
  congregation_name: string;
  minister_name: string;
  document_reference: string | null;
  notes: string | null;
  status: "PENDING" | "VALIDATED" | "REJECTED";
  validated_at: string | null;
  validation_note: string | null;
  created_at: string;
};
type BaptismEvent = { id: string; previous_status: string | null; new_status: string; actor_user_id: string | null; note: string | null; changed_at: string };
const BAPTISM_STATUS_LABELS: Record<BaptismRecord["status"], string> = {
  PENDING: "Pendente de validação",
  VALIDATED: "Validado",
  REJECTED: "Rejeitado",
};

type MemberTransfer = {
  id: string;
  member_record_id: string;
  origin_organization_id: string;
  destination_organization_id: string;
  status: "DRAFT" | "SUBMITTED" | "ACCEPTED" | "REJECTED" | "CANCELLED";
  request_date: string;
  reason: string | null;
  document_reference: string | null;
  submitted_at: string | null;
  decided_at: string | null;
  decision_note: string | null;
  created_at: string;
};
type TransferEvent = { id: string; previous_status: string | null; new_status: string; actor_user_id: string | null; note: string | null; changed_at: string };
type FamilyRelationship = {
  id: string;
  organization_id: string;
  member_record_id: string;
  related_member_record_id: string;
  relationship_type: "PARENT_OF" | "CHILD_OF" | "SPOUSE" | "SIBLING" | "GUARDIAN_OF" | "WARD_OF" | "OTHER";
  notes: string | null;
  is_active: boolean;
  created_at: string;
};
type StatusEvent = {
  id: string;
  previous_status: string | null;
  new_status: string;
  note: string | null;
  changed_at: string;
};

const TRANSFER_STATUS_LABELS: Record<MemberTransfer["status"], string> = {
  DRAFT: "Rascunho",
  SUBMITTED: "Submetido",
  ACCEPTED: "Aceite",
  REJECTED: "Recusado",
  CANCELLED: "Cancelado",
};
const RELATIONSHIP_LABELS: Record<FamilyRelationship["relationship_type"], string> = {
  PARENT_OF: "É progenitor de",
  CHILD_OF: "É filho/a de",
  SPOUSE: "Cônjuge de",
  SIBLING: "Irmão/irmã de",
  GUARDIAN_OF: "Tutor/a de",
  WARD_OF: "Pessoa sob tutela de",
  OTHER: "Outra relação com",
};

const STATUS_LABELS: Record<Member["membership_status"], string> = {
  ACTIVE: "Activo",
  TRANSFERRED: "Transferido",
  DECEASED: "Falecido",
  DISMISSED: "Removido",
  INACTIVE: "Inactivo",
};

function dateLabel(value: string | null) {
  if (!value) return "—";
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime()) ? "—" : new Intl.DateTimeFormat("pt-PT", { dateStyle: "medium" }).format(date);
}

export default function SecretariatPage() {
  const [organizationId, setOrganizationId] = useState("");
  const [organization, setOrganization] = useState<ZionOrganization | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [query, setQuery] = useState("");
  const [historyMemberId, setHistoryMemberId] = useState("");
  const [history, setHistory] = useState<StatusEvent[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [familyRelationships, setFamilyRelationships] = useState<FamilyRelationship[]>([]);
  const [familyLoading, setFamilyLoading] = useState(false);
  const [familySaving, setFamilySaving] = useState(false);
  const [familyError, setFamilyError] = useState("");
  const [familyNotice, setFamilyNotice] = useState("");
  const [baptisms, setBaptisms] = useState<BaptismRecord[]>([]);
  const [baptismsLoading, setBaptismsLoading] = useState(false);
  const [baptismSaving, setBaptismSaving] = useState(false);
  const [baptismError, setBaptismError] = useState("");
  const [baptismNotice, setBaptismNotice] = useState("");
  const [baptismHistoryId, setBaptismHistoryId] = useState("");
  const [baptismHistory, setBaptismHistory] = useState<BaptismEvent[]>([]);
  const [destinationOrganizationId, setDestinationOrganizationId] = useState("");
  const [transfers, setTransfers] = useState<MemberTransfer[]>([]);
  const [transfersLoading, setTransfersLoading] = useState(false);
  const [transferSaving, setTransferSaving] = useState(false);
  const [transferError, setTransferError] = useState("");
  const [transferNotice, setTransferNotice] = useState("");
  const [transferHistoryId, setTransferHistoryId] = useState("");
  const [transferHistory, setTransferHistory] = useState<TransferEvent[]>([]);

  const loadMembers = useCallback(async (id: string) => {
    if (!id) return;
    setLoading(true);
    setError("");
    try {
      const data = await resaRequest<Member[]>(`/v1/organizations/${encodeURIComponent(id)}/church-members`);
      setMembers(data);
      setTransfersLoading(true);
      setTransferError("");
      try {
        const transferItems = await resaRequest<MemberTransfer[]>(`/v1/organizations/${encodeURIComponent(id)}/church-member-transfers`);
        setTransfers(transferItems);
      } catch (transferReason) {
        setTransfers([]);
        setTransferError(transferReason instanceof Error ? transferReason.message : "Não foi possível carregar as transferências.");
      } finally {
        setTransfersLoading(false);
      }
      setFamilyLoading(true);
      setFamilyError("");
      try {
        const relationships = await resaRequest<FamilyRelationship[]>(`/v1/organizations/${encodeURIComponent(id)}/church-member-families`);
        setFamilyRelationships(relationships);
      } catch (familyReason) {
        setFamilyRelationships([]);
        setFamilyError(familyReason instanceof Error ? familyReason.message : "Não foi possível carregar as relações familiares.");
      } finally {
        setFamilyLoading(false);
      }
      setBaptismsLoading(true);
      setBaptismError("");
      try {
        const baptismItems = await resaRequest<BaptismRecord[]>(`/v1/organizations/${encodeURIComponent(id)}/church-baptisms`);
        setBaptisms(baptismItems);
      } catch (baptismReason) {
        setBaptisms([]);
        setBaptismError(baptismReason instanceof Error ? baptismReason.message : "Não foi possível carregar os registos de baptismo.");
      } finally {
        setBaptismsLoading(false);
      }
    } catch (reason) {
      setMembers([]);
      setError(reason instanceof Error ? reason.message : "Não foi possível carregar o registo de membros.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (organizationId) void loadMembers(organizationId);
  }, [organizationId, loadMembers]);

  const filteredMembers = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("pt");
    if (!normalized) return members;
    return members.filter((member) =>
      [member.member_number, member.first_name, member.last_name, member.phone, member.email]
        .some((value) => value?.toLocaleLowerCase("pt").includes(normalized)),
    );
  }, [members, query]);

  async function createMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!organizationId) return;
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const payload = {
      first_name: String(form.get("first_name") ?? "").trim(),
      last_name: String(form.get("last_name") ?? "").trim(),
      member_number: String(form.get("member_number") ?? "").trim() || null,
      birth_date: String(form.get("birth_date") ?? "") || null,
      baptism_date: String(form.get("baptism_date") ?? "") || null,
      phone: String(form.get("phone") ?? "").trim() || null,
      email: String(form.get("email") ?? "").trim() || null,
      gender: String(form.get("gender") ?? "") || null,
      joined_on: String(form.get("joined_on") ?? "") || null,
      membership_status: String(form.get("membership_status") ?? "ACTIVE"),
    };
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const path = `/v1/organizations/${encodeURIComponent(organizationId)}/church-members${editingMember ? `/${encodeURIComponent(editingMember.id)}` : ""}`;
      await resaRequest<Member>(path, {
        method: editingMember ? "PATCH" : "POST",
        body: JSON.stringify(payload),
      });
      setNotice(editingMember ? "Registo de membro actualizado." : "Registo de membro criado e guardado na base de dados.");
      setFormOpen(false);
      setEditingMember(null);
      formElement.reset();
      await loadMembers(organizationId);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível guardar o membro.");
    } finally {
      setSaving(false);
    }
  }

  async function createBaptism(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!organizationId) return;
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const payload = {
      member_record_id: String(form.get("member_record_id") ?? ""),
      baptism_date: String(form.get("baptism_date") ?? ""),
      location: String(form.get("location") ?? "").trim(),
      congregation_name: String(form.get("congregation_name") ?? "").trim(),
      minister_name: String(form.get("minister_name") ?? "").trim(),
      document_reference: String(form.get("document_reference") ?? "").trim() || null,
      notes: String(form.get("notes") ?? "").trim() || null,
    };
    setBaptismSaving(true);
    setBaptismError("");
    setBaptismNotice("");
    try {
      await resaRequest<BaptismRecord>(`/v1/organizations/${encodeURIComponent(organizationId)}/church-baptisms`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      const items = await resaRequest<BaptismRecord[]>(`/v1/organizations/${encodeURIComponent(organizationId)}/church-baptisms`);
      setBaptisms(items);
      formElement.reset();
      setBaptismNotice("Registo de baptismo criado e enviado para validação.");
    } catch (reason) {
      setBaptismError(reason instanceof Error ? reason.message : "Não foi possível registar o baptismo.");
    } finally {
      setBaptismSaving(false);
    }
  }

  async function decideBaptism(record: BaptismRecord, status: "VALIDATED" | "REJECTED") {
    const note = window.prompt(status === "VALIDATED" ? "Nota de validação (opcional):" : "Motivo da rejeição (recomendado):");
    if (note === null) return;
    setBaptismError("");
    setBaptismNotice("");
    try {
      await resaRequest<BaptismRecord>(`/v1/organizations/${encodeURIComponent(organizationId)}/church-baptisms/${encodeURIComponent(record.id)}/decision`, {
        method: "PATCH",
        body: JSON.stringify({ status, validation_note: note.trim() || null }),
      });
      await loadMembers(organizationId);
      setBaptismNotice(status === "VALIDATED" ? "Baptismo validado; a data oficial do membro foi actualizada." : "Registo de baptismo rejeitado e decisão auditada.");
    } catch (reason) {
      setBaptismError(reason instanceof Error ? reason.message : "Não foi possível decidir este registo.");
    }
  }

  async function toggleBaptismHistory(baptismId: string) {
    if (baptismHistoryId === baptismId) {
      setBaptismHistoryId("");
      setBaptismHistory([]);
      return;
    }
    setBaptismHistoryId(baptismId);
    setBaptismHistory([]);
    try {
      const events = await resaRequest<BaptismEvent[]>(`/v1/organizations/${encodeURIComponent(organizationId)}/church-baptisms/${encodeURIComponent(baptismId)}/history`);
      setBaptismHistory(events);
    } catch (reason) {
      setBaptismError(reason instanceof Error ? reason.message : "Não foi possível consultar o histórico do baptismo.");
    }
  }

  async function createTransfer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!organizationId) return;
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const payload = {
      member_record_id: String(form.get("member_record_id") ?? ""),
      destination_organization_id: destinationOrganizationId,
      request_date: String(form.get("request_date") ?? ""),
      reason: String(form.get("reason") ?? "").trim() || null,
      document_reference: String(form.get("document_reference") ?? "").trim() || null,
    };
    setTransferSaving(true);
    setTransferError("");
    setTransferNotice("");
    try {
      await resaRequest<MemberTransfer>(`/v1/organizations/${encodeURIComponent(organizationId)}/church-member-transfers`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      const items = await resaRequest<MemberTransfer[]>(`/v1/organizations/${encodeURIComponent(organizationId)}/church-member-transfers`);
      setTransfers(items);
      formElement.reset();
      setTransferNotice("Pedido de transferência criado como rascunho. Submeta-o para decisão da organização de destino.");
    } catch (reason) {
      setTransferError(reason instanceof Error ? reason.message : "Não foi possível criar o pedido de transferência.");
    } finally {
      setTransferSaving(false);
    }
  }

  async function changeTransferStatus(transfer: MemberTransfer, status: MemberTransfer["status"]) {
    const note = status === "ACCEPTED" || status === "REJECTED"
      ? window.prompt(status === "ACCEPTED" ? "Nota da decisão de aceitação (opcional):" : "Motivo da recusa (recomendado):")
      : null;
    if ((status === "ACCEPTED" || status === "REJECTED") && note === null) return;
    setTransferError("");
    setTransferNotice("");
    try {
      await resaRequest<MemberTransfer>(`/v1/organizations/${encodeURIComponent(organizationId)}/church-member-transfers/${encodeURIComponent(transfer.id)}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status, decision_note: note }),
      });
      const items = await resaRequest<MemberTransfer[]>(`/v1/organizations/${encodeURIComponent(organizationId)}/church-member-transfers`);
      setTransfers(items);
      setTransferNotice("Estado da transferência actualizado e registado no histórico.");
    } catch (reason) {
      setTransferError(reason instanceof Error ? reason.message : "A transição foi recusada. Confirme o âmbito e as permissões da organização.");
    }
  }

  async function toggleTransferHistory(transferId: string) {
    if (transferHistoryId === transferId) {
      setTransferHistoryId("");
      setTransferHistory([]);
      return;
    }
    setTransferHistoryId(transferId);
    setTransferHistory([]);
    try {
      const events = await resaRequest<TransferEvent[]>(`/v1/organizations/${encodeURIComponent(organizationId)}/church-member-transfers/${encodeURIComponent(transferId)}/history`);
      setTransferHistory(events);
    } catch (reason) {
      setTransferError(reason instanceof Error ? reason.message : "Não foi possível carregar o histórico da transferência.");
    }
  }

  async function createFamilyRelationship(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!organizationId) return;
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const payload = {
      member_record_id: String(form.get("member_record_id") ?? ""),
      related_member_record_id: String(form.get("related_member_record_id") ?? ""),
      relationship_type: String(form.get("relationship_type") ?? ""),
      notes: String(form.get("notes") ?? "").trim() || null,
    };
    setFamilySaving(true);
    setFamilyError("");
    setFamilyNotice("");
    try {
      await resaRequest<FamilyRelationship>(`/v1/organizations/${encodeURIComponent(organizationId)}/church-member-families`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      const relationships = await resaRequest<FamilyRelationship[]>(`/v1/organizations/${encodeURIComponent(organizationId)}/church-member-families`);
      setFamilyRelationships(relationships);
      formElement.reset();
      setFamilyNotice("Relação familiar registada.");
    } catch (reason) {
      setFamilyError(reason instanceof Error ? reason.message : "Não foi possível guardar a relação familiar.");
    } finally {
      setFamilySaving(false);
    }
  }

  async function toggleHistory(memberId: string) {
    if (historyMemberId === memberId) {
      setHistoryMemberId("");
      setHistory([]);
      return;
    }
    setHistoryMemberId(memberId);
    setHistory([]);
    setHistoryLoading(true);
    setError("");
    try {
      const data = await resaRequest<StatusEvent[]>(
        `/v1/organizations/${encodeURIComponent(organizationId)}/church-members/${encodeURIComponent(memberId)}/status-history`,
      );
      setHistory(data);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível consultar o histórico.");
    } finally {
      setHistoryLoading(false);
    }
  }

  const reportSummary = useMemo(() => ({
    totalMembers: members.length,
    activeMembers: members.filter((member) => member.membership_status === "ACTIVE").length,
    transferredMembers: members.filter((member) => member.membership_status === "TRANSFERRED").length,
    inactiveMembers: members.filter((member) => member.membership_status === "INACTIVE").length,
    deceasedMembers: members.filter((member) => member.membership_status === "DECEASED").length,
    dismissedMembers: members.filter((member) => member.membership_status === "DISMISSED").length,
    baptismsPending: baptisms.filter((record) => record.status === "PENDING").length,
    baptismsValidated: baptisms.filter((record) => record.status === "VALIDATED").length,
    baptismsRejected: baptisms.filter((record) => record.status === "REJECTED").length,
    outgoingTransfers: transfers.filter((transfer) => transfer.origin_organization_id === organizationId).length,
    incomingTransfers: transfers.filter((transfer) => transfer.destination_organization_id === organizationId).length,
    transfersPending: transfers.filter((transfer) => transfer.status === "SUBMITTED").length,
    transfersAccepted: transfers.filter((transfer) => transfer.status === "ACCEPTED").length,
    transfersRejected: transfers.filter((transfer) => transfer.status === "REJECTED").length,
    transfersDraft: transfers.filter((transfer) => transfer.status === "DRAFT").length,
  }), [members, baptisms, transfers, organizationId]);

  function downloadSecretariatReport() {
    if (!organizationId || !organization) return;
    const rows: string[][] = [
      ["Relatório operacional da Secretaria"],
      ["Organização", organization.name],
      ["Tipo de organização", organization.organization_type],
      ["Gerado em", new Date().toLocaleString("pt-PT")],
      [],
      ["Indicador", "Quantidade"],
      ["Membros registados", String(reportSummary.totalMembers)],
      ["Membros activos", String(reportSummary.activeMembers)],
      ["Membros transferidos", String(reportSummary.transferredMembers)],
      ["Membros inactivos", String(reportSummary.inactiveMembers)],
      ["Membros falecidos", String(reportSummary.deceasedMembers)],
      ["Membros removidos", String(reportSummary.dismissedMembers)],
      ["Baptismos pendentes", String(reportSummary.baptismsPending)],
      ["Baptismos validados", String(reportSummary.baptismsValidated)],
      ["Baptismos rejeitados", String(reportSummary.baptismsRejected)],
      ["Transferências de saída", String(reportSummary.outgoingTransfers)],
      ["Transferências de entrada", String(reportSummary.incomingTransfers)],
      ["Transferências submetidas / pendentes", String(reportSummary.transfersPending)],
      ["Transferências aceites", String(reportSummary.transfersAccepted)],
      ["Transferências recusadas", String(reportSummary.transfersRejected)],
      ["Transferências em rascunho", String(reportSummary.transfersDraft)],
      [],
      ["Registos de membros"],
      ["Número", "Nome", "Estado", "Data de entrada", "Data de baptismo"],
      ...members.map((member) => [
        member.member_number ?? "",
        `${member.first_name} ${member.last_name}`,
        STATUS_LABELS[member.membership_status] ?? member.membership_status,
        member.joined_on ?? "",
        member.baptism_date ?? "",
      ]),
      [],
      ["Transferências"],
      ["Direcção", "Membro", "Estado", "Data do pedido", "Organização de origem", "Organização de destino"],
      ...transfers.map((transfer) => {
        const member = members.find((item) => item.id === transfer.member_record_id);
        return [
          transfer.origin_organization_id === organizationId ? "Saída" : "Entrada",
          member ? `${member.first_name} ${member.last_name}` : "Membro não carregado",
          TRANSFER_STATUS_LABELS[transfer.status] ?? transfer.status,
          transfer.request_date,
          transfer.origin_organization_id,
          transfer.destination_organization_id,
        ];
      }),
    ];
    const csv = rows.map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(";")).join("\r\n");
    const blob = new Blob(["\\uFEFF", csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `secretaria-${organizationId}-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="min-h-screen bg-[#F4F6FA] px-4 py-6 text-[#101B35] sm:px-8 sm:py-10">
      <div className="mx-auto max-w-7xl space-y-7">
        <header className="relative isolate overflow-hidden rounded-[2rem] bg-[#071126] px-6 py-8 text-white shadow-[0_28px_90px_rgba(7,17,38,0.16)] sm:px-10 sm:py-10">
          <div aria-hidden="true" className="absolute -right-12 -top-28 h-80 w-80 rounded-full border border-white/10" />
          <div aria-hidden="true" className="absolute right-16 top-16 h-40 w-40 rounded-full border border-[#D6B66B]/20" />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#E2C477]">ZION OS · Administração eclesiástica</p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-5xl">Secretaria</h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
                Registo oficial de membros, baptismos validados, relações familiares e transferências, protegido pelo âmbito e pelas permissões da organização seleccionada.
              </p>
            </div>
            <div className="relative rounded-2xl border border-white/15 bg-white/[0.07] p-4 lg:min-w-[220px]">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Registo actual</p>
              <p className="mt-2 text-2xl font-semibold">{loading ? "…" : members.length.toLocaleString("pt-PT")}</p>
              <p className="mt-1 text-xs text-slate-400">membros devolvidos pela API</p>
            </div>
          </div>
        </header>

        <section className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-end sm:justify-between">
          <div className="w-full max-w-xl">
            <OrganizationSelector value={organizationId} onChange={(id, selected) => { setOrganization(selected); setOrganizationId(id); }} />
            {organization && <p className="mt-2 text-xs text-slate-500">Âmbito activo: <strong className="text-slate-700">{organization.name}</strong> · {organization.organization_type}</p>}
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <button type="button" onClick={() => void loadMembers(organizationId)} disabled={!organizationId || loading}
              className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-40">
              {loading ? "A actualizar…" : "Actualizar"}
            </button>
            <button type="button" onClick={() => { if (formOpen) { setFormOpen(false); setEditingMember(null); } else { setEditingMember(null); setFormOpen(true); } }} disabled={!organizationId}
              className="rounded-xl bg-[#0C1A3D] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#172c55] disabled:opacity-40">
              {formOpen ? "Fechar formulário" : "Adicionar membro"}
            </button>
          </div>
        </section>

        {error && <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>}
        {notice && <div role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{notice}</div>}

        {formOpen && (
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <div className="mb-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#9B7A34]">{editingMember ? "Editar registo" : "Novo registo"}</p>
              <h2 className="mt-2 text-xl font-semibold">Dados do membro</h2>
              <p className="mt-1 text-sm text-slate-500">Os dados são enviados para a API autenticada; a base de dados aplica as permissões RLS.</p>
            </div>
            <form key={editingMember?.id ?? "new-member"} onSubmit={createMember} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <label className="grid gap-1.5 text-xs font-medium text-slate-600">Nome próprio *<input required name="first_name" defaultValue={editingMember?.first_name ?? ""} maxLength={120} className="rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-[#C8A24A]" /></label>
              <label className="grid gap-1.5 text-xs font-medium text-slate-600">Apelido *<input required name="last_name" defaultValue={editingMember?.last_name ?? ""} maxLength={160} className="rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-[#C8A24A]" /></label>
              <label className="grid gap-1.5 text-xs font-medium text-slate-600">N.º de membro<input name="member_number" defaultValue={editingMember?.member_number ?? ""} maxLength={80} className="rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-[#C8A24A]" /></label>
              <label className="grid gap-1.5 text-xs font-medium text-slate-600">Data de nascimento<input type="date" name="birth_date" defaultValue={editingMember?.birth_date ?? ""} className="rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-[#C8A24A]" /></label>
              <label className="grid gap-1.5 text-xs font-medium text-slate-600">Data de baptismo<input type="date" name="baptism_date" defaultValue={editingMember?.baptism_date ?? ""} className="rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-[#C8A24A]" /></label>
              <label className="grid gap-1.5 text-xs font-medium text-slate-600">Data de entrada<input type="date" name="joined_on" defaultValue={editingMember?.joined_on ?? ""} className="rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-[#C8A24A]" /></label>
              <label className="grid gap-1.5 text-xs font-medium text-slate-600">Sexo<select name="gender" defaultValue={editingMember?.gender ?? ""} className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-[#C8A24A]"><option value="">Não especificado</option><option value="FEMALE">Feminino</option><option value="MALE">Masculino</option><option value="UNSPECIFIED">Não declarado</option></select></label>
              <label className="grid gap-1.5 text-xs font-medium text-slate-600">Telefone<input name="phone" defaultValue={editingMember?.phone ?? ""} maxLength={40} autoComplete="tel" className="rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-[#C8A24A]" /></label>
              <label className="grid gap-1.5 text-xs font-medium text-slate-600">Email<input name="email" type="email" defaultValue={editingMember?.email ?? ""} maxLength={254} autoComplete="email" className="rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-[#C8A24A]" /></label>
              <label className="grid gap-1.5 text-xs font-medium text-slate-600">Estado<select name="membership_status" defaultValue={editingMember?.membership_status ?? "ACTIVE"} className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-[#C8A24A]">{Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
              <div className="flex items-end sm:col-span-2 lg:col-span-3">
                <button type="submit" disabled={saving} className="w-full rounded-xl bg-[#0C1A3D] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#172c55] disabled:opacity-50 sm:w-auto">
                  {saving ? "A guardar…" : editingMember ? "Guardar alterações" : "Guardar registo"}
                </button>
              </div>
            </form>
          </section>
        )}

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-end sm:justify-between sm:p-7">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#9B7A34]">Registo eclesiástico</p>
              <h2 className="mt-2 text-xl font-semibold">Membros da organização</h2>
              <p className="mt-1 text-sm text-slate-500">A listagem mostra apenas registos que a sessão autenticada tem autorização para consultar.</p>
            </div>
            <label className="grid gap-1.5 text-xs font-medium text-slate-500">Pesquisar membros<input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Nome, número, telefone ou email" className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm font-normal text-slate-800 outline-none focus:border-[#C8A24A] sm:min-w-[300px]" /></label>
          </div>
          {!organizationId ? <p className="p-7 text-sm text-slate-500">Seleccione uma organização para consultar o registo oficial.</p>
          : loading ? <p className="p-7 text-sm text-slate-500">A carregar registos reais…</p>
          : filteredMembers.length === 0 ? <p className="p-7 text-sm text-slate-500">{members.length ? "Não existem resultados para esta pesquisa." : "Não existem membros visíveis nesta organização ou a sessão não tem permissão para os consultar."}</p>
          : <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] text-left text-sm">
                <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-4 font-semibold">Membro</th><th className="px-5 py-4 font-semibold">Número</th><th className="px-5 py-4 font-semibold">Baptismo</th><th className="px-5 py-4 font-semibold">Contacto</th><th className="px-5 py-4 font-semibold">Estado</th><th className="px-5 py-4 font-semibold">Histórico</th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredMembers.map((member) => <tr key={member.id} className="align-top transition hover:bg-slate-50/70">
                    <td className="px-5 py-4"><p className="font-semibold text-[#101B35]">{member.first_name} {member.last_name}</p><p className="mt-1 text-xs text-slate-500">Nascimento: {dateLabel(member.birth_date)}</p></td>
                    <td className="px-5 py-4 text-slate-600">{member.member_number || "—"}</td>
                    <td className="px-5 py-4 text-slate-600">{dateLabel(member.baptism_date)}</td>
                    <td className="px-5 py-4 text-slate-600"><p>{member.phone || "—"}</p><p className="mt-1 text-xs text-slate-400">{member.email || ""}</p></td>
                    <td className="px-5 py-4"><span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${member.membership_status === "ACTIVE" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{STATUS_LABELS[member.membership_status] ?? member.membership_status}</span></td>
                    <td className="px-5 py-4"><div className="flex items-center gap-3"><button type="button" onClick={() => { setEditingMember(member); setFormOpen(true); setError(""); setNotice(""); }} className="text-xs font-semibold text-[#0C1A3D] underline-offset-4 hover:underline">Editar</button><button type="button" onClick={() => void toggleHistory(member.id)} className="text-xs font-semibold text-[#7B6127] underline-offset-4 hover:underline">{historyMemberId === member.id ? "Fechar" : "Histórico"}</button></div></td>
                  </tr>).flatMap((row, index) => {
                    const member = filteredMembers[index];
                    if (historyMemberId !== member.id) return [row];
                    return [row, <tr key={`${member.id}-history`}><td colSpan={6} className="bg-[#FBF9F3] px-5 py-4">{historyLoading ? <p className="text-sm text-slate-500">A carregar histórico…</p> : history.length === 0 ? <p className="text-sm text-slate-500">Sem eventos de estado disponíveis.</p> : <ol className="space-y-3">{history.map((event) => <li key={event.id} className="flex flex-col gap-1 text-sm sm:flex-row sm:items-center sm:justify-between"><span className="font-medium">{event.previous_status ? `${STATUS_LABELS[event.previous_status as keyof typeof STATUS_LABELS] ?? event.previous_status} → ` : "Registo inicial → "}{STATUS_LABELS[event.new_status as keyof typeof STATUS_LABELS] ?? event.new_status}</span><span className="text-xs text-slate-500">{new Intl.DateTimeFormat("pt-PT", { dateStyle: "medium", timeStyle: "short" }).format(new Date(event.changed_at))} · {event.note || "Sem observação"}</span></li>)}</ol>}</td></tr>];
                  })}
                </tbody>
              </table>
            </div>}
        </section>
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-5 sm:p-7">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#9B7A34]">Estrutura familiar</p>
            <h2 className="mt-2 text-xl font-semibold">Relações entre membros</h2>
            <p className="mt-1 text-sm text-slate-500">As duas pessoas têm de pertencer à mesma organização; a base de dados impede relações entre organizações diferentes.</p>
          </div>
          {familyError && <p role="alert" className="mx-5 mt-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800 sm:mx-7">{familyError}</p>}
          {familyNotice && <p role="status" className="mx-5 mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 sm:mx-7">{familyNotice}</p>}
          <form onSubmit={createFamilyRelationship} className="grid gap-4 border-b border-slate-100 p-5 sm:grid-cols-2 sm:p-7 lg:grid-cols-4">
            <label className="grid gap-1.5 text-xs font-medium text-slate-600">Membro<select required name="member_record_id" defaultValue="" className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm"><option value="" disabled>Seleccionar membro</option>{members.map((member) => <option key={member.id} value={member.id}>{member.first_name} {member.last_name}{member.member_number ? ` · ${member.member_number}` : ""}</option>)}</select></label>
            <label className="grid gap-1.5 text-xs font-medium text-slate-600">Relação<select required name="relationship_type" defaultValue="PARENT_OF" className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm">{Object.entries(RELATIONSHIP_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            <label className="grid gap-1.5 text-xs font-medium text-slate-600">Membro relacionado<select required name="related_member_record_id" defaultValue="" className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm"><option value="" disabled>Seleccionar membro</option>{members.map((member) => <option key={member.id} value={member.id}>{member.first_name} {member.last_name}{member.member_number ? ` · ${member.member_number}` : ""}</option>)}</select></label>
            <label className="grid gap-1.5 text-xs font-medium text-slate-600">Observação (opcional)<input name="notes" maxLength={2000} className="rounded-xl border border-slate-200 px-3 py-3 text-sm" placeholder="Nota administrativa" /></label>
            <div className="sm:col-span-2 lg:col-span-4"><button type="submit" disabled={familySaving || familyLoading || members.length < 2} className="rounded-xl bg-[#0C1A3D] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">{familySaving ? "A guardar…" : "Registar relação familiar"}</button></div>
          </form>
          {familyLoading ? <p className="p-6 text-sm text-slate-500">A carregar relações familiares…</p> : familyRelationships.length === 0 ? <p className="p-6 text-sm text-slate-500">Ainda não existem relações familiares visíveis nesta organização.</p> : <div className="divide-y divide-slate-100">{familyRelationships.map((relationship) => {
            const member = members.find((item) => item.id === relationship.member_record_id);
            const related = members.find((item) => item.id === relationship.related_member_record_id);
            return <div key={relationship.id} className="flex flex-col gap-1 px-5 py-4 sm:px-7"><p className="text-sm font-semibold">{member ? `${member.first_name} ${member.last_name}` : "Membro"} <span className="font-normal text-slate-500">{RELATIONSHIP_LABELS[relationship.relationship_type] ?? relationship.relationship_type}</span> {related ? `${related.first_name} ${related.last_name}` : "membro relacionado"}</p>{relationship.notes && <p className="text-xs text-slate-500">{relationship.notes}</p>}</div>;
          })}</div>}
        </section>
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-5 sm:p-7">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#9B7A34]">Registo sacramental</p>
            <h2 className="mt-2 text-xl font-semibold">Baptismos e validação documental</h2>
            <p className="mt-1 text-sm text-slate-500">Cada registo inclui membro, data, local, congregação, ministro e referência documental. A validação é uma decisão explícita, com histórico auditável.</p>
          </div>
          {baptismError && <p role="alert" className="mx-5 mt-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800 sm:mx-7">{baptismError}</p>}
          {baptismNotice && <p role="status" className="mx-5 mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 sm:mx-7">{baptismNotice}</p>}
          <form onSubmit={createBaptism} className="grid gap-4 border-b border-slate-100 p-5 sm:grid-cols-2 lg:grid-cols-3 sm:p-7">
            <label className="grid gap-1.5 text-xs font-medium text-slate-600">Membro<select required name="member_record_id" defaultValue="" className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm"><option value="" disabled>Seleccionar membro</option>{members.map((member) => <option key={member.id} value={member.id}>{member.first_name} {member.last_name}{member.member_number ? ` · ${member.member_number}` : ""}</option>)}</select></label>
            <label className="grid gap-1.5 text-xs font-medium text-slate-600">Data do baptismo<input required type="date" name="baptism_date" className="rounded-xl border border-slate-200 px-3 py-3 text-sm" /></label>
            <label className="grid gap-1.5 text-xs font-medium text-slate-600">Local<input required name="location" maxLength={250} className="rounded-xl border border-slate-200 px-3 py-3 text-sm" /></label>
            <label className="grid gap-1.5 text-xs font-medium text-slate-600">Congregação<input required name="congregation_name" maxLength={250} className="rounded-xl border border-slate-200 px-3 py-3 text-sm" /></label>
            <label className="grid gap-1.5 text-xs font-medium text-slate-600">Ministro responsável<input required name="minister_name" maxLength={200} className="rounded-xl border border-slate-200 px-3 py-3 text-sm" /></label>
            <label className="grid gap-1.5 text-xs font-medium text-slate-600">Referência documental<input name="document_reference" maxLength={500} className="rounded-xl border border-slate-200 px-3 py-3 text-sm" placeholder="Identificador do arquivo oficial" /></label>
            <label className="grid gap-1.5 text-xs font-medium text-slate-600 sm:col-span-2 lg:col-span-3">Observações<textarea name="notes" maxLength={4000} rows={2} className="rounded-xl border border-slate-200 px-3 py-3 text-sm" /></label>
            <div className="sm:col-span-2 lg:col-span-3"><button type="submit" disabled={baptismSaving || !organizationId || members.length === 0} className="rounded-xl bg-[#0C1A3D] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">{baptismSaving ? "A guardar…" : "Registar baptismo para validação"}</button></div>
          </form>
          {baptismsLoading ? <p className="p-6 text-sm text-slate-500">A carregar registos de baptismo…</p> : baptisms.length === 0 ? <p className="p-6 text-sm text-slate-500">Não existem registos de baptismo visíveis nesta organização.</p> : <div className="divide-y divide-slate-100">{baptisms.map((record) => {
            const member = members.find((item) => item.id === record.member_record_id);
            return <div key={record.id} className="space-y-3 p-5 sm:p-7">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div><p className="font-semibold">{member ? `${member.first_name} ${member.last_name}` : "Membro"}</p><p className="mt-1 text-sm text-slate-600">{dateLabel(record.baptism_date)} · {record.location} · {record.congregation_name}</p><p className="mt-1 text-xs text-slate-500">Ministro: {record.minister_name}{record.document_reference ? ` · Documento: ${record.document_reference}` : ""}</p>{record.notes && <p className="mt-2 text-sm text-slate-500">{record.notes}</p>}{record.validation_note && <p className="mt-2 text-sm text-slate-600">Nota da decisão: {record.validation_note}</p>}</div>
                <span className={`inline-flex w-fit rounded-full px-3 py-1.5 text-xs font-semibold ${record.status === "VALIDATED" ? "bg-emerald-50 text-emerald-700" : record.status === "REJECTED" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-800"}`}>{BAPTISM_STATUS_LABELS[record.status]}</span>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                {record.status === "PENDING" && <><button type="button" onClick={() => void decideBaptism(record, "VALIDATED")} className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-semibold text-white">Validar</button><button type="button" onClick={() => void decideBaptism(record, "REJECTED")} className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-700">Rejeitar</button></>}
                <button type="button" onClick={() => void toggleBaptismHistory(record.id)} className="text-xs font-semibold text-[#7B6127] underline-offset-4 hover:underline">{baptismHistoryId === record.id ? "Fechar histórico" : "Ver histórico"}</button>
              </div>
              {baptismHistoryId === record.id && <div className="rounded-xl bg-slate-50 p-4">{baptismHistory.length === 0 ? <p className="text-xs text-slate-500">Sem eventos disponíveis para este registo.</p> : <ol className="space-y-2">{baptismHistory.map((event) => <li key={event.id} className="text-xs text-slate-600">{event.previous_status ? `${BAPTISM_STATUS_LABELS[event.previous_status as keyof typeof BAPTISM_STATUS_LABELS] ?? event.previous_status} → ` : "Criado → "}{BAPTISM_STATUS_LABELS[event.new_status as keyof typeof BAPTISM_STATUS_LABELS] ?? event.new_status} · {dateLabel(event.changed_at)}{event.note ? ` · ${event.note}` : ""}</li>)}</ol>}</div>}
            </div>;
          })}</div>}
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-5 sm:p-7">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#9B7A34]">Movimentação eclesiástica</p>
            <h2 className="mt-2 text-xl font-semibold">Transferências de membros</h2>
            <p className="mt-1 text-sm text-slate-500">Pedidos entre organizações, com submissão, decisão pela organização de destino e histórico gerado na base de dados.</p>
          </div>
          {transferError && <p role="alert" className="mx-5 mt-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800 sm:mx-7">{transferError}</p>}
          {transferNotice && <p role="status" className="mx-5 mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 sm:mx-7">{transferNotice}</p>}
          <form onSubmit={createTransfer} className="grid gap-4 border-b border-slate-100 p-5 sm:grid-cols-2 lg:grid-cols-3 sm:p-7">
            <label className="grid gap-1.5 text-xs font-medium text-slate-600">Membro a transferir<select required name="member_record_id" defaultValue="" className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm"><option value="" disabled>Seleccionar membro</option>{members.map((member) => <option key={member.id} value={member.id}>{member.first_name} {member.last_name}{member.member_number ? ` · ${member.member_number}` : ""}</option>)}</select></label>
            <OrganizationSelector value={destinationOrganizationId} onChange={(id) => setDestinationOrganizationId(id)} />
            <label className="grid gap-1.5 text-xs font-medium text-slate-600">Data do pedido<input required type="date" name="request_date" defaultValue={new Date().toISOString().slice(0, 10)} className="rounded-xl border border-slate-200 px-3 py-3 text-sm" /></label>
            <label className="grid gap-1.5 text-xs font-medium text-slate-600">Motivo (opcional)<input name="reason" maxLength={2000} className="rounded-xl border border-slate-200 px-3 py-3 text-sm" /></label>
            <label className="grid gap-1.5 text-xs font-medium text-slate-600">Referência documental (opcional)<input name="document_reference" maxLength={500} className="rounded-xl border border-slate-200 px-3 py-3 text-sm" placeholder="Referência do documento já arquivado" /></label>
            <div className="flex items-end"><button type="submit" disabled={transferSaving || !organizationId || !destinationOrganizationId || members.length === 0} className="rounded-xl bg-[#0C1A3D] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">{transferSaving ? "A guardar…" : "Criar pedido"}</button></div>
          </form>
          {transfersLoading ? <p className="p-6 text-sm text-slate-500">A carregar transferências…</p> : transfers.length === 0 ? <p className="p-6 text-sm text-slate-500">Não existem transferências visíveis para esta organização.</p> : <div className="divide-y divide-slate-100">{transfers.map((transfer) => {
            const member = members.find((item) => item.id === transfer.member_record_id);
            const isOrigin = transfer.origin_organization_id === organizationId;
            return <div key={transfer.id} className="space-y-3 p-5 sm:p-7">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div><p className="font-semibold">{member ? `${member.first_name} ${member.last_name}` : "Registo de membro"}</p><p className="mt-1 text-xs text-slate-500">{isOrigin ? "Saída para" : "Entrada de"} organização · {(isOrigin ? transfer.destination_organization_id : transfer.origin_organization_id).slice(0, 8)}… · Pedido: {dateLabel(transfer.request_date)}</p>{transfer.reason && <p className="mt-2 text-sm text-slate-600">{transfer.reason}</p>}{transfer.decision_note && <p className="mt-1 text-sm text-slate-600">Decisão: {transfer.decision_note}</p>}</div>
                <span className="inline-flex w-fit rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold">{TRANSFER_STATUS_LABELS[transfer.status]}</span>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                {isOrigin && transfer.status === "DRAFT" && <button type="button" onClick={() => void changeTransferStatus(transfer, "SUBMITTED")} className="rounded-lg bg-[#0C1A3D] px-3 py-2 text-xs font-semibold text-white">Submeter</button>}
                {isOrigin && ["DRAFT", "SUBMITTED"].includes(transfer.status) && <button type="button" onClick={() => void changeTransferStatus(transfer, "CANCELLED")} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold">Cancelar</button>}
                {!isOrigin && transfer.status === "SUBMITTED" && <><button type="button" onClick={() => void changeTransferStatus(transfer, "ACCEPTED")} className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-semibold text-white">Aceitar</button><button type="button" onClick={() => void changeTransferStatus(transfer, "REJECTED")} className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-700">Recusar</button></>}
                <button type="button" onClick={() => void toggleTransferHistory(transfer.id)} className="text-xs font-semibold text-[#7B6127] underline-offset-4 hover:underline">{transferHistoryId === transfer.id ? "Fechar histórico" : "Ver histórico"}</button>
              </div>
              {transferHistoryId === transfer.id && <div className="rounded-xl bg-slate-50 p-4">{transferHistory.length === 0 ? <p className="text-xs text-slate-500">Sem eventos ou sem permissão para consultar o histórico.</p> : <ol className="space-y-2">{transferHistory.map((event) => <li key={event.id} className="text-xs text-slate-600">{event.previous_status ? `${TRANSFER_STATUS_LABELS[event.previous_status as keyof typeof TRANSFER_STATUS_LABELS] ?? event.previous_status} → ` : "Criado → "}{TRANSFER_STATUS_LABELS[event.new_status as keyof typeof TRANSFER_STATUS_LABELS] ?? event.new_status} · {dateLabel(event.changed_at)}{event.note ? ` · ${event.note}` : ""}</li>)}</ol>}</div>}
            </div>;
          })}</div>}
        </section>
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm print:border-0 print:shadow-none">
          <div className="flex flex-col gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-end sm:justify-between sm:p-7">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#9B7A34]">Relatórios administrativos</p>
              <h2 className="mt-2 text-xl font-semibold">Relatório operacional da Secretaria</h2>
              <p className="mt-1 text-sm text-slate-500">Resumo calculado exclusivamente a partir dos registos reais devolvidos pela API para a organização seleccionada. Não substitui os mapas oficiais exigidos pela Associação/Conferência.</p>
              {organization && <p className="mt-2 text-xs text-slate-600">Organização: {organization.name} · Emitido em {new Date().toLocaleDateString("pt-PT")}</p>}
            </div>
            <div className="flex flex-wrap gap-2 print:hidden">
              <button type="button" onClick={() => window.print()} disabled={!organizationId || loading} className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 disabled:opacity-40">Imprimir / Guardar PDF</button>
              <button type="button" onClick={downloadSecretariatReport} disabled={!organizationId || loading} className="rounded-xl bg-[#0C1A3D] px-4 py-3 text-sm font-semibold text-white disabled:opacity-40">Exportar CSV</button>
            </div>
          </div>
          {!organizationId ? <p className="p-6 text-sm text-slate-500">Seleccione uma organização para gerar o relatório.</p> : (
            <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 sm:p-7">
              {[
                ["Membros registados", reportSummary.totalMembers],
                ["Membros activos", reportSummary.activeMembers],
                ["Transferidos", reportSummary.transferredMembers],
                ["Baptismos pendentes", reportSummary.baptismsPending],
                ["Baptismos validados", reportSummary.baptismsValidated],
                ["Baptismos rejeitados", reportSummary.baptismsRejected],
                ["Transferências de saída", reportSummary.outgoingTransfers],
                ["Transferências de entrada", reportSummary.incomingTransfers],
                ["Transferências pendentes", reportSummary.transfersPending],
                ["Transferências aceites", reportSummary.transfersAccepted],
                ["Transferências recusadas", reportSummary.transfersRejected],
                ["Transferências em rascunho", reportSummary.transfersDraft],
              ].map(([label, value]) => <div key={label} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <p className="text-xs font-medium text-slate-500">{label}</p>
                <p className="mt-2 text-2xl font-semibold text-[#0C1A3D]">{Number(value).toLocaleString("pt-PT")}</p>
              </div>)}
            </div>
          )}
          <div className="border-t border-slate-100 px-5 py-4 text-xs leading-5 text-slate-500 sm:px-7">
            Os números reflectem apenas os dados acessíveis à sessão autenticada e carregados nesta página. Antes de usar um relatório para submissão institucional, deve ser comparado com os formulários e prazos oficiais da Associação/Conferência local.
          </div>
        </section>
      </div>
    </main>
  );
}
