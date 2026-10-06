// Decorative altitude study. Replace this component with approved artwork.
export function AscentArt() {
  return (
    <div className="ascent-art" aria-hidden="true">
      <svg viewBox="0 0 640 520" fill="none" focusable="false">
        <defs>
          <linearGradient
            id="ridge"
            x1="320"
            y1="60"
            x2="320"
            y2="500"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#daff00" stopOpacity="0.8" />
            <stop offset="1" stopColor="#daff00" stopOpacity="0.04" />
          </linearGradient>
        </defs>
        <g stroke="url(#ridge)" strokeWidth="1">
          {Array.from({ length: 14 }, (_, index) => {
            const offset = index * 17;
            return (
              <path
                key={index}
                d={`M-40 ${390 + offset} L130 ${260 + offset} L220 ${305 + offset} L340 ${80 + offset} L425 ${250 + offset} L500 ${200 + offset} L680 ${370 + offset}`}
              />
            );
          })}
        </g>
        <path
          d="M340 60V480"
          stroke="#daff00"
          strokeOpacity="0.2"
          strokeDasharray="3 9"
        />
        <circle cx="340" cy="80" r="5" fill="#daff00" />
        <path d="M325 80H355M340 65V95" stroke="#daff00" />
        <g fill="#daff00">
          <rect x="213" y="299" width="7" height="7" />
          <rect x="427" y="246" width="13" height="4" />
          <rect x="444" y="246" width="4" height="4" />
          <rect x="148" y="364" width="4" height="10" />
        </g>
      </svg>
      <span className="art-caption">
        Colorado altitude study / artwork pending
      </span>
    </div>
  );
}
