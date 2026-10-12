import { useState, type FormEvent, type KeyboardEvent } from "react";
import type { BoardDate, PageId } from "../data/mock";
import { getPreparationItems } from "../data/preparation";
import { calculateWorkspaceTotals, workspaceItemCount, type TripWorkspaceData } from "../data/travel";
import { useI18n } from "../i18n/LanguageContext";

export interface TripOverviewInfo {
  name: string;
  destination: string;
  startDate: string;
  endDate: string;
  travelers: number;
  isArchived: boolean;
}

type EditableField = "name" | "destination" | "dates" | "travelers";

const dateParts = (value: string) => {
  const date = new Date(`${value}T00:00:00`);
  return {
    day: String(date.getDate()).padStart(2, "0"),
    month: date.getMonth() + 1,
    year: date.getFullYear(),
  };
};

const tripDays = (startDate: string, endDate: string) => {
  const start = new Date(`${startDate}T00:00:00`).getTime();
  const end = new Date(`${endDate}T00:00:00`).getTime();
  return Math.max(1, Math.round((end - start) / 86_400_000) + 1);
};

export function Overview({
  goTo,
  data,
  preparation,
  trip,
  onTripChange,
  onDeleteTrip,
  dailyDate,
}: {
  goTo: (id: PageId) => void;
  data: TripWorkspaceData;
  preparation: ReturnType<typeof getPreparationItems>;
  trip: TripOverviewInfo;
  onTripChange: (trip: TripOverviewInfo) => void;
  onDeleteTrip: () => void;
  dailyDate: BoardDate;
}) {
  const { t } = useI18n();
  const [editingField, setEditingField] = useState<EditableField | null>(null);
  const [draft, setDraft] = useState(trip);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuNote, setMenuNote] = useState("");
  const totals = calculateWorkspaceTotals(data);
  const itemCount = workspaceItemCount(data);
  const start = dateParts(trip.startDate);
  const end = dateParts(trip.endDate);

  const beginEdit = (field: EditableField) => {
    setDraft(trip);
    setEditingField(field);
    setMenuOpen(false);
    setMenuNote("");
  };

  const saveEdit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const next = {
      ...draft,
      name: draft.name.trim() || trip.name,
      destination: draft.destination.trim() || trip.destination,
      travelers: Math.max(1, Math.round(draft.travelers) || 1),
    };
    if (next.endDate < next.startDate) next.endDate = next.startDate;
    onTripChange(next);
    setEditingField(null);
  };

  const cancelOnEscape = (key: string) => {
    if (key === "Escape") setEditingField(null);
  };

  const handleEditorKey = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" && !event.nativeEvent.isComposing) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    } else {
      cancelOnEscape(event.key);
    }
  };

  return (
    <div className="overview-page">
      <section className="trip-hero">
        <div className="overview-trip-menu">
          <button className="overview-trip-menu-trigger" onClick={() => setMenuOpen(current => !current)} aria-label={t("trip_actions")} aria-expanded={menuOpen}>•••</button>
          {menuOpen && <div className="overview-trip-menu-popover">
            <button onClick={() => beginEdit("name")}>{t("edit_trip")}</button>
            <button onClick={() => { onTripChange({ ...trip, isArchived: !trip.isArchived }); setMenuOpen(false); setMenuNote(trip.isArchived ? "trip_restored" : "trip_archived"); }}>{t(trip.isArchived ? "unarchive_trip" : "archive_trip")}</button>
            <button className="danger" onClick={() => { setMenuOpen(false); onDeleteTrip(); }}>{t("delete_trip")}</button>
          </div>}
        </div>

        <div className="hero-dates">
          {editingField === "dates" ? (
            <form className="hero-date-editor" onSubmit={saveEdit}>
              <label><span>{t("start")}</span><input autoFocus type="date" value={draft.startDate} onChange={event => setDraft({ ...draft, startDate: event.target.value })} onKeyDown={handleEditorKey} /></label>
              <label><span>{t("end")}</span><input type="date" value={draft.endDate} onChange={event => setDraft({ ...draft, endDate: event.target.value })} onKeyDown={handleEditorKey} /></label>
              <button>{t("enter_to_save")}</button>
            </form>
          ) : (
            <button className="hero-date-button" onClick={() => beginEdit("dates")} aria-label={t("edit_trip_dates")}>
              <b>{start.day}</b><span>{t(`month_short_${start.month}`)}<br />{start.year}</span><i /><b>{end.day}</b><span>{t(`month_short_${end.month}`)}<br />{end.year}</span>
            </button>
          )}
        </div>

        <div className="hero-copy">
          <p>
            {t("days_count", { count: tripDays(trip.startDate, trip.endDate) })} · {editingField === "travelers" ? (
              <form className="hero-travelers-editor" onSubmit={saveEdit}>
                <input autoFocus type="number" min="1" value={draft.travelers} onChange={event => setDraft({ ...draft, travelers: Number(event.target.value) })} onKeyDown={handleEditorKey} aria-label={t("traveler_count")} />
                <button>{t("save")}</button>
              </form>
            ) : <button className="hero-inline-trigger" onClick={() => beginEdit("travelers")}>{t("travelers_count", { count: trip.travelers })}</button>}
            {trip.isArchived && <span className="archived-tag">{t("archived")}</span>}
          </p>
          <h2>
            {editingField === "destination" ? (
              <form className="hero-copy-editor" onSubmit={saveEdit}><input autoFocus value={draft.destination} onChange={event => setDraft({ ...draft, destination: event.target.value })} onBlur={() => setEditingField(null)} onKeyDown={handleEditorKey} aria-label={t("destination")} /></form>
            ) : <button onClick={() => beginEdit("destination")}>{trip.destination}</button>}
            <br />
            {editingField === "name" ? (
              <form className="hero-copy-editor" onSubmit={saveEdit}><input autoFocus value={draft.name} onChange={event => setDraft({ ...draft, name: event.target.value })} onBlur={() => setEditingField(null)} onKeyDown={handleEditorKey} aria-label={t("trip_name")} /></form>
            ) : <button className="trip-name-trigger" onClick={() => beginEdit("name")}><em>{trip.name}</em></button>}
          </h2>
          {menuNote && <span className="countdown">{t(menuNote)}</span>}
        </div>
        <div className="route-code"><span>SHA</span><i /><b>→</b><i /><span>TYO</span></div>
      </section>

      <section className="overview-kpis">
        <button className="overview-kpi-link" onClick={() => goTo("workspace")}>
          <small>{t("total_expense")}</small><b>¥{totals.grandTotal.toLocaleString()}</b><span>{t("from_plan_items", { count: itemCount })}</span>
        </button>
        <button className="overview-kpi-link" onClick={() => goTo("prep")}>
          <small>{t("pending_preparation")}</small><b>{t("items_count", { count: preparation.pending })}</b><span>{t("view_preparation")}</span>
        </button>
      </section>

      <section className="overview-grid">
        <button className="readiness-panel overview-entry-card" onClick={() => goTo("prep")}>
          <div className="panel-heading"><div><p>{t("preparation_progress")}</p><h3>{t("preparation_progress")}</h3></div><span>{preparation.progress}%</span></div>
          <div className="progress-track"><i style={{ width: `${preparation.progress}%` }} /></div>
          <div className="metric-row metric-row-two"><span><b>{preparation.completed}</b><small>{t("processed")}</small></span><span><b>{preparation.pending}</b><small>{t("pending")}</small></span></div>
          <span className="overview-card-cta">{t("view_preparation")}</span>
        </button>
        <button className="next-up overview-entry-card" onClick={() => goTo("daily")}>
          <div className="panel-heading"><div><p>{t("today")}</p><h3>{t("date_month_day", { month: Number(dailyDate.date.split(".")[0]), day: Number(dailyDate.date.split(".")[1]) })}　{t(dailyDate.week)}</h3></div></div>
          <div className="today-entry-copy"><b>{t("view_today_plan")}</b><small>{t("today_plan_description")}</small></div>
          <span className="overview-card-cta">{t("daily_view_link")}</span>
        </button>
      </section>

      <section className="workspace-sync-panel">
        <div><p>{t("expense_summary")}</p><h3>{t("expense_summary")}</h3></div>
        <div className="sync-metrics"><span><small>{t("total_expense")}</small><b>¥{totals.grandTotal.toLocaleString()}</b></span></div>
        <button onClick={() => goTo("workspace")}>{t("view_expense_details")}</button>
      </section>
    </div>
  );
}
