import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { EventsTab } from './EventsTab';
import type { Event } from '@campus-event-finder/shared';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeEvent(overrides: Partial<Event> = {}): Event {
  return {
    id: 'evt-1',
    title: 'Test Event',
    description: 'A test event',
        subtype: 'other',
    date: '2099-06-15',
    time: '14:00',
    locationName: 'Main Hall',
    campusAddress: '1 Campus Drive',
    ...overrides,
  };
}

const mockOnSelectEvent = jest.fn();

// ---------------------------------------------------------------------------
// fetch mock helpers
// ---------------------------------------------------------------------------

function mockFetchSuccess(events: Event[]): void {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => events,
  } as Response);
}

function mockFetchError(): void {
  global.fetch = jest.fn().mockResolvedValue({
    ok: false,
    status: 500,
    json: async () => ({}),
  } as Response);
}

beforeEach(() => {
  jest.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Unit tests
// ---------------------------------------------------------------------------

describe('EventsTab', () => {
  describe('initial load', () => {
    it('calls GET /events on mount', async () => {
      mockFetchSuccess([]);
      render(<EventsTab onSelectEvent={mockOnSelectEvent} />);
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringMatching(/\/events$/)
        );
      });
    });

    it('renders a list of events returned by the API', async () => {
      const events = [
        makeEvent({ id: '1', title: 'Alpha Event', date: '2099-06-10' }),
        makeEvent({ id: '2', title: 'Beta Event', date: '2099-06-20' }),
      ];
      mockFetchSuccess(events);
      render(<EventsTab onSelectEvent={mockOnSelectEvent} />);
      await waitFor(() => {
        expect(screen.getByText(/Alpha Event/)).toBeInTheDocument();
        expect(screen.getByText(/Beta Event/)).toBeInTheDocument();
      });
    });

    it('shows empty-state message when no upcoming events (requirement 1.3)', async () => {
      mockFetchSuccess([]);
      render(<EventsTab onSelectEvent={mockOnSelectEvent} />);
      await waitFor(() => {
        expect(screen.getByText(/no events currently scheduled/i)).toBeInTheDocument();
      });
    });

    it('shows an error message when the API call fails', async () => {
      mockFetchError();
      render(<EventsTab onSelectEvent={mockOnSelectEvent} />);
      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });
    });
  });

  describe('event list item rendering (requirements 1.4, 1.5)', () => {
    it('renders title, date, time, and location name for each event', async () => {
      const event = makeEvent({
        title: 'Science Fair',
        date: '2099-07-04',
        time: '10:00',
        locationName: 'Science Building',
      });
      mockFetchSuccess([event]);
      render(<EventsTab onSelectEvent={mockOnSelectEvent} />);
      await waitFor(() => {
        expect(screen.getByText(/Science Fair/)).toBeInTheDocument();
        expect(screen.getByText(/2099-07-04/)).toBeInTheDocument();
        expect(screen.getByText(/10:00/)).toBeInTheDocument();
        expect(screen.getByText(/Science Building/)).toBeInTheDocument();
      });
    });

    it('renders price when price is set (requirement 1.4)', async () => {
      const event = makeEvent({ price: 5 });
      mockFetchSuccess([event]);
      render(<EventsTab onSelectEvent={mockOnSelectEvent} />);
      await waitFor(() => {
        expect(screen.getByText(/\$5/)).toBeInTheDocument();
      });
    });

    it('does NOT render price when price is not set (requirement 1.4)', async () => {
      const event = makeEvent({ price: undefined });
      mockFetchSuccess([event]);
      render(<EventsTab onSelectEvent={mockOnSelectEvent} />);
      await waitFor(() => {
        expect(screen.queryByText(/\$/)).not.toBeInTheDocument();
      });
    });

    it('renders entry requirements summary when entryRequirements is set (requirement 1.5)', async () => {
      const event = makeEvent({ entryRequirements: 'Must be a club member' });
      mockFetchSuccess([event]);
      render(<EventsTab onSelectEvent={mockOnSelectEvent} />);
      await waitFor(() => {
        expect(screen.getByText(/Must be a club member/)).toBeInTheDocument();
      });
    });

    it('does NOT render entry requirements when entryRequirements is not set (requirement 1.5)', async () => {
      const event = makeEvent({ entryRequirements: undefined });
      mockFetchSuccess([event]);
      render(<EventsTab onSelectEvent={mockOnSelectEvent} />);
      await waitFor(() => {
        expect(screen.queryByText(/Requirements:/)).not.toBeInTheDocument();
      });
    });
  });

  describe('date ordering (requirement 1.1)', () => {
    it('renders events ordered by date ascending', async () => {
      const events = [
        makeEvent({ id: '3', title: 'Later Event', date: '2099-12-01' }),
        makeEvent({ id: '1', title: 'Earlier Event', date: '2099-06-01' }),
        makeEvent({ id: '2', title: 'Middle Event', date: '2099-09-01' }),
      ];
      mockFetchSuccess(events);
      render(<EventsTab onSelectEvent={mockOnSelectEvent} />);
      await waitFor(() => {
        const items = screen.getAllByRole('button');
        const titles = items.map((el) => el.textContent ?? '');
        const earlierIdx = titles.findIndex((t) => t.includes('Earlier Event'));
        const middleIdx = titles.findIndex((t) => t.includes('Middle Event'));
        const laterIdx = titles.findIndex((t) => t.includes('Later Event'));
        expect(earlierIdx).toBeLessThan(middleIdx);
        expect(middleIdx).toBeLessThan(laterIdx);
      });
    });
  });

  describe('search (requirements 2.1, 2.3, 2.4)', () => {
    it('renders a search input field (requirement 2.1)', async () => {
      mockFetchSuccess([]);
      render(<EventsTab onSelectEvent={mockOnSelectEvent} />);
      expect(screen.getByRole('textbox', { name: /search events/i })).toBeInTheDocument();
    });

    it('calls GET /events?q={query} when user types in search (requirement 2.1)', async () => {
      mockFetchSuccess([]);
      render(<EventsTab onSelectEvent={mockOnSelectEvent} />);
      await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));

      const input = screen.getByRole('textbox', { name: /search events/i });
      await act(async () => {
        fireEvent.change(input, { target: { value: 'music' } });
      });

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringMatching(/\/events\?q=music/)
        );
      });
    });

    it('shows "no matching events found" when search returns empty (requirement 2.3)', async () => {
      mockFetchSuccess([]);
      render(<EventsTab onSelectEvent={mockOnSelectEvent} />);
      await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));

      const input = screen.getByRole('textbox', { name: /search events/i });
      await act(async () => {
        fireEvent.change(input, { target: { value: 'nonexistent' } });
      });

      await waitFor(() => {
        expect(screen.getByText(/no matching events found/i)).toBeInTheDocument();
      });
    });

    it('restores full list when search is cleared via Clear button (requirement 2.4)', async () => {
      const allEvents = [makeEvent({ id: '1', title: 'Music Night' })];
      // First call (mount) returns full list; second call (search) returns empty; third call (clear) returns full list
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true, json: async () => allEvents } as Response)
        .mockResolvedValueOnce({ ok: true, json: async () => [] } as Response)
        .mockResolvedValueOnce({ ok: true, json: async () => allEvents } as Response);

      render(<EventsTab onSelectEvent={mockOnSelectEvent} />);
      await waitFor(() => expect(screen.getByText(/Music Night/)).toBeInTheDocument());

      const input = screen.getByRole('textbox', { name: /search events/i });
      await act(async () => {
        fireEvent.change(input, { target: { value: 'xyz' } });
      });
      await waitFor(() => expect(screen.getByText(/no matching events found/i)).toBeInTheDocument());

      const clearBtn = screen.getByRole('button', { name: /clear search/i });
      await act(async () => {
        fireEvent.click(clearBtn);
      });

      await waitFor(() => {
        expect(screen.getByText(/Music Night/)).toBeInTheDocument();
        // Verify the last fetch was for the full list (no query param)
        const calls = (global.fetch as jest.Mock).mock.calls;
        const lastCall = calls[calls.length - 1][0] as string;
        expect(lastCall).toMatch(/\/events$/);
      });
    });

    it('restores full list when search input is manually cleared to empty string (requirement 2.4)', async () => {
      const allEvents = [makeEvent({ id: '1', title: 'Art Show' })];
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true, json: async () => allEvents } as Response)
        .mockResolvedValueOnce({ ok: true, json: async () => [] } as Response)
        .mockResolvedValueOnce({ ok: true, json: async () => allEvents } as Response);

      render(<EventsTab onSelectEvent={mockOnSelectEvent} />);
      await waitFor(() => expect(screen.getByText(/Art Show/)).toBeInTheDocument());

      const input = screen.getByRole('textbox', { name: /search events/i });
      await act(async () => {
        fireEvent.change(input, { target: { value: 'xyz' } });
      });
      await waitFor(() => expect(screen.getByText(/no matching events found/i)).toBeInTheDocument());

      await act(async () => {
        fireEvent.change(input, { target: { value: '' } });
      });

      await waitFor(() => {
        expect(screen.getByText(/Art Show/)).toBeInTheDocument();
      });
    });
  });

  describe('event selection', () => {
    it('calls onSelectEvent with the correct event when an item is clicked', async () => {
      const event = makeEvent({ id: 'evt-42', title: 'Click Me' });
      mockFetchSuccess([event]);
      render(<EventsTab onSelectEvent={mockOnSelectEvent} />);
      await waitFor(() => expect(screen.getByText(/Click Me/)).toBeInTheDocument());

      fireEvent.click(screen.getByRole('button', { name: /View details for Click Me/i }));
      expect(mockOnSelectEvent).toHaveBeenCalledWith(event);
    });

    it('calls onSelectEvent when Enter key is pressed on an event item', async () => {
      const event = makeEvent({ id: 'evt-43', title: 'Keyboard Event' });
      mockFetchSuccess([event]);
      render(<EventsTab onSelectEvent={mockOnSelectEvent} />);
      await waitFor(() => expect(screen.getByText(/Keyboard Event/)).toBeInTheDocument());

      fireEvent.keyDown(screen.getByRole('button', { name: /View details for Keyboard Event/i }), {
        key: 'Enter',
      });
      expect(mockOnSelectEvent).toHaveBeenCalledWith(event);
    });
  });
});

// ---------------------------------------------------------------------------
// Property-Based Tests
// ---------------------------------------------------------------------------

import * as fc from 'fast-check';

// Feature: campus-event-finder, Property 2: Event list item rendering completeness
describe('Property 2: Event list item rendering completeness (Requirements 1.4, 1.5)', () => {
  /**
   * Validates: Requirements 1.4, 1.5
   *
   * For any Event object, the rendered list item should always include the
   * title, date, time, and location name; should include the price if and
   * only if a price is set; and should include a summary of entry
   * requirements if and only if entryRequirements is defined.
   */
  it('always renders title, date, time, locationName; renders price iff set; renders entryRequirements iff defined', async () => {
    // ISO 8601 date: YYYY-MM-DD in the future
    const dateArb = fc.date({ min: new Date('2099-01-01'), max: new Date('2099-12-31') }).map(
      (d) => d.toISOString().slice(0, 10)
    );

    // HH:MM time
    const timeArb = fc
      .tuple(fc.integer({ min: 0, max: 23 }), fc.integer({ min: 0, max: 59 }))
      .map(([h, m]) => `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);

    // Non-negative integer price to avoid float formatting ambiguity
    const priceArb = fc.option(fc.integer({ min: 1, max: 999 }), { nil: undefined });

    // Optional entryRequirements: undefined or a non-empty alphanumeric string
    // Use alphanumeric strings to avoid regex special characters in the text.
    // Filter out consecutive spaces to avoid whitespace-normalization mismatches in assertions.
    const entryReqArb = fc.option(
      fc.stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz '.split('')), { minLength: 3, maxLength: 50 })
        .filter((s) => s.trim().length > 0 && !s.includes('  ')),
      { nil: undefined }
    );

    // Use unique-enough strings for title/locationName to avoid cross-field text collisions.
    // Prefix each field with a unique marker so getByText won't confuse them.
    const eventArb = fc
      .tuple(
        fc.uuid(),                                                    // id
        fc.hexaString({ minLength: 6, maxLength: 6 }),                // title suffix
        fc.hexaString({ minLength: 6, maxLength: 6 }),                // locationName suffix
        dateArb,                                                      // date
        timeArb,                                                      // time
        priceArb,                                                     // price?
        entryReqArb,                                                  // entryRequirements?
      )
      .map(([id, titleSuffix, locSuffix, date, time, price, entryRequirements]) => ({
        id,
        title: `Title-${titleSuffix}`,
        description: 'A description',
            subtype: 'other',
        date,
        time,
        locationName: `Loc-${locSuffix}`,
        campusAddress: '1 Campus Drive',
        ...(price !== undefined ? { price } : {}),
        ...(entryRequirements !== undefined ? { entryRequirements } : {}),
      } as import('@campus-event-finder/shared').Event));

    await fc.assert(
      fc.asyncProperty(eventArb, async (event) => {
        // Mock fetch to return this single event
        global.fetch = jest.fn().mockResolvedValue({
          ok: true,
          json: async () => [event],
        } as Response);

        const { unmount } = render(<EventsTab onSelectEvent={jest.fn()} />);

        try {
          // Wait for the event list item to appear
          await waitFor(() => {
            expect(screen.getByText(new RegExp(escapeRegex(event.title)))).toBeInTheDocument();
          });

          // Get the rendered list item element (the <li> with role="button")
          const listItem = screen.getByRole('button', {
            name: new RegExp(`View details for ${escapeRegex(event.title)}`, 'i'),
          });

          // 1. Title must always be present in the list item
          expect(listItem).toHaveTextContent(event.title);

          // 2. Date must always be present in the list item
          expect(listItem).toHaveTextContent(event.date);

          // 3. Time must always be present in the list item
          expect(listItem).toHaveTextContent(event.time);

          // 4. Location name must always be present in the list item
          expect(listItem).toHaveTextContent(event.locationName);

          // 5. Price: present if and only if price is set
          if (event.price !== undefined && event.price !== null) {
            // Price is set — must appear in the list item
            expect(listItem).toHaveTextContent(`$${event.price}`);
          } else {
            // Price is not set — dollar sign must NOT appear in the list item
            expect(listItem.textContent).not.toMatch(/\$/);
          }

          // 6. Entry requirements: present if and only if entryRequirements is defined
          if (event.entryRequirements) {
            // entryRequirements is set — must appear in the list item (trim to handle whitespace)
            expect(listItem.textContent).toContain(event.entryRequirements.trim());
          } else {
            // entryRequirements is not set — requirements label must NOT appear in the list item
            expect(listItem.textContent).not.toMatch(/Requirements:/);
          }
        } finally {
          unmount();
        }
      }),
      { numRuns: 100 }
    );
  }, 30000);
});

/** Escapes special regex characters in a string so it can be used in a RegExp. */
function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Feature: campus-event-finder, Property 4: Search clear restores full list
describe('Property 4: Search clear restores full list (Requirement 2.4)', () => {
  /**
   * Validates: Requirements 2.4
   *
   * For any initial list of upcoming events and any search query applied to it,
   * clearing the search input should restore the result to the same set of events
   * as the unfiltered list.
   */
  it('restores the full event list after a search query is cleared', async () => {
    // Generate a list of 1–5 events with unique hex-suffixed titles
    const eventArb = fc
      .tuple(fc.uuid(), fc.hexaString({ minLength: 6, maxLength: 6 }))
      .map(([id, suffix]) => ({
        id,
        title: `Evt-${suffix}`,
        description: 'desc',
        subtype: 'other',
        date: '2099-06-15',
        time: '10:00',
        locationName: 'Hall',
        campusAddress: '1 Campus Drive',
      } as import('@campus-event-finder/shared').Event));

    const eventsArb = fc.array(eventArb, { minLength: 1, maxLength: 5 });

    // Non-empty search query that won't accidentally match any generated title
    // (titles are "Evt-<hex6>"; query uses a prefix that won't appear in hex titles)
    const queryArb = fc
      .stringOf(fc.constantFrom(...'ghijklmnopqrstuvwxyz'.split('')), { minLength: 1, maxLength: 10 })
      .filter((s) => s.trim().length > 0);

    await fc.assert(
      fc.asyncProperty(eventsArb, queryArb, async (allEvents, query) => {
        // Call 1 (mount): returns full list
        // Call 2 (search): returns empty (query matches nothing)
        // Call 3 (clear via Clear button): returns full list again
        // Call 4 (clear via empty input): returns full list again (if needed)
        global.fetch = jest.fn()
          .mockResolvedValueOnce({ ok: true, json: async () => allEvents } as Response)
          .mockResolvedValueOnce({ ok: true, json: async () => [] } as Response)
          .mockResolvedValueOnce({ ok: true, json: async () => allEvents } as Response)
          .mockResolvedValue({ ok: true, json: async () => allEvents } as Response);

        const { unmount } = render(<EventsTab onSelectEvent={jest.fn()} />);

        try {
          // Wait for the initial full list to render
          await waitFor(() => {
            expect(screen.getByText(new RegExp(allEvents[0].title))).toBeInTheDocument();
          });

          // Type a search query that returns no results
          const input = screen.getByRole('textbox', { name: /search events/i });
          await act(async () => {
            fireEvent.change(input, { target: { value: query } });
          });

          // Wait for the empty search state
          await waitFor(() => {
            expect(screen.getByText(/no matching events found/i)).toBeInTheDocument();
          });

          // Click the Clear button to restore the full list
          const clearBtn = screen.getByRole('button', { name: /clear search/i });
          await act(async () => {
            fireEvent.click(clearBtn);
          });

          // All events from the original full list must be visible again
          await waitFor(() => {
            for (const event of allEvents) {
              expect(screen.getByText(new RegExp(event.title))).toBeInTheDocument();
            }
          });

          // The last fetch call must have been for the unfiltered list (no query param)
          const calls = (global.fetch as jest.Mock).mock.calls;
          const lastUrl = calls[calls.length - 1][0] as string;
          expect(lastUrl).toMatch(/\/events$/);
        } finally {
          unmount();
        }
      }),
      { numRuns: 100 }
    );
  }, 60000);
});
