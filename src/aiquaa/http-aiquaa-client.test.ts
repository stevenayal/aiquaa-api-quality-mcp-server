import { afterEach, describe, expect, it, vi } from "vitest";
import { AiquaaClientError, HttpAiquaaClient } from "./http-aiquaa-client.js";

describe("HttpAiquaaClient", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("throws when AIQUAA_API_BASE_URL is missing", () => {
    expect(() => new HttpAiquaaClient({ accessToken: "token" })).toThrow(AiquaaClientError);
  });

  it("throws when the access token is missing", () => {
    expect(() => new HttpAiquaaClient({ baseUrl: "https://api.example.com" })).toThrow(
      AiquaaClientError,
    );
  });

  it("fetches and normalizes a requirement", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ text: "El usuario debe poder recuperar su contraseña." }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const client = new HttpAiquaaClient({
      baseUrl: "https://api.example.com",
      accessToken: "token",
    });
    const requirement = await client.getRequirement("prj_1", "REQ-001");

    expect(requirement.text).toContain("recuperar su contraseña");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.com/projects/prj_1/requirements/REQ-001",
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("throws an AiquaaClientError on a non-ok response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 404, statusText: "Not Found" }),
    );
    const client = new HttpAiquaaClient({
      baseUrl: "https://api.example.com",
      accessToken: "token",
    });
    await expect(client.getRequirement("prj_1", "REQ-999")).rejects.toThrow(AiquaaClientError);
  });
});
