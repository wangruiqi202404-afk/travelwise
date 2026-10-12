export type WorkspaceCategoryId = "intercity" | "local" | "accommodation" | "itinerary" | "extra";

export interface BaseTravelItem {
  id: string;
  text: string;
  amount: number;
  isCompleted: boolean;
  isPreparationTask: boolean;
}

export interface IntercityTransport extends BaseTravelItem { dateId: string }
export interface LocalTransport extends BaseTravelItem { dateId: string }
export interface ItineraryItem extends BaseTravelItem { dateId: string }
export interface DailyExtraItem extends BaseTravelItem {
  dateId: string;
  source: "daily_extra" | "workspace_extra";
}
export interface Accommodation extends BaseTravelItem {
  checkInDateId: string;
  checkOutDateId: string;
}

export interface TripWorkspaceData {
  transportIntercity: IntercityTransport[];
  transportLocal: LocalTransport[];
  accommodations: Accommodation[];
  itineraryItems: ItineraryItem[];
  dailyExtras: DailyExtraItem[];
}

export type WorkspaceItem = IntercityTransport | LocalTransport | Accommodation | ItineraryItem | DailyExtraItem;

export const workspaceCategories: { id: WorkspaceCategoryId; label: string; icon: string; color: string }[] = [
  { id: "intercity", label: "category_intercity", icon: "↗", color: "blue" },
  { id: "local", label: "category_local", icon: "⇄", color: "gray" },
  { id: "accommodation", label: "category_accommodation", icon: "▱", color: "purple" },
  { id: "itinerary", label: "category_itinerary", icon: "◎", color: "green" },
  { id: "extra", label: "category_extra", icon: "＋", color: "orange" },
];

const item = (id: string, text: string, isCompleted = false, isPreparationTask = false) => ({
  id,
  text,
  amount: parseTravelAmount(text),
  isCompleted,
  isPreparationTask,
});

export const initialWorkspaceData: TripWorkspaceData = {
  transportIntercity: [
    { ...item("ic1", "上海→东京 MU523 08:40 ¥2140", true, true), dateId: "d1" },
    { ...item("ic2", "上野→镰仓 JR 08:10 ¥49", false, true), dateId: "d3" },
    { ...item("ic3", "东京→上海 MU524 13:50 ¥1980", true, true), dateId: "d7" },
  ],
  transportLocal: [
    { ...item("lt1", "Skyliner→上野 15:30 ¥125", false, true), dateId: "d1" },
    { ...item("lt2", "东京 Metro 24h 地铁通票 ¥40", false, true), dateId: "d2" },
    { ...item("lt3", "地铁一日券 ¥40", true, true), dateId: "d4" },
    { ...item("lt4", "新宿→涩谷 山手线 ¥18"), dateId: "d5" },
    { ...item("lt5", "上野→成田 Skyliner 08:15 ¥125", false, true), dateId: "d7" },
  ],
  accommodations: [
    { ...item("ac1", "NOHGA HOTEL 上野 6晚 ¥7260", true, true), checkInDateId: "d1", checkOutDateId: "d7" },
  ],
  itineraryItems: [
    { ...item("it1", "ぽん多本家 晚餐 ¥210"), dateId: "d1" },
    { ...item("it2", "上野公园 09:30"), dateId: "d2" },
    { ...item("it3", "浅草·藏前 14:00"), dateId: "d2" },
    { ...item("it4", "国立西洋美术馆 门票 ¥25", false, true), dateId: "d2" },
    { ...item("it5", "浅草今半 12:00 午餐 ¥325", true, true), dateId: "d2" },
    { ...item("it6", "镰仓一日散步 鹤冈·长谷·七里滨"), dateId: "d3" },
    { ...item("it7", "长谷寺 现场购票 ¥20"), dateId: "d3" },
    { ...item("it8", "Bills 七里滨 16:30 ¥260"), dateId: "d3" },
    { ...item("it9", "清澄白河 咖啡店·美术馆"), dateId: "d4" },
    { ...item("it10", "东京都现代美术馆 门票 ¥60", false, true), dateId: "d4" },
    { ...item("it11", "深川饭 午餐 ¥150"), dateId: "d4" },
    { ...item("it12", "新宿·涩谷 城市漫步"), dateId: "d5" },
    { ...item("it13", "SHIBUYA SKY 17:20 门票 ¥125", false, true), dateId: "d5" },
    { ...item("it14", "鸟竹总本店 晚餐 ¥220"), dateId: "d5" },
    { ...item("it15", "代官山 T-SITE 购物 ¥400"), dateId: "d5" },
    { ...item("it16", "自由活动 留白时间"), dateId: "d6" },
    { ...item("it17", "银座八五 拉面 ¥75"), dateId: "d6" },
    { ...item("it18", "银座购物 ¥600"), dateId: "d6" },
  ],
  dailyExtras: [],
};

export function parseTravelAmount(text: string) {
  const prefix = text.match(/[¥￥]\s*([\d,]+(?:\.\d{1,2})?)/);
  const suffix = text.match(/([\d,]+(?:\.\d{1,2})?)\s*元/);
  const value = (prefix?.[1] ?? suffix?.[1] ?? "0").replaceAll(",", "");
  return Math.max(0, Number(value) || 0);
}

export const accommodationCoversDate = (item: Accommodation, dateId: string) => {
  const dateIndex = (id: string) => Number(id.replace(/^d/, "")) - 1;
  const current = dateIndex(dateId);
  const start = dateIndex(item.checkInDateId);
  const end = dateIndex(item.checkOutDateId);
  if (current < 0 || start < 0 || !Number.isFinite(current) || !Number.isFinite(start)) return false;
  return end > start ? current >= start && current < end : current === start;
};

export const workspaceItemCount = (data: TripWorkspaceData) =>
  data.transportIntercity.length + data.transportLocal.length + data.accommodations.length + data.itineraryItems.length + data.dailyExtras.length;

export const getWorkspaceItems = (data: TripWorkspaceData) => [
  ...data.transportIntercity.map(item => ({ categoryId: "intercity" as const, item })),
  ...data.transportLocal.map(item => ({ categoryId: "local" as const, item })),
  ...data.accommodations.map(item => ({ categoryId: "accommodation" as const, item })),
  ...data.itineraryItems.map(item => ({ categoryId: "itinerary" as const, item })),
  ...data.dailyExtras.map(item => ({ categoryId: "extra" as const, item })),
];

export const getPreparationStats = (data: TripWorkspaceData) => {
  const preparationItems = getWorkspaceItems(data).filter(record => record.item.isPreparationTask);
  const completedItems = preparationItems.filter(record => record.item.isCompleted);
  const pendingItems = preparationItems.filter(record => !record.item.isCompleted);
  return {
    total: preparationItems.length,
    pending: pendingItems.length,
    completed: completedItems.length,
    progress: preparationItems.length ? Math.round(completedItems.length / preparationItems.length * 100) : 100,
    pendingItems,
  };
};

export const calculateWorkspaceTotals = (data: TripWorkspaceData) => {
  const category = {
    intercity: data.transportIntercity.reduce((sum, current) => sum + current.amount, 0),
    local: data.transportLocal.reduce((sum, current) => sum + current.amount, 0),
    accommodation: data.accommodations.reduce((sum, current) => sum + current.amount, 0),
    itinerary: data.itineraryItems.reduce((sum, current) => sum + current.amount, 0),
    extra: data.dailyExtras.reduce((sum, current) => sum + current.amount, 0),
  } satisfies Record<WorkspaceCategoryId, number>;

  const daily: Record<string, number> = {};
  const addDailyAmount = (dateId: string, amount: number) => { daily[dateId] = (daily[dateId] ?? 0) + amount; };
  data.transportIntercity.forEach(current => { addDailyAmount(current.dateId, current.amount); });
  data.transportLocal.forEach(current => { addDailyAmount(current.dateId, current.amount); });
  data.itineraryItems.forEach(current => { addDailyAmount(current.dateId, current.amount); });
  data.dailyExtras.forEach(current => { addDailyAmount(current.dateId, current.amount); });
  data.accommodations.forEach(current => { addDailyAmount(current.checkInDateId, current.amount); });

  const paidTotal = getWorkspaceItems(data)
    .filter(record => record.item.isCompleted)
    .reduce((sum, record) => sum + record.item.amount, 0);
  const grandTotal = Object.values(category).reduce((sum, amount) => sum + amount, 0);

  return {
    grandTotal,
    paidTotal,
    pendingTotal: grandTotal - paidTotal,
    category,
    daily,
  };
};
