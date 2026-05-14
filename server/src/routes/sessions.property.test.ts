/**
 * Property-based tests previously mutated the in-memory `sessionsStore`.
 * They are disabled until reimplemented against Prisma + a transactional test harness.
 */
describe.skip('Property tests (pending Prisma harness)', () => {
  it('placeholder', () => {
    expect(true).toBe(true);
  });
});
