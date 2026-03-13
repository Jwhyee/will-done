export const formatUnfinishedPastText = (dates: string[], t: any) => {
  if (dates.length === 0) return "";
  
  const formatDate = (dateStr: string) => {
    // dates are in YYYY-MM-DD format from the backend
    const [y, m, d] = dateStr.split("-").map(Number);
    return { m, d };
  };

  if (dates.length === 1) {
    const { m, d } = formatDate(dates[0]);
    return t.main.unfinished_past.singular.replace("{m}", m).replace("{d}", d);
  }

  if (dates.length === 2) {
    const { m: m1, d: d1 } = formatDate(dates[0]);
    const { m: m2, d: d2 } = formatDate(dates[1]);
    return t.main.unfinished_past.plural_2
      .replace("{m1}", m1).replace("{d1}", d1)
      .replace("{m2}", m2).replace("{d2}", d2);
  }

  if (dates.length === 3) {
    const { m: m1, d: d1 } = formatDate(dates[0]);
    const { m: m2, d: d2 } = formatDate(dates[1]);
    const { m: m3, d: d3 } = formatDate(dates[2]);
    return t.main.unfinished_past.plural_3
      .replace("{m1}", m1).replace("{d1}", d1)
      .replace("{m2}", m2).replace("{d2}", d2)
      .replace("{m3}", m3).replace("{d3}", d3);
  }

  const { m, d } = formatDate(dates[0]);
  return t.main.unfinished_past.many
    .replace("{m}", m).replace("{d}", d)
    .replace("{n}", dates.length - 1);
};
