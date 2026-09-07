import CustomLayoutPart from "./CustomLayoutPart";
import {
  normalizeCustomLayoutConfig,
} from "./customLayoutConfig";

export default function CustomLayoutWidget({
  data = {},
  history = [],
  item = {},
}) {
  const config =
    normalizeCustomLayoutConfig(
      item?.customLayoutConfig
    );

  const canvasWidth =
    config.canvas.width;

  const canvasHeight =
    config.canvas.height;

  return (
    <div
      className="h-full min-h-0 w-full overflow-hidden"
      style={{
        backgroundColor:
          config.canvas
            .transparentBackground
            ? "transparent"
            : config.canvas
                .backgroundColor ||
              "#FFFFFF",
      }}
    >
      <div className="relative h-full w-full">
        {config.parts.map(
          (part) => (
            <section
              key={part.id}
              className="absolute min-h-0 min-w-0 overflow-hidden"
              style={{
                left: `${
                  (
                    part.x /
                    canvasWidth
                  ) * 100
                }%`,
                top: `${
                  (
                    part.y /
                    canvasHeight
                  ) * 100
                }%`,
                width: `${
                  (
                    part.w /
                    canvasWidth
                  ) * 100
                }%`,
                height: `${
                  (
                    part.h /
                    canvasHeight
                  ) * 100
                }%`,
                zIndex:
                  part.z || 1,
                opacity:
                  part.opacity ??
                  1,
                transform: `rotate(${
                  part.rotation || 0
                }deg)`,
                transformOrigin:
                  "center center",
                backgroundColor:
                  part.backgroundColor ||
                  "transparent",
                border:
                  part.showFrame
                    ? `1px solid ${
                        part.borderColor ||
                        "#D8E2EF"
                      }`
                    : "none",
                borderRadius:
                  `${
                    part.borderRadius ??
                    12
                  }px`,
              }}
            >
              <CustomLayoutPart
                part={part}
                data={data}
                history={history}
              />
            </section>
          )
        )}
      </div>
    </div>
  );
}
