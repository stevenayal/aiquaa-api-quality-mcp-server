import { describe, expect, it } from "vitest";
import { analyzeRepository } from "./repository-analyzer.js";

describe("analyzeRepository", () => {
  it("detects NestJS controllers and endpoints", () => {
    const file = {
      path: "src/users/users.controller.ts",
      content: `
@Controller("users")
export class UsersController {
  @Get(":id")
  findOne(@Param("id") id: string) {}

  @Post()
  create(@Body() dto: CreateUserDto) {}
}
`,
    };
    const result = analyzeRepository([file]);
    expect(result.stack.framework).toBe("nestjs");
    expect(result.operations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ method: "GET", path: "/users/{id}" }),
        expect.objectContaining({ method: "POST", path: "/users" }),
      ]),
    );
  });

  it("detects Express routes", () => {
    const file = {
      path: "src/routes.js",
      content: `
const express = require("express");
const router = express.Router();
router.get("/orders/:id", handler);
router.post("/orders", handler);
`,
    };
    const result = analyzeRepository([file]);
    expect(result.stack.framework).toBe("express");
    expect(result.operations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ method: "GET", path: "/orders/{id}" }),
        expect.objectContaining({ method: "POST", path: "/orders" }),
      ]),
    );
  });

  it("detects Spring Boot mappings", () => {
    const file = {
      path: "src/main/java/com/api/OrderController.java",
      content: `
@RestController
@RequestMapping("/api/orders")
public class OrderController {
  @GetMapping("/{id}")
  public Order getOrder(@PathVariable String id) { return null; }

  @PostMapping
  public Order createOrder(@RequestBody Order order) { return null; }
}
`,
    };
    const result = analyzeRepository([file]);
    expect(result.stack.framework).toBe("spring-boot");
    expect(result.operations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ method: "GET", path: "/api/orders/{id}" }),
        expect.objectContaining({ method: "POST", path: "/api/orders" }),
      ]),
    );
  });

  it("detects ASP.NET Core [Http*] attributes", () => {
    const file = {
      path: "Controllers/ProductsController.cs",
      content: `
[ApiController]
[Route("api/products")]
public class ProductsController : ControllerBase {
  [HttpGet("{id}")]
  public IActionResult Get(string id) => Ok();

  [HttpPost]
  public IActionResult Create([FromBody] Product product) => Ok();
}
`,
    };
    const result = analyzeRepository([file]);
    expect(result.stack.framework).toBe("aspnet-core");
    expect(result.operations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ method: "GET", path: "/api/products/{id}" }),
        expect.objectContaining({ method: "POST", path: "/api/products" }),
      ]),
    );
  });

  it("detects FastAPI decorators", () => {
    const file = {
      path: "app/main.py",
      content: `
from fastapi import FastAPI
app = FastAPI()

@app.get("/items/{item_id}")
def read_item(item_id: str):
    return {}

@app.post("/items")
def create_item(item: Item):
    return {}
`,
    };
    const result = analyzeRepository([file]);
    expect(result.stack.framework).toBe("fastapi");
    expect(result.operations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ method: "GET", path: "/items/{item_id}" }),
        expect.objectContaining({ method: "POST", path: "/items" }),
      ]),
    );
  });

  it("detects Quarkus JAX-RS resources", () => {
    const file = {
      path: "src/main/java/com/api/BookResource.java",
      content: `
import jakarta.ws.rs.GET;
@Path("/books")
public class BookResource {
  @GET
  @Path("/{id}")
  public Book get(@PathParam("id") String id) { return null; }
}
`,
    };
    const result = analyzeRepository([file]);
    expect(result.stack.framework).toBe("quarkus");
    expect(result.operations.length).toBeGreaterThan(0);
  });

  it("returns unknown stack when no signature matches", () => {
    const result = analyzeRepository([{ path: "README.md", content: "# hello" }]);
    expect(result.stack.framework).toBe("unknown");
    expect(result.operations).toHaveLength(0);
  });

  it("deduplicates identical method+path across files", () => {
    const fileA = {
      path: "a.js",
      content: `router.get("/ping", h);`,
    };
    const fileB = {
      path: "b.js",
      content: `router.get("/ping", h2); require("express");`,
    };
    const result = analyzeRepository([
      { path: "x.js", content: 'require("express"); router.get("/ping", h);' },
      fileA,
      fileB,
    ]);
    const pings = result.operations.filter((op) => op.path === "/ping" && op.method === "GET");
    expect(pings).toHaveLength(1);
  });
});
