import { describe, expect, it } from "vitest";
import { decryptPii, encryptPii, maskAadhaar, maskPan } from "@/lib/pii";

describe("identity data protection", () => {
  it("encrypts Aadhaar/PAN values without storing the plaintext", () => {
    const aadhaar = encryptPii("1234 5678 9012");
    const pan = encryptPii("ABCDE1234F");
    expect(aadhaar).not.toContain("1234 5678 9012");
    expect(pan).not.toContain("ABCDE1234F");
    expect(decryptPii(aadhaar)).toBe("1234 5678 9012");
    expect(decryptPii(pan)).toBe("ABCDE1234F");
  });

  it("masks protected values for HR display", () => {
    expect(maskAadhaar(encryptPii("123456789012"))).toBe("XXXX-XXXX-9012");
    expect(maskPan(encryptPii("ABCDE1234F"))).toBe("ABXXXXXX4F");
  });
});
