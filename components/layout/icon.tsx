import type React from "react";
export function Icon({ name, size = 18 }: { name: string; size?: number }) {
  const paths: Record<string, React.ReactNode> = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
    chart: <><path d="M4 19h16M7 15v-4M12 15V5M17 15V8"/></>, gift: <><rect x="3" y="8" width="18" height="4" rx="1"/><path d="M5 12v8h14v-8M12 8v12M12 8H8.5a2.5 2.5 0 1 1 2.4-3.2L12 8Zm0 0h3.5a2.5 2.5 0 1 0-2.4-3.2L12 8Z"/></>,
    users: <><circle cx="9" cy="8" r="3"/><path d="M3 20v-2a6 6 0 0 1 12 0v2M16 5a3 3 0 0 1 0 6M17 14a5 5 0 0 1 4 5v1"/></>,
    refresh: <><path d="M20 7v5h-5M4 17v-5h5"/><path d="M5 9a7 7 0 0 1 12-3l3 3M4 15l3 3a7 7 0 0 0 12-3"/></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18"/></>,
    arrow: <path d="m9 18 6-6-6-6"/>, info: <><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></>,
    bag: <><path d="M5 8h14l1 12H4L5 8ZM9 8V6a3 3 0 0 1 6 0v2"/></>, mouse: <><rect x="6" y="2" width="12" height="20" rx="6"/><path d="M12 6v4"/></>,
    search: <><circle cx="11" cy="11" r="7"/><path d="m16 16 4 4"/></>, bolt: <path d="m13 2-8 11h6l-1 9 9-12h-6l0-8Z"/>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}
