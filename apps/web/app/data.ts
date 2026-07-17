import snapshotJson from "./engegov-snapshot.json";

type Contract = {
  company?: string | null;
  cnpj?: string | null;
  procurementNumber?: string | null;
  number?: string | null;
  date?: string | null;
  serviceOrder?: string | null;
  initialValue?: number | null;
  startDate?: string | null;
  executionLimit?: string | null;
  contractEnd?: string | null;
  resourceType?: string | null;
};

type Execution = {
  contractedValue?: number | null;
  executedValue?: number | null;
  balance?: number | null;
  percentExecuted?: number | null;
  forecastValue?: number | null;
  addedValue?: number | null;
  currentValue?: number | null;
};

type Measurement = {
  number: number;
  percentMeasured: number | null;
  measuredValue: number | null;
  date: string | null;
  accumulatedPercent: number | null;
  accumulatedValue: number | null;
};

type SourceWork = {
  id: number | string;
  code: string;
  slug: string;
  secretariat: string;
  name: string;
  address: string;
  intervention: string;
  officialStatus: string;
  contract?: Contract;
  execution?: Execution;
  measurements?: Measurement[];
  reviewNotice?: string | null;
  sourceUrl: string;
  collectedAt: string;
  contentHash: string;
};

type Snapshot = {
  source: string;
  sourceUrl: string;
  collectedAt: string;
  tlsVerification: boolean;
  declaredTotals: { inProgress: number; completed: number; paused: number; total: number };
  collectedTotals: { total: number; byStatus: Record<string, number> };
  works: SourceWork[];
};

export type Work = SourceWork & {
  contract: Contract;
  execution: Execution;
  measurements: Measurement[];
  status: "Concluída" | "Em Andamento" | "Paralisada" | string;
  initialValue: number | null;
  currentValue: number | null;
  executedValue: number | null;
  physicalProgress: number | null;
  mandate: string;
  inheritedByCurrentMandate: boolean;
};

export const snapshot = snapshotJson as Snapshot;

function mandateFor(date?: string | null) {
  const year = date ? Number(date.slice(0, 4)) : NaN;
  if (!Number.isFinite(year)) return "Data não informada";
  const start = 2021 + Math.floor((year - 2021) / 4) * 4;
  return `${start}–${start + 3}`;
}

export const works: Work[] = snapshot.works.map((item) => {
  const contract = item.contract ?? {};
  const execution = item.execution ?? {};
  // O EngeGOV distingue Valor Total Previsto (base) de Valor Total Atual.
  const initialValue = execution.forecastValue ?? contract.initialValue ?? execution.contractedValue ?? null;
  const currentValue = execution.currentValue ?? execution.contractedValue ?? initialValue;
  const executedValue = execution.executedValue ?? null;
  const physicalProgress = execution.percentExecuted ?? null;
  return {
    ...item,
    contract,
    execution,
    measurements: item.measurements ?? [],
    status: item.officialStatus,
    initialValue,
    currentValue,
    executedValue,
    physicalProgress,
    mandate: mandateFor(contract.date),
    inheritedByCurrentMandate: item.officialStatus !== "Concluída" && Boolean(contract.date && contract.date < "2025-01-01"),
  };
});

export const money = (value: number | null | undefined) =>
  value == null
    ? "Não informado"
    : new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(value);

export const dateBR = (value: string | null | undefined) =>
  value ? new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(new Date(`${value.slice(0, 10)}T12:00:00Z`)) : "Não informado";

export const dateTimeBR = (value: string) =>
  new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" }).format(new Date(value));

export const statusClass = (status: string) =>
  status === "Concluída" ? "done" : status === "Em Andamento" ? "progress" : status === "Paralisada" ? "paused" : "neutral";

export const costChange = (work: Work) =>
  work.initialValue && work.currentValue != null
    ? ((work.currentValue - work.initialValue) / work.initialValue) * 100
    : null;

export const mandateRows = ["2017–2020", "2021–2024", "2025–2028"].map((mandate) => {
  const items = works.filter((work) => work.mandate === mandate);
  return {
    mandate,
    total: items.length,
    completed: items.filter((work) => work.status === "Concluída").length,
    inProgress: items.filter((work) => work.status === "Em Andamento").length,
    paused: items.filter((work) => work.status === "Paralisada").length,
    contracted: items.reduce((sum, work) => sum + (work.initialValue ?? 0), 0),
    current: items.reduce((sum, work) => sum + (work.currentValue ?? 0), 0),
  };
});

export const costAlerts = works.filter((work) => (costChange(work) ?? 0) > 20);
export const overdueCandidates = works.filter(
  (work) => work.status !== "Concluída" && work.contract.executionLimit && work.contract.executionLimit < snapshot.collectedAt.slice(0, 10),
);
