import { describe, expect, it } from "vitest";
import { findRequestByOperation, parsePostmanCollection } from "./postman-analyzer.js";

const COLLECTION = {
  info: { name: "Sample API" },
  item: [
    {
      name: "Users",
      item: [
        {
          name: "GET /users/:id",
          request: { method: "GET", url: { raw: "{{baseUrl}}/users/:id" } },
          event: [
            {
              listen: "test",
              script: { exec: ['pm.test("REQ-001 | status is 200", () => {});'] },
            },
          ],
        },
        {
          name: "POST /users",
          request: { method: "POST", url: { raw: "{{baseUrl}}/users" } },
          event: [],
        },
      ],
    },
  ],
  variable: [{ key: "baseUrl", value: "" }],
};

describe("parsePostmanCollection", () => {
  it("flattens folders into requests with assertion names", () => {
    const summary = parsePostmanCollection(COLLECTION);
    expect(summary.name).toBe("Sample API");
    expect(summary.requests).toHaveLength(2);
    const get = summary.requests.find((r) => r.method === "GET")!;
    expect(get.folder).toBe("Users");
    expect(get.assertionNames).toEqual(["REQ-001 | status is 200"]);
    expect(get.hasTestScript).toBe(true);
  });

  it("marks requests without a test script accordingly", () => {
    const summary = parsePostmanCollection(COLLECTION);
    const post = summary.requests.find((r) => r.method === "POST")!;
    expect(post.hasTestScript).toBe(false);
    expect(post.assertionNames).toHaveLength(0);
  });

  it("parses a JSON string collection the same as an object", () => {
    const summary = parsePostmanCollection(JSON.stringify(COLLECTION));
    expect(summary.requests).toHaveLength(2);
  });
});

describe("findRequestByOperation", () => {
  it("matches a request by method and path segment", () => {
    const summary = parsePostmanCollection(COLLECTION);
    const found = findRequestByOperation(summary, "GET", "/users/{id}");
    expect(found?.name).toBe("GET /users/:id");
  });

  it("returns undefined when no request matches", () => {
    const summary = parsePostmanCollection(COLLECTION);
    const found = findRequestByOperation(summary, "DELETE", "/users/{id}");
    expect(found).toBeUndefined();
  });
});
