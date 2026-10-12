import { useMemo, useState, type FormEvent } from "react";
import type { BoardDate } from "../data/mock";
import {
  accommodationCoversDate,
  calculateWorkspaceTotals,
  parseTravelAmount,
  workspaceCategories,
  type TripWorkspaceData,
  type WorkspaceCategoryId,
  type WorkspaceItem,
} from "../data/travel";
import { useI18n } from "../i18n/LanguageContext";

type DailyCategoryId = Exclude<WorkspaceCategoryId, "accommodation" | "extra">;
type DailyRecord = { categoryId: DailyCategoryId; item: WorkspaceItem };
type EditDraft = { id: string; categoryId: WorkspaceCategoryId; field: "text" | "amount"; value: string };

const money = (value: number) => `¥${value.toLocaleString()}`;
const timePattern = /\b([01]?\d|2[0-3]):[0-5]\d\b/;
const pricePattern = /(?:[¥￥]\s*[\d,]+(?:\.\d{1,2})?|[\d,]+(?:\.\d{1,2})?\s*元)/;

const getTime = (text: string) => text.match(timePattern)?.[0] ?? "";
const displayText = (text: string) => text.replace(timePattern, "").replace(pricePattern, "").replace(/\s+/g, " ").trim();

const replaceAmountInText = (text: string, amount: number) => {
  const withoutAmount = text.replace(pricePattern, "").replace(/\s+/g, " ").trim();
  return amount > 0 ? `${withoutAmount} ¥${amount}` : withoutAmount;
};

export function DailyView({
  data,
  dates,
  dateId,
  onDateChange,
  onDataChange,
  onBack,
}: {
  data: TripWorkspaceData;
  dates: BoardDate[];
  dateId: string;
  onDateChange: (dateId: string) => void;
  onDataChange: (data: TripWorkspaceData) => void;
  onBack: () => void;
}) {
  const { t } = useI18n();
  const [draft, setDraft] = useState<EditDraft | null>(null);
  const [isAddingExtra, setIsAddingExtra] = useState(false);
  const [extraText, setExtraText] = useState("");
  const selectedDate = dates.find(date => date.id === dateId) ?? dates[0];
  const totals = calculateWorkspaceTotals(data);

  const dailyItems = useMemo<DailyRecord[]>(() => {
    const records: DailyRecord[] = [
      ...data.transportIntercity.filter(item => item.dateId === dateId).map(item => ({ categoryId: "intercity" as const, item })),
      ...data.transportLocal.filter(item => item.dateId === dateId).map(item => ({ categoryId: "local" as const, item })),
      ...data.itineraryItems.filter(item => item.dateId === dateId).map(item => ({ categoryId: "itinerary" as const, item })),
    ];
    return records.sort((a, b) => {
      const aTime = getTime(a.item.text);
      const bTime = getTime(b.item.text);
      if (!aTime && !bTime) return 0;
      if (!aTime) return 1;
      if (!bTime) return -1;
      return aTime.localeCompare(bTime);
    });
  }, [data, dateId]);

  const accommodations = data.accommodations.filter(item => accommodationCoversDate(item, dateId));
  const dailyExtras = data.dailyExtras.filter(item => item.dateId === dateId);

  const updateItem = (categoryId: WorkspaceCategoryId, id: string, updater: (item: WorkspaceItem) => WorkspaceItem) => {
    const update = <T extends WorkspaceItem>(items: T[]) => items.map(item => item.id === id ? updater(item) as T : item);
    if (categoryId === "intercity") onDataChange({ ...data, transportIntercity: update(data.transportIntercity) });
    else if (categoryId === "local") onDataChange({ ...data, transportLocal: update(data.transportLocal) });
    else if (categoryId === "accommodation") onDataChange({ ...data, accommodations: update(data.accommodations) });
    else if (categoryId === "extra") onDataChange({ ...data, dailyExtras: update(data.dailyExtras) });
    else onDataChange({ ...data, itineraryItems: update(data.itineraryItems) });
  };

  const addDailyExtra = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const text = extraText.trim();
    if (!text) return;
    onDataChange({
      ...data,
      dailyExtras: [...data.dailyExtras, {
        id: `daily-extra-${Date.now()}`,
        dateId,
        text,
        amount: parseTravelAmount(text),
        source: "daily_extra",
        isCompleted: false,
        isPreparationTask: false,
      }],
    });
    setExtraText("");
    setIsAddingExtra(false);
  };

  const saveDraft = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!draft) return;
    if (draft.field === "text") {
      const text = draft.value.trim();
      if (!text) return;
      updateItem(draft.categoryId, draft.id, item => ({ ...item, text, amount: parseTravelAmount(text) }));
    } else {
      const amount = Math.max(0, Number(draft.value.replaceAll(",", "")) || 0);
      updateItem(draft.categoryId, draft.id, item => ({ ...item, amount, text: replaceAmountInText(item.text, amount) }));
    }
    setDraft(null);
  };

  const dateParts = selectedDate.date.split(".");

  return (
    <div className="daily-view-page">
      <section className="daily-date-shell">
        <div className="daily-title-row">
          <div><button onClick={onBack}>← {t("travel_plan")}</button><h2>{t("date_month_day", { month: Number(dateParts[0]), day: Number(dateParts[1]) })} <span>{t(selectedDate.week)}</span></h2></div>
          <small>{t("day_number", { count: selectedDate.dayIndex })}</small>
        </div>
        <div className="daily-date-strip" aria-label={t("switch_date")}>
          {dates.map(date => <button className={date.id === dateId ? "active" : ""} key={date.id} onClick={() => { setDraft(null); setIsAddingExtra(false); setExtraText(""); onDateChange(date.id); }}>
            <span>{date.date}</span><small>{t(date.week)}</small>
          </button>)}
        </div>
      </section>

      <section className="daily-overview-line">
        <span><small>{t("today_expense")}</small><b>{money(totals.daily[dateId] ?? 0)}</b></span>
      </section>

      <section className="daily-agenda">
        <div className="daily-section-title"><p>{t("today")}</p><h3>{t("today_items")}</h3></div>
        <div className="daily-item-list">
          {dailyItems.map(({ categoryId, item }) => {
            const time = getTime(item.text);
            const textDraft = draft?.id === item.id && draft.categoryId === categoryId && draft.field === "text";
            const amountDraft = draft?.id === item.id && draft.categoryId === categoryId && draft.field === "amount";
            return <article className="daily-item" key={`${categoryId}-${item.id}`}>
              <time>{time || "—"}</time>
              <div className="daily-item-main">
                {textDraft && draft
                  ? <form className="daily-inline-form" onSubmit={saveDraft}><input autoFocus value={draft.value} onChange={event => setDraft({ ...draft, value: event.target.value })} onKeyDown={event => { if (event.key === "Escape") setDraft(null); }} aria-label={t("edit_item", { item: displayText(item.text) })} /></form>
                  : <button className="daily-item-name" onClick={() => setDraft({ id: item.id, categoryId, field: "text", value: item.text })}>{displayText(item.text)}</button>}
                <small>{t(workspaceCategories.find(category => category.id === categoryId)?.label ?? categoryId)}</small>
              </div>
              <div className="daily-item-amount">
                {amountDraft && draft
                  ? <form className="daily-amount-form" onSubmit={saveDraft}><span>¥</span><input autoFocus inputMode="decimal" value={draft.value} onFocus={event => event.currentTarget.select()} onChange={event => setDraft({ ...draft, value: event.target.value })} onKeyDown={event => { if (event.key === "Escape") setDraft(null); }} aria-label={t("edit_amount", { item: displayText(item.text) })} /></form>
                  : item.amount > 0
                    ? <button onClick={() => setDraft({ id: item.id, categoryId, field: "amount", value: String(item.amount) })}>{money(item.amount)}</button>
                    : <span className="daily-no-amount">—</span>}
              </div>
            </article>;
          })}
          {!dailyItems.length && <div className="daily-empty">{t("no_today_items")}</div>}
        </div>
      </section>

      <section className="daily-extra">
        <div className="daily-section-title"><p>{t("extra")}</p><h3>{t("extra_itinerary")}</h3></div>
        <div className="daily-item-list">
          {dailyExtras.map(item => {
            const textDraft = draft?.id === item.id && draft.categoryId === "extra" && draft.field === "text";
            const amountDraft = draft?.id === item.id && draft.categoryId === "extra" && draft.field === "amount";
            return <article className="daily-item daily-extra-item" key={item.id}>
              <time>＋</time>
              <div className="daily-item-main">
                {textDraft && draft
                  ? <form className="daily-inline-form" onSubmit={saveDraft}><input autoFocus value={draft.value} onChange={event => setDraft({ ...draft, value: event.target.value })} onKeyDown={event => { if (event.key === "Escape") setDraft(null); }} aria-label={t("edit_extra_itinerary")} /></form>
                  : <button className="daily-item-name" onClick={() => setDraft({ id: item.id, categoryId: "extra", field: "text", value: item.text })}>{displayText(item.text)}</button>}
                <small>{t("temporary_record")}</small>
              </div>
              <div className="daily-item-amount">
                {amountDraft && draft
                  ? <form className="daily-amount-form" onSubmit={saveDraft}><span>¥</span><input autoFocus inputMode="decimal" value={draft.value} onFocus={event => event.currentTarget.select()} onChange={event => setDraft({ ...draft, value: event.target.value })} onKeyDown={event => { if (event.key === "Escape") setDraft(null); }} aria-label={t("edit_amount", { item: displayText(item.text) })} /></form>
                  : item.amount > 0
                    ? <button onClick={() => setDraft({ id: item.id, categoryId: "extra", field: "amount", value: String(item.amount) })}>{money(item.amount)}</button>
                    : <span className="daily-no-amount">—</span>}
              </div>
            </article>;
          })}
          <div className="daily-extra-add">
            {!isAddingExtra
              ? <button onClick={() => setIsAddingExtra(true)}>＋ {t("add_item")}</button>
              : <form className="daily-inline-form" onSubmit={addDailyExtra}><input autoFocus value={extraText} onChange={event => setExtraText(event.target.value)} onBlur={() => { setIsAddingExtra(false); setExtraText(""); }} onKeyDown={event => { if (event.key === "Enter" && !event.nativeEvent.isComposing) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } else if (event.key === "Escape") { setIsAddingExtra(false); setExtraText(""); } }} placeholder={t("extra_example")} aria-label={t("add_extra_itinerary")} /></form>}
          </div>
        </div>
      </section>

      <section className="daily-stay">
        <div className="daily-section-title"><p>{t("stay")}</p><h3>{t("today_stay")}</h3></div>
        {accommodations.map(item => {
          const amountDraft = draft?.id === item.id && draft.categoryId === "accommodation" && draft.field === "amount";
          return <div className="daily-stay-row" key={item.id}>
            <span>🏨</span>
            <div><button onClick={() => setDraft({ id: item.id, categoryId: "accommodation", field: "text", value: item.text })}>{displayText(item.text)}</button><small>{t("tonight_stay")}</small></div>
            {amountDraft && draft
              ? <form className="daily-amount-form daily-stay-amount-form" onSubmit={saveDraft}><span>¥</span><input autoFocus inputMode="decimal" value={draft.value} onFocus={event => event.currentTarget.select()} onChange={event => setDraft({ ...draft, value: event.target.value })} onKeyDown={event => { if (event.key === "Escape") setDraft(null); }} aria-label={t("edit_amount", { item: displayText(item.text) })} /></form>
              : item.amount > 0
                ? <button className="daily-stay-amount" onClick={() => setDraft({ id: item.id, categoryId: "accommodation", field: "amount", value: String(item.amount) })}>{money(item.amount)}</button>
                : <span className="daily-no-amount">—</span>}
          </div>;
        })}
        {draft?.categoryId === "accommodation" && draft.field === "text" && <form className="daily-stay-editor" onSubmit={saveDraft}>
          <input autoFocus value={draft.value} onChange={event => setDraft({ ...draft, value: event.target.value })} onKeyDown={event => { if (event.key === "Escape") setDraft(null); }} aria-label={t("edit_stay")} />
        </form>}
        {!accommodations.length && <div className="daily-empty">{t("no_stay_tonight")}</div>}
      </section>

      <footer className="daily-grand-total"><span>{t("today_total")}</span><b>{money(totals.daily[dateId] ?? 0)}</b></footer>
    </div>
  );
}
