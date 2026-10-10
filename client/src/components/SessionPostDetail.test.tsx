import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SessionPostDetail } from './SessionPostDetail';
import type { SessionPost, Student } from '@campus-event-finder/shared';
import * as fc from 'fast-check';

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
    scheduledAt: '2099-07-10T15:00:00Z',
    description: 'Looking for players for a casual game.',
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

function makeStudent(overrides: Partial<Student> = {}): Student {
  return {
    id: 'student-1',
    email: 'student@campus.edu',
    displayName: 'Test Student',
    passwordHash: 'hashed',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Unit Tests
// ---------------------------------------------------------------------------

describe('SessionPostDetail', () => {
  describe('required fields (requirement 8.1)', () => {
    it('renders the sport name', () => {
      render(
        <SessionPostDetail
          post={makePost({ sport: 'Tennis' })}
          currentStudent={null}
          authToken="token"
          onEdit={jest.fn()}
          onDelete={jest.fn()}
        />
      );
      expect(screen.getByRole('heading', { name: /Tennis/i })).toBeInTheDocument();
    });

    it('renders participants needed', () => {
      render(
        <SessionPostDetail
          post={makePost({ participantsNeeded: 4 })}
          currentStudent={null}
          authToken="token"
          onEdit={jest.fn()}
          onDelete={jest.fn()}
        />
      );
      expect(screen.getByText(/Participants needed:.*4/)).toBeInTheDocument();
    });

    it('renders skill level', () => {
      render(
        <SessionPostDetail
          post={makePost({ skillLevel: 'Beginner' })}
          currentStudent={null}
          authToken="token"
          onEdit={jest.fn()}
          onDelete={jest.fn()}
        />
      );
      expect(screen.getByText(/Skill level:.*Beginner/)).toBeInTheDocument();
    });

    it('renders scheduledAt', () => {
      render(
        <SessionPostDetail
          post={makePost({ scheduledAt: '2099-08-01T10:00:00Z' })}
          currentStudent={null}
          authToken="token"
          onEdit={jest.fn()}
          onDelete={jest.fn()}
        />
      );
      expect(screen.getByText(/2099-08-01T10:00:00Z/)).toBeInTheDocument();
    });

    it('renders description', () => {
      render(
        <SessionPostDetail
          post={makePost({ description: 'Casual pickup game at the gym.' })}
          currentStudent={null}
          authToken="token"
          onEdit={jest.fn()}
          onDelete={jest.fn()}
        />
      );
      expect(screen.getByText(/Casual pickup game at the gym\./)).toBeInTheDocument();
    });
  });

  describe('edit/delete visibility (requirement 8.1)', () => {
    it('shows edit and delete buttons when currentStudent is the creator', () => {
      const student = makeStudent({ id: 'owner-1' });
      const post = makePost({ creatorId: 'owner-1' });
      render(
        <SessionPostDetail
          post={post}
          currentStudent={student}
          authToken="token"
          onEdit={jest.fn()}
          onDelete={jest.fn()}
        />
      );
      expect(screen.getByRole('button', { name: /edit post/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /delete post/i })).toBeInTheDocument();
    });

    it('hides edit and delete buttons when currentStudent is null', () => {
      render(
        <SessionPostDetail
          post={makePost()}
          currentStudent={null}
          authToken="token"
          onEdit={jest.fn()}
          onDelete={jest.fn()}
        />
      );
      expect(screen.queryByRole('button', { name: /edit post/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /delete post/i })).not.toBeInTheDocument();
    });

    it('hides edit and delete buttons when currentStudent is a different student', () => {
      const student = makeStudent({ id: 'other-student' });
      const post = makePost({ creatorId: 'owner-1' });
      render(
        <SessionPostDetail
          post={post}
          currentStudent={student}
          authToken="token"
          onEdit={jest.fn()}
          onDelete={jest.fn()}
        />
      );
      expect(screen.queryByRole('button', { name: /edit post/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /delete post/i })).not.toBeInTheDocument();
    });

    it('calls onEdit when edit button is clicked', () => {
      const onEdit = jest.fn();
      const student = makeStudent({ id: 'owner-1' });
      const post = makePost({ creatorId: 'owner-1' });
      render(
        <SessionPostDetail
          post={post}
          currentStudent={student}
          authToken="token"
          onEdit={onEdit}
          onDelete={jest.fn()}
        />
      );
      fireEvent.click(screen.getByRole('button', { name: /edit post/i }));
      expect(onEdit).toHaveBeenCalledTimes(1);
    });
  });

  // ---------------------------------------------------------------------------
  // Delete action wired to DELETE /sessions/:id (requirement 8.3)
  // ---------------------------------------------------------------------------

  describe('delete action (requirement 8.3)', () => {
    beforeEach(() => {
      jest.resetAllMocks();
    });

    it('calls DELETE /sessions/:id with auth token when delete button is clicked', async () => {
      const fetchMock = jest.fn().mockResolvedValue({ ok: true });
      global.fetch = fetchMock;

      const student = makeStudent({ id: 'owner-1' });
      const post = makePost({ id: 'post-42', creatorId: 'owner-1' });
      render(
        <SessionPostDetail
          post={post}
          currentStudent={student}
          authToken="my-auth-token"
          onEdit={jest.fn()}
          onDelete={jest.fn()}
        />
      );

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /delete post/i }));
      });

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/sessions/post-42'),
        expect.objectContaining({
          method: 'DELETE',
          headers: expect.objectContaining({
            Authorization: 'Bearer my-auth-token',
          }),
        })
      );
    });

    it('calls onDelete after a successful API response', async () => {
      global.fetch = jest.fn().mockResolvedValue({ ok: true });

      const onDelete = jest.fn();
      const student = makeStudent({ id: 'owner-1' });
      const post = makePost({ creatorId: 'owner-1' });
      render(
        <SessionPostDetail
          post={post}
          currentStudent={student}
          authToken="token"
          onEdit={jest.fn()}
          onDelete={onDelete}
        />
      );

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /delete post/i }));
      });

      expect(onDelete).toHaveBeenCalledTimes(1);
    });

    it('does NOT call onDelete when the API call fails', async () => {
      global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 403 });

      const onDelete = jest.fn();
      const student = makeStudent({ id: 'owner-1' });
      const post = makePost({ creatorId: 'owner-1' });
      render(
        <SessionPostDetail
          post={post}
          currentStudent={student}
          authToken="token"
          onEdit={jest.fn()}
          onDelete={onDelete}
        />
      );

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /delete post/i }));
      });

      expect(onDelete).not.toHaveBeenCalled();
    });

    it('shows an error message when the API call fails', async () => {
      global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 500 });

      const student = makeStudent({ id: 'owner-1' });
      const post = makePost({ creatorId: 'owner-1' });
      render(
        <SessionPostDetail
          post={post}
          currentStudent={student}
          authToken="token"
          onEdit={jest.fn()}
          onDelete={jest.fn()}
        />
      );

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /delete post/i }));
      });

      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('shows an error message when the network request throws', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

      const student = makeStudent({ id: 'owner-1' });
      const post = makePost({ creatorId: 'owner-1' });
      render(
        <SessionPostDetail
          post={post}
          currentStudent={student}
          authToken="token"
          onEdit={jest.fn()}
          onDelete={jest.fn()}
        />
      );

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /delete post/i }));
      });

      expect(screen.getByRole('alert')).toHaveTextContent(/Network error/i);
    });

    it('does NOT call onDelete before the API responds', async () => {
      let resolveFetch!: (value: unknown) => void;
      global.fetch = jest.fn().mockReturnValue(
        new Promise((resolve) => {
          resolveFetch = resolve;
        })
      );

      const onDelete = jest.fn();
      const student = makeStudent({ id: 'owner-1' });
      const post = makePost({ creatorId: 'owner-1' });
      render(
        <SessionPostDetail
          post={post}
          currentStudent={student}
          authToken="token"
          onEdit={jest.fn()}
          onDelete={onDelete}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: /delete post/i }));

      // onDelete should not have been called yet
      expect(onDelete).not.toHaveBeenCalled();

      // Now resolve the fetch
      await act(async () => {
        resolveFetch({ ok: true });
      });

      expect(onDelete).toHaveBeenCalledTimes(1);
    });
  });
});

// ---------------------------------------------------------------------------
// Property-Based Tests
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Property 15: Edit/delete options visible only to post owner
// Feature: campus-event-finder, Property 15: Edit/delete options visible only to post owner
// Validates: Requirements 8.1
// ---------------------------------------------------------------------------

describe('Property 15: Edit/delete options visible only to post owner (Requirements 8.1)', () => {
  /**
   * Validates: Requirements 8.1
   *
   * For any session post and any authenticated student, the edit and delete
   * options should appear if and only if the student's id matches the post's
   * creatorId.
   */

  const studentIdArb = fc.hexaString({ minLength: 4, maxLength: 12 }).map((s) => `student-${s}`);

  const postArb = fc
    .tuple(fc.uuid(), studentIdArb, fc.hexaString({ minLength: 4, maxLength: 8 }))
    .map(
      ([id, creatorId, sportSfx]) =>
        ({
          id,
          creatorId,
          sport: `Sport-${sportSfx}`,
          participantsNeeded: 2,
          skillLevel: 'Any',
          scheduledAt: '2099-09-01T12:00:00Z',
          description: 'A session post.',
          isActive: true,
        } as SessionPost)
    );

  const studentArb = fc
    .tuple(fc.uuid(), studentIdArb)
    .map(
      ([id, _]) =>
        ({
          id,
          email: `${id}@campus.edu`,
          displayName: 'A Student',
          passwordHash: 'hash',
        } as Student)
    );

  // currentStudent is either a Student or null
  const currentStudentArb: fc.Arbitrary<Student | null> = fc.oneof(
    studentArb,
    fc.constant(null)
  );

  it('edit/delete buttons appear iff currentStudent.id === post.creatorId', () => {
    // Feature: campus-event-finder, Property 15: Edit/delete options visible only to post owner
    fc.assert(
      fc.property(postArb, currentStudentArb, (post, currentStudent) => {
        const { unmount } = render(
          <SessionPostDetail
            post={post}
            currentStudent={currentStudent}
            authToken="test-token"
            onEdit={jest.fn()}
            onDelete={jest.fn()}
          />
        );

        try {
          const editBtn = screen.queryByRole('button', { name: /edit post/i });
          const deleteBtn = screen.queryByRole('button', { name: /delete post/i });

          const isOwner = currentStudent !== null && currentStudent.id === post.creatorId;

          if (isOwner) {
            expect(editBtn).toBeInTheDocument();
            expect(deleteBtn).toBeInTheDocument();
          } else {
            expect(editBtn).not.toBeInTheDocument();
            expect(deleteBtn).not.toBeInTheDocument();
          }
        } finally {
          unmount();
        }
      }),
      { numRuns: 100 }
    );
  }, 30000);
});

// ---------------------------------------------------------------------------
// Property 17: Session post deletion removes from list
// Feature: campus-event-finder, Property 17: Session post deletion removes from list
// Validates: Requirements 8.3
// ---------------------------------------------------------------------------

describe('Property 17: onDelete called only after successful DELETE API call (Requirements 8.3)', () => {
  /**
   * Validates: Requirements 8.3
   *
   * For any session post owned by the current student, clicking delete should
   * call onDelete if and only if the DELETE /sessions/:id API call succeeds.
   */

  const postIdArb = fc.uuid();
  const tokenArb = fc.hexaString({ minLength: 8, maxLength: 32 });

  it('onDelete is called iff the API responds with ok=true', async () => {
    // Feature: campus-event-finder, Property 17: Session post deletion removes from list
    await fc.assert(
      fc.asyncProperty(postIdArb, tokenArb, fc.boolean(), async (postId, token, apiSucceeds) => {
        const onDelete = jest.fn();
        const fetchMock = jest.fn().mockResolvedValue({ ok: apiSucceeds });
        global.fetch = fetchMock;

        const student = makeStudent({ id: 'owner-1' });
        const post = makePost({ id: postId, creatorId: 'owner-1' });

        const { unmount } = render(
          <SessionPostDetail
            post={post}
            currentStudent={student}
            authToken={token}
            onEdit={jest.fn()}
            onDelete={onDelete}
          />
        );

        try {
          await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: /delete post/i }));
          });

          if (apiSucceeds) {
            expect(onDelete).toHaveBeenCalledTimes(1);
          } else {
            expect(onDelete).not.toHaveBeenCalled();
          }
        } finally {
          unmount();
        }
      }),
      { numRuns: 50 }
    );
  });
});
