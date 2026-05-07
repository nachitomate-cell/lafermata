const KEY = 'lf_staff_unlocked';
const TTL = 8 * 60 * 60 * 1000; // 8 hours

export function setStaffSession(): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(KEY, Date.now().toString());
}

export function isStaffSessionValid(): boolean {
  if (typeof window === 'undefined') return false;
  const raw = localStorage.getItem(KEY);
  if (!raw) return false;
  return Date.now() - parseInt(raw, 10) < TTL;
}

export function clearStaffSession(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(KEY);
}
