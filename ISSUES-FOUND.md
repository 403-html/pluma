# Issues Found - Frontend Auth Validation

## Blocking Issue (Must Fix Before Merge)

### 1. ESLint Error: Unused Import in Test File

**File:** `apps/api/src/tests/flagConfigs.test.ts`  
**Line:** 5  
**Severity:** ERROR (blocking)  
**Impact:** Prevents `pnpm --filter @pluma/api lint` from passing

**Current Code:**
```typescript
import {
  PROJECT_ID, OTHER_PROJECT_ID, ENV_ID, FLAG_ID, AUTH_COOKIE,
  mockSession, mockEnvironment, mockFlag, mockFlagConfig,
} from './fixtures';
```

**Fix:**
```typescript
import {
  OTHER_PROJECT_ID, ENV_ID, FLAG_ID, AUTH_COOKIE,
  mockSession, mockEnvironment, mockFlag, mockFlagConfig,
} from './fixtures';
```

**Rationale:** `PROJECT_ID` is imported but never used in the test file, causing a TypeScript ESLint error.

---

## Non-Blocking Warnings (Optional Fixes)

### 2. Console Statement Warning

**File:** `apps/api/src/index.ts`  
**Line:** 12  
**Severity:** WARNING (non-blocking)  
**Impact:** ESLint warning, does not prevent build

**Issue:** Unexpected console statement (ESLint rule allows only `console.warn` and `console.error`)

**Options:**
1. Change to `console.error()` if it's an error message
2. Remove if not needed
3. Add ESLint ignore comment if intentional for development

### 3. Unused ESLint Directive

**File:** `apps/api/src/routes/admin/flags.ts`  
**Line:** 124  
**Severity:** WARNING (non-blocking)  
**Impact:** ESLint warning, clutters code

**Issue:** ESLint directive `// eslint-disable-next-line no-await-in-loop` is present but the rule is not being violated

**Fix:** Remove the unnecessary directive

---

## Validation Results Summary

### Passing (12/13)
- ✅ App ESLint
- ✅ App TypeScript
- ✅ API TypeScript
- ✅ File structure
- ✅ Middleware implementation
- ✅ Next.js config
- ✅ API routes
- ✅ Environment variables
- ✅ Storybook stories
- ✅ Login page
- ✅ Register page
- ✅ 404 page

### Failing (1/13)
- ❌ API ESLint (issue #1 above)

---

## Action Items

**Priority 1 (Required):**
- [ ] Fix unused `PROJECT_ID` import in `apps/api/src/tests/flagConfigs.test.ts:5`
- [ ] Re-run `pnpm --filter @pluma/api lint` to verify fix

**Priority 2 (Recommended):**
- [ ] Address console statement warning in `apps/api/src/index.ts:12`
- [ ] Remove unused ESLint directive in `apps/api/src/routes/admin/flags.ts:124`

**Priority 3 (Follow-up):**
- [ ] Implement E2E tests from test-plan.md
- [ ] Implement accessibility tests from test-plan.md
- [ ] Add API tests for auth endpoints

---

## Verification Steps

After applying fixes:

```bash
# 1. Verify API linting passes
pnpm --filter @pluma/api lint

# 2. Verify TypeScript still compiles
pnpm --filter @pluma/api tsc --noEmit

# 3. Run existing tests
pnpm --filter @pluma/api test

# 4. Verify app linting still passes
pnpm --filter @pluma/app lint

# 5. Verify app TypeScript still compiles
pnpm --filter @pluma/app tsc --noEmit
```

All commands above should exit with code 0.
