import { useState, type FormEvent } from "react";
import {
  checklistCategoryMeta,
  checklistCategoryOrder,
  getPreparationItems,
  type ChecklistCategory,
  type ChecklistStatus,
  type PreparationMemo,
  type ResolvedChecklistItem,
} from "../data/preparation";
import { useI18n } from "../i18n/LanguageContext";

interface DisplayItem {
  id: string;
  title: string;
  status: ChecklistStatus;
  isCustom: boolean;
}

export function Preparation({
  checklist,
  onChecklistStatusChange,
  memos,
  onMemosChange,
  progress,
}: {
  checklist: ResolvedChecklistItem[];
  onChecklistStatusChange: (id: string, status: ChecklistStatus) => void;
  memos: PreparationMemo[];
  onMemosChange: (memos: PreparationMemo[]) => void;
  progress: ReturnType<typeof getPreparationItems>;
}) {
  const { t } = useI18n();
  const [addingTo, setAddingTo] = useState<ChecklistCategory | null>(null);
  const [newItemText, setNewItemText] = useState("");
  const [editingItem, setEditingItem] = useState<{ id: string; text: string } | null>(null);
  const [openMenuKey, setOpenMenuKey] = useState<string | null>(null);

  const setItemStatus = (item: DisplayItem, status: ChecklistStatus) => {
    if (item.isCustom) {
      onMemosChange(memos.map(memo => memo.id === item.id ? { ...memo, status } : memo));
    } else {
      onChecklistStatusChange(item.id, status);
    }
    setOpenMenuKey(null);
  };

  const addItem = (event: FormEvent<HTMLFormElement>, category: ChecklistCategory) => {
    event.preventDefault();
    const text = newItemText.trim();
    if (!text) return;
    onMemosChange([...memos, { id: `prep-${crypto.randomUUID()}`, category, text, status: "pending" }]);
    setNewItemText("");
    setAddingTo(null);
  };

  const saveItemEdit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingItem) return;
    const text = editingItem.text.trim();
    if (!text) return;
    onMemosChange(memos.map(memo => memo.id === editingItem.id ? { ...memo, text } : memo));
    setEditingItem(null);
  };

  const deleteItem = (id: string) => {
    onMemosChange(memos.filter(memo => memo.id !== id));
    if (editingItem?.id === id) setEditingItem(null);
    setOpenMenuKey(null);
  };

  const renderItem = (item: DisplayItem) => {
    const isCompleted = item.status === "completed";
    const isNotApplicable = item.status === "not_applicable";
    const menuKey = `${item.isCustom ? "custom" : "default"}:${item.id}`;

    return (
      <div className={`checklist-item status-${item.status}`} key={menuKey}>
        <input
          type="checkbox"
          checked={isCompleted}
          disabled={isNotApplicable}
          onChange={event => setItemStatus(item, event.target.checked ? "completed" : "pending")}
          aria-label={t("mark_item_status", { item: item.title, status: t(isCompleted ? "pending" : "processed") })}
        />
        <div className="checklist-item-copy">
          {item.isCustom && editingItem?.id === item.id ? (
            <form className="memo-edit-form" onSubmit={saveItemEdit}>
              <input
                autoFocus
                value={editingItem.text}
                onChange={event => setEditingItem({ ...editingItem, text: event.target.value })}
                onKeyDown={event => { if (event.key === "Escape") setEditingItem(null); }}
                onBlur={() => setEditingItem(null)}
                aria-label={t("edit_custom_prep")}
              />
            </form>
          ) : item.isCustom ? (
            <button onClick={() => setEditingItem({ id: item.id, text: item.title })}>{item.title}</button>
          ) : (
            <b>{item.title}</b>
          )}
        </div>
        <span className="checklist-status">{t(isNotApplicable ? "not_applicable" : isCompleted ? "processed" : "pending")}</span>
        <div className="checklist-more">
          <button aria-label={t("item_more_actions", { item: item.title })} onClick={() => setOpenMenuKey(current => current === menuKey ? null : menuKey)}>•••</button>
          {openMenuKey === menuKey && (
            <div className="checklist-menu">
              <button onClick={() => setItemStatus(item, isNotApplicable ? "pending" : "not_applicable")}>
                {t(isNotApplicable ? "restore_pending" : "mark_not_applicable")}
              </button>
              {item.isCustom && <button className="danger" onClick={() => deleteItem(item.id)}>{t("delete")}</button>}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="prep-page checklist-page">
      <section className="ai-brief preparation-brief">
        <div className="ai-orbit preparation-mark">✓</div>
        <div>
          <p>{t("final_checklist")}</p>
          <h2>{t("final_check_title")}</h2>
          <span>{t("final_check_description")}</span>
        </div>
        <div className="prep-score">
          <small>{t("preparation_progress")}</small>
          <b>{progress.progress}%</b>
          <span>{t("processed_count", { completed: progress.completed, total: progress.total })}</span>
        </div>
      </section>

      <div className="checklist-groups simple-checklist-groups">
        {checklistCategoryOrder.map(category => {
          const categoryItems: DisplayItem[] = [
            ...checklist.filter(item => item.category === category).map(item => ({
              id: item.id,
              title: t(item.title),
              status: item.status,
              isCustom: false,
            })),
            ...memos.filter(memo => memo.category === category).map(memo => ({
              id: memo.id,
              title: memo.text,
              status: memo.status,
              isCustom: true,
            })),
          ];
          const applicableItems = categoryItems.filter(item => item.status !== "not_applicable");
          const completedCount = applicableItems.filter(item => item.status === "completed").length;

          return (
            <section className="checklist-group simple-checklist-group" key={category}>
              <header className="checklist-group-head simple-checklist-head">
                <span>{checklistCategoryMeta[category].index}</span>
                <h3>{t(checklistCategoryMeta[category].label)}</h3>
                <strong>{completedCount}/{applicableItems.length}</strong>
              </header>
              <div className="checklist-items">
                {categoryItems.map(renderItem)}
                <div className="memo-add-row">
                  {addingTo !== category ? (
                    <button onClick={() => { setAddingTo(category); setNewItemText(""); }}>＋ {t("add_item")}</button>
                  ) : (
                    <form className="memo-inline-editor" onSubmit={event => addItem(event, category)}>
                      <input
                        autoFocus
                        value={newItemText}
                        onChange={event => setNewItemText(event.target.value)}
                        onKeyDown={event => {
                          if (event.key === "Escape") {
                            setAddingTo(null);
                            setNewItemText("");
                          }
                        }}
                        placeholder={t("prep_item_placeholder")}
                        aria-label={t("add_item_to_category", { category: t(checklistCategoryMeta[category].label) })}
                      />
                    </form>
                  )}
                </div>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
