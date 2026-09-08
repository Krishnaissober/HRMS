/* eslint-disable @typescript-eslint/no-require-imports */
const http = require("node:http");

const port = Number(process.env.BACKEND_PORT || 4000);

const server = http.createServer(async (request, response) => {
  response.setHeader(
    "Access-Control-Allow-Origin",
    process.env.FRONTEND_ORIGIN || "http://localhost:3000",
  );
  response.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", "content-type");
  response.setHeader("Access-Control-Allow-Credentials", "true");

  if (request.method === "OPTIONS") {
    response.writeHead(204);
    response.end();
    return;
  }

  if (request.method === "GET" && request.url === "/health") {
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify({ success: true, service: "hr-portal-backend", status: "ok" }));
    return;
  }

  if (request.method === "POST" && request.url === "/api/address/postal-code") {
    let raw = "";
    request.on("data", (chunk) => {
      raw += chunk;
    });
    request.on("end", async () => {
      try {
        const input = JSON.parse(raw || "{}");
        const latitude = Number(input.latitude);
        const longitude = Number(input.longitude);
        if (
          !Number.isFinite(latitude) ||
          latitude < -90 ||
          latitude > 90 ||
          !Number.isFinite(longitude) ||
          longitude < -180 ||
          longitude > 180
        ) {
          response.writeHead(400, { "content-type": "application/json" });
          response.end(
            JSON.stringify({ success: false, error: "Valid GPS coordinates are required" }),
          );
          return;
        }
        const query = new URLSearchParams({
          format: "jsonv2",
          addressdetails: "1",
          lat: String(latitude),
          lon: String(longitude),
        });
        const lookup = await fetch(`https://nominatim.openstreetmap.org/reverse?${query}`, {
          headers: { "user-agent": "Triple-Minds-HR-local-development/1.0" },
          signal: AbortSignal.timeout(8000),
        });
        if (!lookup.ok) throw new Error("Address lookup unavailable");
        const provider = await lookup.json();
        const address = provider.address || {};
        const location = {
          addressLine1: provider.display_name || "",
          city: address.city || address.town || address.village || address.county || "",
          state: address.state || "",
        };
        response.writeHead(200, { "content-type": "application/json" });
        response.end(
          JSON.stringify({
            success: true,
            data: { found: Boolean(location.addressLine1), ...location },
          }),
        );
      } catch (error) {
        response.writeHead(503, { "content-type": "application/json" });
        response.end(
          JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : "Address lookup unavailable",
          }),
        );
      }
    });
    return;
  }

  if (request.method === "GET" && request.url.startsWith("/api/candidate-submissions")) {
    try {
      const target = new URL(request.url, "http://localhost");
      const upstream = await fetch(
        `http://localhost:3000/api/v1/candidate-submissions${target.search}`,
        {
          headers: {
            cookie: request.headers.cookie || "",
            "x-organization-id": request.headers["x-organization-id"] || "",
          },
        },
      );
      response.writeHead(upstream.status, {
        "content-type": upstream.headers.get("content-type") || "application/json",
      });
      response.end(await upstream.text());
    } catch (error) {
      response.writeHead(502, { "content-type": "application/json" });
      response.end(
        JSON.stringify({
          success: false,
          error: error instanceof Error ? error.message : "Backend gateway unavailable",
        }),
      );
    }
    return;
  }

  response.writeHead(404, { "content-type": "application/json" });
  response.end(JSON.stringify({ success: false, error: "Not found" }));
});

server.listen(port, () => {
  console.log(`HRMS backend listening on http://localhost:${port}`);
});
