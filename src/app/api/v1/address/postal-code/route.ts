import { z } from "zod";
import { NextRequest } from "next/server";
import { AppError, errorResponse, validationError } from "@/lib/errors";
import { requestId, successResponse } from "@/lib/request";

const inputSchema = z
  .object({
    postalCode: z.string().trim().min(2).max(20).optional(),
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
    countryCode: z.string().trim().length(2).optional(),
  })
  .refine(
    (value) =>
      Boolean(value.postalCode) || (value.latitude !== undefined && value.longitude !== undefined),
    { message: "Provide a postal code or GPS coordinates." },
  );
const unavailable = () =>
  new AppError("INTERNAL_ERROR", "Address lookup is temporarily unavailable.", 503);
const component = (components: Array<{ long_name: string; types: string[] }>, type: string) =>
  components.find((item) => item.types.includes(type))?.long_name || "";

export async function POST(request: NextRequest) {
  const id = requestId(request);
  try {
    const parsed = inputSchema.safeParse(await request.json());
    if (!parsed.success) throw validationError("Enter a valid postal code or GPS coordinates.");
    const key = process.env.GOOGLE_MAPS_API_KEY;
    if (!key && parsed.data.latitude !== undefined && parsed.data.longitude !== undefined) {
      const query = new URLSearchParams({
        format: "jsonv2",
        addressdetails: "1",
        lat: String(parsed.data.latitude),
        lon: String(parsed.data.longitude),
      });
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?${query}`, {
        headers: { "user-agent": "Triple-Minds-HR-local-development/1.0" },
        signal: AbortSignal.timeout(8000),
        cache: "no-store",
      });
      if (!response.ok) throw unavailable();
      const provider = (await response.json()) as {
        display_name?: string;
        address?: Record<string, string>;
      };
      const address = provider.address || {};
      const location = {
        postalCode: address.postcode || "",
        city: address.city || address.town || address.village || address.county || "",
        state: address.state || "",
        country: address.country || "",
        formattedAddress: provider.display_name || "",
        latitude: parsed.data.latitude,
        longitude: parsed.data.longitude,
      };
      return successResponse(
        { found: Boolean(location.formattedAddress), locations: [location], ...location },
        id,
      );
    }
    if (!key)
      throw new AppError(
        "INTERNAL_ERROR",
        "Address lookup is not configured for postal-code search.",
        503,
      );
    const query = new URLSearchParams({ key });
    if (parsed.data.latitude !== undefined && parsed.data.longitude !== undefined)
      query.set("latlng", `${parsed.data.latitude},${parsed.data.longitude}`);
    else query.set("address", parsed.data.postalCode || "");
    if (parsed.data.countryCode && parsed.data.latitude === undefined)
      query.set("components", `country:${parsed.data.countryCode.toLowerCase()}`);
    const response = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?${query}`, {
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    });
    if (!response.ok) throw unavailable();
    const provider = (await response.json()) as {
      status: string;
      results?: Array<{
        formatted_address: string;
        geometry?: { location?: { lat: number; lng: number } };
        address_components: Array<{ long_name: string; types: string[] }>;
      }>;
    };
    if (provider.status !== "OK" && provider.status !== "ZERO_RESULTS") throw unavailable();
    const locations = (provider.results || []).map((result) => ({
      postalCode:
        component(result.address_components, "postal_code") || parsed.data.postalCode || "",
      city:
        component(result.address_components, "locality") ||
        component(result.address_components, "postal_town") ||
        component(result.address_components, "administrative_area_level_2"),
      state: component(result.address_components, "administrative_area_level_1"),
      country: component(result.address_components, "country"),
      formattedAddress: result.formatted_address,
      latitude: result.geometry?.location?.lat ?? parsed.data.latitude ?? null,
      longitude: result.geometry?.location?.lng ?? parsed.data.longitude ?? null,
    }));
    return successResponse(
      {
        found: locations.length > 0,
        postalCode: parsed.data.postalCode || locations[0]?.postalCode || "",
        locations,
        ...(locations.length === 1 ? locations[0] : {}),
      },
      id,
    );
  } catch (error) {
    return errorResponse(error, id);
  }
}
