import { useState, type FormEvent } from "react";
import { useI18n } from "../i18n/LanguageContext";
import type { TripOverviewInfo } from "./Overview";

const newTripDraft = (): TripOverviewInfo => ({
  name: "",
  destination: "",
  startDate: "2026-10-02",
  endDate: "2026-10-08",
  travelers: 2,
  isArchived: false,
});

export function CreateTrip({ onCreated }: { onCreated: (trip: TripOverviewInfo) => void }) {
  const { t } = useI18n();
  const [step, setStep] = useState(1);
  const [trip, setTrip] = useState<TripOverviewInfo>(newTripDraft);

  const continueToPreferences = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStep(2);
  };

  const finishCreate = () => {
    onCreated({
      ...trip,
      name: trip.name.trim(),
      destination: trip.destination.trim(),
      endDate: trip.endDate < trip.startDate ? trip.startDate : trip.endDate,
      travelers: Math.max(1, trip.travelers),
      isArchived: false,
    });
  };
  return (
    <div className="create-layout">
      <section className="create-intro">
        <span className="index-number">00</span>
        <p>{t("create_intro")}</p>
        <h2>{t("create_headline_line1")}<br/><em>{t("create_headline_line2")}</em></h2>
        <div className="create-principles">
          <span>{t("create_principle_summary")}</span>
        </div>
      </section>

      <section className="create-form-panel">
        <div className="step-line"><span className={step >= 1 ? "done" : ""}>{t("create_step_basics")}</span><i/><span className={step >= 2 ? "done" : ""}>{t("create_step_preferences")}</span><i/><span>{t("create_step_done")}</span></div>
        {step === 1 ? (
          <form className="form-stage" onSubmit={continueToPreferences}>
            <p className="section-kicker">{t("trip_basics")}</p>
            <h3>{t("where_to_go")}</h3>
            <label>{t("trip_name")}<input required value={trip.name} onChange={event => setTrip({ ...trip, name: event.target.value })} /></label>
            <div className="field-grid">
              <label>{t("origin")}<input defaultValue="上海" /></label>
              <label>{t("destination")}<input required value={trip.destination} onChange={event => setTrip({ ...trip, destination: event.target.value })} /></label>
              <label>{t("start_date")}<input required type="date" value={trip.startDate} onChange={event => setTrip({ ...trip, startDate: event.target.value })} /></label>
              <label>{t("return_date")}<input required type="date" value={trip.endDate} min={trip.startDate} onChange={event => setTrip({ ...trip, endDate: event.target.value })} /></label>
            </div>
            <button className="primary-button" type="submit">{t("continue_preferences")} <span>→</span></button>
          </form>
        ) : (
          <div className="form-stage">
            <p className="section-kicker">{t("travel_profile")}</p>
            <h3>{t("tailor_reminders")}</h3>
            <div className="choice-group"><label>{t("travel_companions")}</label><div><button type="button" className={trip.travelers === 2 ? "selected" : ""} onClick={() => setTrip({ ...trip, travelers: 2 })}>{t("travelers_two")}</button><button type="button" className={trip.travelers === 1 ? "selected" : ""} onClick={() => setTrip({ ...trip, travelers: 1 })}>{t("travelers_solo")}</button><button type="button" className={trip.travelers >= 3 ? "selected" : ""} onClick={() => setTrip({ ...trip, travelers: 3 })}>{t("travelers_family")}</button></div></div>
            <div className="choice-group"><label>{t("travel_pace")}</label><div><button type="button">{t("pace_compact")}</button><button type="button" className="selected">{t("pace_balanced")}</button><button type="button">{t("pace_relaxed")}</button></div></div>
            <div className="choice-group"><label>{t("special_focus")}</label><div><button type="button" className="selected">{t("focus_dining")}</button><button type="button" className="selected">{t("focus_connections")}</button><button type="button">{t("focus_tax_refund")}</button></div></div>
            <div className="button-row"><button type="button" className="secondary-button" onClick={() => setStep(1)}>← {t("back")}</button><button type="button" className="primary-button" onClick={finishCreate}>{t("create_trip")} <span>→</span></button></div>
          </div>
        )}
      </section>
    </div>
  );
}
