const PIPE_BODY_LIGHT = "#A7AAAD";
const PIPE_BODY_DARK = "#858C95";
const PIPE_RIM_LIGHT = "#737A82";
const PIPE_RIM_DARK = "#56606C";
const PIPE_BORE_LIGHT = "#3F454B";
const PIPE_BORE_DARK = "#202833";

const pointKey = (point) =>
  `${Math.round(Number(point.x) * 2) / 2}:${Math.round(
    Number(point.y) * 2
  ) / 2}`;

export const parseOrthogonalPath = (
  path = ""
) => {
  const points = [];
  const regex =
    /[ML]\s*(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)/gi;

  let match =
    regex.exec(path);

  while (match) {
    const point = {
      x: Number(match[1]),
      y: Number(match[2]),
    };

    const previous =
      points[
        points.length - 1
      ];

    if (
      !previous ||
      Math.hypot(
        previous.x - point.x,
        previous.y - point.y
      ) > 0.25
    ) {
      points.push(point);
    }

    match =
      regex.exec(path);
  }

  return points;
};

const normalizeDirectionVector = (
  from,
  to
) => {
  const dx =
    Number(to.x) -
    Number(from.x);

  const dy =
    Number(to.y) -
    Number(from.y);

  if (
    Math.abs(dx) >=
    Math.abs(dy)
  ) {
    return {
      x:
        dx >= 0
          ? 1
          : -1,
      y: 0,
    };
  }

  return {
    x: 0,
    y:
      dy >= 0
        ? 1
        : -1,
  };
};

const vectorLabel = (
  vector
) => {
  if (vector.x > 0) {
    return "right";
  }

  if (vector.x < 0) {
    return "left";
  }

  if (vector.y > 0) {
    return "down";
  }

  return "up";
};

const oppositeVector = (
  vector
) => ({
  x: -vector.x,
  y: -vector.y,
});

const offsetPoint = (
  point,
  vector,
  amount
) => ({
  x:
    Number(point.x) +
    vector.x * amount,
  y:
    Number(point.y) +
    vector.y * amount,
});

const segmentLength = (
  start,
  end
) =>
  Math.hypot(
    Number(end.x) -
      Number(start.x),
    Number(end.y) -
      Number(start.y)
  );

const angleForSegment = (
  start,
  end
) =>
  Math.atan2(
    Number(end.y) -
      Number(start.y),
    Number(end.x) -
      Number(start.x)
  ) *
  (180 / Math.PI);

const makePipePalette = (
  dark
) => ({
  rim:
    dark
      ? PIPE_RIM_DARK
      : PIPE_RIM_LIGHT,
  body:
    dark
      ? PIPE_BODY_DARK
      : PIPE_BODY_LIGHT,
  bore:
    dark
      ? PIPE_BORE_DARK
      : PIPE_BORE_LIGHT,
  highlight:
    dark
      ? "rgba(255,255,255,.26)"
      : "rgba(255,255,255,.58)",
  shadow:
    dark
      ? "rgba(0,0,0,.35)"
      : "rgba(15,23,42,.18)",
});

export function StraightPipePiece({
  start,
  end,
  dark = false,
  selected = false,
  thickness = 24,
  modular = true,
}) {
  const length =
    segmentLength(
      start,
      end
    );

  if (length < 1) {
    return null;
  }

  const angle =
    angleForSegment(
      start,
      end
    );

  const palette =
    makePipePalette(dark);

  const bore =
    Math.max(
      8,
      thickness * 0.48
    );

  const clampCount =
    modular
      ? Math.max(
          0,
          Math.floor(
            length / 54
          ) - 1
        )
      : 0;

  return (
    <g
      className="pointer-events-none"
      transform={`translate(${start.x} ${start.y}) rotate(${angle})`}
    >
      <rect
        x="0"
        y={
          -thickness / 2 -
          2
        }
        width={length}
        height={
          thickness + 4
        }
        rx={
          thickness / 2 +
          2
        }
        fill={palette.rim}
      />

      <rect
        x="0"
        y={
          -thickness / 2
        }
        width={length}
        height={thickness}
        rx={
          thickness / 2
        }
        fill={palette.body}
        stroke={
          selected
            ? "#35C9F4"
            : "rgba(255,255,255,.24)"
        }
        strokeWidth={
          selected
            ? 1.4
            : 0.7
        }
      />

      <rect
        x="0"
        y={
          -bore / 2
        }
        width={length}
        height={bore}
        rx={bore / 2}
        fill={palette.bore}
      />

      <rect
        x="4"
        y={
          -thickness / 2 +
          3
        }
        width={
          Math.max(
            0,
            length - 8
          )
        }
        height="2.2"
        rx="1.1"
        fill={
          palette.highlight
        }
      />

      {Array.from({
        length:
          clampCount,
      }).map(
        (
          _,
          index
        ) => {
          const x =
            (
              length *
              (index + 1)
            ) /
            (
              clampCount + 1
            );

          return (
            <g
              key={`pipe-clamp-${index}`}
              transform={`translate(${x} 0)`}
            >
              <rect
                x="-3.2"
                y={
                  -thickness /
                    2 -
                  3.5
                }
                width="6.4"
                height={
                  thickness + 7
                }
                rx="1.7"
                fill={
                  palette.rim
                }
              />
              <rect
                x="-1.4"
                y={
                  -thickness /
                    2 -
                  2.2
                }
                width="2.8"
                height={
                  thickness + 4.4
                }
                fill={
                  palette.body
                }
              />
            </g>
          );
        }
      )}
    </g>
  );
}

const elbowArc = (
  vertex,
  incomingTowardPrevious,
  outgoingTowardNext,
  radius
) => {
  const start =
    offsetPoint(
      vertex,
      incomingTowardPrevious,
      radius
    );

  const end =
    offsetPoint(
      vertex,
      outgoingTowardNext,
      radius
    );

  const cross =
    incomingTowardPrevious.x *
      outgoingTowardNext.y -
    incomingTowardPrevious.y *
      outgoingTowardNext.x;

  const sweep =
    cross < 0
      ? 1
      : 0;

  return {
    start,
    end,
    path:
      `M ${start.x} ${start.y} ` +
      `A ${radius} ${radius} 0 0 ${sweep} ${end.x} ${end.y}`,
  };
};

function CollarAt({
  point,
  direction,
  dark,
  thickness,
}) {
  const palette =
    makePipePalette(dark);

  const angle =
    direction.x !== 0
      ? 0
      : 90;

  return (
    <g
      className="pointer-events-none"
      transform={`translate(${point.x} ${point.y}) rotate(${angle})`}
    >
      <rect
        x="-3.4"
        y={
          -thickness /
            2 -
          3.2
        }
        width="6.8"
        height={
          thickness + 6.4
        }
        rx="1.7"
        fill={palette.rim}
      />
      <rect
        x="-1.5"
        y={
          -thickness /
            2 -
          1.8
        }
        width="3"
        height={
          thickness + 3.6
        }
        fill={palette.body}
      />
    </g>
  );
}

export function ElbowPipePiece({
  previous,
  vertex,
  next,
  dark = false,
  selected = false,
  thickness = 24,
  radius = 17,
}) {
  const towardPrevious =
    normalizeDirectionVector(
      vertex,
      previous
    );

  const towardNext =
    normalizeDirectionVector(
      vertex,
      next
    );

  if (
    towardPrevious.x ===
      towardNext.x &&
    towardPrevious.y ===
      towardNext.y
  ) {
    return null;
  }

  const palette =
    makePipePalette(dark);

  const bore =
    Math.max(
      8,
      thickness * 0.48
    );

  const arc =
    elbowArc(
      vertex,
      towardPrevious,
      towardNext,
      radius
    );

  return (
    <g className="pointer-events-none">
      <path
        d={arc.path}
        fill="none"
        stroke={palette.rim}
        strokeWidth={
          thickness + 5
        }
        strokeLinecap="butt"
      />
      <path
        d={arc.path}
        fill="none"
        stroke={
          selected
            ? "#35C9F4"
            : palette.body
        }
        strokeWidth={thickness}
        strokeLinecap="butt"
      />
      {!selected && (
        <path
          d={arc.path}
          fill="none"
          stroke={palette.body}
          strokeWidth={
            thickness - 1.2
          }
          strokeLinecap="butt"
        />
      )}
      <path
        d={arc.path}
        fill="none"
        stroke={palette.bore}
        strokeWidth={bore}
        strokeLinecap="round"
      />
      <path
        d={arc.path}
        fill="none"
        stroke={palette.highlight}
        strokeWidth="2"
        strokeLinecap="round"
        opacity=".72"
        transform="translate(0 -2)"
      />

      <CollarAt
        point={arc.start}
        direction={
          towardPrevious
        }
        dark={dark}
        thickness={
          thickness
        }
      />
      <CollarAt
        point={arc.end}
        direction={
          towardNext
        }
        dark={dark}
        thickness={
          thickness
        }
      />
    </g>
  );
}

export function PipeFlangePiece({
  point,
  direction,
  dark = false,
  selected = false,
  thickness = 24,
}) {
  const palette =
    makePipePalette(dark);

  const angle =
    direction.x !== 0
      ? 0
      : 90;

  const bore =
    Math.max(
      8,
      thickness * 0.46
    );

  return (
    <g
      className="pointer-events-none"
      transform={`translate(${point.x} ${point.y}) rotate(${angle})`}
    >
      <rect
        x="-7"
        y={
          -thickness /
            2 -
          5
        }
        width="7"
        height={
          thickness + 10
        }
        rx="1.5"
        fill={palette.rim}
        stroke={
          selected
            ? "#35C9F4"
            : "rgba(255,255,255,.28)"
        }
        strokeWidth={
          selected
            ? 1.1
            : 0.6
        }
      />
      <rect
        x="-4.5"
        y={
          -thickness /
            2 -
          2.2
        }
        width="4.5"
        height={
          thickness + 4.4
        }
        fill={palette.body}
      />
      <rect
        x="-4.8"
        y={
          -bore / 2
        }
        width="5"
        height={bore}
        rx={bore / 2}
        fill={palette.bore}
      />
    </g>
  );
}

const directionVector = (
  label
) => {
  switch (label) {
    case "left":
      return {
        x: -1,
        y: 0,
      };
    case "right":
      return {
        x: 1,
        y: 0,
      };
    case "up":
      return {
        x: 0,
        y: -1,
      };
    case "down":
    default:
      return {
        x: 0,
        y: 1,
      };
  }
};

export function PipeJunctionPiece({
  x,
  y,
  directions = [],
  color = "#35C9F4",
  dark = false,
  thickness = 24,
  selected = false,
}) {
  const palette =
    makePipePalette(dark);

  const unique =
    Array.from(
      new Set(directions)
    );

  const bore =
    Math.max(
      8,
      thickness * 0.48
    );

  const stub =
    22;

  return (
    <g
      className="pointer-events-none"
      transform={`translate(${x} ${y})`}
    >
      {unique.map(
        (label) => {
          const vector =
            directionVector(
              label
            );

          return (
            <g
              key={label}
            >
              <line
                x1="0"
                y1="0"
                x2={
                  vector.x *
                  stub
                }
                y2={
                  vector.y *
                  stub
                }
                stroke={
                  palette.rim
                }
                strokeWidth={
                  thickness + 5
                }
                strokeLinecap="butt"
              />
              <line
                x1="0"
                y1="0"
                x2={
                  vector.x *
                  stub
                }
                y2={
                  vector.y *
                  stub
                }
                stroke={
                  palette.body
                }
                strokeWidth={
                  thickness
                }
                strokeLinecap="butt"
              />
              <line
                x1="0"
                y1="0"
                x2={
                  vector.x *
                  stub
                }
                y2={
                  vector.y *
                  stub
                }
                stroke={
                  palette.bore
                }
                strokeWidth={bore}
                strokeLinecap="round"
              />
            </g>
          );
        }
      )}

      <circle
        r={
          thickness * 0.67
        }
        fill={palette.rim}
      />
      <circle
        r={
          thickness * 0.54
        }
        fill={palette.body}
        stroke={
          selected
            ? "#35C9F4"
            : "rgba(255,255,255,.3)"
        }
        strokeWidth={
          selected
            ? 1.3
            : 0.7
        }
      />
      <circle
        r={
          bore * 0.5
        }
        fill={palette.bore}
      />
      <circle
        r="2.3"
        fill={color}
        opacity=".88"
      />
    </g>
  );
}

const pointOnSegment = (
  point,
  start,
  end,
  tolerance = 1.2
) => {
  const minX =
    Math.min(
      start.x,
      end.x
    ) -
    tolerance;

  const maxX =
    Math.max(
      start.x,
      end.x
    ) +
    tolerance;

  const minY =
    Math.min(
      start.y,
      end.y
    ) -
    tolerance;

  const maxY =
    Math.max(
      start.y,
      end.y
    ) +
    tolerance;

  if (
    point.x < minX ||
    point.x > maxX ||
    point.y < minY ||
    point.y > maxY
  ) {
    return false;
  }

  const horizontal =
    Math.abs(
      start.y - end.y
    ) <= tolerance;

  if (horizontal) {
    return (
      Math.abs(
        point.y - start.y
      ) <= tolerance
    );
  }

  const vertical =
    Math.abs(
      start.x - end.x
    ) <= tolerance;

  if (vertical) {
    return (
      Math.abs(
        point.x - start.x
      ) <= tolerance
    );
  }

  const length =
    segmentLength(
      start,
      end
    );

  const a =
    segmentLength(
      start,
      point
    );

  const b =
    segmentLength(
      point,
      end
    );

  return (
    Math.abs(
      a + b - length
    ) <= tolerance * 2
  );
};

const directionsAtPoint = (
  point,
  start,
  end
) => {
  const directions = [];

  if (
    Math.hypot(
      point.x - start.x,
      point.y - start.y
    ) > 1
  ) {
    directions.push(
      vectorLabel(
        normalizeDirectionVector(
          point,
          start
        )
      )
    );
  }

  if (
    Math.hypot(
      point.x - end.x,
      point.y - end.y
    ) > 1
  ) {
    directions.push(
      vectorLabel(
        normalizeDirectionVector(
          point,
          end
        )
      )
    );
  }

  return directions;
};

export const buildPipeNetworkJunctions = (
  routes = []
) => {
  const prepared =
    routes
      .map(
        (route) => {
          const vertices =
            parseOrthogonalPath(
              route.path
            );

          if (
            vertices.length < 2
          ) {
            return null;
          }

          return {
            ...route,
            vertices,
            segments:
              vertices
                .slice(0, -1)
                .map(
                  (
                    start,
                    index
                  ) => ({
                    start,
                    end:
                      vertices[
                        index + 1
                      ],
                  })
                ),
          };
        }
      )
      .filter(Boolean);

  const candidateMap =
    new Map();

  prepared.forEach(
    (route) => {
      route.vertices.forEach(
        (point) => {
          const key =
            pointKey(point);

          if (
            !candidateMap.has(
              key
            )
          ) {
            candidateMap.set(
              key,
              {
                x:
                  point.x,
                y:
                  point.y,
              }
            );
          }
        }
      );
    }
  );

  const junctions = [];

  candidateMap.forEach(
    (point) => {
      const routeIds =
        new Set();

      const directions =
        new Set();

      let color =
        "#35C9F4";

      let hasInteriorTouch =
        false;

      prepared.forEach(
        (route) => {
          let touched =
            false;

          const routeInteriorVertex =
            route.vertices
              .slice(
                1,
                -1
              )
              .some(
                (vertex) =>
                  Math.hypot(
                    vertex.x -
                      point.x,
                    vertex.y -
                      point.y
                  ) <=
                  1.2
              );

          if (
            routeInteriorVertex
          ) {
            hasInteriorTouch =
              true;
          }

          route.segments.forEach(
            (segment) => {
              if (
                !pointOnSegment(
                  point,
                  segment.start,
                  segment.end
                )
              ) {
                return;
              }

              touched = true;

              const segmentSize =
                segmentLength(
                  segment.start,
                  segment.end
                );

              if (
                segmentSize >
                2.4
              ) {
                const fromStart =
                  segmentLength(
                    segment.start,
                    point
                  );

                const fromEnd =
                  segmentLength(
                    point,
                    segment.end
                  );

                if (
                  fromStart >
                    1.2 &&
                  fromEnd >
                    1.2
                ) {
                  hasInteriorTouch =
                    true;
                }
              }

              directionsAtPoint(
                point,
                segment.start,
                segment.end
              ).forEach(
                (direction) =>
                  directions.add(
                    direction
                  )
              );
            }
          );

          if (touched) {
            routeIds.add(
              route.id
            );

            if (
              route.color
            ) {
              color =
                route.color;
            }
          }
        }
      );

      if (
        routeIds.size < 2 ||
        directions.size < 2 ||
        !hasInteriorTouch
      ) {
        return;
      }

      junctions.push({
        id:
          `pipe-junction-${pointKey(
            point
          )}`,
        x:
          point.x,
        y:
          point.y,
        directions:
          Array.from(
            directions
          ),
        color,
        type:
          directions.size >= 4
            ? "cross"
            : directions.size === 3
            ? "tee"
            : "coupling",
      });
    }
  );

  return junctions;
};

export function ProcessPipeJunctions({
  junctions = [],
  dark = false,
  thickness = 24,
}) {
  return (
    <g className="pointer-events-none">
      {junctions.map(
        (junction) => (
          <PipeJunctionPiece
            key={
              junction.id
            }
            x={junction.x}
            y={junction.y}
            directions={
              junction.directions
            }
            color={
              junction.color
            }
            dark={dark}
            thickness={
              thickness
            }
          />
        )
      )}
    </g>
  );
}

export function RealPipeRoute({
  path,
  color = "#35C9F4",
  dark = false,
  selected = false,
  animateFlow = true,
  duration = 1.6,
  thickness = 24,
  showStartFlange = true,
  showEndFlange = true,
}) {
  const vertices =
    parseOrthogonalPath(
      path
    );

  if (
    vertices.length < 2
  ) {
    return null;
  }

  const bendRadius =
    17;

  const straightPieces =
    vertices
      .slice(0, -1)
      .map(
        (
          start,
          index
        ) => {
          const end =
            vertices[
              index + 1
            ];

          const vector =
            normalizeDirectionVector(
              start,
              end
            );

          const length =
            segmentLength(
              start,
              end
            );

          const safeTrim =
            Math.min(
              bendRadius,
              Math.max(
                0,
                length /
                  3
              )
            );

          const trimStart =
            index > 0
              ? safeTrim
              : 0;

          const trimEnd =
            index <
            vertices.length -
              2
              ? safeTrim
              : 0;

          return {
            start:
              offsetPoint(
                start,
                vector,
                trimStart
              ),
            end:
              offsetPoint(
                end,
                oppositeVector(
                  vector
                ),
                trimEnd
              ),
          };
        }
      );

  const firstDirection =
    normalizeDirectionVector(
      vertices[0],
      vertices[1]
    );

  const lastDirection =
    normalizeDirectionVector(
      vertices[
        vertices.length - 2
      ],
      vertices[
        vertices.length - 1
      ]
    );

  return (
    <g>
      {straightPieces.map(
        (
          piece,
          index
        ) => (
          <StraightPipePiece
            key={`straight-${index}`}
            start={
              piece.start
            }
            end={
              piece.end
            }
            dark={dark}
            selected={
              selected
            }
            thickness={
              thickness
            }
          />
        )
      )}

      {vertices
        .slice(
          1,
          -1
        )
        .map(
          (
            vertex,
            index
          ) => (
            <ElbowPipePiece
              key={`elbow-${index}`}
              previous={
                vertices[
                  index
                ]
              }
              vertex={
                vertex
              }
              next={
                vertices[
                  index + 2
                ]
              }
              dark={dark}
              selected={
                selected
              }
              thickness={
                thickness
              }
              radius={
                bendRadius
              }
            />
          )
        )}

      {showStartFlange && (
        <PipeFlangePiece
          point={
            vertices[0]
          }
          direction={
            oppositeVector(
              firstDirection
            )
          }
          dark={dark}
          selected={
            selected
          }
          thickness={
            thickness
          }
        />
      )}

      {showEndFlange && (
        <PipeFlangePiece
          point={
            vertices[
              vertices.length - 1
            ]
          }
          direction={
            lastDirection
          }
          dark={dark}
          selected={
            selected
          }
          thickness={
            thickness
          }
        />
      )}

      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth="3.1"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray="10 9"
        opacity={
          animateFlow
            ? 0.96
            : 0.55
        }
        className={
          animateFlow
            ? "process-real-pipe-flow pointer-events-none"
            : "pointer-events-none"
        }
        style={{
          animationDuration:
            `${duration}s`,
          filter:
            `drop-shadow(0 0 2px ${color}55)`,
        }}
      />
    </g>
  );
}
