// Small stroke icon set (24px grid, currentColor)
type P = { className?: string };
const S = ({ className = "h-5 w-5", children }: P & { children: React.ReactNode }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    {children}
  </svg>
);
export const IconSparkle = (p: P) => (
  <S {...p}><path d="M10 3.5l1.6 4.4 4.4 1.6-4.4 1.6L10 15.5l-1.6-4.4L4 9.5l4.4-1.6zM18 13l.8 2.2 2.2.8-2.2.8L18 19l-.8-2.2-2.2-.8 2.2-.8zM17.5 3v3M16 4.5h3" /></S>
);
export const IconShirt = (p: P) => (
  <S {...p}><path d="M8 3.5L4 6l1.5 4 2-.8V20.5h9V9.2l2 .8L20 6l-4-2.5c-.6 1.4-2.2 2.3-4 2.3s-3.4-.9-4-2.3z" /></S>
);
export const IconBag = (p: P) => (
  <S {...p}><path d="M5 8h14l-1 12.5H6zM9 8V6.5a3 3 0 016 0V8M9 12a3 3 0 006 0" /></S>
);
export const IconUser = (p: P) => (
  <S {...p}><circle cx="12" cy="8" r="3.5" /><path d="M5 20.5c.8-3.6 3.6-5.5 7-5.5s6.2 1.9 7 5.5" /></S>
);
export const IconX = (p: P) => (<S {...p}><path d="M6 6l12 12M18 6L6 18" /></S>);
export const IconCheck = (p: P) => (<S {...p}><path d="M5 12.5l4.5 4.5L19 7.5" /></S>);
export const IconSun = (p: P) => (
  <S {...p}><circle cx="12" cy="12" r="3.5" /><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4" /></S>
);
export const IconRain = (p: P) => (
  <S {...p}><path d="M7 15a4 4 0 01-.5-8A5.5 5.5 0 0117 6.5 3.8 3.8 0 0117 15z" /><path d="M9 18l-1 2.5M13 18l-1 2.5M17 18l-1 2.5" /></S>
);
export const IconExternal = (p: P) => (<S {...p}><path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 01-1 1H5a1 1 0 01-1-1V7a1 1 0 011-1h5" /></S>);
export const IconPlus = (p: P) => (<S {...p}><path d="M12 5v14M5 12h14" /></S>);
export const IconStar = ({ className = "h-3.5 w-3.5" }: P) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden><path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.8z" /></svg>
);
