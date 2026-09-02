const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000";

export async function backendFetch(path: string, init?: RequestInit) {
  return fetch(`${backendUrl}${path}`, init);
}

export { backendUrl };
