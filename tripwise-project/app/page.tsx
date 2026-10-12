"use client";

import { useCallback, useEffect, useState } from "react";
import { CreateTrip } from "./components/CreateTrip";
import { DailyView } from "./components/DailyView";
import { Overview, type TripOverviewInfo } from "./components/Overview";
import { Preparation } from "./components/Preparation";
import { TravelWorkspace } from "./components/TravelWorkspace";
import { WorkspaceShare } from "./components/WorkspaceShare";
import { boardDates, getTripBoardDates, navItems, type BoardDate, type PageId } from "./data/mock";
import {
  applyChecklistOverrides,
  buildPreparationChecklist,
  getPreparationItems,
  initialPreparationMemos,
  type ChecklistStatus,
  type PreparationMemo,
} from "./data/preparation";
import { initialWorkspaceData, type TripWorkspaceData } from "./data/travel";
import { LanguageProvider, useI18n, type Language } from "./i18n/LanguageContext";

const pageMeta: Record<PageId, { eyebrow?: string; title: string; subtitle?: string }> = {
  create: { eyebrow: "page_create_eyebrow", title: "create_trip" },
  overview: { title: "trip_overview" },
  workspace: { title: "travel_plan", subtitle: "travel_plan_subtitle" },
  daily: { title: "daily_view" },
  prep: { eyebrow: "page_prep_eyebrow", title: "preparation" },
};

const defaultTripOverviewInfo: TripOverviewInfo = {
  name: "东京旅行",
  destination: "东京 · 镰仓",
  startDate: "2026-10-02",
  endDate: "2026-10-08",
  travelers: 2,
  isArchived: false,
};

interface TripRecord extends TripOverviewInfo {
  id: string;
  isDemo?: boolean;
  workspaceData: TripWorkspaceData;
  dailyDateId: string;
  preparationMemos: PreparationMemo[];
  checklistOverrides: Record<string, ChecklistStatus>;
}

const cloneInitialWorkspaceData = (): TripWorkspaceData => ({
  transportIntercity: initialWorkspaceData.transportIntercity.map(item => ({ ...item })),
  transportLocal: initialWorkspaceData.transportLocal.map(item => ({ ...item })),
  accommodations: initialWorkspaceData.accommodations.map(item => ({ ...item })),
  itineraryItems: initialWorkspaceData.itineraryItems.map(item => ({ ...item })),
  dailyExtras: initialWorkspaceData.dailyExtras.map(item => ({ ...item })),
});

const createEmptyWorkspaceData = (): TripWorkspaceData => ({
  transportIntercity: [],
  transportLocal: [],
  accommodations: [],
  itineraryItems: [],
  dailyExtras: [],
});

const createDemoTrip = (): TripRecord => ({
  id: "demo-tokyo",
  ...defaultTripOverviewInfo,
  isDemo: true,
  workspaceData: cloneInitialWorkspaceData(),
  dailyDateId: "d1",
  preparationMemos: initialPreparationMemos.map(item => ({ ...item })),
  checklistOverrides: {},
});

function usePersistentState<T>(key: string, initialValue: () => T) {
  const [value, setValue] = useState<T>(initialValue);
  const [storageReady, setStorageReady] = useState(false);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      try {
        const saved = window.localStorage.getItem(key);
        if (saved) setValue(JSON.parse(saved) as T);
      } catch {
        // Ignore malformed device-local demo state and keep the safe default.
      }
      setStorageReady(true);
    });
    return () => { active = false; };
  }, [key]);

  useEffect(() => {
    if (storageReady) window.localStorage.setItem(key, JSON.stringify(value));
  }, [key, storageReady, value]);

  return [value, setValue] as const;
}

function Mark() {
  return (
    <div className="brand-mark" aria-hidden="true">
      <span />
      <span />
      <span />
    </div>
  );
}

const defaultDailyDateId = (startDate: string, endDate: string, dates: BoardDate[]) => {
  const [startYear, startMonth, startDateOfMonth] = startDate.split("-").map(Number);
  const [endYear, endMonth, endDateOfMonth] = endDate.split("-").map(Number);
  const startDay = Date.UTC(startYear, startMonth - 1, startDateOfMonth);
  const endDay = Date.UTC(endYear, endMonth - 1, endDateOfMonth);
  const now = new Date();
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  if (today <= startDay) return dates[0].id;
  if (today >= endDay) return dates[dates.length - 1].id;
  return dates[Math.floor((today - startDay) / 86_400_000)]?.id ?? dates[0].id;
};

function LanguageMenu({ onClose }: { onClose: () => void }) {
  const { language, setLanguage, t } = useI18n();
  const chooseLanguage = (nextLanguage: Language) => {
    setLanguage(nextLanguage);
    onClose();
  };

  return (
    <div className="language-menu" role="menu" aria-label={t("language")}>
      <small>{t("language")}</small>
      <button className={language === "zh" ? "active" : ""} onClick={() => chooseLanguage("zh")}>{t("language_chinese")}</button>
      <button className={language === "en" ? "active" : ""} onClick={() => chooseLanguage("en")}>{t("language_english")}</button>
    </div>
  );
}

function TripwiseApp() {
  const { t } = useI18n();
  const [activePage, setActivePage] = useState<PageId>("create");
  const [settingsMenu, setSettingsMenu] = useState<"top" | "sidebar" | null>(null);
  const [tripMenuOpen, setTripMenuOpen] = useState(false);
  const [shareRequestId, setShareRequestId] = useState(0);
  const [isSharing, setIsSharing] = useState(false);
  const [trips, setTrips] = usePersistentState<TripRecord[]>("tripwise-trips-v2", () => [createDemoTrip()]);
  const [currentTripId, setCurrentTripId] = usePersistentState<string>("tripwise-current-trip-id-v2", () => "demo-tokyo");
  const currentTrip = trips.find(trip => trip.id === currentTripId) ?? trips[0];
  const currentTripDates = currentTrip
    ? currentTrip.isDemo
      ? boardDates
      : getTripBoardDates(currentTrip.startDate, currentTrip.endDate, currentTrip.destination)
    : boardDates;
  const meta = pageMeta[activePage];
  const resolvedChecklist = currentTrip
    ? applyChecklistOverrides(buildPreparationChecklist(), currentTrip.checklistOverrides)
    : [];
  const preparationProgress = getPreparationItems({
    checklist: resolvedChecklist,
  });
  const pendingCount = preparationProgress.pending;

  const updateTrip = (tripId: string, updater: (trip: TripRecord) => TripRecord) => {
    setTrips(currentTrips => currentTrips.map(trip => trip.id === tripId ? updater(trip) : trip));
  };

  const updateCurrentTrip = (updater: (trip: TripRecord) => TripRecord) => {
    if (currentTrip) updateTrip(currentTrip.id, updater);
  };

  const openDailyView = (dateId: string) => {
    updateCurrentTrip(trip => ({ ...trip, dailyDateId: dateId }));
    setActivePage("daily");
  };

  const navigateToPage = (pageId: PageId) => {
    if (!currentTrip && pageId !== "create") {
      setActivePage("create");
      return;
    }
    if (pageId === "daily" && currentTrip) updateCurrentTrip(trip => ({ ...trip, dailyDateId: defaultDailyDateId(trip.startDate, trip.endDate, getTripBoardDates(trip.startDate, trip.endDate, trip.destination)) }));
    setActivePage(pageId);
  };

  const createNewTrip = (trip: TripOverviewInfo) => {
    const id = crypto.randomUUID();
    const nextTrip: TripRecord = {
      id,
      ...trip,
      workspaceData: createEmptyWorkspaceData(),
      dailyDateId: boardDates[0].id,
      preparationMemos: [],
      checklistOverrides: {},
    };
    setTrips(currentTrips => [...currentTrips, nextTrip]);
    setCurrentTripId(id);
    setActivePage("overview");
  };

  const switchTrip = (tripId: string) => {
    setCurrentTripId(tripId);
    setTripMenuOpen(false);
    setActivePage("overview");
  };

  const deleteTrip = (tripId: string) => {
    const target = trips.find(trip => trip.id === tripId);
    if (!target || !window.confirm(t("confirm_delete_trip", { name: target.name }))) return;
    const remainingTrips = trips.filter(trip => trip.id !== tripId);
    setTrips(remainingTrips);
    setTripMenuOpen(false);
    if (tripId === currentTrip?.id) {
      const nextTrip = remainingTrips[0];
      setCurrentTripId(nextTrip?.id ?? "");
      setActivePage(nextTrip ? "overview" : "create");
    }
  };

  const shareWorkspace = () => {
    if (!currentTrip || isSharing) return;
    setIsSharing(true);
    setShareRequestId(current => current + 1);
  };

  const finishSharing = useCallback(() => setIsSharing(false), []);

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <button className="brand" onClick={() => navigateToPage("overview")} aria-label={t("app_home")}>
          <Mark />
          <span>TRIPWISE</span>
        </button>

        <nav className="side-nav" aria-label={t("main_navigation")}>
          <p className="nav-label">{t("workspace_label")}</p>
          {navItems.map((item) => (
            <button
              key={item.id}
              className={activePage === item.id ? "nav-item active" : "nav-item"}
              onClick={() => navigateToPage(item.id)}
            >
              <span className="nav-icon">{item.icon}</span>
              <span>{t(item.label)}</span>
              {item.id === "prep" && pendingCount > 0 && <span className="nav-badge">{pendingCount}</span>}
            </button>
          ))}
        </nav>

        <div className="trip-switcher">
          <p className="nav-label">{t("current_trip")}</p>
          {currentTrip && <>
            <button onClick={() => setTripMenuOpen(open => !open)} aria-expanded={tripMenuOpen}>
              <span className="trip-flag">JP</span>
              <span className="trip-switch-text">
                <b>{currentTrip.name}{currentTrip.isDemo ? t("demo_trip_suffix") : ""}</b>
                <small>{currentTrip.startDate.slice(5).replace("-", ".")} — {currentTrip.endDate.slice(5).replace("-", ".")}</small>
              </span>
              <span className="chevron">⌄</span>
            </button>
            {tripMenuOpen && <div className="trip-list-menu" role="menu" aria-label={t("trip_list")}>
              {trips.map(trip => <div className={trip.id === currentTrip.id ? "trip-list-row active" : "trip-list-row"} key={trip.id}>
                <button className="trip-list-select" onClick={() => switchTrip(trip.id)} aria-label={t("switch_to_trip", { name: trip.name })}>
                  <b>{trip.name}{trip.isDemo ? t("demo_trip_suffix") : ""}</b>
                  <small>{trip.destination}</small>
                </button>
                <button className="trip-list-delete" onClick={() => deleteTrip(trip.id)} aria-label={t("delete_named_trip", { name: trip.name })}>×</button>
              </div>)}
            </div>}
          </>}
        </div>

        <div className="sidebar-bottom">
          <div className="ai-credit"><span>✓</span><div><b>{t("preparation")}</b><small>{t("items_pending", { count: pendingCount })}</small></div></div>
          <div className="profile"><span className="avatar">YL</span><div><b>Yulin</b><small>{t("personal_workspace")}</small></div><button aria-label={t("settings")} onClick={() => setSettingsMenu(current => current === "sidebar" ? null : "sidebar")}>•••</button></div>
          {settingsMenu === "sidebar" && <LanguageMenu onClose={() => setSettingsMenu(null)} />}
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            {meta.eyebrow && <p className="eyebrow">{t(meta.eyebrow)}</p>}
            <h1>{t(meta.title)}</h1>
            {meta.subtitle && <span className="page-subtitle">{t(meta.subtitle)}</span>}
          </div>
          <div className="top-actions">
            <button className="share-button" onClick={shareWorkspace} disabled={!currentTrip || isSharing}><span>↗</span> {t(isSharing ? "generating_image" : "share")}</button>
            <div className="settings-wrap">
              <button className="more-button" aria-label={t("settings")} onClick={() => setSettingsMenu(current => current === "top" ? null : "top")}>•••</button>
              {settingsMenu === "top" && <LanguageMenu onClose={() => setSettingsMenu(null)} />}
            </div>
          </div>
        </header>

        <div className={`page-content page-${activePage}`}>
          {activePage === "create" && <CreateTrip onCreated={createNewTrip} />}
          {activePage === "overview" && currentTrip && <Overview key={currentTrip.id} goTo={navigateToPage} data={currentTrip.workspaceData} preparation={preparationProgress} trip={currentTrip} onTripChange={trip => updateCurrentTrip(current => ({ ...current, ...trip }))} onDeleteTrip={() => deleteTrip(currentTrip.id)} dailyDate={currentTripDates.find(date => date.id === defaultDailyDateId(currentTrip.startDate, currentTrip.endDate, currentTripDates)) ?? currentTripDates[0]} />}
          {activePage === "workspace" && currentTrip && <TravelWorkspace key={currentTrip.id} data={currentTrip.workspaceData} dates={currentTripDates} onDataChange={workspaceData => updateCurrentTrip(trip => ({ ...trip, workspaceData }))} onOpenDaily={openDailyView} />}
          {activePage === "daily" && currentTrip && <DailyView key={currentTrip.id} data={currentTrip.workspaceData} dates={currentTripDates} dateId={currentTrip.dailyDateId} onDateChange={dateId => updateCurrentTrip(trip => ({ ...trip, dailyDateId: dateId }))} onDataChange={workspaceData => updateCurrentTrip(trip => ({ ...trip, workspaceData }))} onBack={() => setActivePage("workspace")} />}
          {activePage === "prep" && currentTrip && <Preparation key={currentTrip.id}
            checklist={resolvedChecklist}
            onChecklistStatusChange={(id, status) => updateCurrentTrip(trip => ({ ...trip, checklistOverrides: { ...trip.checklistOverrides, [id]: status } }))}
            memos={currentTrip.preparationMemos}
            onMemosChange={preparationMemos => updateCurrentTrip(trip => ({ ...trip, preparationMemos }))}
            progress={preparationProgress}
          />}
        </div>
      </section>

      <nav className="mobile-nav" aria-label={t("mobile_navigation")}>
        {navItems.map((item) => (
          <button key={item.id} className={activePage === item.id ? "active" : ""} onClick={() => navigateToPage(item.id)}>
            <span>{item.icon}</span><small>{t(item.shortLabel)}</small>
          </button>
        ))}
      </nav>
      {currentTrip && <WorkspaceShare
        data={currentTrip.workspaceData}
        dates={currentTripDates}
        tripName={currentTrip.name}
        requestId={shareRequestId}
        onComplete={finishSharing}
      />}
    </main>
  );
}

export default function Home() {
  return <LanguageProvider><TripwiseApp /></LanguageProvider>;
}
