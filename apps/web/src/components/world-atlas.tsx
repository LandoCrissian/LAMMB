// Original schematic silhouettes: approximate geography, no participation data.
export function WorldAtlas() {
  return (
    <figure className="world-atlas">
      <svg
        viewBox="0 0 800 420"
        role="img"
        aria-labelledby="atlas-title atlas-description"
      >
        <title id="atlas-title">One world. A future global flock.</title>
        <desc id="atlas-description">
          An illustrative world silhouette. No locations, country registrations
          or collector activity are shown.
        </desc>
        <g className="atlas-grid" aria-hidden="true">
          <ellipse cx="400" cy="200" rx="385" ry="185" />
          <ellipse cx="400" cy="200" rx="260" ry="185" />
          <ellipse cx="400" cy="200" rx="130" ry="185" />
          <path d="M400 15v370 M15 200h770 M54 120h692 M54 280h692 M140 55h520 M140 345h520" />
        </g>
        <g className="atlas-land">
          <path d="m56 106 29-31 52-10 24-26 58 7 28 25-23 22-25 2-9 20-26 7-10 28-30 8 7 30 23 8 16 35 25 13-9 16-26-12-30-34-22-9-16-45-21-17-18 4-17-15 17-8Z" />
          <path d="m244 23 34-12 34 19-11 36-31 24-20-12-7-33Z" />
          <path d="m194 233 36-9 39 26 13 32-23 35-6 32-24 36-13-10 2-41-16-36-15-29Z" />
          <path d="m355 133 14-16 22 2 13-14-6-26 27-25 14 7-10 31 14 16 24-13 26 12-4 22-36 9-19 18-17-8-13 7-7-18-24 12-19-1Z" />
          <path d="m357 165 39-11 29 12 13 25 24 16-15 35-14 8-8 42-21 21-17-6-4-33-20-28-18-33Z" />
          <path d="m462 80 26-15 40 4 37-17 59 8 23 18 56-5 29 28-29 18-25-7-17 24 6 34-26 37-20-11-11-32-29-5-19 33-5 27-15-4-17-46-26-4-19 9-21-22-31-2-15-26Z" />
          <path d="m603 213 15 15 17-1 9 24 27 6 2 10-35-7-16-18-21-3Z M690 170l10-14 4 22-12 12Z M460 280l9-19 5 22-9 20Z" />
          <path d="m641 303 23-24 37 4 27 19 10 38-28 6-24-12-38 8-20-17Z M757 334l9-6 4 26-16 22-9 9Z" />
        </g>
      </svg>
      <figcaption>
        <strong>ILLUSTRATION / NO LIVE ACTIVITY</strong>No country registry or
        collector counts are available.
      </figcaption>
    </figure>
  );
}
