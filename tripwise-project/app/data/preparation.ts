export type ChecklistCategory = "documents" | "essentials" | "clothing" | "insurance" | "money";

export type ChecklistStatus = "pending" | "completed" | "not_applicable";

export interface ChecklistDefinition {
  id: string;
  category: ChecklistCategory;
  title: string;
}

export interface ResolvedChecklistItem extends ChecklistDefinition {
  status: ChecklistStatus;
}

export interface PreparationMemo {
  id: string;
  category: ChecklistCategory;
  text: string;
  status: ChecklistStatus;
}

export const checklistCategoryOrder: ChecklistCategory[] = [
  "documents",
  "essentials",
  "clothing",
  "insurance",
  "money",
];

export const checklistCategoryMeta: Record<ChecklistCategory, { label: string; index: string }> = {
  documents: { label: "prep_category_documents", index: "01" },
  essentials: { label: "prep_category_essentials", index: "02" },
  clothing: { label: "prep_category_clothing", index: "03" },
  insurance: { label: "prep_category_insurance", index: "04" },
  money: { label: "prep_category_money", index: "05" },
};

const item = (id: string, category: ChecklistCategory, title: string): ChecklistDefinition => ({ id, category, title });

export const basePreparationChecklist: ChecklistDefinition[] = [
  item("documents-passport", "documents", "checklist_passport"),
  item("documents-visa-entry", "documents", "checklist_visa_entry"),
  item("documents-backup", "documents", "checklist_documents_backup"),

  item("essentials-charger", "essentials", "checklist_charger"),
  item("essentials-adapter", "essentials", "checklist_adapter"),
  item("essentials-medicine", "essentials", "checklist_medicine"),
  item("essentials-toiletries", "essentials", "checklist_toiletries"),
  item("essentials-sim", "essentials", "checklist_sim"),

  item("clothing-daily", "clothing", "checklist_daily_clothes"),
  item("clothing-jacket", "clothing", "checklist_jacket"),
  item("clothing-shoes", "clothing", "checklist_walking_shoes"),
  item("clothing-rain", "clothing", "checklist_rain_gear"),

  item("insurance-travel", "insurance", "checklist_travel_insurance"),

  item("money-card", "money", "checklist_bank_card"),
  item("money-cash", "money", "checklist_local_cash"),
  item("money-overseas-payment", "money", "checklist_overseas_payment"),
];

export function buildPreparationChecklist(): ResolvedChecklistItem[] {
  return basePreparationChecklist.map(checklistItem => ({ ...checklistItem, status: "pending" }));
}

export function applyChecklistOverrides(
  checklist: ResolvedChecklistItem[],
  overrides: Record<string, ChecklistStatus>,
) {
  return checklist.map(checklistItem => ({
    ...checklistItem,
    status: overrides[checklistItem.id] ?? checklistItem.status,
  }));
}

export const initialPreparationMemos: PreparationMemo[] = [];

export function getPreparationItems({
  checklist,
}: {
  checklist: ResolvedChecklistItem[];
}) {
  const statuses = checklist.map(item => item.status);
  const applicable = statuses.filter(status => status !== "not_applicable");
  const completed = applicable.filter(status => status === "completed").length;

  return {
    total: applicable.length,
    completed,
    pending: applicable.length - completed,
    notApplicable: statuses.length - applicable.length,
    progress: applicable.length ? Math.round((completed / applicable.length) * 100) : 100,
  };
}
