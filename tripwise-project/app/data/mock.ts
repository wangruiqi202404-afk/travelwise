export type PageId = "create" | "overview" | "workspace" | "daily" | "prep";

export interface BoardDate {
  id: string;
  date: string;
  week: string;
  city: string;
  dayIndex: number;
}

export const navItems: { id: PageId; label: string; shortLabel: string; icon: string; badge?: string }[] = [
  { id: "create", label: "create_trip", shortLabel: "nav_create_short", icon: "＋" },
  { id: "overview", label: "trip_overview", shortLabel: "nav_overview_short", icon: "⌂" },
  { id: "workspace", label: "travel_plan", shortLabel: "nav_plan_short", icon: "▦" },
  { id: "daily", label: "daily_view", shortLabel: "nav_daily_short", icon: "☷" },
  { id: "prep", label: "preparation", shortLabel: "nav_prep_short", icon: "✓", badge: "12" },
];

export const boardDates: BoardDate[] = [
  { id: "d1", date: "10.02", week: "weekday_fri", city: "city_tokyo", dayIndex: 1 },
  { id: "d2", date: "10.03", week: "weekday_sat", city: "city_tokyo", dayIndex: 2 },
  { id: "d3", date: "10.04", week: "weekday_sun", city: "city_kamakura", dayIndex: 3 },
  { id: "d4", date: "10.05", week: "weekday_mon", city: "city_tokyo", dayIndex: 4 },
  { id: "d5", date: "10.06", week: "weekday_tue", city: "city_tokyo", dayIndex: 5 },
  { id: "d6", date: "10.07", week: "weekday_wed", city: "city_tokyo", dayIndex: 6 },
  { id: "d7", date: "10.08", week: "weekday_thu", city: "city_return", dayIndex: 7 },
];

const weekdayKeys = [
  "weekday_sun",
  "weekday_mon",
  "weekday_tue",
  "weekday_wed",
  "weekday_thu",
  "weekday_fri",
  "weekday_sat",
];

export const getTripBoardDates = (startDate: string, endDate: string, destination: string): BoardDate[] => {
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  const dates: BoardDate[] = [];

  for (let current = new Date(start); current <= end; current.setDate(current.getDate() + 1)) {
    dates.push({
      id: `d${dates.length + 1}`,
      date: `${String(current.getMonth() + 1).padStart(2, "0")}.${String(current.getDate()).padStart(2, "0")}`,
      week: weekdayKeys[current.getDay()],
      city: destination,
      dayIndex: dates.length + 1,
    });
  }

  return dates.length ? dates : [{ id: "d1", date: startDate.slice(5).replace("-", "."), week: weekdayKeys[start.getDay()], city: destination, dayIndex: 1 }];
};
