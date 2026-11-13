/** 不把店铺本地时间转换成浏览器时区或 UTC。 */
export function parseCivilDate(value: string): Date | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:T|$)/.exec(value);
  if (!match) return undefined;
  const year = Number(match[1]), month = Number(match[2]), day = Number(match[3]);
  const date = new Date(year, month - 1, day, 12);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day ? date : undefined;
}
export function updateCivilDate(value: string, date: Date): string {
  const pad = (number: number) => String(number).padStart(2, "0");
  const day = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  const time = /^\d{4}-\d{2}-\d{2}T(\d{2}:\d{2}(?::\d{2})?)$/.exec(value)?.[1] || "00:00:00";
  return `${day}T${time}`;
}
export function updateCivilTime(value: string, time: string): string {
  const date = /^\d{4}-\d{2}-\d{2}(?=T|$)/.exec(value)?.[0];
  return date && /^\d{2}:\d{2}(?::\d{2})?$/.test(time) ? `${date}T${time}` : value;
}
