import { startOfMonth, eachWeekOfInterval, format, endOfMonth, endOfISOWeek, parse, isValid } from "date-fns";

// Helper to get consistent week key for WEEKLY view
export const getWeekKey = (date: Date) => {
  const start = startOfMonth(date);
  const weeks = eachWeekOfInterval({ start, end: date }, { weekStartsOn: 1 });
  return `${format(date, "yyyy")}|${format(date, "MM")}|${weeks.length}`;
};

export const calculateRange = (val: string, type: "DAILY" | "WEEKLY" | "MONTHLY", t: any) => {
  if (!val || typeof val !== 'string') return { start: "", end: "", label: "" };
  
  try {
    if (type === "DAILY") {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(val)) return { start: "", end: "", label: "" };
      return { start: val, end: val, label: val };
    }
    
    if (type === "MONTHLY") {
      if (!/^\d{4}-\d{2}$/.test(val)) return { start: "", end: "", label: "" };
      const date = parse(val, "yyyy-MM", new Date());
      if (!isValid(date)) return { start: "", end: "", label: "" };
      const label = `${val.split("-")[0]}${t.common?.year || '년'} ${parseInt(val.split("-")[1])}${t.common?.month || '월'} ${t.retrospective?.monthly || '월간'}`;
      return { 
        start: format(startOfMonth(date), "yyyy-MM-dd"), 
        end: format(endOfMonth(date), "yyyy-MM-dd"), 
        label
      };
    }
    
    if (type === "WEEKLY") {
      if (!val.includes("|")) return { start: "", end: "", label: "" };
      const [y, m, w] = val.split("|");
      if (!y || !m || !w) return { start: "", end: "", label: "" };
      
      const firstDay = new Date(parseInt(y), parseInt(m) - 1, 1);
      const weeks = eachWeekOfInterval({ start: firstDay, end: endOfMonth(firstDay) }, { weekStartsOn: 1 });
      const weekStart = weeks[parseInt(w) - 1] || weeks[0];
      const s = weekStart > firstDay ? weekStart : firstDay;
      const e_raw = endOfISOWeek(weekStart); 
      const e = e_raw < endOfMonth(firstDay) ? e_raw : endOfMonth(firstDay);
      const startStr = format(s, "yyyy-MM-dd");
      const endStr = format(e, "yyyy-MM-dd");
      return { 
        start: startStr, end: endStr, 
        label: `${y}${t.common?.year || '년'} ${parseInt(m)}${t.common?.month || '월'} ${w}${t.retrospective?.week_unit || '주'} (${startStr} ~ ${endStr})` 
      };
    }
  } catch (e) { console.error(e); }
  return { start: "", end: "", label: "" };
};
