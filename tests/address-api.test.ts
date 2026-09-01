import { describe, expect, it, vi, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/v1/address/postal-code/route";

afterEach(() => vi.unstubAllGlobals());

describe("postal-code address lookup", () => {
  it("returns normalized location fields from Google", async () => {
    process.env.GOOGLE_MAPS_API_KEY = "test-key";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ status: "OK", results: [{ formatted_address: "Hyderabad, Telangana, India", geometry: { location: { lat: 17.4, lng: 78.4 } }, address_components: [{ long_name: "Hyderabad", types: ["locality"] }, { long_name: "Telangana", types: ["administrative_area_level_1"] }, { long_name: "India", types: ["country"] }] }] }), { status: 200 })));
    const response = await POST(new NextRequest("http://localhost/api/v1/address/postal-code", { method: "POST", body: JSON.stringify({ postalCode: " 500001 " }) }));
    expect(response.status).toBe(200);
    expect((await response.json()).data).toMatchObject({ found: true, city: "Hyderabad", state: "Telangana", country: "India" });
  });

  it("returns a safe configuration response without a Google key", async () => {
    delete process.env.GOOGLE_MAPS_API_KEY;
    const response = await POST(new NextRequest("http://localhost/api/v1/address/postal-code", { method: "POST", body: JSON.stringify({ postalCode: "500001" }) }));
    expect(response.status).toBe(503);
    expect((await response.json()).error.message).not.toContain("test-key");
  });

  it("rejects empty postal codes", async () => {
    const response = await POST(new NextRequest("http://localhost/api/v1/address/postal-code", { method: "POST", body: JSON.stringify({ postalCode: "" }) }));
    expect(response.status).toBe(422);
  });
});
