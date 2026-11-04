const MARK_PATH = "M13 46V19h8l11 14 11-14h8v27h-9V32L32 44 22 32v14z";

const TRACES = [
  "M13 19H7l-4-4",
  "M51 19h6l4-4",
  "M13 46H7l-4 4",
  "M51 46h6l4 4",
  "M32 33V6",
  "M32 44v14",
];

const JOINT_NODES: Array<[number, number]> = [
  [13, 19],
  [51, 19],
  [13, 46],
  [51, 46],
  [32, 33],
  [32, 44],
];

const EDGE_NODES: Array<[number, number]> = [
  [3, 15],
  [61, 15],
  [3, 50],
  [61, 50],
  [32, 6],
  [32, 58],
];

const DOTS = ["d1", "d2", "d3", "d4", "d5", "d6"];

/** Decorative Mentary "M" mark rendered as a glowing circuit orb over a grid. */
export function MentaryOrb() {
  return (
    <div className="auth-art" aria-hidden="true">
      <div className="auth-art-grid" />
      {DOTS.map((dot) => (
        <span key={dot} className={`auth-art-dot auth-art-${dot}`} />
      ))}
      <div className="auth-orb-wrap">
        <div className="auth-orb-glow" />
        <div className="auth-orb-ring" />
        <div className="auth-orb">
          <svg viewBox="-4 -4 72 72" fill="none">
            <defs>
              <linearGradient id="mentary-orb-mark" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#9ff5ff" />
                <stop offset="1" stopColor="#00c2e5" />
              </linearGradient>
            </defs>
            <g
              className="auth-orb-traces"
              stroke="#7fe9ff"
              strokeWidth="0.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {TRACES.map((d) => (
                <path key={d} d={d} />
              ))}
            </g>
            <path d={MARK_PATH} fill="url(#mentary-orb-mark)" />
            {EDGE_NODES.map(([cx, cy]) => (
              <circle
                key={`e${cx}-${cy}`}
                className="auth-orb-node is-dim"
                cx={cx}
                cy={cy}
                r="1.4"
              />
            ))}
            {JOINT_NODES.map(([cx, cy]) => (
              <circle key={`j${cx}-${cy}`} className="auth-orb-node" cx={cx} cy={cy} r="1.7" />
            ))}
          </svg>
        </div>
      </div>
    </div>
  );
}

export function MentaryMark() {
  return (
    <svg className="mentary-mark" viewBox="-4 -4 72 72" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="mentary-mark-gradient" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#9ff5ff" />
          <stop offset="1" stopColor="#00c2e5" />
        </linearGradient>
      </defs>
      <g
        stroke="#7fe9ff"
        strokeWidth="0.7"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.8"
      >
        {TRACES.map((d) => (
          <path key={d} d={d} />
        ))}
      </g>
      <path d={MARK_PATH} fill="url(#mentary-mark-gradient)" />
      {EDGE_NODES.map(([cx, cy]) => (
        <circle key={`e${cx}-${cy}`} cx={cx} cy={cy} r="1.4" fill="#eaf9ff" opacity="0.6" />
      ))}
      {JOINT_NODES.map(([cx, cy]) => (
        <circle key={`j${cx}-${cy}`} cx={cx} cy={cy} r="1.7" fill="#eaf9ff" />
      ))}
    </svg>
  );
}
