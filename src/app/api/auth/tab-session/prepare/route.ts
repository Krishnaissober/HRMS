import {
  isValidTabId,
  serializeActiveTabCookie,
  serializeOAuthTabCookie,
} from "@/lib/tab-session";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { tabId?: string } | null;
  if (!isValidTabId(body?.tabId)) return Response.json({ error: "Invalid tab id." }, { status: 400 });
  const response = Response.json({ ok: true });
  response.headers.append("Set-Cookie", serializeOAuthTabCookie(body.tabId, request.url));
  response.headers.append("Set-Cookie", serializeActiveTabCookie(body.tabId, request.url));
  return response;
}
