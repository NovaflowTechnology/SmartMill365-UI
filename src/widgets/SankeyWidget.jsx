import {
  ResponsiveContainer,
  Sankey,
  Tooltip,
} from "recharts";

import { useId } from "react";
import { TECH_SURFACE_CLASS, TechBackdrop } from "./widgetTech";

export const defaultSankeyConfig = {
  sourceName: "Boiler A",
  sourceColor: "#7CB342",
  unit: "psi",
  outputs: [
    {
      id: "output-1",
      name: "Sterilizer 1",
      color: "#2E7D32",
      dataKey: "",
      dataSource: {
        bucket: "Mill",
        measurement: "PBLR",
        tagKey: "id",
        tagValue: "",
        id: "",
        channel: "ch2",
      },
    },
    {
      id: "output-2",
      name: "Sterilizer 2",
      color: "#A4C65A",
      dataKey: "",
      dataSource: {
        bucket: "Mill",
        measurement: "PBLR",
        tagKey: "id",
        tagValue: "",
        id: "",
        channel: "ch2",
      },
    },
    {
      id: "output-3",
      name: "Sterilizer 3",
      color: "#6D254D",
      dataKey: "",
      dataSource: {
        bucket: "Mill",
        measurement: "PBLR",
        tagKey: "id",
        tagValue: "",
        id: "",
        channel: "ch2",
      },
    },
  ],
};

const nodeColors = [
  "#7CB342",
  "#2E7D32",
  "#A4C65A",
  "#6D254D",
  "#4F8A5B",
  "#B65C7A",
  "#C5D98B",
  "#365F3C",
];

const linkColorPairs = [
  { start: "#E7F0CE", middle: "#BFD88A", end: "#7CB342", text: "#52751F", node: "#7CB342" },
  { start: "#DDEBDD", middle: "#86B889", end: "#2E7D32", text: "#245C28", node: "#2E7D32" },
  { start: "#F0F5DD", middle: "#C8D98B", end: "#A4C65A", text: "#667A32", node: "#A4C65A" },
  { start: "#EAD6E0", middle: "#C58AA5", end: "#6D254D", text: "#5C1D40", node: "#6D254D" },
  { start: "#DFEADF", middle: "#90B296", end: "#4F8A5B", text: "#386542", node: "#4F8A5B" },
  { start: "#F1DCE4", middle: "#D69AB0", end: "#B65C7A", text: "#8A3D5B", node: "#B65C7A" },
  { start: "#F5F8E8", middle: "#DCE7AE", end: "#C5D98B", text: "#7D8D4D", node: "#C5D98B" },
  { start: "#DCE6DE", middle: "#78957E", end: "#365F3C", text: "#28472D", node: "#365F3C" },
];

const normalizeHexColor = (value, fallback = "#7CB342") => {
  const text = String(value || "").trim();
  return /^#[0-9a-fA-F]{6}$/.test(text)
    ? text
    : fallback;
};

const mixHex = (hex, target, amount) => {
  const source = normalizeHexColor(hex);
  const destination = normalizeHexColor(target);

  const parse = (value) => ({
    r: parseInt(value.slice(1, 3), 16),
    g: parseInt(value.slice(3, 5), 16),
    b: parseInt(value.slice(5, 7), 16),
  });

  const a = parse(source);
  const b = parse(destination);

  const channel = (start, end) =>
    Math.round(start + (end - start) * amount)
      .toString(16)
      .padStart(2, "0");

  return `#${channel(a.r, b.r)}${channel(a.g, b.g)}${channel(a.b, b.b)}`;
};

const getColorSet = (color, fallbackPair) => {
  const base = normalizeHexColor(
    color,
    fallbackPair?.node || "#7CB342"
  );

  return {
    start: mixHex(base, "#ffffff", 0.58),
    middle: mixHex(base, "#ffffff", 0.28),
    end: base,
    text: mixHex(base, "#000000", 0.3),
    node: mixHex(base, "#000000", 0.08),
  };
};

const previewOnlyValues = [44.1, 33, 31.2, 28.5, 22.8, 18.6];

const createId = (prefix) =>
  `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;

export const normalizeSankeyConfig = (config = defaultSankeyConfig) => {
  const outputs = Array.isArray(config?.outputs)
    ? config.outputs
    : Array.isArray(config?.links)
    ? config.links.map((link, index) => ({
        id: link.id || createId("output"),
        name: link.label || `Output ${index + 1}`,
        dataKey: link.dataKey || "",
        dataSource: {
          bucket: "Mill",
          measurement: "PBLR",
          tagKey: "id",
          tagValue: "",
          id: "",
          channel: "",
          ...(link.dataSource || {}),
        },
      }))
    : defaultSankeyConfig.outputs;

  return {
    sourceName: config?.sourceName || defaultSankeyConfig.sourceName,
    sourceColor: normalizeHexColor(
      config?.sourceColor,
      defaultSankeyConfig.sourceColor
    ),
    unit: config?.unit || defaultSankeyConfig.unit,
    outputs: outputs.map((output, index) => ({
      id: output.id || createId("output"),
      name: output.name || `Output ${index + 1}`,
      color: normalizeHexColor(
        output.color,
        linkColorPairs[
          index % linkColorPairs.length
        ].node
      ),
      dataKey: output.dataKey || "",
      dataSource: {
        bucket:
          output.dataSource?.bucket ||
          output.bucket ||
          "Mill",
        measurement:
          output.dataSource?.measurement ||
          output.measurement ||
          "PBLR",
        tagKey:
          output.dataSource?.tagKey ||
          output.tagKey ||
          "id",
        tagValue:
          output.dataSource?.tagValue ||
          output.tagValue ||
          output.dataSource?.id ||
          "",
        id:
          output.dataSource?.id ||
          output.dataSource?.tagValue ||
          output.tagValue ||
          "",
        channel:
          output.dataSource?.channel ||
          output.channel ||
          "",
      },
    })),
  };
};

const formatNumber = (value) => {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "0";
  }

  return number.toFixed(Number.isInteger(number) ? 0 : 1);
};

const getOutputRuntimeValue = (item, output) => {
  const runtimeValue =
    item?.sankeyRuntimeValues?.[output.id]?.value;

  const numericRuntimeValue = Number(runtimeValue);

  return Number.isFinite(numericRuntimeValue)
    ? numericRuntimeValue
    : null;
};

function CustomNode(props) {
  const { x, y, width, height, index, payload } = props;
  const color =
    payload?.color ||
    nodeColors[index % nodeColors.length];

  const isSource = Boolean(payload?.isSource);

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx={0}
        fill={color}
      />

      <text
        x={isSource ? x + width + 12 : x - 12}
        y={y + height / 2}
        textAnchor={isSource ? "start" : "end"}
        dominantBaseline="middle"
        fill="currentColor"
        className="text-slate-700 dark:text-slate-200"
        fontSize={12}
        fontWeight={800}
      >
        {payload?.name}
      </text>
    </g>
  );
}

function CustomLink({
  sourceX,
  targetX,
  sourceY,
  targetY,
  sourceControlX,
  targetControlX,
  linkWidth,
  payload,
  index,
  gradientPrefix,
}) {
  const colorPair =
    linkColorPairs[
      index % linkColorPairs.length
    ];

  const gradientId =
    `${gradientPrefix}-link-${index}`;

  const gradientStart =
    payload?.gradientStart ||
    colorPair.start;

  const gradientMiddle =
    payload?.gradientMiddle ||
    colorPair.middle;

  const gradientEnd =
    payload?.gradientEnd ||
    colorPair.end;

  const labelColor =
    payload?.labelColor ||
    colorPair.text;

  const safeLinkWidth = Math.max(
    3,
    Number(linkWidth) || 0
  );

  const path = `
    M${sourceX},${sourceY}
    C${sourceControlX},${sourceY}
     ${targetControlX},${targetY}
     ${targetX},${targetY}
  `;

  return (
    <g
      style={{
        animation:
          "sankeyLinkFade 420ms ease-out both",
        animationDelay:
          `${index * 70}ms`,
      }}
    >
      <defs>
        <linearGradient
          id={gradientId}
          gradientUnits="userSpaceOnUse"
          x1={sourceX}
          y1={sourceY}
          x2={targetX}
          y2={targetY}
        >
          <stop
            offset="0%"
            stopColor={gradientStart}
            stopOpacity="0.88"
          />

          <stop
            offset="55%"
            stopColor={gradientMiddle}
            stopOpacity="0.8"
          />

          <stop
            offset="100%"
            stopColor={gradientEnd}
            stopOpacity="0.92"
          />
        </linearGradient>
      </defs>

      {/* Full-width flow. No filter or transform, so the link is not clipped. */}
      <path
        d={path}
        fill="none"
        stroke={`url(#${gradientId})`}
        strokeWidth={safeLinkWidth}
        strokeLinecap="butt"
      />

      {/* Very light internal sheen without reducing the visible thickness. */}
      {safeLinkWidth >= 18 && (
        <path
          d={path}
          fill="none"
          stroke="rgba(255,255,255,0.16)"
          strokeWidth={Math.max(
            1,
            safeLinkWidth * 0.08
          )}
          strokeLinecap="butt"
          pointerEvents="none"
        />
      )}

      {safeLinkWidth >= 12 && (
        <text
          x={(sourceX + targetX) / 2}
          y={(sourceY + targetY) / 2}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="currentColor"
          className="text-slate-700 dark:text-slate-100"
          fontSize={11}
          fontWeight={900}
        >
          {payload?.displayValue}
        </text>
      )}
    </g>
  );
}

export default function SankeyWidget({
  data = {},
  item = {},
}) {
  const generatedId = useId();

  const gradientPrefix =
    `sankey-${generatedId.replace(/:/g, "")}`;

  const config = normalizeSankeyConfig(
    item?.sankeyConfig || defaultSankeyConfig
  );

  const outputValues = config.outputs.map((output, index) => {
    const runtimeValue = getOutputRuntimeValue(item, output);
    const valueFromDataKey = Number(data?.[output.dataKey]);

    const channelKey = output.dataSource?.channel;
    const valueFromChannel = Number(
      channelKey ? data?.[channelKey] : undefined
    );

    const previewOnlyValue =
      item?.previewMode || item?.isBuilderPreview
        ? previewOnlyValues[index % previewOnlyValues.length]
        : undefined;

    const value = Number.isFinite(runtimeValue)
      ? runtimeValue
      : Number.isFinite(valueFromDataKey)
      ? valueFromDataKey
      : Number.isFinite(valueFromChannel)
      ? valueFromChannel
      : Number.isFinite(Number(previewOnlyValue))
      ? Number(previewOnlyValue)
      : 0;

    const runtimeInfo = item?.sankeyRuntimeValues?.[output.id];

    return {
      ...output,
      value: Math.max(0, value),
      isActual: Number.isFinite(runtimeValue),
      isPreviewOnly:
        !Number.isFinite(runtimeValue) &&
        !Number.isFinite(valueFromDataKey) &&
        !Number.isFinite(valueFromChannel) &&
        Number.isFinite(Number(previewOnlyValue)),
      runtimeTimestamp: runtimeInfo?.timestamp || null,
      runtimeError: runtimeInfo?.error || null,
      ...(() => {
        const fallbackPair =
          linkColorPairs[
            index % linkColorPairs.length
          ];

        const colorSet = getColorSet(
          output.color,
          fallbackPair
        );

        return {
          gradientStart: colorSet.start,
          gradientMiddle: colorSet.middle,
          gradientEnd: colorSet.end,
          labelColor: colorSet.text,
          nodeColor: colorSet.node,
        };
      })(),
      displayValue: `${formatNumber(value)} ${config.unit || ""}`,
    };
  });

  const validOutputs = outputValues.filter((output) => output.value > 0);

  const actualOutputCount = validOutputs.filter(
    (output) => output.isActual
  ).length;

  const previewOnlyOutputCount = validOutputs.filter(
    (output) => output.isPreviewOnly
  ).length;

  const totalValue = validOutputs.reduce(
    (sum, output) => sum + Number(output.value || 0),
    0
  );

  const nodes = [
    {
      name: config.sourceName || "Source",
      color: normalizeHexColor(
        config.sourceColor,
        nodeColors[0]
      ),
      isSource: true,
      displayValue:
        totalValue > 0
          ? `${formatNumber(totalValue)} ${config.unit || ""}`
          : "",
    },
    ...validOutputs.map((output) => ({
      name: output.name,
      color: output.nodeColor,
      labelColor: output.labelColor,
      isSource: false,
    })),
  ];

  const links = validOutputs.map((output, index) => ({
    source: 0,
    target: index + 1,
    value: output.value,
    label: output.name,
    dataKey: output.dataKey,
    channel: output.dataSource?.channel,
    gradientStart:
      output.gradientStart,

    gradientMiddle:
      output.gradientMiddle,

    gradientEnd:
      output.gradientEnd,

    labelColor:
      output.labelColor,
    displayValue: output.displayValue,
    isActual: output.isActual,
    timestamp: output.runtimeTimestamp,
    error: output.runtimeError,
  }));

  return (
    <div
      className={`${TECH_SURFACE_CLASS} sankey-widget flex h-full w-full flex-col px-4 py-4`}
    >
      <TechBackdrop />
      <div className="relative z-10 flex h-full min-h-0 flex-col">
      <style>{`
        @keyframes sankeyLinkFade {
          from {
            opacity: 0;
          }

          to {
            opacity: 1;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .sankey-widget g {
            animation: none !important;
          }
        }
      `}</style>

      {/* SIMPLE HEADER */}
      <div
        className="
          mb-3 flex shrink-0
          items-center justify-between
          gap-4 pr-14
        "
      >
        <div className="min-w-0">
          <p
            className="
              text-[10px] font-black
              uppercase tracking-[0.2em]
              text-[#5F8F25]
              dark:text-[#A4C65A]
            "
          >
            Sankey flow
          </p>

          {item?.label &&
            item.label !== "Sankey Widget" &&
            item.label !== "Sankey Flow" && (
              <h3
                className="
                  mt-1 truncate
                  text-base font-black
                  text-slate-900
                  dark:text-white
                "
              >
                {item.label}
              </h3>
            )}

          <p
            className="
              mt-1 text-xs
              text-slate-500
              dark:text-slate-400
            "
          >
            Flow distribution from {config.sourceName || "source"} to configured outputs.
          </p>

          <p
            className="
              mt-1 text-[11px]
              font-semibold
              text-slate-400
              dark:text-slate-500
            "
          >
            {actualOutputCount > 0
              ? `${actualOutputCount}/${validOutputs.length} output(s) using actual data`
              : previewOnlyOutputCount > 0
              ? "Preview sample values only"
              : "Waiting for actual data"}
          </p>
        </div>

        <div
          className="
            shrink-0 rounded-2xl
            border border-[#DDE8C7]
            bg-[#F5F8E9]
            px-4 py-2.5
            text-right
            shadow-sm
            dark:border-[#7CB342]/25
            dark:bg-[#7CB342]/10
          "
        >
          <p
            className="
              text-[9px] font-black
              uppercase tracking-[0.14em]
              text-[#5F8F25]
              dark:text-[#C5D98B]
            "
          >
            Total flow
          </p>

          <p
            className="
              mt-1 text-lg font-black
              leading-none
              text-[#2E7D32]
              dark:text-[#A4C65A]
            "
          >
            {formatNumber(totalValue)}
            {config.unit && (
              <span className="ml-1 text-xs font-bold">
                {config.unit}
              </span>
            )}
          </p>
        </div>
      </div>

      {links.length === 0 ? (
        <div
          className="
            flex min-h-0 flex-1
            items-center justify-center
            rounded-2xl
            border border-dashed
            border-slate-300
            bg-transparent
            text-sm text-slate-500
            dark:border-slate-700
            dark:text-slate-400
          "
        >
          No valid Sankey outputs configured
        </div>
      ) : (
        <div
          className="
            min-h-0 flex-1
            overflow-hidden
            rounded-2xl
            bg-transparent
          "
        >
          <ResponsiveContainer
            width="100%"
            height="100%"
          >
            <Sankey
              data={{
                nodes,
                links,
              }}
              nodeWidth={9}
              nodePadding={34}
              linkCurvature={0.42}
              iterations={72}
              node={<CustomNode />}
              link={<CustomLink gradientPrefix={gradientPrefix} />}
              margin={{
                top: 28,
                right: 150,
                bottom: 28,
                left: 105,
              }}
            >
              <Tooltip
                contentStyle={{
                  borderRadius: 14,
                  border:
                    "1px solid rgba(148,163,184,0.28)",
                  background:
                    "rgba(15,23,42,0.96)",
                  color: "#f8fafc",
                  boxShadow:
                    "0 18px 40px rgba(15,23,42,0.24)",
                  fontSize: 12,
                  fontWeight: 700,
                }}
                itemStyle={{
                  color: "#f8fafc",
                }}
                formatter={(
                  value,
                  name,
                  props
                ) => {
                  const payload =
                    props?.payload || {};

                  return [
                    `${formatNumber(value)} ${
                      config.unit || ""
                    }`,
                    payload?.label ||
                      "Flow",
                  ];
                }}
                labelFormatter={() => ""}
              />
            </Sankey>
          </ResponsiveContainer>
        </div>
      )}
      </div>
    </div>
  );
}
