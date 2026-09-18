import { auth } from "@/lib/auth";
import {
  expireOAuthTabCookie,
  isValidTabId,
  serializeActiveTabCookie,
  serializeTabSessionCookie,
} from "@/lib/tab-session";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    tabId?: string;
    sessionToken?: string;
  } | null;
  if (!isValidTabId(body?.tabId) || !body?.sessionToken) {
    return Response.json({ error: "Invalid tab session request." }, { status: 400 });
  }

  const session = await auth.api.getSession({
    headers: new Headers({ authorization: `Bearer ${body.sessionToken}` }),
  });
  if (!session) return Response.json({ error: "Invalid session." }, { status: 401 });

  const response = Response.json({ ok: true });
  response.headers.append(
    "Set-Cookie",
    serializeTabSessionCookie(body.tabId, body.sessionToken, request.url),
  );
  response.headers.append("Set-Cookie", serializeActiveTabCookie(body.tabId, request.url));
  response.headers.append("Set-Cookie", expireOAuthTabCookie(request.url));
  return response;
}
