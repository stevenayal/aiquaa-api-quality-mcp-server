# AIQUAA API Quality MCP Server

Servidor MCP (Model Context Protocol) que analiza requisitos y APIs, evalúa la cobertura de pruebas existente y genera o mantiene automatización Postman/Newman — con la opción de abrir un draft pull request en GitHub con los cambios.

No es un generador de colecciones desde cero: es un agente de **mantenimiento** de automatización de pruebas de API. Lee lo que ya existe (endpoints, DTOs, validadores, colecciones, pipelines) antes de decidir si crear, extender, modificar, mantener o deprecar algo.

## Propósito

Dado uno o varios de: un requisito, una historia de usuario, un documento OpenAPI, un comando curl, código fuente de una API o un repositorio de GitHub — el servidor:

1. Detecta stack, endpoints, autenticación, validadores y contratos.
2. Estructura requisitos/criterios/reglas con IDs estables (`REQ-`, `AC-`, `BR-`).
3. Cruza requisitos contra endpoints y la colección Postman existente.
4. Decide `create` / `extend` / `modify` / `keep` / `deprecate` / `block` por requisito.
5. Genera o modifica únicamente lo necesario: colección, environment, scripts, pipeline CI.
6. Opcionalmente abre un draft PR con todo lo anterior.

## Instalación

```bash
npx -y aiquaa-api-quality-mcp-server
```

O como dependencia del proyecto:

```bash
npm install aiquaa-api-quality-mcp-server
```

## Quick start

```bash
npx -y aiquaa-api-quality-mcp-server
```

Por defecto expone:

```text
MCP:    http://localhost:3000/mcp
Health: http://localhost:3000/health
```

```bash
curl http://localhost:3000/health
# {"status":"ok","name":"aiquaa-api-quality","version":"0.1.0","transport":"streamable-http"}
```

## Configuración MCP

Agregar a la configuración de tu cliente MCP (Claude Code, Claude Desktop, etc.) como servidor HTTP:

```json
{
  "mcpServers": {
    "aiquaa-api-quality": {
      "url": "http://localhost:3000/mcp"
    }
  }
}
```

### Variables de entorno

| Variable                  | Requerida                              | Descripción                                                                      |
| ------------------------- | -------------------------------------- | -------------------------------------------------------------------------------- |
| `PORT`                    | no (default `3000`)                    | Puerto HTTP del servidor.                                                        |
| `MCP_PATH`                | no (default `/mcp`)                    | Path del endpoint MCP.                                                           |
| `GITHUB_TOKEN`            | solo para `api_pr` con `dry_run=false` | Token con permisos `contents:write` y `pull-requests:write`.                     |
| `GITHUB_API_URL`          | no                                     | Para GitHub Enterprise. Default `https://api.github.com`.                        |
| `AIQUAA_API_BASE_URL`     | no                                     | Backend AIQUAA para requisitos/reglas remotas.                                   |
| `AIQUAA_ACCESS_TOKEN`     | no                                     | JWT para AIQUAA en desarrollo (en producción, `Authorization: Bearer` a `/mcp`). |
| `CODEGRAPH_BIN`           | no (default `codegraph`)               | Binario de CodeGraph.                                                            |
| `CODEGRAPH_ALLOWED_ROOTS` | no                                     | Carpetas permitidas para `codegraph`, separadas por el separador de PATH del SO. |
| `ENGRAM_BIN`              | no (default `engram`)                  | Binario de Engram.                                                               |
| `ENGRAM_PROJECT_PREFIX`   | no (default `aiquaa-`)                 | Prefijo de namespace de memoria por proyecto.                                    |

Nunca se incluyen tokens, passwords ni API keys en los artefactos generados (colecciones, environments, pipelines). Ver [Seguridad](#seguridad).

## Tools disponibles

| Tool             | Qué hace                                                                                                                                                     |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `api_analizar`   | Analiza requisitos, repositorio GitHub, OpenAPI, curl o archivos fuente. Detecta stack, endpoints, colecciones y workflows existentes.                       |
| `api_requisitos` | Convierte historias/criterios/reglas en un modelo estructurado con IDs `REQ-`/`AC-`/`BR-`.                                                                   |
| `api_cobertura`  | Devuelve la matriz Requirement → Endpoint → Request → Assertions → Status.                                                                                   |
| `api_generar`    | Genera o extiende colección Postman v2.1, environment y assertions (modos `create`/`extend`/`modify`).                                                       |
| `api_validar`    | Valida estructuralmente colección/environment: JSON, schema v2.1, variables, duplicados, secretos. No ejecuta nada.                                          |
| `api_ejecutar`   | Ejecuta Newman — solo cuando el usuario lo invoca explícitamente. Hosts de producción requieren `confirmed_production_run=true`.                             |
| `api_fallos`     | Clasifica fallos de Newman/JUnit/mensajes de error por categoría (producto, contrato, datos, auth, test desactualizado, flaky, timeout, infraestructura...). |
| `api_pipeline`   | Genera o extiende un workflow de GitHub Actions / Azure Pipelines con el job de Newman.                                                                      |
| `api_cambios`    | Devuelve el plan de cambios (`ChangePlan`) antes de escribir nada: estrategia, archivos, cobertura antes/después.                                            |
| `api_pr`         | Crea rama, aplica archivos y abre un draft PR. `dry_run=true` y `draft=true` por defecto.                                                                    |

## Flujo: de requisito a PR

```text
api_analizar   → stack, endpoints, colecciones/pipelines existentes
api_requisitos → REQ-/AC-/BR- estructurados
api_cobertura  → qué está cubierto, parcial, desactualizado o sin cubrir
api_cambios    → plan (create/extend/modify/keep/deprecate/block) antes de tocar nada
api_generar    → archivos generados (dry, en memoria)
api_validar    → chequeo estructural antes de escribir
api_pr         → dry_run=true primero, luego dry_run=false para abrir el PR
```

### Ejemplo desde OpenAPI

```text
Analizá este OpenAPI y generá cobertura para REQ-142 (creación de usuario).
```

Llamada a `api_analizar` con `openapi` (JSON o YAML) → `api_generar` con `mode="create"` y los endpoints detectados.

### Ejemplo desde un repositorio

```text
Analizá el repositorio org/customer-api y el requisito REQ-142.

Revisá los endpoints, DTOs, validadores y las colecciones Postman existentes.

Si la cobertura ya existe, no la dupliques.

Si está incompleta, agregá o modificá únicamente los requests y assertions necesarios.

Prepará los cambios y mostrame el diff.

Después, creá un draft PR contra main.
```

Flujo de tools: `api_analizar` (con `repository`) → `api_cobertura` → `api_cambios` → `api_generar` → `api_validar` → `api_pr` (`dry_run=true` para mostrar el diff, luego `dry_run=false`).

### Ejemplo de ampliación de colección existente

```text
Ya tengo tests/postman/C_CUSTOMER_API.json. Agregá cobertura para el nuevo
campo obligatorio "taxId" en POST /customers sin duplicar los requests que
ya existen.
```

`api_generar` con `mode="extend"` y `existing_collection` — solo agrega las assertions faltantes al request existente; no crea un request duplicado (ver `src/generators/collection-generator.ts`).

### Uso de `dryRun`

`api_pr` tiene `dry_run=true` por defecto: devuelve rama, título, cuerpo del PR y archivos planificados sin tocar GitHub. Solo con `dry_run=false` explícito se crea la rama, se commitean los archivos y se abre el PR (como draft, salvo `draft=false` explícito).

## Configuración de GitHub

`api_pr` necesita `GITHUB_TOKEN` con permisos de escritura sobre el repositorio (`contents:write`, `pull-requests:write`). El flujo:

1. Verifica permisos de escritura sobre el repo.
2. Lee la rama base (o usa el default branch).
3. Reutiliza la rama `test/api-quality/<requirement-or-operation>` si ya existe.
4. Crea/actualiza/borra los archivos provistos.
5. Abre un **draft PR** con contexto, requisitos evaluados, endpoints afectados, cobertura antes/después, archivos, supuestos, riesgos, secretos requeridos e instrucciones de ejecución.

Antes de escribir, cada archivo pasa por un escaneo de secretos (`src/security/secret-scanner.ts`); si algo parece un token o clave privada, la operación se aborta.

## Seguridad

- Los valores marcados como secretos nunca se escriben en environments generados — quedan como `""` para completarse fuera de versión.
- `api_validar` detecta variables secretas hardcodeadas y patrones de credenciales embebidas (AWS keys, tokens de GitHub, JWT, bloques de clave privada).
- `api_ejecutar` bloquea ejecuciones contra hosts que parecen de producción salvo `confirmed_production_run=true`.
- `api_pr` tiene `dry_run=true` y `draft=true` por defecto; nunca sobrescribe un archivo sin leerlo primero (usa el SHA actual de GitHub al hacer `createOrUpdateFileContents`).
- El servidor nunca imprime ni reenvía `GITHUB_TOKEN`/`AIQUAA_ACCESS_TOKEN` en las respuestas de las tools.

## Integración AIQUAA

`src/aiquaa/` define un puerto (`AiquaaClientPort`) y un adapter HTTP (`HttpAiquaaClient`) que usa las rutas centralizadas en `src/constants.ts` (`AIQUAA_ENDPOINTS`). El core del MCP depende solo de la interfaz, así que cambiar el backend o mockearlo en tests no toca las tools. Las rutas no se asumen definitivas — es el único lugar que hay que tocar si cambian.

## CodeGraph

`src/codegraph/codegraph-client.ts` invoca el binario `codegraph` (configurable con `CODEGRAPH_BIN`) para contexto estructural de un repositorio local, restringido a `CODEGRAPH_ALLOWED_ROOTS`. Es opcional: si no está configurado, la tool que lo use devuelve un error explícito en vez de fallar en silencio.

## Engram

`src/memory/engram-client.ts` invoca el binario `engram` (configurable con `ENGRAM_BIN`) para guardar/recuperar memoria persistente, siempre bajo el namespace `ENGRAM_PROJECT_PREFIX + projectId`. Nunca se guardan secretos; el llamador es responsable de pasar contenido ya curado.

## CI/CD

- `.github/workflows/ci.yml`: build + lint + test (npm y pnpm) en cada push/PR a `main`.
- `.github/workflows/publish-npm.yml`: publica a npm vía [Trusted Publishing/OIDC](https://docs.npmjs.com/trusted-publishers) cuando se publica un release de GitHub, verificando que el tag coincida con `package.json`.
- `api_pipeline` genera el mismo tipo de workflow (con el job de Newman) para el repositorio de la API bajo prueba, no para este servidor.

## Publicación en npm

El paquete se publica vía Trusted Publishing (OIDC), sin tokens de npm en secretos de CI:

1. Crear un release de GitHub con tag `vX.Y.Z` igual a `package.json#version`.
2. El workflow `publish-npm.yml` corre `npm run check` y luego `npm publish` usando el `id-token: write` del job.

## Desarrollo local

```bash
npm install
npm run build
npm test
npm run lint
npm run dev   # build + start con --watch
```

```bash
docker build -t aiquaa-api-quality-mcp-server .
docker run -p 3000:3000 aiquaa-api-quality-mcp-server
```

## Limitaciones conocidas

- La detección de stack/endpoints es heurística (regex por framework), no un parser AST completo — cubre Express, NestJS, Fastify, Spring Boot, Quarkus, ASP.NET Core, FastAPI, Django y Flask con buena precisión en los casos comunes, pero puede fallar en estructuras muy atípicas. Siempre declara `confidence` y deja `missingInformation` explícito.
- `api_ejecutar` requiere que `newman` esté instalable/disponible en el entorno donde corre el servidor.
- `api_analizar` con `repository` requiere `GITHUB_TOKEN` con permiso de lectura sobre el repo y usa la API de Git Trees (limita a ~150 archivos relevantes y 200 KB por archivo para mantener el análisis acotado).
- La generación de reportes HTML enriquecidos (PDF, HTMLExtra) queda del lado de Newman/CI (`newman-reporter-htmlextra`); el servidor no genera PDFs.
- El parseo de JUnit XML es basado en regex para los casos comunes de `<testcase>`/`<failure>`, no un parser XML completo.

## Licencia

MIT — ver [LICENSE](LICENSE).
