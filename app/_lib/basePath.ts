const RAW_BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "/inspecta";
const BASE_PATH =
  RAW_BASE_PATH && RAW_BASE_PATH !== "/" ? RAW_BASE_PATH.replace(/\/$/, "") : "";

export function withBasePath(path: string) {
  if (!BASE_PATH) {
    return path;
  }
  if (path.startsWith(BASE_PATH)) {
    return path;
  }
  return `${BASE_PATH}${path.startsWith("/") ? path : `/${path}`}`;
}

export function getBasePath() {
  return BASE_PATH;
}
