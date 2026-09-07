import {
  parseOrthogonalPath,
} from "./ProcessPipeParts";

const segmentLength = (
  start,
  end
) =>
  Math.hypot(
    end.x - start.x,
    end.y - start.y
  );

const segmentAngle = (
  start,
  end
) =>
  Math.atan2(
    end.y - start.y,
    end.x - start.x
  ) *
  (180 / Math.PI);

const isFruitMedium = (
  medium
) =>
  [
    "fruit",
    "ffb",
    "looseFruit",
    "bunch",
    "freshFruitBunch",
  ].includes(medium);

function ConveyorStraightTile({
  start,
  end,
  dark = false,
  selected = false,
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
    segmentAngle(
      start,
      end
    );

  const rail =
    dark
      ? "#87909A"
      : "#9A9D9F";

  const belt =
    dark
      ? "#282D33"
      : "#3F4346";

  const roller =
    dark
      ? "#C5CBD3"
      : "#C8CBCC";

  const rollerCount =
    Math.max(
      2,
      Math.floor(
        length / 18
      )
    );

  return (
    <g
      className="pointer-events-none"
      transform={`translate(${start.x} ${start.y}) rotate(${angle})`}
    >
      <rect
        x="0"
        y="-13"
        width={length}
        height="26"
        rx="13"
        fill={rail}
        stroke={
          selected
            ? "#35C9F4"
            : "rgba(255,255,255,.28)"
        }
        strokeWidth={
          selected
            ? 1.5
            : 0.7
        }
      />

      <rect
        x="7"
        y="-9"
        width={
          Math.max(
            0,
            length - 14
          )
        }
        height="18"
        rx="9"
        fill={belt}
      />

      <rect
        x="8"
        y="-7"
        width={
          Math.max(
            0,
            length - 16
          )
        }
        height="2"
        rx="1"
        fill="rgba(255,255,255,.18)"
      />

      {Array.from({
        length:
          rollerCount,
      }).map(
        (
          _,
          index
        ) => {
          const x =
            (
              length *
              (index + 0.5)
            ) /
            rollerCount;

          return (
            <g
              key={`roller-${index}`}
              className="process-conveyor-roller"
              transform={`translate(${x} 0)`}
            >
              <circle
                r="4.4"
                fill={roller}
                stroke={
                  dark
                    ? "#4B5563"
                    : "#6B7280"
                }
                strokeWidth=".8"
              />
              <path
                d="M-2.8 0h5.6M0-2.8v5.6"
                stroke={
                  dark
                    ? "#5F6975"
                    : "#73787B"
                }
                strokeWidth=".9"
                strokeLinecap="round"
              />
              <circle
                r="1.1"
                fill={
                  dark
                    ? "#4B5563"
                    : "#5F6366"
                }
              />
            </g>
          );
        }
      )}

      <line
        x1="6"
        y1="-13"
        x2={
          Math.max(
            6,
            length - 6
          )
        }
        y2="-13"
        stroke={
          dark
            ? "#B2BAC4"
            : "#B6B8BA"
        }
        strokeWidth="2.2"
      />

      <line
        x1="6"
        y1="13"
        x2={
          Math.max(
            6,
            length - 6
          )
        }
        y2="13"
        stroke={
          dark
            ? "#646D78"
            : "#7C8083"
        }
        strokeWidth="2.2"
      />
    </g>
  );
}

function ConveyorCorner({
  point,
  dark = false,
  selected = false,
}) {
  return (
    <g
      className="pointer-events-none"
      transform={`translate(${point.x} ${point.y})`}
    >
      <circle
        r="15.5"
        fill={
          dark
            ? "#87909A"
            : "#9A9D9F"
        }
        stroke={
          selected
            ? "#35C9F4"
            : "rgba(255,255,255,.28)"
        }
        strokeWidth={
          selected
            ? 1.4
            : 0.7
        }
      />
      <circle
        r="10.5"
        fill={
          dark
            ? "#282D33"
            : "#3F4346"
        }
      />
      <circle
        r="5.2"
        fill={
          dark
            ? "#C5CBD3"
            : "#C8CBCC"
        }
        stroke={
          dark
            ? "#4B5563"
            : "#6B7280"
        }
        strokeWidth=".9"
      />
      <circle
        r="1.8"
        fill={
          dark
            ? "#4B5563"
            : "#62676A"
        }
      />
    </g>
  );
}

function MovingPackage({
  path,
  duration,
  delay,
  color,
  medium,
  productStyle = "auto",
}) {
  const useFruit =
    productStyle ===
      "ffb" ||
    (
      productStyle ===
        "auto" &&
      isFruitMedium(
        medium
      )
    );

  return (
    <g className="pointer-events-none">
      {useFruit ? (
        <g>
          <circle
            cx="-4"
            cy="0"
            r="4.5"
            fill="#C86B2D"
          />
          <circle
            cx="1"
            cy="-3"
            r="4.8"
            fill="#F59E0B"
          />
          <circle
            cx="4"
            cy="2"
            r="4.3"
            fill="#B45309"
          />
          <circle
            cx="-1"
            cy="3"
            r="4.1"
            fill="#E58A32"
          />
          <path
            d="M0 -7l2-4"
            stroke="#4D7C0F"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </g>
      ) : (
        <g>
          <rect
            x="-8"
            y="-6"
            width="16"
            height="12"
            rx="2"
            fill={color}
            stroke="rgba(255,255,255,.95)"
            strokeWidth="1"
          />
          <path
            d="M-6 -2h12M0 -5v10"
            stroke="rgba(255,255,255,.52)"
            strokeWidth=".9"
          />
          <path
            d="M-5 5h10"
            stroke="rgba(15,23,42,.24)"
            strokeWidth="1"
          />
        </g>
      )}

      <animateMotion
        path={path}
        dur={`${duration}s`}
        begin={`${delay}s`}
        repeatCount="indefinite"
        rotate="auto"
      />
    </g>
  );
}

export default function ProcessConveyorTrack({
  path,
  color = "#F59E0B",
  medium = "product",
  dark = false,
  selected = false,
  animateFlow = true,
  duration = 3.8,
  productStyle = "auto",
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

  const productCount = 5;

  return (
    <g>
      {vertices
        .slice(
          0,
          -1
        )
        .map(
          (
            start,
            index
          ) => (
            <ConveyorStraightTile
              key={`conveyor-segment-${index}`}
              start={start}
              end={
                vertices[
                  index + 1
                ]
              }
              dark={dark}
              selected={
                selected
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
            point,
            index
          ) => (
            <ConveyorCorner
              key={`conveyor-corner-${index}`}
              point={point}
              dark={dark}
              selected={
                selected
              }
            />
          )
        )}

      <path
        d={path}
        fill="none"
        stroke="rgba(255,255,255,.2)"
        strokeWidth="2"
        strokeDasharray="2 14"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={
          animateFlow
            ? "process-conveyor-track-motion pointer-events-none"
            : "pointer-events-none"
        }
        style={{
          animationDuration:
            `${Math.max(
              0.65,
              duration * 0.28
            )}s`,
        }}
      />

      {animateFlow &&
        Array.from({
          length:
            productCount,
        }).map(
          (
            _,
            index
          ) => (
            <MovingPackage
              key={`moving-product-${index}`}
              path={path}
              color={color}
              medium={
                medium
              }
              productStyle={
                productStyle
              }
              duration={
                duration
              }
              delay={
                -(
                  duration *
                  index
                ) /
                productCount
              }
            />
          )
        )}
    </g>
  );
}
