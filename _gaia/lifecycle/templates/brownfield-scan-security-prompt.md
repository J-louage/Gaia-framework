# Security Endpoint Audit Scanner — Subagent Prompt

> Brownfield deep analysis scan subagent. Detects security gaps in API endpoints including missing authentication middleware, IDOR vulnerabilities, rate limiting gaps, sensitive data exposure, and missing input validation.
> Reference: Architecture ADR-021, Section 10.15.2, Section 10.15.5

## Objective

Scan the codebase at `{project-path}` to catalog all API endpoints and identify security gaps. For each API endpoint, determine its HTTP method, authentication requirements, authorization checks, and detect vulnerabilities that could lead to unauthorized access or data exposure.

**Output format:** Follow the gap entry schema at `{project-root}/_gaia/lifecycle/templates/gap-entry-schema.md` exactly.

## Phase 1: Endpoint Discovery

Catalog all API endpoints in the project. For each endpoint, record:

- **Route path** (e.g., `/api/users/:id`, `/api/orders`)
- **HTTP method** (GET, POST, PUT, PATCH, DELETE)
- **Authentication requirements** — middleware, decorators, or annotations that enforce auth
- **Authorization checks** — role-based access control, ownership validation, permission checks
- **Handler function** — the controller/handler that processes the request

### Stack-Aware Endpoint Discovery Patterns

Apply the following framework-specific patterns based on the detected `{tech_stack}`:

#### Java/Spring

| Pattern | Type | Description |
|---------|------|-------------|
| `@GetMapping`, `@PostMapping`, `@PutMapping`, `@DeleteMapping`, `@PatchMapping` | Route | Spring MVC endpoint annotations |
| `@RequestMapping(method = RequestMethod.GET)` | Route | Explicit method mapping |
| `RouterFunction<ServerResponse>` | Route | Spring WebFlux functional endpoints |
| `@RestController` class-level `@RequestMapping` | Route prefix | Base path for all methods in controller |

#### Node/Express

| Pattern | Type | Description |
|---------|------|-------------|
| `app.get()`, `app.post()`, `app.put()`, `app.delete()`, `app.patch()` | Route | Express route handlers |
| `router.get()`, `router.post()`, `router.put()`, `router.delete()` | Route | Express Router route handlers |
| `app.route().get().post()` | Route | Chained route handlers |
| `app.all()` | Route | Catch-all route handler |

#### Python/Django

| Pattern | Type | Description |
|---------|------|-------------|
| `path()`, `re_path()` in `urls.py` | Route | Django URL configuration |
| `@api_view(['GET', 'POST'])` | Route | DRF function-based view decorator |
| `class XxxViewSet(viewsets.ModelViewSet)` | Route | DRF viewset with automatic CRUD routes |
| `class XxxView(APIView)` | Route | DRF class-based view |

#### Go/Gin

| Pattern | Type | Description |
|---------|------|-------------|
| `r.GET()`, `r.POST()`, `r.PUT()`, `r.DELETE()`, `r.PATCH()` | Route | Gin route handlers |
| `group.GET()`, `group.POST()` | Route | Gin route group handlers |
| `http.HandleFunc()`, `http.Handle()` | Route | Standard library HTTP handlers |
| `mux.HandleFunc()`, `mux.Handle()` | Route | gorilla/mux route handlers |

### Graceful Exit — No API Endpoints

If no API endpoints are detected after scanning route files (e.g., the project is a CLI tool, library, or static site), output a summary note and zero gap entries:

```markdown
## Summary
No API endpoints detected — security endpoint audit not applicable.
Total Findings: 0
```

## Phase 2: Security Gap Detection Rules

For each cataloged endpoint, evaluate the following 5 detection categories:

### 1. Missing Authentication Middleware (AC3a)

Detect endpoints that have no authentication middleware in their middleware chain. An endpoint is flagged when:
- It has no auth middleware/decorator/annotation applied directly
- It does not inherit auth from a parent router or application-level middleware (see Phase 3 below)
- It is publicly accessible without any identity verification

**Severity:**
- `critical` — mutating endpoints (POST, PUT, PATCH, DELETE) missing authentication middleware entirely
- `high` — read endpoints (GET) missing authentication middleware that return non-public data

### 2. IDOR Vulnerability Detection (AC3b)

Detect endpoints where path or query parameters reference resources without ownership validation. An IDOR-vulnerable endpoint has:
- Path parameters like `:id`, `{id}`, `<int:pk>` that reference a resource
- No ownership validation in the handler (e.g., no check that `request.user.id == resource.owner_id`)
- Direct database lookups using the parameter without filtering by the authenticated user

**Severity:** `critical` — IDOR vulnerabilities allow unauthorized access to other users' data

### 3. Rate Limiting Gap Detection (AC3c)

Detect endpoints without rate limiting at the application level. Note that reverse proxy rate limiting (nginx, API Gateway) is not visible to static analysis.

**Flag these:**
- Endpoints with no rate limiter middleware in their middleware chain
- Authentication endpoints (login, register, password reset) without rate limiting

**Severity:** `high` — missing rate limiting is a defense-in-depth gap

**Note:** Append to each finding: "Reverse proxy or API gateway rate limiting is not visible to static code analysis. Verify infrastructure-level rate limiting separately."

### 4. Sensitive Data Exposure Detection (AC3d)

Detect endpoints whose response objects contain fields that should be filtered before returning to clients.

**Flag these response fields:**
- `password`, `password_hash`, `hashed_password`
- `token`, `access_token`, `refresh_token`, `api_key`, `secret`
- `ssn`, `social_security`, `national_id`
- `credit_card`, `card_number`, `cvv`, `expiry`
- Any field matching patterns: `*_secret`, `*_key`, `*_token`

**Severity:** `high` — sensitive data exposure is a defense-in-depth gap

### 5. Missing Input Validation on Mutating Endpoints (AC3e)

Detect mutating endpoints (POST, PUT, PATCH, DELETE) that accept a request body but have no input validation.

**Flag these:**
- POST/PUT/PATCH endpoints without request body validation middleware/schema
- No validation library usage (Joi, Zod, class-validator, Pydantic, marshmallow)
- No schema validation at the framework level

**Severity:** `high` — missing input validation enables injection attacks and data corruption

## Phase 3: False-Positive Mitigation — Inherited Auth (AC8)

Before flagging an endpoint as "missing authentication middleware," trace the middleware chain upward to check for inherited auth:

### Stack-Aware Inherited Auth Patterns

#### Java/Spring Security

| Pattern | Scope | Description |
|---------|-------|-------------|
| `HttpSecurity.authorizeRequests().anyRequest().authenticated()` | App-level | Spring Security global auth requirement |
| `@PreAuthorize("hasRole('ADMIN')")` on controller class | Class-level | All methods in controller inherit auth |
| `@Secured("ROLE_USER")` on controller class | Class-level | All methods inherit role check |
| `SecurityFilterChain` bean configuration | App-level | Global security filter chain |
| `.antMatchers("/api/**").authenticated()` | Path-level | Auth on path pattern |

#### Node/Express Middleware

| Pattern | Scope | Description |
|---------|-------|-------------|
| `app.use(authMiddleware)` | App-level | Global Express middleware auth |
| `router.use(passport.authenticate('jwt'))` | Router-level | All routes in router inherit auth |
| `app.use('/api', authMiddleware, apiRouter)` | Path-level | Auth on all `/api` sub-routes |

#### Django Permissions

| Pattern | Scope | Description |
|---------|-------|-------------|
| `REST_FRAMEWORK.DEFAULT_PERMISSION_CLASSES: [IsAuthenticated]` | App-level | DRF global permission |
| `LoginRequiredMixin` in class-based views | Class-level | All methods inherit login check |
| `@login_required` on view function | Function-level | Single view auth |
| `@permission_required('app.permission')` | Function-level | Permission check |

#### Go/Gin Middleware

| Pattern | Scope | Description |
|---------|-------|-------------|
| `r.Use(JWTAuth())` on engine | App-level | Global Gin middleware auth |
| `group := r.Group("/api"); group.Use(AuthMiddleware())` | Group-level | All routes in group inherit auth |
| `gin.HandlerFunc` auth guard on group | Group-level | Auth guard middleware |

**Rule:** If an endpoint inherits auth from any of these parent-level patterns, do NOT flag it as "missing authentication middleware." This avoids false positives on individually undecorated routes that are protected by their parent scope.

## Output Format

### Gap Entry Structure

Each finding MUST use the standardized gap schema from `gap-entry-schema.md`:

```yaml
gap:
  id: "GAP-SECURITY-{seq}"
  category: "security-endpoint"
  severity: "{critical|high}"
  title: "Short description (max 80 chars)"
  description: "What was found, why it matters, what security implication it has"
  evidence:
    file: "relative/path/to/file"
    line: 42
  recommendation: "Actionable fix — add middleware, validate input, filter response"
  verified_by: "machine-detected"
  confidence: "{high|medium|low}"
```

### Field Values

- **id:** `GAP-SECURITY-{seq}` — sequential numbering starting at 001 (e.g., `GAP-SECURITY-001`, `GAP-SECURITY-002`)
- **category:** Always `security-endpoint`
- **severity:** Based on security impact:
  - `critical` — missing authentication middleware on mutating endpoints (POST/PUT/PATCH/DELETE), IDOR vulnerabilities with direct security implications
  - `high` — missing rate limiting, sensitive data exposure without response filtering, missing input validation on mutating endpoints (defense-in-depth gaps)
- **verified_by:** Always `machine-detected`
- **confidence:** Based on detection certainty:
  - `high` — exact pattern match (e.g., no auth decorator/annotation on a `@PostMapping` handler, explicit password field in serializer)
  - `medium` — heuristic match (e.g., handler accesses path parameter without obvious ownership check, IDOR detection requiring understanding of handler logic)
  - `low` — ambiguous case (e.g., custom auth mechanism not recognized by pattern table, middleware chain too complex to trace statically)

## Budget Enforcement

- Each gap entry should average approximately 100 tokens in the structured YAML format
- Maximum output: 70 gap entries per scan to stay within NFR-024 token budget constraints
- If more than 70 gaps are detected:
  1. Sort all findings by severity (critical > high)
  2. Within same severity, sort by confidence (high > medium > low)
  3. Keep the top 70 entries
  4. Truncate remaining entries
  5. Append a budget summary section:

```markdown
## Budget Summary
Total gaps detected: {N}. Showing top 70 by severity. Omitted: {N-70} entries ({high_count} high, {critical_count} critical).
```

## Output File

Write all findings to: `{planning_artifacts}/brownfield-scan-security.md`

Include a header:
```markdown
# Brownfield Scan: Security Endpoint Audit

> Scanner: Security Endpoint Audit Scanner
> Tech Stack: {tech_stack}
> Scan Date: {date}
> Total Findings: {count}
> Endpoints Cataloged: {endpoint_count}
```
