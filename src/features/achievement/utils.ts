export const calculateRange = (val: string, type: "DAILY") => {
  if (!val || typeof val !== 'string') return { start: "", end: "", label: "" };

  try {
    if (type === "DAILY") {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(val)) return { start: "", end: "", label: "" };
      return { start: val, end: val, label: val };
    }
  } catch (e) { console.error(e); }
  return { start: "", end: "", label: "" };
};
