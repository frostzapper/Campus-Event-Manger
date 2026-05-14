import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { Event } from '@campus-event-finder/shared';
import { EventCard, EventCardSkeleton } from './HomePage';

const API_BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3000';

interface EventsPageProps {
  onSelectEvent: (event: Event) => void;
  isAuthenticated: boolean;
  onRequireAuth: (action: { type: 'register'; event: Event }, prompt: string) => void;
}

interface FilterState {
  subtype: string;
  free: boolean;
  paid: boolean;
  online: boolean;
  offline: boolean;
  dateFrom: string;
  dateTo: string;
}

const INITIAL_FILTERS: FilterState = {
  subtype: '',
  free: false,
  paid: false,
  online: false,
  offline: false,
  dateFrom: '',
  dateTo: '',
};

export function EventsPage({ onSelectEvent, isAuthenticated, onRequireAuth }: EventsPageProps): React.ReactElement {
  const [events, setEvents] = useState<Event[]>([]);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [suggestions, setSuggestions] = useState<{ id: string; title: string }[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filters, setFilters] = useState<FilterState>(INITIAL_FILTERS);
  const [sort, setSort] = useState('date');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isSearchingSuggestions, setIsSearchingSuggestions] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const observer = useRef<IntersectionObserver | null>(null);
  const lastEventElementRef = useCallback((node: HTMLDivElement | null) => {
    if (isLoading) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        setPage(prevPage => prevPage + 1);
      }
    });
    if (node) observer.current.observe(node);
  }, [isLoading, hasMore]);

  // ── Debounce search ──────────────────────────────────────────────────────
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 500);
    return () => clearTimeout(timer);
  }, [search]);

  // ── Fetch suggestions ────────────────────────────────────────────────────
  useEffect(() => {
    if (!search.trim()) {
      setSuggestions([]);
      return;
    }
    setIsSearchingSuggestions(true);
    fetch(`${API_BASE_URL}/events/suggestions?q=${encodeURIComponent(search.trim())}`)
      .then(r => r.json())
      .then(data => setSuggestions(data))
      .catch(() => {})
      .finally(() => setIsSearchingSuggestions(false));
  }, [search]);

  // ── Fetch events ─────────────────────────────────────────────────────────
  const fetchEvents = useCallback(async (isInitial: boolean) => {
    setIsLoading(true);
    setError(null);
    try {
      const queryParams = new URLSearchParams();
      if (debouncedSearch) queryParams.set('q', debouncedSearch);
      if (filters.subtype) queryParams.set('subtype', filters.subtype);
      if (filters.free) queryParams.set('free', 'true');
      if (filters.paid) queryParams.set('paid', 'true');
      if (filters.online) queryParams.set('online', 'true');
      if (filters.offline) queryParams.set('offline', 'true');
      if (filters.dateFrom) queryParams.set('dateFrom', filters.dateFrom);
      if (filters.dateTo) queryParams.set('dateTo', filters.dateTo);
      queryParams.set('sort', sort);
      queryParams.set('page', (isInitial ? 1 : page).toString());
      queryParams.set('limit', '9');

      const res = await fetch(`${API_BASE_URL}/events?${queryParams.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch events');
      const data = await res.json();
      
      // Safety check: Handle both the new paginated object and the old raw array
      const newEvents = Array.isArray(data) ? data : (data?.events || []);
      const totalPages = typeof data?.totalPages === 'number' ? data.totalPages : 1;
      const totalCount = typeof data?.total === 'number' ? data.total : newEvents.length;

      setEvents(prev => isInitial ? newEvents : [...prev, ...newEvents]);
      setHasMore(isInitial ? (totalPages > 1) : (page < totalPages));
      setTotal(totalCount);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  }, [debouncedSearch, filters, sort, page]);

  // Trigger initial load on filter/search/sort change
  useEffect(() => {
    setPage(1);
    void fetchEvents(true);
  }, [debouncedSearch, filters, sort]);

  // Trigger page load
  useEffect(() => {
    if (page > 1) void fetchEvents(false);
  }, [page]);

  const subtypes = ['technical', 'cultural', 'sports', 'other'];

  const clearFilters = () => setFilters(INITIAL_FILTERS);

  return (
    <div className="discovery-container">
      {/* ── Header Area ── */}
      <header className="discovery-header">
        <div className="container">
          <div className="discovery-hero">
            <h1>Advanced Event <span>Discovery</span></h1>
            <p>Find the perfect campus event with precision search and smart filters.</p>
          </div>

          <div className="discovery-search-wrap">
            <div className="discovery-search-bar">
              <span className="search-icon">🔍</span>
              <input
                type="text"
                placeholder="Search by title, description, or tags..."
                value={search}
                onChange={e => { setSearch(e.target.value); setShowSuggestions(true); }}
                onFocus={() => setShowSuggestions(true)}
              />
              {isLoading && <span className="loading-spinner-small" />}
              {search && (
                <button className="clear-search" onClick={() => setSearch('')}>✕</button>
              )}

              {/* Autocomplete Suggestions */}
              {showSuggestions && suggestions.length > 0 && (
                <div className="autocomplete-dropdown">
                  {suggestions.map(s => (
                    <button
                      key={s.id}
                      className="suggestion-item"
                      onClick={() => {
                        setSearch(s.title);
                        setShowSuggestions(false);
                      }}
                    >
                      <span>📅</span> {s.title}
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            <div className="discovery-sort">
              <label htmlFor="sort-select">Sort by:</label>
              <select id="sort-select" value={sort} onChange={e => setSort(e.target.value)}>
                <option value="date">Upcoming Soonest</option>
                <option value="newest">Newest Added</option>
                <option value="trending">Trending (Popular)</option>
                <option value="mostRegistered">Most Registered</option>
              </select>
            </div>
          </div>
        </div>
      </header>

      <div className="container discovery-content">
        {/* ── Filters Sidebar ── */}
        <aside className="discovery-sidebar">
          <div className="filter-group">
            <div className="filter-group-header">
              <h3>Filters</h3>
              <button className="btn-link" onClick={clearFilters}>Clear all</button>
            </div>
          </div>

          <div className="filter-group">
            <h4>Type</h4>
            <div className="filter-chips">
              {subtypes.map(s => (
                <button
                  key={s}
                  className={`filter-chip ${filters.subtype === s ? 'active' : ''}`}
                  onClick={() => setFilters(f => ({ ...f, subtype: f.subtype === s ? '' : s }))}
                >
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="filter-group">
            <h4>Price</h4>
            <div className="checkbox-row">
              <label>
                <input
                  type="checkbox"
                  checked={filters.free}
                  onChange={e => setFilters(f => ({ ...f, free: e.target.checked }))}
                />
                Free
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={filters.paid}
                  onChange={e => setFilters(f => ({ ...f, paid: e.target.checked }))}
                />
                Paid
              </label>
            </div>
          </div>

          <div className="filter-group">
            <h4>Format</h4>
            <div className="checkbox-row">
              <label>
                <input
                  type="checkbox"
                  checked={filters.online}
                  onChange={e => setFilters(f => ({ ...f, online: e.target.checked }))}
                />
                Online
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={filters.offline}
                  onChange={e => setFilters(f => ({ ...f, offline: e.target.checked }))}
                />
                In-person
              </label>
            </div>
          </div>

          <div className="filter-group">
            <h4>Date Range</h4>
            <div className="date-range-inputs">
              <input
                type="date"
                value={filters.dateFrom}
                onChange={e => setFilters(f => ({ ...f, dateFrom: e.target.value }))}
                aria-label="From date"
              />
              <span className="date-separator">to</span>
              <input
                type="date"
                value={filters.dateTo}
                onChange={e => setFilters(f => ({ ...f, dateTo: e.target.value }))}
                aria-label="To date"
              />
            </div>
          </div>
        </aside>

        {/* ── Main Results Area ── */}
        <main className="discovery-results">
          <div className="results-info">
            {isLoading && page === 1 ? 'Searching...' : `Found ${total} events`}
          </div>

          {error && <div className="alert alert-error">{error}</div>}

          <div className="cards-grid cards-grid-3">
            {events.map((event, index) => (
              <div
                key={`${event.id}-${index}`}
                ref={index === events.length - 1 ? lastEventElementRef : null}
              >
                <EventCard
                  event={event}
                  onClick={() => onSelectEvent(event)}
                  isAuthenticated={isAuthenticated}
                  onRequireAuth={onRequireAuth}
                />
              </div>
            ))}
          </div>

          {isLoading && (
            <div className="cards-grid cards-grid-3" style={{ marginTop: '2rem' }}>
              {[1, 2, 3].map(i => <EventCardSkeleton key={i} />)}
            </div>
          )}

          {!isLoading && events.length === 0 && (
            <div className="state-empty">
              <div className="state-empty-icon">🔎</div>
              <h3>No results found</h3>
              <p>Try adjusting your search terms or clearing filters to see more events.</p>
              <button className="btn btn-outline" onClick={clearFilters}>Clear all filters</button>
            </div>
          )}

          {!hasMore && events.length > 0 && (
            <div className="pagination-end">
              ✨ You've seen all the events for now.
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
