import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import * as fc from 'fast-check';
import { SessionPostForm } from './SessionPostForm';
import type { SessionPost } from '@campus-event-finder/shared';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makePost(overrides: Partial<SessionPost> = {}): SessionPost {
  return {
    id: 'post-1',
    creatorId: 'student-1',
    sport: 'Basketball',
    participantsNeeded: 3,
    skillLevel: 'Intermediate',
    scheduledAt: '2099-07-10T15:00',
    description: 'Looking for players for a casual game.',
    isActive: true,
    ...overrides,
  };
}

const defaultProps = {
  onSuccess: jest.fn(),
  onCancel: jest.fn(),
  authToken: 'test-token',
};

// ---------------------------------------------------------------------------
// Unit Tests
// ---------------------------------------------------------------------------

describe('SessionPostForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // -------------------------------------------------------------------------
  // Requirement 7.2: Required fields
  // -------------------------------------------------------------------------

  describe('form fields (requirement 7.2)', () => {
    it('renders sport field', () => {
      render(<SessionPostForm {...defaultProps} />);
      expect(screen.getByLabelText(/sport/i)).toBeInTheDocument();
    });

    it('renders participantsNeeded field', () => {
      render(<SessionPostForm {...defaultProps} />);
      expect(screen.getByLabelText(/participants needed/i)).toBeInTheDocument();
    });

    it('renders skillLevel field (optional)', () => {
      render(<SessionPostForm {...defaultProps} />);
      expect(screen.getByLabelText(/skill level/i)).toBeInTheDocument();
    });

    it('renders scheduledAt field', () => {
      render(<SessionPostForm {...defaultProps} />);
      expect(screen.getByLabelText(/scheduled date and time/i)).toBeInTheDocument();
    });

    it('renders description field', () => {
      render(<SessionPostForm {...defaultProps} />);
      expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
    });

    it('renders Create post button in create mode', () => {
      render(<SessionPostForm {...defaultProps} />);
      expect(screen.getByRole('button', { name: /create post/i })).toBeInTheDocument();
    });

    it('renders Cancel button', () => {
      render(<SessionPostForm {...defaultProps} />);
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Requirement 7.4: Validation errors shown without publishing
  // -------------------------------------------------------------------------

  describe('validation (requirement 7.4)', () => {
    it('shows error when sport is missing', async () => {
      render(<SessionPostForm {...defaultProps} />);
      fireEvent.click(screen.getByRole('button', { name: /create post/i }));
      await waitFor(() => {
        expect(screen.getByText(/sport name is required/i)).toBeInTheDocument();
      });
      expect(defaultProps.onSuccess).not.toHaveBeenCalled();
    });

    it('shows error when participantsNeeded is missing', async () => {
      render(<SessionPostForm {...defaultProps} />);
      fireEvent.change(screen.getByLabelText(/sport/i), { target: { value: 'Tennis' } });
      fireEvent.click(screen.getByRole('button', { name: /create post/i }));
      await waitFor(() => {
        expect(screen.getByText(/at least 1 participant is required/i)).toBeInTheDocument();
      });
      expect(defaultProps.onSuccess).not.toHaveBeenCalled();
    });

    it('shows error when participantsNeeded is 0', async () => {
      render(<SessionPostForm {...defaultProps} />);
      fireEvent.change(screen.getByLabelText(/sport/i), { target: { value: 'Tennis' } });
      fireEvent.change(screen.getByLabelText(/participants needed/i), { target: { value: '0' } });
      fireEvent.click(screen.getByRole('button', { name: /create post/i }));
      await waitFor(() => {
        expect(screen.getByText(/at least 1 participant is required/i)).toBeInTheDocument();
      });
      expect(defaultProps.onSuccess).not.toHaveBeenCalled();
    });

    it('shows error when scheduledAt is missing', async () => {
      render(<SessionPostForm {...defaultProps} />);
      fireEvent.change(screen.getByLabelText(/sport/i), { target: { value: 'Tennis' } });
      fireEvent.change(screen.getByLabelText(/participants needed/i), { target: { value: '2' } });
      fireEvent.click(screen.getByRole('button', { name: /create post/i }));
      await waitFor(() => {
        expect(screen.getByText(/scheduled date and time is required/i)).toBeInTheDocument();
      });
      expect(defaultProps.onSuccess).not.toHaveBeenCalled();
    });

    it('shows error when description is missing', async () => {
      render(<SessionPostForm {...defaultProps} />);
      fireEvent.change(screen.getByLabelText(/sport/i), { target: { value: 'Tennis' } });
      fireEvent.change(screen.getByLabelText(/participants needed/i), { target: { value: '2' } });
      fireEvent.change(screen.getByLabelText(/scheduled date and time/i), {
        target: { value: '2099-09-01T10:00' },
      });
      fireEvent.click(screen.getByRole('button', { name: /create post/i }));
      await waitFor(() => {
        expect(screen.getByText(/description is required/i)).toBeInTheDocument();
      });
      expect(defaultProps.onSuccess).not.toHaveBeenCalled();
    });

    it('does not call fetch when validation fails', async () => {
      render(<SessionPostForm {...defaultProps} />);
      fireEvent.click(screen.getByRole('button', { name: /create post/i }));
      await waitFor(() => {
        expect(screen.getByText(/sport name is required/i)).toBeInTheDocument();
      });
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('skillLevel is optional — no error when skillLevel is empty', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'new-post', creatorId: 'student-1', isActive: true }),
      });

      render(<SessionPostForm {...defaultProps} />);
      fireEvent.change(screen.getByLabelText(/sport/i), { target: { value: 'Tennis' } });
      fireEvent.change(screen.getByLabelText(/participants needed/i), { target: { value: '2' } });
      // skillLevel left empty
      fireEvent.change(screen.getByLabelText(/scheduled date and time/i), {
        target: { value: '2099-09-01T10:00' },
      });
      fireEvent.change(screen.getByLabelText(/description/i), {
        target: { value: 'Casual game' },
      });
      fireEvent.click(screen.getByRole('button', { name: /create post/i }));

      await waitFor(() => {
        expect(defaultProps.onSuccess).toHaveBeenCalledTimes(1);
      });
    });
  });

  // -------------------------------------------------------------------------
  // Requirement 7.3, 7.5: POST /sessions on success, call onSuccess
  // -------------------------------------------------------------------------

  describe('successful submission (requirements 7.3, 7.5)', () => {
    it('calls POST /sessions with correct data and invokes onSuccess', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'new-post', creatorId: 'student-1', isActive: true }),
      });

      render(<SessionPostForm {...defaultProps} />);
      fireEvent.change(screen.getByLabelText(/sport/i), { target: { value: 'Basketball' } });
      fireEvent.change(screen.getByLabelText(/participants needed/i), { target: { value: '3' } });
      fireEvent.change(screen.getByLabelText(/skill level/i), { target: { value: 'Beginner' } });
      fireEvent.change(screen.getByLabelText(/scheduled date and time/i), {
        target: { value: '2099-08-15T14:00' },
      });
      fireEvent.change(screen.getByLabelText(/description/i), {
        target: { value: 'Pickup game at the gym' },
      });
      fireEvent.click(screen.getByRole('button', { name: /create post/i }));

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/sessions'),
          expect.objectContaining({
            method: 'POST',
            headers: expect.objectContaining({
              'Content-Type': 'application/json',
              Authorization: 'Bearer test-token',
            }),
            body: JSON.stringify({
              sport: 'Basketball',
              participantsNeeded: 3,
              skillLevel: 'Beginner',
              scheduledAt: '2099-08-15T14:00',
              description: 'Pickup game at the gym',
            }),
          })
        );
        expect(defaultProps.onSuccess).toHaveBeenCalledTimes(1);
      });
    });

    it('calls onCancel when Cancel button is clicked', () => {
      render(<SessionPostForm {...defaultProps} />);
      fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
      expect(defaultProps.onCancel).toHaveBeenCalledTimes(1);
    });
  });

  // -------------------------------------------------------------------------
  // Error handling
  // -------------------------------------------------------------------------

  describe('API error handling', () => {
    it('shows error message when API returns 401', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 401,
      });

      render(<SessionPostForm {...defaultProps} />);
      fireEvent.change(screen.getByLabelText(/sport/i), { target: { value: 'Tennis' } });
      fireEvent.change(screen.getByLabelText(/participants needed/i), { target: { value: '2' } });
      fireEvent.change(screen.getByLabelText(/scheduled date and time/i), {
        target: { value: '2099-09-01T10:00' },
      });
      fireEvent.change(screen.getByLabelText(/description/i), {
        target: { value: 'Casual game' },
      });
      fireEvent.click(screen.getByRole('button', { name: /create post/i }));

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent(/logged in/i);
      });
      expect(defaultProps.onSuccess).not.toHaveBeenCalled();
    });

    it('shows error message when API returns non-ok status', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      render(<SessionPostForm {...defaultProps} />);
      fireEvent.change(screen.getByLabelText(/sport/i), { target: { value: 'Tennis' } });
      fireEvent.change(screen.getByLabelText(/participants needed/i), { target: { value: '2' } });
      fireEvent.change(screen.getByLabelText(/scheduled date and time/i), {
        target: { value: '2099-09-01T10:00' },
      });
      fireEvent.change(screen.getByLabelText(/description/i), {
        target: { value: 'Casual game' },
      });
      fireEvent.click(screen.getByRole('button', { name: /create post/i }));

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent(/failed to save session post/i);
      });
      expect(defaultProps.onSuccess).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // Edit mode (requirement 8.4): pre-populate fields
  // -------------------------------------------------------------------------

  describe('edit mode (requirement 8.4)', () => {
    it('pre-populates all fields with existing post data', () => {
      const post = makePost();
      render(<SessionPostForm {...defaultProps} existingPost={post} />);

      expect(screen.getByLabelText(/sport/i)).toHaveValue('Basketball');
      expect(screen.getByLabelText(/participants needed/i)).toHaveValue(3);
      expect(screen.getByLabelText(/skill level/i)).toHaveValue('Intermediate');
      expect(screen.getByLabelText(/scheduled date and time/i)).toHaveValue('2099-07-10T15:00');
      expect(screen.getByLabelText(/description/i)).toHaveValue(
        'Looking for players for a casual game.'
      );
    });

    it('renders Save changes button in edit mode', () => {
      render(<SessionPostForm {...defaultProps} existingPost={makePost()} />);
      expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument();
    });

    it('calls PUT /sessions/:id on save in edit mode', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'post-1', creatorId: 'student-1', isActive: true }),
      });

      const post = makePost();
      render(<SessionPostForm {...defaultProps} existingPost={post} />);

      fireEvent.change(screen.getByLabelText(/sport/i), { target: { value: 'Soccer' } });
      fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/sessions/post-1'),
          expect.objectContaining({ method: 'PUT' })
        );
        expect(defaultProps.onSuccess).toHaveBeenCalledTimes(1);
      });
    });
  });
});

// ---------------------------------------------------------------------------
// Property-Based Tests
// ---------------------------------------------------------------------------

// Feature: campus-event-finder, Property 16: Session post edit round-trip
describe('Property 16: Session post edit round-trip (requirement 8.2)', () => {
  /**
   * Validates: Requirements 8.2
   *
   * For any session post and any valid set of edits applied to it, submitting
   * the form in edit mode should call PUT /sessions/:id with the updated field
   * values, reflecting the changes in the Sports_Tab list after the edit is saved.
   */
  it('calls PUT /sessions/:id with updated field values for any valid edit', async () => {
    // Feature: campus-event-finder, Property 16: Session post edit round-trip
    // Arbitrary generator for non-empty trimmed strings
    const nonEmptyString = fc
      .string({ minLength: 1, maxLength: 80 })
      .filter((s) => s.trim().length > 0 && s === s.trim());

    // datetime-local values must match the pattern YYYY-MM-DDTHH:MM
    const datetimeLocal = fc
      .tuple(
        fc.integer({ min: 2025, max: 2099 }),
        fc.integer({ min: 1, max: 12 }),
        fc.integer({ min: 1, max: 28 }),
        fc.integer({ min: 0, max: 23 }),
        fc.integer({ min: 0, max: 59 })
      )
      .map(([year, month, day, hour, minute]) => {
        const pad = (n: number): string => String(n).padStart(2, '0');
        return `${year}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(minute)}`;
      });

    const sessionPostArb = fc.record<SessionPost>({
      id: fc.uuid(),
      creatorId: fc.uuid(),
      sport: nonEmptyString,
      participantsNeeded: fc.integer({ min: 1, max: 100 }),
      skillLevel: fc.string({ maxLength: 40 }),
      scheduledAt: datetimeLocal,
      description: nonEmptyString,
      isActive: fc.boolean(),
    });

    // Generator for a valid set of edits (all required fields must remain valid)
    const editsArb = fc.record({
      sport: nonEmptyString,
      participantsNeeded: fc.integer({ min: 1, max: 100 }),
      skillLevel: fc.string({ maxLength: 40 }),
      scheduledAt: datetimeLocal,
      description: nonEmptyString,
    });

    await fc.assert(
      fc.asyncProperty(sessionPostArb, editsArb, async (post, edits) => {
        const mockFetch = jest.fn().mockResolvedValueOnce({
          ok: true,
          json: async () => ({ ...post, ...edits }),
        });
        global.fetch = mockFetch;

        const onSuccess = jest.fn();
        const { unmount } = render(
          <SessionPostForm
            existingPost={post}
            onSuccess={onSuccess}
            onCancel={jest.fn()}
            authToken="test-token"
          />
        );

        // Apply edits to each field
        fireEvent.change(screen.getByLabelText(/sport/i), {
          target: { value: edits.sport },
        });
        fireEvent.change(screen.getByLabelText(/participants needed/i), {
          target: { value: String(edits.participantsNeeded) },
        });
        fireEvent.change(screen.getByLabelText(/skill level/i), {
          target: { value: edits.skillLevel },
        });
        fireEvent.change(screen.getByLabelText(/scheduled date and time/i), {
          target: { value: edits.scheduledAt },
        });
        fireEvent.change(screen.getByLabelText(/description/i), {
          target: { value: edits.description },
        });

        fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

        await waitFor(() => {
          expect(mockFetch).toHaveBeenCalledWith(
            expect.stringContaining(`/sessions/${post.id}`),
            expect.objectContaining({
              method: 'PUT',
              headers: expect.objectContaining({
                'Content-Type': 'application/json',
                Authorization: 'Bearer test-token',
              }),
              body: JSON.stringify({
                sport: edits.sport.trim(),
                participantsNeeded: edits.participantsNeeded,
                skillLevel: edits.skillLevel.trim(),
                scheduledAt: edits.scheduledAt.trim(),
                description: edits.description.trim(),
              }),
            })
          );
          expect(onSuccess).toHaveBeenCalledTimes(1);
        });

        unmount();
      }),
      { numRuns: 100 }
    );
  }, 30000);
});
describe('Property 18: Edit form pre-population (requirement 8.4)', () => {
  /**
   * Validates: Requirements 8.4
   *
   * For any session post with existing field values, opening the edit form
   * should pre-populate every field with the post's current data.
   */
  it('pre-populates every field with the existing post data for any valid post', () => {
    // Arbitrary generator for non-empty trimmed strings (no leading/trailing whitespace
    // so the component's .trim() round-trip is transparent).
    const nonEmptyString = fc
      .string({ minLength: 1, maxLength: 80 })
      .filter((s) => s.trim().length > 0 && s === s.trim());

    // datetime-local values must match the pattern YYYY-MM-DDTHH:MM
    const datetimeLocal = fc
      .tuple(
        fc.integer({ min: 2025, max: 2099 }),
        fc.integer({ min: 1, max: 12 }),
        fc.integer({ min: 1, max: 28 }),
        fc.integer({ min: 0, max: 23 }),
        fc.integer({ min: 0, max: 59 })
      )
      .map(([year, month, day, hour, minute]) => {
        const pad = (n: number): string => String(n).padStart(2, '0');
        return `${year}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(minute)}`;
      });

    const sessionPostArb = fc.record<SessionPost>({
      id: fc.uuid(),
      creatorId: fc.uuid(),
      sport: nonEmptyString,
      participantsNeeded: fc.integer({ min: 1, max: 100 }),
      skillLevel: fc.string({ maxLength: 40 }),
      scheduledAt: datetimeLocal,
      description: nonEmptyString,
      isActive: fc.boolean(),
    });

    fc.assert(
      fc.property(sessionPostArb, (post) => {
        const { unmount } = render(
          <SessionPostForm
            existingPost={post}
            onSuccess={jest.fn()}
            onCancel={jest.fn()}
            authToken="test-token"
          />
        );

        // Sport field
        expect(screen.getByLabelText(/sport/i)).toHaveValue(post.sport);

        // Participants needed (numeric input)
        expect(screen.getByLabelText(/participants needed/i)).toHaveValue(post.participantsNeeded);

        // Skill level
        expect(screen.getByLabelText(/skill level/i)).toHaveValue(post.skillLevel);

        // Scheduled date and time
        expect(screen.getByLabelText(/scheduled date and time/i)).toHaveValue(post.scheduledAt);

        // Description
        expect(screen.getByLabelText(/description/i)).toHaveValue(post.description);

        unmount();
      }),
      { numRuns: 100 }
    );
  }, 30000);
});
