# Test Plan: Frontend Authentication Implementation

## Risk Assessment

### High Risk Areas
1. **Authentication Bypass** - Middleware misconfiguration could allow unauthorized access
2. **Cookie Security** - Improper cookie settings could lead to XSS/CSRF attacks
3. **Session Management** - Session fixation or session hijacking vulnerabilities

### Medium Risk Areas
1. **Redirect Logic** - Incorrect redirects could trap users or expose routes
2. **First-Time Setup** - Race conditions during initial registration
3. **API Proxy Configuration** - Misrouted requests could expose internal APIs

### Low Risk Areas
1. **404 Page** - Static content, minimal risk
2. **UI Components** - Form validation handled by browser + server

---

## Test Scenarios

### 1. Authentication & Authorization

#### 1.1 First-Time Setup Flow
**Priority:** HIGH  
**Type:** E2E

**Test Steps:**
1. Ensure database has no users (clean state)
2. Navigate to http://localhost:3000/
3. Verify automatic redirect to /register
4. Fill registration form with valid email/password
5. Submit form
6. Verify redirect to /login
7. Attempt second registration
8. Verify 409 Conflict response

**Expected Results:**
- [ ] Step 3: Redirected to /register (not /login)
- [ ] Step 6: Redirected to /login after successful registration
- [ ] Step 8: Error message shown, no second user created

#### 1.2 Login Flow - Valid Credentials
**Priority:** HIGH  
**Type:** E2E

**Test Steps:**
1. Navigate to /login
2. Enter valid email/password
3. Submit form
4. Verify redirect to /
5. Check browser cookies for pluma_session
6. Verify cookie attributes

**Expected Results:**
- [ ] Step 4: Redirected to / (home page)
- [ ] Step 5: Cookie pluma_session present
- [ ] Step 6: Cookie has httpOnly=true, secure=true, sameSite=lax

#### 1.3 Login Flow - Invalid Credentials
**Priority:** HIGH  
**Type:** E2E

**Test Steps:**
1. Navigate to /login
2. Enter invalid email/password
3. Submit form
4. Check for error message
5. Verify no cookie set

**Expected Results:**
- [ ] Step 4: Error message displayed
- [ ] Step 5: No pluma_session cookie present

#### 1.4 Session Invalidation on Login
**Priority:** MEDIUM  
**Type:** API Test

**Test Steps:**
1. Login successfully (session A created)
2. Note session token A
3. Login again with same credentials (session B created)
4. Verify session A is deleted from database
5. Attempt to use session A token
6. Verify 401 Unauthorized

**Expected Results:**
- [ ] Step 4: Old session deleted
- [ ] Step 6: Old session token rejected

---

### 2. Middleware Protection

#### 2.1 Protected Route Access Without Auth
**Priority:** HIGH  
**Type:** E2E

**Test Steps:**
1. Clear all cookies
2. Navigate to / (protected route)
3. Verify redirect to /login
4. Try navigating to /projects (any protected route)
5. Verify redirect to /login

**Expected Results:**
- [ ] Step 3: Redirected to /login
- [ ] Step 5: Redirected to /login

#### 2.2 Public Path Accessibility
**Priority:** HIGH  
**Type:** E2E

**Test Steps:**
1. Clear all cookies
2. Navigate to /login
3. Verify no redirect (page loads)
4. Navigate to /register
5. Verify no redirect (page loads)

**Expected Results:**
- [ ] Step 3: Login page loads without redirect
- [ ] Step 5: Register page loads without redirect

#### 2.3 Static Asset Accessibility
**Priority:** HIGH  
**Type:** E2E / Network

**Test Steps:**
1. Clear all cookies
2. Request /_next/static/... resource
3. Verify 200 OK response (no redirect)
4. Request /api/v1/auth/setup
5. Verify 200 OK response (no redirect)
6. Request /favicon.ico
7. Verify 200 OK response (no redirect)

**Expected Results:**
- [ ] Step 3: Static asset served without authentication
- [ ] Step 5: Setup endpoint accessible without auth
- [ ] Step 7: Favicon served without authentication

---

### 3. API Integration

#### 3.1 GET /api/v1/auth/setup
**Priority:** HIGH  
**Type:** API Test

**Test Steps:**
1. Clean database (no users)
2. GET /api/v1/auth/setup
3. Verify response { configured: false }
4. Create a user
5. GET /api/v1/auth/setup
6. Verify response { configured: true }

**Expected Results:**
- [ ] Step 3: Returns { configured: false }
- [ ] Step 6: Returns { configured: true }

#### 3.2 POST /api/v1/auth/register
**Priority:** HIGH  
**Type:** API Test

**Test Steps:**
1. POST /api/v1/auth/register with valid data
2. Verify 201 Created
3. Verify user in database
4. POST /api/v1/auth/register again
5. Verify 409 Conflict

**Expected Results:**
- [ ] Step 2: 201 Created with user data
- [ ] Step 3: User exists in database
- [ ] Step 5: 409 Conflict (no second user)

#### 3.3 POST /api/v1/auth/login
**Priority:** HIGH  
**Type:** API Test

**Test Steps:**
1. Create test user
2. POST /api/v1/auth/login with valid credentials
3. Verify 200 OK
4. Verify Set-Cookie header present
5. POST /api/v1/auth/login with invalid credentials
6. Verify 401 Unauthorized
7. Verify no Set-Cookie header

**Expected Results:**
- [ ] Step 3: 200 OK with user data
- [ ] Step 4: Set-Cookie header with pluma_session
- [ ] Step 6: 401 Unauthorized
- [ ] Step 7: No cookie set

#### 3.4 GET /api/v1/auth/me
**Priority:** MEDIUM  
**Type:** API Test

**Test Steps:**
1. Login to get session cookie
2. GET /api/v1/auth/me with cookie
3. Verify 200 OK with user data
4. GET /api/v1/auth/me without cookie
5. Verify 401 Unauthorized

**Expected Results:**
- [ ] Step 3: Returns current user
- [ ] Step 5: Returns 401

#### 3.5 POST /api/v1/auth/logout
**Priority:** MEDIUM  
**Type:** API Test

**Test Steps:**
1. Login to get session cookie
2. POST /api/v1/auth/logout with cookie
3. Verify 204 No Content
4. Verify session deleted from database
5. Verify Set-Cookie header clears cookie
6. GET /api/v1/auth/me with old cookie
7. Verify 401 Unauthorized

**Expected Results:**
- [ ] Step 3: 204 No Content
- [ ] Step 4: Session deleted
- [ ] Step 5: Cookie cleared
- [ ] Step 7: Old cookie rejected

---

### 4. Proxy Configuration

#### 4.1 API Proxy Rewrite
**Priority:** HIGH  
**Type:** Integration

**Test Steps:**
1. From Next.js app, fetch /api/v1/auth/setup
2. Verify request proxied to localhost:4000
3. Verify response returned correctly

**Expected Results:**
- [ ] Step 2: Request hits API server on port 4000
- [ ] Step 3: Response matches API response

#### 4.2 SDK Proxy Rewrite
**Priority:** MEDIUM  
**Type:** Integration

**Test Steps:**
1. From Next.js app, fetch /sdk/v1/evaluate (when implemented)
2. Verify request proxied to localhost:4000
3. Verify response returned correctly

**Expected Results:**
- [ ] Step 2: Request hits API server on port 4000
- [ ] Step 3: Response matches API response

---

### 5. Accessibility

#### 5.1 Keyboard Navigation - Login Page
**Priority:** MEDIUM  
**Type:** Manual / A11y Tool

**Test Steps:**
1. Navigate to /login
2. Tab through form elements
3. Verify focus order: email → password → submit
4. Verify focus indicators visible
5. Submit form with Enter key

**Expected Results:**
- [ ] Step 3: Logical tab order
- [ ] Step 4: Clear focus indicators
- [ ] Step 5: Form submits on Enter

#### 5.2 Form Labels - Login & Register
**Priority:** MEDIUM  
**Type:** Automated A11y

**Test Steps:**
1. Run axe-core on /login
2. Verify no violations
3. Check email input has associated label
4. Check password input has associated label
5. Run axe-core on /register
6. Verify no violations

**Expected Results:**
- [ ] Step 2: Zero a11y violations
- [ ] Step 3: Email has label with for="email"
- [ ] Step 4: Password has label with for="password"
- [ ] Step 6: Zero a11y violations

#### 5.3 404 Page Accessibility
**Priority:** LOW  
**Type:** Automated A11y

**Test Steps:**
1. Navigate to /nonexistent-page
2. Run axe-core
3. Verify no violations
4. Verify heading hierarchy (h1, h2)
5. Verify link is keyboard accessible

**Expected Results:**
- [ ] Step 2: Zero a11y violations
- [ ] Step 4: Proper heading structure
- [ ] Step 5: Link is tabbable and clickable

---

### 6. Security

#### 6.1 Cookie Security Attributes
**Priority:** HIGH  
**Type:** Security Test

**Test Steps:**
1. Login successfully
2. Inspect pluma_session cookie
3. Verify httpOnly flag is true
4. Verify secure flag is true
5. Verify sameSite is lax or strict

**Expected Results:**
- [ ] Step 3: httpOnly=true (not accessible via JavaScript)
- [ ] Step 4: secure=true (HTTPS only)
- [ ] Step 5: sameSite=lax (CSRF protection)

#### 6.2 SQL Injection Prevention
**Priority:** HIGH  
**Type:** Security Test

**Test Steps:**
1. Attempt login with email: `' OR '1'='1`
2. Verify 400 Bad Request (Zod validation)
3. Attempt login with email: `admin@example.com'; DROP TABLE users;--`
4. Verify 400 Bad Request or 401 Unauthorized
5. Verify users table still exists

**Expected Results:**
- [ ] Step 2: Invalid email rejected by Zod
- [ ] Step 4: Attack rejected
- [ ] Step 5: No SQL injection occurred

#### 6.3 Timing Attack Prevention
**Priority:** MEDIUM  
**Type:** Security Test

**Test Steps:**
1. Measure response time for login with non-existent email
2. Measure response time for login with existing email + wrong password
3. Compare response times
4. Verify times are similar (within 100ms)

**Expected Results:**
- [ ] Step 4: Response times similar (bcrypt always runs)

#### 6.4 Session Fixation Prevention
**Priority:** HIGH  
**Type:** Security Test

**Test Steps:**
1. Attacker creates session (login as attacker)
2. Note attacker's session token
3. Victim logs in
4. Verify victim gets new session token
5. Verify attacker's old token is invalidated

**Expected Results:**
- [ ] Step 4: New session created for victim
- [ ] Step 5: Old sessions deleted on login

---

## Automation Strategy

### Unit Tests (Vitest)
- Zod schema validation
- Helper functions (isPublicPath)
- Cookie parsing logic

### API Tests (Supertest / Vitest)
- All auth endpoints (setup, register, login, logout, me)
- Status codes, response schemas
- Cookie headers
- Error cases

### E2E Tests (Playwright)
- Login flow
- Register flow
- Protected route access
- Redirect logic
- 404 page

### Accessibility Tests (axe-core)
- Login page
- Register page
- 404 page

---

## Exit Criteria

- [ ] All HIGH priority tests pass
- [ ] 90%+ MEDIUM priority tests pass
- [ ] Zero critical security vulnerabilities
- [ ] Zero critical accessibility violations (WCAG 2.1 Level A)
- [ ] ESLint passes for all new code
- [ ] TypeScript compiles without errors

---

## Test Execution Instructions

### Setup
```bash
# Install dependencies
pnpm install

# Start database
docker compose up -d postgres

# Apply migrations
pnpm --filter @pluma/db db:migrate
```

### Run Tests
```bash
# API tests
pnpm --filter @pluma/api test

# E2E tests (when implemented)
pnpm --filter @pluma/app test:e2e

# Accessibility tests (when implemented)
pnpm --filter @pluma/app test:a11y
```

### Manual Testing
```bash
# Terminal 1: Start API
pnpm --filter @pluma/api dev

# Terminal 2: Start App
pnpm --filter @pluma/app dev

# Browser: http://localhost:3000
```

---

## Notes

- This test plan focuses on business logic validation, not UI appearance
- Storybook stories exist for visual regression testing
- Security tests should be run against HTTPS in staging/production
- Accessibility tests should be supplemented with manual testing using screen readers
