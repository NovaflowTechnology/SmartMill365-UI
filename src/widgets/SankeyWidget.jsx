import {
  ResponsiveContainer,
  Sankey,
  Tooltip,
} from "recharts";

export const defaultSankeyConfig = {
  sourceName: "Boiler A",
  unit: "t/h",
  outputs: [
    {
      id: "output-1",
      name: "Sterilizer 1",
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
  "#2563eb",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#06b6d4",
  "#ec4899",
  "#84cc16",
  "#f97316",
  "#14b8a6",
];

const linkColors = [
  "rgba(96, 165, 250, 0.48)",
  "rgba(52, 211, 153, 0.48)",
  "rgba(251, 191, 36, 0.52)",
  "rgba(248, 113, 113, 0.48)",
  "rgba(167, 139, 250, 0.48)",
  "rgba(34, 211, 238, 0.48)",
  "rgba(244, 114, 182, 0.48)",
  "rgba(163, 230, 53, 0.48)",
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
  const color = payload?.color || nodeColors[index % nodeColors.length];

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx={0}
        fill={color}
        stroke="rgba(255,255,255,0.9)"
        strokeWidth={1}
      />

      <text
        x={payload?.isSource ? x + width + 10 : x - 10}
        y={y + height / 2 - 7}
        textAnchor={payload?.isSource ? "start" : "end"}
        dominantBaseline="middle"
        fill="#0f172a"
        fontSize={12}
        fontWeight={800}
      >
        {payload?.name}
      </text>

      {payload?.displayValue && (
        <text
          x={payload?.isSource ? x + width + 10 : x - 10}
          y={y + height / 2 + 9}
          textAnchor={payload?.isSource ? "start" : "end"}
          dominantBaseline="middle"
          fill="#475569"
          fontSize={11}
          fontWeight={700}
        >
          {payload.displayValue}
        </text>
      )}
    </g>
  );
}

function CustomLink(props) {
  const {
    sourceX,
    targetX,
    sourceY,
    targetY,
    sourceControlX,
    targetControlX,
    linkWidth,
    payload,
    index,
  } = props;

  const color = payload?.color || linkColors[index % linkColors.length];

  return (
    <g>
      <path
        d={`
          M${sourceX},${sourceY}
          C${sourceControlX},${sourceY}
           ${targetControlX},${targetY}
           ${targetX},${targetY}
        `}
        fill="none"
        stroke={color}
        strokeWidth={Math.max(2, linkWidth)}
        strokeLinecap="butt"
      />

      {linkWidth >= 12 && (
        <text
          x={(sourceX + targetX) / 2}
          y={(sourceY + targetY) / 2}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="#0f172a"
          fontSize={11}
          fontWeight={800}
          paintOrder="stroke"
          stroke="white"
          strokeWidth={4}
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
      color: linkColors[index % linkColors.length],
      nodeColor: nodeColors[(index + 1) % nodeColors.length],
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
      isSource: false,
      displayValue: output.displayValue,
    })),
  ];

  const links = validOutputs.map((output, index) => ({
    source: 0,
    target: index + 1,
    value: output.value,
    label: output.name,
    dataKey: output.dataKey,
    channel: output.dataSource?.channel,
    color: output.color,
    displayValue: output.displayValue,
    isActual: output.isActual,
    timestamp: output.runtimeTimestamp,
    error: output.runtimeError,
  }));

  return (
    <div className="h-full w-full overflow-hidden border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-500">
            Sankey flow
          </p>

          <h3 className="mt-1 text-lg font-black text-gray-800 dark:text-white">
            {item?.label || "Sankey Widget"}
          </h3>

          <p className="mt-1 text-xs text-gray-400">
            Flow distribution from {config.sourceName || "source"} to configured outputs.
          </p>

          <p className="mt-1 text-[11px] font-bold text-gray-400">
            {actualOutputCount > 0
              ? `${actualOutputCount}/${validOutputs.length} output(s) using actual data`
              : previewOnlyOutputCount > 0
              ? "Preview sample values only"
              : "Waiting for actual data"}
          </p>
        </div>

        <div className="bg-emerald-50 px-4 py-3 text-right dark:bg-emerald-900/30">
          <p className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-300">
            Total
          </p>

          <p className="text-xl font-black text-emerald-700 dark:text-emerald-200">
            {formatNumber(totalValue)} {config.unit || ""}
          </p>
        </div>
      </div>

      {links.length === 0 ? (
        <div className="flex h-[calc(100%-76px)] items-center justify-center border border-dashed border-gray-300 bg-gray-50 text-sm text-gray-400 dark:border-slate-700 dark:bg-slate-950">
          No valid Sankey outputs configured
        </div>
      ) : (
        <div className="h-[calc(100%-76px)] w-full bg-gray-50 p-2 dark:bg-slate-950">
          <ResponsiveContainer width="100%" height="100%">
            <Sankey
              data={{
                nodes,
                links,
              }}
              nodeWidth={10}
              nodePadding={40}
              linkCurvature={0.48}
              iterations={72}
              node={<CustomNode />}
              link={<CustomLink />}
              margin={{
                top: 34,
                right: 180,
                bottom: 34,
                left: 120,
              }}
            >
              <Tooltip
                contentStyle={{
                  borderRadius: 0,
                  border: "1px solid rgba(148,163,184,0.35)",
                  boxShadow: "0 20px 40px rgba(15,23,42,0.18)",
                  fontSize: 12,
                  fontWeight: 700,
                }}
                formatter={(value, name, props) => {
                  const payload = props?.payload || {};

                  return [
                    `${formatNumber(value)} ${config.unit || ""}`,
                    payload?.isActual
                      ? `${payload?.label || "Flow"} · Actual`
                      : item?.previewMode || item?.isBuilderPreview
                      ? `${payload?.label || "Flow"} · Preview only`
                      : `${payload?.label || "Flow"} · No actual data`,
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
