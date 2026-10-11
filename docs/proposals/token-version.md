# Token Version Claim

## Proposal

Add a `tokenVersion` integer claim to JWTs. Increment this value on logout and password change. On every authenticated request, verify that the token's `tokenVersion` matches the user's current `User.tokenVersion` in the database. This enables immediate token invalidation without waiting for expiry.

## Implementation

### Database Schema

Add to `User` model in Prisma schema:

```prisma
model User {
  // ... existing fields ...
  tokenVersion: Int @default(0)
}
```

Run migration: `npx prisma migrate dev --name add_token_version`

### JWT Payload

Update `server/src/lib/token.ts` to include `tokenVersion` in the signed payload:

```typescript
interface TokenPayload {
  studentId: string;
  tokenVersion: number;
  iat?: number;
  exp?: number;
}

export function signToken(studentId: string, tokenVersion: number): string {
  const payload: Omit<TokenPayload, 'iat' | 'exp'> = { studentId, tokenVersion };
  return jwt.sign(payload, config.jwtSecret, { expiresIn: EXPIRY_SECONDS });
}
```

### Authenticated Requests

Update `server/src/middleware/auth.ts` requireAuth to verify token version:

```typescript
const payload = verifyToken(token);
if (payload) {
  const user = await prisma.user.findUnique({ where: { id: payload.studentId } });
  if (!user || user.tokenVersion !== payload.tokenVersion) {
    res.status(401).json({ message: 'Token invalidated' });
    return;
  }
  (req as AuthenticatedRequest).studentId = payload.studentId;
  next();
  return;
}
```

### Logout

Update POST /auth/logout to increment `tokenVersion`:

```typescript
await prisma.user.update({
  where: { id: studentId },
  data: { tokenVersion: { increment: 1 } },
});
```

### Password Change

When user changes password, increment `tokenVersion` to invalidate all existing tokens.

## Per-Request Cost

Each authenticated request requires one database query (already made to fetch user data, so no additional cost if token version check is combined with user fetch).

## Effect on Existing Tokens

Tokens issued before this change have no `tokenVersion` claim. Treat missing `tokenVersion` as `0`. Tokens continue to work; existing users are not logged out by deployment.

## Test Plan

- Verify that changing password increments tokenVersion and invalidates old tokens
- Verify that logout increments tokenVersion
- Verify that tokens with mismatched versions return 401
- Verify that tokens issued before the change (no tokenVersion claim) still authenticate
