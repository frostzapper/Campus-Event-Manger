# Security Notes

## localStorage Token Storage (XSS Risk)

Campus Event Finder stores JWTs in `localStorage`. This approach is vulnerable to Cross-Site Scripting (XSS) attacks: if an attacker can inject JavaScript into the page, they can steal the token from localStorage and use it to impersonate the user.

### Alternative: httpOnly Cookies

A more secure approach would be to store JWTs in httpOnly cookies (inaccessible to JavaScript). This mitigates XSS token theft because malicious JavaScript cannot read httpOnly cookies.

Trade-off: httpOnly cookies are sent automatically with every HTTP request (including cross-origin if not protected by SameSite), but cannot be accessed by client-side code. This requires CSRF protection if the API is hosted on a different domain than the frontend.

### Mitigation for Current Approach

To reduce XSS risk with localStorage:

1. Use Content Security Policy (CSP) headers to restrict script sources
2. Implement Subresource Integrity (SRI) for third-party scripts
3. Regularly audit and minimize third-party dependencies
4. Implement token rotation and short expiry times
5. Validate and sanitize all user inputs to prevent injection

### Recommendation for Phase 4+

Consider migrating to httpOnly cookies + CSRF tokens (double-submit cookie or synchronized token pattern) in a future phase when frontend and backend authentication architecture can be redesigned together.
