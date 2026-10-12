import { useState, type FormEvent } from "react";
import type { BoardDate } from "../data/mock";
import {
  accommodationCoversDate,
  calculateWorkspaceTotals,
  parseTravelAmount,
  workspaceCategories,
  workspaceItemCount,
  type TripWorkspaceData,
  type WorkspaceCategoryId,
  type WorkspaceItem,
} from "../data/travel";
import { useI18n } from "../i18n/LanguageContext";

const money = (value: number) => `¥${value.toLocaleString()}`;

interface TextDraft {
  id: string;
  categoryId: WorkspaceCategoryId;
  cellDateId: string;
  text: string;
}

const getItemsForCell = (data: TripWorkspaceData, categoryId: WorkspaceCategoryId, dateId: string): WorkspaceItem[] => {
  if (categoryId === "intercity") return data.transportIntercity.filter(item => item.dateId === dateId);
  if (categoryId === "local") return data.transportLocal.filter(item => item.dateId === dateId);
  if (categoryId === "accommodation") return data.accommodations.filter(item => accommodationCoversDate(item, dateId));
  if (categoryId === "extra") return data.dailyExtras.filter(item => item.dateId === dateId);
  return data.itineraryItems.filter(item => item.dateId === dateId);
};

const nextDateId = (dates: BoardDate[], dateId: string) => {
  const index = dates.findIndex(date => date.id === dateId);
  return dates[Math.min(index + 1, dates.length - 1)]?.id ?? dateId;
};

export function TravelWorkspace({ data, dates, onDataChange, onOpenDaily }: {
  data: TripWorkspaceData;
  dates: BoardDate[];
  onDataChange: (data: TripWorkspaceData) => void;
  onOpenDaily: (dateId: string) => void;
}) {
  const { t } = useI18n();
  const [draft, setDraft] = useState<TextDraft | null>(null);
  const totals = calculateWorkspaceTotals(data);

  const startNew = (dateId: string, categoryId: WorkspaceCategoryId) => {
    setDraft({ id: "", categoryId, cellDateId: dateId, text: "" });
  };

  const startEdit = (item: WorkspaceItem, categoryId: WorkspaceCategoryId, cellDateId: string) => {
    setDraft({ id: item.id, categoryId, cellDateId, text: item.text });
  };

  const saveDraft = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!draft?.text.trim()) return;
    const text = draft.text.trim();
    const amount = parseTravelAmount(text);
    const id = draft.id || `item-${Date.now()}`;

    if (draft.categoryId === "intercity") {
      const existing = data.transportIntercity.find(item => item.id === draft.id);
      const nextItem = { id, dateId: existing?.dateId ?? draft.cellDateId, text, amount, isCompleted: existing?.isCompleted ?? false, isPreparationTask: existing?.isPreparationTask ?? false };
      onDataChange({ ...data, transportIntercity: existing ? data.transportIntercity.map(item => item.id === id ? nextItem : item) : [...data.transportIntercity, nextItem] });
    } else if (draft.categoryId === "local") {
      const existing = data.transportLocal.find(item => item.id === draft.id);
      const nextItem = { id, dateId: existing?.dateId ?? draft.cellDateId, text, amount, isCompleted: existing?.isCompleted ?? false, isPreparationTask: existing?.isPreparationTask ?? false };
      onDataChange({ ...data, transportLocal: existing ? data.transportLocal.map(item => item.id === id ? nextItem : item) : [...data.transportLocal, nextItem] });
    } else if (draft.categoryId === "accommodation") {
      const existing = data.accommodations.find(item => item.id === draft.id);
      const nextItem = { id, checkInDateId: existing?.checkInDateId ?? draft.cellDateId, checkOutDateId: existing?.checkOutDateId ?? nextDateId(dates, draft.cellDateId), text, amount, isCompleted: existing?.isCompleted ?? false, isPreparationTask: existing?.isPreparationTask ?? false };
      onDataChange({ ...data, accommodations: existing ? data.accommodations.map(item => item.id === id ? nextItem : item) : [...data.accommodations, nextItem] });
    } else if (draft.categoryId === "extra") {
      const existing = data.dailyExtras.find(item => item.id === draft.id);
      const nextItem = { id, dateId: existing?.dateId ?? draft.cellDateId, text, amount, isCompleted: existing?.isCompleted ?? false, isPreparationTask: false, source: existing?.source ?? "workspace_extra" as const };
      onDataChange({ ...data, dailyExtras: existing ? data.dailyExtras.map(item => item.id === id ? nextItem : item) : [...data.dailyExtras, nextItem] });
    } else {
      const existingExtra = data.dailyExtras.find(item => item.id === draft.id);
      if (existingExtra) {
        const nextItem = { ...existingExtra, text, amount };
        onDataChange({ ...data, dailyExtras: data.dailyExtras.map(item => item.id === id ? nextItem : item) });
        setDraft(null);
        return;
      }
      const existing = data.itineraryItems.find(item => item.id === draft.id);
      const nextItem = { id, dateId: existing?.dateId ?? draft.cellDateId, text, amount, isCompleted: existing?.isCompleted ?? false, isPreparationTask: existing?.isPreparationTask ?? false };
      onDataChange({ ...data, itineraryItems: existing ? data.itineraryItems.map(item => item.id === id ? nextItem : item) : [...data.itineraryItems, nextItem] });
    }
    setDraft(null);
  };

  const toggleReservation = (id: string, checked: boolean) => {
    onDataChange({
      ...data,
      itineraryItems: data.itineraryItems.map(item => item.id === id ? { ...item, isCompleted: checked } : item),
    });
  };

  const deleteItem = (categoryId: WorkspaceCategoryId, id: string) => {
    if (categoryId === "intercity") onDataChange({ ...data, transportIntercity: data.transportIntercity.filter(item => item.id !== id) });
    else if (categoryId === "local") onDataChange({ ...data, transportLocal: data.transportLocal.filter(item => item.id !== id) });
    else if (categoryId === "accommodation") onDataChange({ ...data, accommodations: data.accommodations.filter(item => item.id !== id) });
    else if (categoryId === "extra") onDataChange({ ...data, dailyExtras: data.dailyExtras.filter(item => item.id !== id) });
    else onDataChange({ ...data, itineraryItems: data.itineraryItems.filter(item => item.id !== id) });
    if (draft?.id === id) setDraft(null);
  };

  return (
    <div className="board-page">
      <section className="board-toolbar">
        <div className="view-tabs"><button className="active">▦ {t("table_view")}</button><button onClick={() => onOpenDaily(dates[0].id)}>{t("daily_view")}</button></div>
        <div className="board-legend"><span>{t("reservation_legend")}</span></div>
        <div className="board-total"><small>{t("current_total_expense")}</small><b>{money(totals.grandTotal)}</b></div>
      </section>

      <div className="board-mobile-hint">{t("board_mobile_hint")}</div>
      <section className="board-scroll" aria-label={t("travel_plan_board")}>
        <div className="matrix-grid matrix-header">
          <div className="matrix-corner sticky-col"><small>{t("travel_plan")}</small><b>{t("category_date")}</b></div>
          {dates.map(date => <button className="date-head" key={date.id} onClick={() => onOpenDaily(date.id)} aria-label={t("open_daily_view", { date: date.date })}><span>{t("day_number", { count: date.dayIndex })}</span><b>{date.date}</b><small>{t(date.week)} · {t(date.city)}</small></button>)}
        </div>

        {workspaceCategories.map(category => (
          <div className="matrix-grid matrix-row" key={category.id}>
            <div className="category-head sticky-col">
              <span className={`board-cat-icon board-cat-${category.color}`}>{category.icon}</span>
              <div><b>{t(category.label)}</b><small>{t("category_total", { amount: money(totals.category[category.id]) })}</small></div>
            </div>
            {dates.map(date => {
              const items = getItemsForCell(data, category.id, date.id);
              const editingHere = draft?.categoryId === category.id && draft.cellDateId === date.id;
              const cellTotal = category.id === "accommodation"
                ? data.accommodations.filter(item => item.checkInDateId === date.id).reduce((sum, item) => sum + item.amount, 0)
                : category.id === "itinerary"
                  ? data.itineraryItems.filter(item => item.dateId === date.id).reduce((sum, item) => sum + item.amount, 0)
                  : items.reduce((sum, item) => sum + item.amount, 0);

              return <div className="matrix-cell workspace-cell" data-category={category.id} data-date={date.id} key={date.id}>
                {items.map(item => <div className="simple-item-row" data-item-id={item.id} key={item.id}>
                  <button className="simple-item-text" onClick={() => startEdit(item, category.id, date.id)} aria-label={t("edit_item", { item: item.text })}>{item.text}</button>
                  {category.id === "itinerary" && <label className="completion-toggle" onClick={event => event.stopPropagation()}>
                    <input type="checkbox" checked={item.isCompleted} onChange={event => toggleReservation(item.id, event.target.checked)} />
                    <span>{t(item.isCompleted ? "booked" : "not_booked")}</span>
                  </label>}
                  <button className="simple-item-delete" onClick={() => deleteItem(category.id, item.id)} aria-label={t("delete_item", { item: item.text })}>×</button>
                </div>)}

                {editingHere && draft && <form className="inline-text-editor" onSubmit={saveDraft}>
                  <input autoFocus value={draft.text} onChange={event => setDraft({ ...draft, text: event.target.value })} onBlur={() => { if (!draft.id) setDraft(null); }} onKeyDown={event => { if (event.key === "Enter" && !event.nativeEvent.isComposing) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } else if (event.key === "Escape") setDraft(null); }} placeholder={t("item_input_placeholder")} aria-label={t("item_content")} />
                </form>}

                {!editingHere && <button className="cell-add-item" onClick={() => startNew(date.id, category.id)}>＋ {t("add_item")}</button>}
                {cellTotal > 0 && <div className="cell-total"><span>{t("cell_total")}</span><b>{money(cellTotal)}</b></div>}
              </div>;
            })}
          </div>
        ))}

        <div className="matrix-grid matrix-footer">
          <div className="total-label sticky-col"><span>Σ</span><div><b>{t("daily_expense")}</b><small>{t("total_amount", { amount: money(totals.grandTotal) })}</small></div></div>
          {dates.map(date => <div className="day-cost" key={date.id}><small>{date.date}</small><b>{money(totals.daily[date.id] ?? 0)}</b><span>{t("daily_total")}</span></div>)}
        </div>
      </section>
      <footer className="board-footer"><span>{t("plan_items_count", { count: workspaceItemCount(data) })}</span><span>{t("days_categories_count", { days: dates.length, count: workspaceCategories.length })}</span><p>{t("updated_just_now")}</p></footer>
    </div>
  );
}
