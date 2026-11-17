/** Show a phone as +39 *** *** 123. The last three digits stay visible. */
export function maskPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length < 4) return "";
  const last = digits.slice(-3);
  const prefix = digits.startsWith("39") ? "+39" : `+${digits.slice(0, Math.min(3, digits.length - 3))}`;
  return `${prefix} *** *** ${last}`;
}

/** Keep the first letter of the name and of the domain. */
export function maskEmail(value: string) {
  const email = value.trim().toLowerCase();
  const at = email.lastIndexOf("@");
  if (at <= 0 || at === email.length - 1) return "";
  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  const dot = domain.lastIndexOf(".");
  if (dot <= 0) return `${local.slice(0, 1)}***@***`;
  return `${local.slice(0, 1)}***@${domain.slice(0, 1)}***.${domain.slice(dot + 1)}`;
}
