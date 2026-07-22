import { describe, expect, it } from "vitest";
import { findHardcodedSecretVariables, scanForSecrets } from "./secret-scanner.js";

describe("scanForSecrets", () => {
  it("detects a GitHub token pattern", () => {
    expect(scanForSecrets("token: ghp_abcdefghijklmnopqrstuvwxyz1234")).toContain("GitHub token");
  });

  it("detects an AWS access key", () => {
    expect(scanForSecrets("AKIAABCDEFGHIJKLMNOP")).toContain("AWS access key");
  });

  it("detects a private key block", () => {
    expect(scanForSecrets("-----BEGIN RSA PRIVATE KEY-----\nMII...")).toContain(
      "private key block",
    );
  });

  it("returns no findings for clean content", () => {
    expect(scanForSecrets(JSON.stringify({ baseUrl: "{{baseUrl}}" }))).toHaveLength(0);
  });
});

describe("findHardcodedSecretVariables", () => {
  it("flags a secret-like key with a real value", () => {
    const findings = findHardcodedSecretVariables([{ key: "apiToken", value: "sk_live_abc123" }]);
    expect(findings).toHaveLength(1);
    expect(findings[0]!.key).toBe("apiToken");
  });

  it("does not flag a secret-like key that is empty or templated", () => {
    const findings = findHardcodedSecretVariables([
      { key: "password", value: "" },
      { key: "accessToken", value: "{{accessToken}}" },
    ]);
    expect(findings).toHaveLength(0);
  });

  it("does not flag a non-secret key", () => {
    expect(
      findHardcodedSecretVariables([{ key: "baseUrl", value: "http://localhost" }]),
    ).toHaveLength(0);
  });
});
