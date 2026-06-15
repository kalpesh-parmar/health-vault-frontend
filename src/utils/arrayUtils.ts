export const safeArray = (value: any): any[] =>
  Array.isArray(value) ? value : [];

export const safeFilter = <T>(value: any, cb: (item: T, index: number, array: T[]) => boolean): T[] =>
  safeArray(value).filter(cb);

export const safeMap = <T, U>(value: any, cb: (item: T, index: number, array: T[]) => U): U[] =>
  safeArray(value).map(cb);

export const safeFind = <T>(value: any, cb: (item: T, index: number, array: T[]) => boolean): T | undefined =>
  safeArray(value).find(cb);

export const safeGet = (obj: any, path: string, defaultValue?: any): any => {
  if (!obj) return defaultValue;
  const parts = path.split(".");
  let current = obj;
  for (const part of parts) {
    if (current == null || typeof current !== "object") return defaultValue;
    current = current[part];
  }
  return current === undefined ? defaultValue : current;
};
