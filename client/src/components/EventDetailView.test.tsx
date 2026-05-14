import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { EventDetailView } from './EventDetailView';
import type { Event } from '@campus-event-finder/shared';
import * as fc from 'fast-check';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeEvent(overrides: Partial<Event> = {}): Event {
  return {
    id: 'evt-1',
    title: 'Campus Concert',
    description: 'A live music event on the main stage.',
        subtype: 'other',
    date: '2099-06-15',
    time: '18:00',
    locationName: 'Main Auditorium',
    campusAddress: '123 Campus Drive',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Unit Tests
// ---------------------------------------------------------------------------

describe('EventDetailView', () => {
  describe('required fields (requirements 3.1)', () => {
    it('renders the event title', () => {
      render(
        <EventDetailView
          event={makeEvent({ title: 'Spring Gala' })}
          isOnCampus={true}
          onGetDirections={jest.fn()}
          onShare={jest.fn()}
        />
      );
      expect(screen.getByRole('heading', { name: /Spring Gala/i })).toBeInTheDocument();
    });

    it('renders the full description', () => {
      render(
        <EventDetailView
          event={makeEvent({ description: 'A detailed description of the event.' })}
          isOnCampus={true}
          onGetDirections={jest.fn()}
          onShare={jest.fn()}
        />
      );
      expect(screen.getByText(/A detailed description of the event\./)).toBeInTheDocument();
    });

    it('renders the date', () => {
      render(
        <EventDetailView
          event={makeEvent({ date: '2099-07-04' })}
          isOnCampus={true}
          onGetDirections={jest.fn()}
          onShare={jest.fn()}
        />
      );
      expect(screen.getByText(/2099-07-04/)).toBeInTheDocument();
    });

    it('renders the time', () => {
      render(
        <EventDetailView
          event={makeEvent({ time: '14:30' })}
          isOnCampus={true}
          onGetDirections={jest.fn()}
          onShare={jest.fn()}
        />
      );
      expect(screen.getByText(/14:30/)).toBeInTheDocument();
    });

    it('renders the location name', () => {
      render(
        <EventDetailView
          event={makeEvent({ locationName: 'Science Building' })}
          isOnCampus={true}
          onGetDirections={jest.fn()}
          onShare={jest.fn()}
        />
      );
      expect(screen.getByText(/Science Building/)).toBeInTheDocument();
    });

    it('renders the campus address', () => {
      render(
        <EventDetailView
          event={makeEvent({ campusAddress: '456 University Ave' })}
          isOnCampus={true}
          onGetDirections={jest.fn()}
          onShare={jest.fn()}
        />
      );
      expect(screen.getByText(/456 University Ave/)).toBeInTheDocument();
    });
  });

  describe('optional price field (requirement 3.2)', () => {
    it('renders price when price is set', () => {
      render(
        <EventDetailView
          event={makeEvent({ price: 10 })}
          isOnCampus={true}
          onGetDirections={jest.fn()}
          onShare={jest.fn()}
        />
      );
      expect(screen.getByText(/Price:.*\$10/)).toBeInTheDocument();
    });

    it('does NOT render price when price is undefined', () => {
      render(
        <EventDetailView
          event={makeEvent({ price: undefined })}
          isOnCampus={true}
          onGetDirections={jest.fn()}
          onShare={jest.fn()}
        />
      );
      expect(screen.queryByText(/Price:/)).not.toBeInTheDocument();
    });

    it('renders price of 0 (free event with explicit zero price)', () => {
      render(
        <EventDetailView
          event={makeEvent({ price: 0 })}
          isOnCampus={true}
          onGetDirections={jest.fn()}
          onShare={jest.fn()}
        />
      );
      expect(screen.getByText(/Price:.*\$0/)).toBeInTheDocument();
    });
  });

  describe('optional entry requirements field (requirement 3.3)', () => {
    it('renders full entry requirements text when set', () => {
      render(
        <EventDetailView
          event={makeEvent({ entryRequirements: 'Must be a club member' })}
          isOnCampus={true}
          onGetDirections={jest.fn()}
          onShare={jest.fn()}
        />
      );
      expect(screen.getByText(/Must be a club member/)).toBeInTheDocument();
    });

    it('does NOT render entry requirements when undefined', () => {
      render(
        <EventDetailView
          event={makeEvent({ entryRequirements: undefined })}
          isOnCampus={true}
          onGetDirections={jest.fn()}
          onShare={jest.fn()}
        />
      );
      expect(screen.queryByText(/Entry requirements:/)).not.toBeInTheDocument();
    });
  });

  describe('share button (requirement 9.1)', () => {
    it('always renders the share button', () => {
      render(
        <EventDetailView
          event={makeEvent()}
          isOnCampus={true}
          onGetDirections={jest.fn()}
          onShare={jest.fn()}
        />
      );
      expect(screen.getByRole('button', { name: /share event/i })).toBeInTheDocument();
    });

    it('calls onShare with the event when share button is clicked', () => {
      const onShare = jest.fn();
      const event = makeEvent();
      render(
        <EventDetailView
          event={event}
          isOnCampus={true}
          onGetDirections={jest.fn()}
          onShare={onShare}
        />
      );
      fireEvent.click(screen.getByRole('button', { name: /share event/i }));
      expect(onShare).toHaveBeenCalledTimes(1);
      expect(onShare).toHaveBeenCalledWith(event);
    });

    it('renders share button even when off campus', () => {
      render(
        <EventDetailView
          event={makeEvent()}
          isOnCampus={false}
          onGetDirections={jest.fn()}
          onShare={jest.fn()}
        />
      );
      expect(screen.getByRole('button', { name: /share event/i })).toBeInTheDocument();
    });

    it('renders share button when location is undetermined (null)', () => {
      render(
        <EventDetailView
          event={makeEvent()}
          isOnCampus={null}
          onGetDirections={jest.fn()}
          onShare={jest.fn()}
        />
      );
      expect(screen.getByRole('button', { name: /share event/i })).toBeInTheDocument();
    });
  });

  describe('"Get Directions" button (requirements 3.4, 3.5, 4.3, 4.7)', () => {
    it('shows "Get Directions" when off campus (isOnCampus = false)', () => {
      render(
        <EventDetailView
          event={makeEvent()}
          isOnCampus={false}
          onGetDirections={jest.fn()}
          onShare={jest.fn()}
        />
      );
      expect(screen.getByRole('button', { name: /get directions/i })).toBeInTheDocument();
    });

    it('shows "Get Directions" when location is undetermined (isOnCampus = null)', () => {
      render(
        <EventDetailView
          event={makeEvent()}
          isOnCampus={null}
          onGetDirections={jest.fn()}
          onShare={jest.fn()}
        />
      );
      expect(screen.getByRole('button', { name: /get directions/i })).toBeInTheDocument();
    });

    it('hides "Get Directions" when on campus (isOnCampus = true)', () => {
      render(
        <EventDetailView
          event={makeEvent()}
          isOnCampus={true}
          onGetDirections={jest.fn()}
          onShare={jest.fn()}
        />
      );
      expect(screen.queryByRole('button', { name: /get directions/i })).not.toBeInTheDocument();
    });

    it('calls onGetDirections with the campusAddress when "Get Directions" is clicked', () => {
      const onGetDirections = jest.fn();
      const event = makeEvent({ campusAddress: '789 College Blvd' });
      render(
        <EventDetailView
          event={event}
          isOnCampus={false}
          onGetDirections={onGetDirections}
          onShare={jest.fn()}
        />
      );
      fireEvent.click(screen.getByRole('button', { name: /get directions/i }));
      expect(onGetDirections).toHaveBeenCalledTimes(1);
      expect(onGetDirections).toHaveBeenCalledWith('789 College Blvd');
    });
  });
});

// ---------------------------------------------------------------------------
// Property-Based Tests
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Property 5: Event detail view rendering completeness
// Feature: campus-event-finder, Property 5: Event detail view rendering completeness
// Validates: Requirements 3.1, 3.2, 3.3
// ---------------------------------------------------------------------------

describe('Property 5: Event detail view rendering completeness (Requirements 3.1, 3.2, 3.3)', () => {
  /**
   * Validates: Requirements 3.1, 3.2, 3.3
   *
   * For any Event object, the rendered detail view should always include the
   * title, full description, date, time, location name, and campus address;
   * should include the price if and only if a price is set; and should include
   * the full entry requirements text if and only if entryRequirements is defined.
   */

  // ISO 8601 date in the future
  const dateArb = fc
    .date({ min: new Date('2099-01-01'), max: new Date('2099-12-31') })
    .map((d) => d.toISOString().slice(0, 10));

  // HH:MM time
  const timeArb = fc
    .tuple(fc.integer({ min: 0, max: 23 }), fc.integer({ min: 0, max: 59 }))
    .map(([h, m]) => `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);

  // Non-negative integer price to avoid float formatting ambiguity
  const priceArb = fc.option(fc.integer({ min: 1, max: 999 }), { nil: undefined });

  // Optional entryRequirements: undefined or a non-empty alphanumeric string
  // Filter out consecutive spaces to avoid whitespace-normalization mismatches in assertions.
  const entryReqArb = fc.option(
    fc
      .stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz '.split('')), {
        minLength: 3,
        maxLength: 50,
      })
      .filter((s) => s.trim().length > 0 && !s.includes('  ')),
    { nil: undefined }
  );

  // Use hex-suffixed strings to avoid cross-field text collisions
  const eventArb = fc
    .tuple(
      fc.uuid(),
      fc.hexaString({ minLength: 6, maxLength: 6 }), // title suffix
      fc.hexaString({ minLength: 6, maxLength: 6 }), // description suffix
      fc.hexaString({ minLength: 6, maxLength: 6 }), // locationName suffix
      fc.hexaString({ minLength: 6, maxLength: 6 }), // campusAddress suffix
      dateArb,
      timeArb,
      priceArb,
      entryReqArb
    )
    .map(
      ([id, titleSfx, descSfx, locSfx, addrSfx, date, time, price, entryRequirements]) =>
        ({
          id,
          title: `Title-${titleSfx}`,
          description: `Desc-${descSfx}`,
        subtype: 'other',
          date,
          time,
          locationName: `Loc-${locSfx}`,
          campusAddress: `Addr-${addrSfx}`,
          ...(price !== undefined ? { price } : {}),
          ...(entryRequirements !== undefined ? { entryRequirements } : {}),
        } as Event)
    );

  it('always renders title, description, date, time, locationName, and campusAddress', () => {
    // Feature: campus-event-finder, Property 5: Event detail view rendering completeness
    fc.assert(
      fc.property(eventArb, (event) => {
        const { unmount } = render(
          <EventDetailView
            event={event}
            isOnCampus={true}
            onGetDirections={jest.fn()}
            onShare={jest.fn()}
          />
        );

        try {
          // Title must always be present
          expect(screen.getByRole('heading', { name: new RegExp(event.title) })).toBeInTheDocument();

          // Full description must always be present
          expect(screen.getByText(new RegExp(event.description))).toBeInTheDocument();

          // Date must always be present
          expect(screen.getByText(new RegExp(event.date))).toBeInTheDocument();

          // Time must always be present
          expect(screen.getByText(new RegExp(event.time))).toBeInTheDocument();

          // Location name must always be present
          expect(screen.getByText(new RegExp(event.locationName))).toBeInTheDocument();

          // Campus address must always be present
          expect(screen.getByText(new RegExp(event.campusAddress))).toBeInTheDocument();
        } finally {
          unmount();
        }
      }),
      { numRuns: 100 }
    );
  }, 30000);

  it('renders price if and only if price is set', () => {
    // Feature: campus-event-finder, Property 5: Event detail view rendering completeness
    fc.assert(
      fc.property(eventArb, (event) => {
        const { unmount } = render(
          <EventDetailView
            event={event}
            isOnCampus={true}
            onGetDirections={jest.fn()}
            onShare={jest.fn()}
          />
        );

        try {
          if (event.price !== undefined && event.price !== null) {
            // Price is set — must appear
            expect(screen.getByText(new RegExp(`\\$${event.price}`))).toBeInTheDocument();
          } else {
            // Price is not set — dollar sign must NOT appear
            expect(document.body.textContent).not.toMatch(/Price:/);
          }
        } finally {
          unmount();
        }
      }),
      { numRuns: 100 }
    );
  }, 30000);

  it('renders full entry requirements text if and only if entryRequirements is defined', () => {
    // Feature: campus-event-finder, Property 5: Event detail view rendering completeness
    fc.assert(
      fc.property(eventArb, (event) => {
        const { unmount } = render(
          <EventDetailView
            event={event}
            isOnCampus={true}
            onGetDirections={jest.fn()}
            onShare={jest.fn()}
          />
        );

        try {
          if (event.entryRequirements) {
            // entryRequirements is set — full text must appear
            expect(document.body.textContent).toContain(event.entryRequirements.trim());
          } else {
            // entryRequirements is not set — label must NOT appear
            expect(document.body.textContent).not.toMatch(/Entry requirements:/);
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
// Property 6: Directions button visibility based on location context
// Feature: campus-event-finder, Property 6: Directions button visibility based on location context
// Validates: Requirements 3.4, 4.3, 4.7
// ---------------------------------------------------------------------------

describe('Property 6: Directions button visibility based on location context (Requirements 3.4, 4.3, 4.7)', () => {
  /**
   * Validates: Requirements 3.4, 4.3, 4.7
   *
   * For any event and any determined location context, the "Get Directions"
   * button should appear in the event detail view if and only if the student's
   * location context is off campus (false) or location is undetermined (null).
   * When on campus (true), the button must NOT appear.
   */

  // Arbitrary for isOnCampus: true | false | null
  const locationContextArb = fc.oneof(
    fc.constant(true),
    fc.constant(false),
    fc.constant(null)
  ) as fc.Arbitrary<boolean | null>;

  // Minimal event arbitrary — only fields needed for rendering
  const eventArb = fc
    .tuple(
      fc.uuid(),
      fc.hexaString({ minLength: 6, maxLength: 6 }),
      fc.hexaString({ minLength: 6, maxLength: 6 })
    )
    .map(
      ([id, titleSfx, addrSfx]) =>
        ({
          id,
          title: `Title-${titleSfx}`,
          description: 'A description',
        subtype: 'other',
          date: '2099-06-15',
          time: '10:00',
          locationName: 'Main Hall',
          campusAddress: `Addr-${addrSfx}`,
        } as Event)
    );

  it('"Get Directions" appears iff isOnCampus is false or null', () => {
    // Feature: campus-event-finder, Property 6: Directions button visibility based on location context
    fc.assert(
      fc.property(eventArb, locationContextArb, (event, isOnCampus) => {
        const { unmount } = render(
          <EventDetailView
            event={event}
            isOnCampus={isOnCampus}
            onGetDirections={jest.fn()}
            onShare={jest.fn()}
          />
        );

        try {
          const directionsBtn = screen.queryByRole('button', { name: /get directions/i });

          if (isOnCampus === false || isOnCampus === null) {
            // Off campus or undetermined — button MUST be visible
            expect(directionsBtn).toBeInTheDocument();
          } else {
            // On campus — button MUST NOT be visible
            expect(directionsBtn).not.toBeInTheDocument();
          }
        } finally {
          unmount();
        }
      }),
      { numRuns: 100 }
    );
  }, 30000);

  it('share button is always visible regardless of location context', () => {
    // Feature: campus-event-finder, Property 6: Directions button visibility based on location context
    fc.assert(
      fc.property(eventArb, locationContextArb, (event, isOnCampus) => {
        const { unmount } = render(
          <EventDetailView
            event={event}
            isOnCampus={isOnCampus}
            onGetDirections={jest.fn()}
            onShare={jest.fn()}
          />
        );

        try {
          // Share button must always be present regardless of location context
          expect(screen.getByRole('button', { name: /share event/i })).toBeInTheDocument();
        } finally {
          unmount();
        }
      }),
      { numRuns: 100 }
    );
  }, 30000);
});
