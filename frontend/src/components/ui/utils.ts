export type ClassValue = string | undefined | null | false;

export const cx = (...classes: ClassValue[]) =>
  classes.filter(Boolean).join(" ");
