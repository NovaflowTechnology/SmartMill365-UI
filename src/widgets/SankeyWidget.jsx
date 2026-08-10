import {
  ResponsiveContainer,
  Sankey,
  Tooltip,
} from "recharts";

import { useId } from "react";

export const defaultSankeyConfig = {
  sourceName: "Source",
  unit: "",
  outputs: [
    {
      id: "output-1",
      name: "Sterilizer 1",
      dataKey: "",
      dataSource: {
        bucket: "",
        measurement: "",
        tagKey: "id",
        tagValue: "",
        id: "",
        channel: "",
      },
    },
    {
      id: "output-2",
      name: "Sterilizer 2",
      dataKey: "",
      dataSource: {
        bucket: "",
        measurement: "",
        tagKey: "id",
        tagValue: "",
        id: "",
        channel: "",
      },
    },
    {
      id: "output-3",
      name: "Sterilizer 3",
      dataKey: "",
      dataSource: {
        bucket: "",
        measurement: "",
        tagKey: "id",
        tagValue: "",
        id: "",
        channel: "",
      },
    },
  ],
};

const nodeColors = [
  "#2563eb",
  "#059669",
  "#d97706",
  "#dc2626",
  "#7c3aed",
  "#0891b2",
  "#db2777",
  "#65a30d",
];

const linkColorPairs = [
  {
    start: "#bfdbfe",
    middle: "#93c5fd",
    end: "#60a5fa",
    text: "#1d4ed8",
    node: "#2563eb",
  },
  {
    start: "#a7f3d0",
    middle: "#6ee7b7",
    end: "#34d399",
    text: "#047857",
    node: "#059669",
  },
  {
    start: "#fde68a",
    middle: "#fcd34d",
    end: "#fbbf24",
    text: "#b45309",
    node: "#d97706",
  },
  {
    start: "#fecaca",
    middle: "#fca5a5",
    end: "#f87171",
    text: "#b91c1c",
    node: "#dc2626",
  },
  {
    start: "#ddd6fe",
    middle: "#c4b5fd",
    end: "#a78bfa",
    text: "#6d28d9",
    node: "#7c3aed",
  },
  {
    start: "#a5f3fc",
    middle: "#67e8f9",
    end: "#22d3ee",
    text: "#0e7490",
    node: "#0891b2",
  },
  {
    start: "#fbcfe8",
    middle: "#f9a8d4",
    end: "#f472b6",
    text: "#be185d",
    node: "#db2777",
  },
  {
    start: "#d9f99d",
    middle: "#bef264",
    end: "#a3e635",
    text: "#4d7c0f",
    node: "#65a30d",
  },
];

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
          bucket: "",
          measurement: "",
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
    unit: config?.unit || defaultSankeyConfig.unit,
    outputs: outputs.map((output, index) => ({
      id: output.id || createId("output"),
      name: output.name || `Output ${index + 1}`,
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
        fill={isSource ? "#1e3a8a" : payload?.labelColor || "#334155"}
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
          fill={labelColor}
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
      gradientStart:
        linkColorPairs[
          index % linkColorPairs.length
        ].start,

      gradientMiddle:
        linkColorPairs[
          index % linkColorPairs.length
        ].middle,

      gradientEnd:
        linkColorPairs[
          index % linkColorPairs.length
        ].end,

      labelColor:
        linkColorPairs[
          index % linkColorPairs.length
        ].text,

      nodeColor:
        linkColorPairs[
          index % linkColorPairs.length
        ].node,
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
      color: nodeColors[0],
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
      className="
        sankey-widget
        flex h-full w-full
        flex-col overflow-hidden
        bg-transparent
        px-4 py-4
      "
    >
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
          gap-4
        "
      >
        <div className="min-w-0">
          <p
            className="
              text-[10px] font-black
              uppercase tracking-[0.2em]
              text-emerald-600
              dark:text-emerald-400
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
            border border-emerald-200
            bg-emerald-50
            px-4 py-2.5
            text-right
            shadow-sm
            dark:border-emerald-900/60
            dark:bg-emerald-500/10
          "
        >
          <p
            className="
              text-[9px] font-black
              uppercase tracking-[0.14em]
              text-emerald-700
              dark:text-emerald-300
            "
          >
            Total flow
          </p>

          <p
            className="
              mt-1 text-lg font-black
              leading-none
              text-emerald-800
              dark:text-emerald-200
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
  );
}
