'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { PointerEvent, KeyboardEvent } from 'react';
import {
  countries,
  atlasCollections,
  filterCollections,
  searchCountries,
  readAtlasFragment,
} from '../config/atlas';
import {
  constrainView,
  focusShape,
  initialView,
  pinchView,
  zoomAt,
} from './atlas-geometry';
import type { AtlasData, Point, View } from './atlas-geometry';

export function WorldAtlas({ embedded = false }: { embedded?: boolean } = {}) {
  const [data, setData] = useState<AtlasData | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<(typeof countries)[number] | null>(
    null,
  );
  const [community, setCommunity] = useState('all');
  const [expanded, setExpanded] = useState(false);
  const [view, setView] = useState(initialView);
  const viewRef = useRef(initialView);
  const pointers = useRef(new Map<number, Point>());
  const gesture = useRef<{
    start: Point;
    code: string | null;
    moved: boolean;
  } | null>(null);
  const applyView = useCallback((next: View) => {
    viewRef.current = next;
    setView(next);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetch('/maps/countries-v1.json', { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error('Boundary asset unavailable');
        return response.json() as Promise<AtlasData>;
      })
      .then((result) => {
        if (
          result.version !== 'lammb-atlas-1' ||
          result.countries.length !== 248
        )
          throw new Error('Boundary version mismatch');
        setData(result);
      })
      .catch((error: unknown) => {
        if (!(error instanceof DOMException && error.name === 'AbortError'))
          setFailed(true);
      });
    return () => controller.abort();
  }, [attempt]);

  useEffect(() => {
    if (embedded) return;
    const sync = () => {
      const state = readAtlasFragment(location.hash);
      setSelected(state.country);
      setCommunity(state.collection);
      setExpanded(Boolean(state.country));
      const shape = data?.countries.find(
        (country) => country.code === state.country?.code,
      );
      applyView(shape ? focusShape(shape) : initialView);
    };
    sync();
    window.addEventListener('hashchange', sync);
    return () => window.removeEventListener('hashchange', sync);
  }, [data, applyView, embedded]);

  function choose(code: string, filter = community) {
    const country = countries.find((item) => item.code === code);
    if (!country) return;
    // Native fragment history supports links, refresh and back/forward.
    if (!embedded)
      location.hash = new URLSearchParams({
        country: code,
        community: filter,
      }).toString();
    setSelected(country);
    setCommunity(filter);
    setExpanded(true);
    const shape = data?.countries.find((item) => item.code === code);
    applyView(shape ? focusShape(shape) : initialView);
  }
  function selectCommunity(filter: string) {
    setCommunity(filter);
    if (selected) choose(selected.code, filter);
    else if (!embedded)
      location.hash = new URLSearchParams({ community: filter }).toString();
  }
  function point(event: PointerEvent<SVGSVGElement>): Point {
    const matrix = event.currentTarget.getScreenCTM();
    if (!matrix) return { x: 0, y: 0 };
    const converted = new DOMPoint(
      event.clientX,
      event.clientY,
    ).matrixTransform(matrix.inverse());
    return { x: converted.x, y: converted.y };
  }
  function pointerDown(event: PointerEvent<SVGSVGElement>) {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    const start = point(event);
    pointers.current.set(event.pointerId, start);
    const code =
      event.target instanceof Element
        ? (event.target
            .closest('[data-country]')
            ?.getAttribute('data-country') ?? null)
        : null;
    if (pointers.current.size === 1)
      gesture.current = {
        start: { x: event.clientX, y: event.clientY },
        code,
        moved: false,
      };
    else if (gesture.current) gesture.current.moved = true;
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function pointerMove(event: PointerEvent<SVGSVGElement>) {
    const previous = pointers.current.get(event.pointerId);
    if (!previous) return;
    const next = point(event);
    const before = [...pointers.current.values()];
    pointers.current.set(event.pointerId, next);
    const after = [...pointers.current.values()];
    if (
      gesture.current &&
      Math.hypot(
        event.clientX - gesture.current.start.x,
        event.clientY - gesture.current.start.y,
      ) > 8
    )
      gesture.current.moved = true;
    if (before.length === 2 && before[0] && before[1] && after[0] && after[1])
      applyView(
        pinchView(
          viewRef.current,
          [before[0], before[1]],
          [after[0], after[1]],
        ),
      );
    else if (before.length === 1)
      applyView(
        constrainView({
          ...viewRef.current,
          x: viewRef.current.x + next.x - previous.x,
          y: viewRef.current.y + next.y - previous.y,
        }),
      );
  }
  function pointerEnd(event: PointerEvent<SVGSVGElement>) {
    if (!pointers.current.has(event.pointerId)) return;
    const candidate = gesture.current;
    pointers.current.delete(event.pointerId);
    if (
      event.type === 'pointerup' &&
      pointers.current.size === 0 &&
      candidate &&
      !candidate.moved &&
      candidate.code
    )
      choose(candidate.code);
    if (pointers.current.size === 0) gesture.current = null;
  }
  function mapKeys(event: KeyboardEvent<SVGSVGElement>) {
    const delta = 65;
    const keys = [
      'ArrowLeft',
      'ArrowRight',
      'ArrowUp',
      'ArrowDown',
      '+',
      '=',
      '-',
      '0',
      'Home',
    ];
    if (!keys.includes(event.key)) return;
    event.preventDefault();
    const current = viewRef.current;
    if (['0', 'Home'].includes(event.key)) applyView(initialView);
    else if (['+', '=', '-'].includes(event.key))
      applyView(
        zoomAt(current, event.key === '-' ? 1 / 1.5 : 1.5, { x: 500, y: 260 }),
      );
    else
      applyView(
        constrainView({
          ...current,
          x:
            current.x +
            (event.key === 'ArrowLeft'
              ? delta
              : event.key === 'ArrowRight'
                ? -delta
                : 0),
          y:
            current.y +
            (event.key === 'ArrowUp'
              ? delta
              : event.key === 'ArrowDown'
                ? -delta
                : 0),
        }),
      );
  }
  const results = searchCountries(query);
  return (
    <div className="atlas-experience">
      <div className="atlas-toolbar">
        <div
          className="atlas-filters"
          role="group"
          aria-label="Community filter"
        >
          <button
            type="button"
            aria-pressed={community === 'all'}
            onClick={() => selectCommunity('all')}
          >
            All communities
          </button>
          {filterCollections.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={community === item.id}
              onClick={() => selectCommunity(item.id)}
            >
              {item.name}
              {item.role === 'FOUNDING' && <span> founding</span>}
            </button>
          ))}
        </div>
        <p className="atlas-registry-status">REGISTRY NOT YET LIVE</p>
      </div>
      <div className="atlas-layout">
        <div className="atlas-map-column">
          <div
            className="atlas-stage"
            role="region"
            aria-label="Geographic world atlas"
          >
            <div className="atlas-stage-label" aria-hidden="true">
              <span>THE GLOBAL FLOCK</span>
              <span>4663 / EARTH</span>
            </div>
            {data ? (
              <svg
                className="atlas-map"
                viewBox="0 0 1000 520"
                role="img"
                tabIndex={0}
                aria-label="Interactive world map"
                aria-describedby="atlas-controls-help"
                data-zoom={view.k.toFixed(3)}
                onKeyDown={mapKeys}
                onPointerDown={pointerDown}
                onPointerMove={pointerMove}
                onPointerUp={pointerEnd}
                onPointerCancel={pointerEnd}
                onLostPointerCapture={pointerEnd}
              >
                <g
                  transform={`translate(${view.x},${view.y}) scale(${view.k})`}
                >
                  <path className="atlas-ocean" d={data.outline} />
                  <path className="atlas-graticule" d={data.graticule} />
                  {data.countries.map((country) => (
                    <path
                      key={country.code}
                      data-country={country.code}
                      className={`atlas-country${selected?.code === country.code ? ' is-selected' : ''}`}
                      d={country.path}
                      aria-hidden="true"
                    >
                      <title>
                        {
                          countries.find((item) => item.code === country.code)
                            ?.name
                        }
                      </title>
                    </path>
                  ))}
                  {data.exceptions.map((area) => (
                    <path
                      key={area.name}
                      className="atlas-exception"
                      d={area.path}
                      aria-hidden="true"
                    >
                      <title>
                        {area.name} — geographic area without an ISO country
                        code; see map notes
                      </title>
                    </path>
                  ))}
                </g>
              </svg>
            ) : (
              <div className="atlas-load" role="status">
                {failed ? (
                  <>
                    <p>
                      Country boundaries could not load. The country list still
                      works.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setFailed(false);
                        setAttempt(attempt + 1);
                      }}
                    >
                      Retry map
                    </button>
                  </>
                ) : (
                  <p>Opening the atlas…</p>
                )}
              </div>
            )}
            <div
              className="atlas-map-controls"
              role="group"
              aria-label="Map view controls"
            >
              <button
                type="button"
                disabled={!data}
                aria-label="Zoom in"
                onClick={() =>
                  applyView(zoomAt(viewRef.current, 1.5, { x: 500, y: 260 }))
                }
              >
                +
              </button>
              <button
                type="button"
                disabled={!data}
                aria-label="Zoom out"
                onClick={() =>
                  applyView(
                    zoomAt(viewRef.current, 1 / 1.5, { x: 500, y: 260 }),
                  )
                }
              >
                −
              </button>
              <button
                type="button"
                disabled={!data}
                onClick={() => applyView(initialView)}
              >
                Reset view
              </button>
            </div>
            <div className="atlas-map-caption">
              <span>GEOGRAPHY, NOT PARTICIPATION</span>
              <a href="#map-notes">Map notes</a>
            </div>
          </div>
          <p id="atlas-controls-help" className="atlas-help">
            Tap a country. Drag to pan. Pinch to zoom. With map focus: + / −
            zoom, arrows pan, Home resets. Use the country list for small
            islands.
          </p>
          <details className="atlas-country-directory">
            <summary>
              Search &amp; country list <span>249 countries / territories</span>
            </summary>
            <label htmlFor="atlas-search">Find a country or ISO code</label>
            <input
              id="atlas-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              autoComplete="off"
              placeholder="Country name or code"
            />
            <p className="atlas-search-status" role="status">
              {results.length
                ? `${results.length} geographic results. No registration counts.`
                : 'No countries match. Try another name or code.'}
            </p>
            <ul
              className="atlas-country-list"
              aria-label="Countries and territories"
            >
              {results.map((country) => (
                <li key={country.code}>
                  <a
                    href={`#country=${country.code}&community=${community}`}
                    aria-current={
                      country.code === selected?.code ? 'location' : undefined
                    }
                    onClick={(event) => {
                      event.preventDefault();
                      choose(country.code);
                    }}
                  >
                    {country.name}
                    <span>{country.code}</span>
                  </a>
                </li>
              ))}
            </ul>
          </details>
        </div>
        <aside className="atlas-country-sheet" aria-label="Country details">
          <button
            type="button"
            className="atlas-sheet-toggle"
            aria-expanded={expanded}
            aria-controls="atlas-country-details"
            onClick={() => setExpanded(!expanded)}
          >
            {selected
              ? `${selected.name} / ${selected.code}`
              : 'Explore a country'}
            <span aria-hidden="true">{expanded ? '−' : '+'}</span>
          </button>
          <div
            className={`atlas-country-details${expanded ? ' is-open' : ''}`}
            id="atlas-country-details"
          >
            <p className="atlas-eyebrow">
              {selected
                ? `ISO 3166-1 / ${selected.code}`
                : 'YOUR WORLD. YOUR CHOICE.'}
            </p>
            <h2 id="atlas-country-heading">
              {selected?.name ?? 'The flock starts somewhere.'}
            </h2>
            <p className="atlas-country-status" role="status">
              {selected
                ? `${selected.name} selected. Registration unavailable.`
                : 'Select any country to explore.'}
            </p>
            {selected && !selected.boundaryAvailable && (
              <p className="atlas-boundary-warning">
                Boundary unavailable in this dataset. No approximate polygon is
                substituted.
              </p>
            )}
            <div className="atlas-empty-state">
              <h3>Community participation</h3>
              <p>
                {community === 'lammb'
                  ? 'LAMMB / founding collection concept.'
                  : 'All admitted communities / future view.'}{' '}
                No live registry or collector counts are available.
              </p>
              <h3>Specimen gallery</h3>
              <p>
                Verified, opt-in specimens will belong here. No ownership is
                claimed.
              </p>
              <h3>First Arrival</h3>
              <p>
                Future verified arrival history. No arrival has been recorded
                here.
              </p>
            </div>
            <p className="atlas-chain">Robinhood Chain / 4663</p>
            <p className="atlas-voluntary">
              Country is a voluntary choice. No GPS, IP location or precise
              address.
            </p>
            <details className="atlas-admission">
              <summary>Future community candidates</summary>
              <ul>
                {atlasCollections
                  .filter((item) => item.admission === 'CANDIDATE')
                  .map((item) => (
                    <li key={item.id}>
                      {item.name}
                      <span>Candidate / not admitted</span>
                    </li>
                  ))}
              </ul>
            </details>
          </div>
        </aside>
      </div>
      <noscript>
        <style>
          {
            '.atlas-stage,.atlas-help,.atlas-filters,.atlas-country-sheet,.atlas-search-status,.atlas-country-directory input,.atlas-country-directory label { display: none !important; }'
          }
        </style>
        <p>
          Interactive map controls need JavaScript. The native country list
          remains available for geographic exploration. Nothing is registered.
        </p>
      </noscript>
    </div>
  );
}
