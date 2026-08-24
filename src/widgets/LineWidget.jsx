import {
  Area,
  AreaChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  useId,
  useMemo,
  useRef,
} from "react";
import {
  TECH_AXIS_STROKE,
  TECH_HEADER_CLASS,
  TECH_MUTED_CLASS,
  TECH_SURFACE_CLASS,
  TechBackdrop,
  botanicalTooltipStyle,
  toFiniteNumber,
  useWidgetSize,
} from "./widgetTech";

const DEFAULT_CHART_DISPLAY = {
  // Background reference grid. Widget Studio can turn this on/off.
  showGrid: true,
  // Balanced is easier to read than a fully dense engineering grid.
  gridDensity: "normal",
  showLegend: true,
  showTooltip: true,
  showXAxis: true,
  showYAxis: true,
  showDots: false,
  xAxisFormat: "auto",
  xAxisTickGap: 56,
  // Smart Auto is the default. Fixed Scale lets the user control the exact
  // minimum, maximum, and major tick interval (for example 0-400 by 100).
  yAxisMode: "auto", // "auto" | "fixed"
  yAxisMin: "",
  yAxisMax: "",
  yAxisInterval: "",
  yAxisTickCount: 5,
  strokeWidth: 2.5,
  lineWeight: "normal", // "thin" | "normal" | "bold"
  linePattern: "solid", // "solid" | "dashed" | "dotted"
  curveType: "linear", // "linear" | "monotone" | "step"

  // LineWidget now supports both Line and Area rendering.
  // Keep the widget type as "line" and switch this setting only.
  chartStyle: "line", // "line" | "area"
  areaOpacity: 0.35,
  areaEndOpacity: 0.02,

  // Industrial chart options.
  compactLegend: true,
  showLatestValues: true,
  showZeroLine: false,
  autoScalePerSeries: false,
};

const normaliseTimestamp = (value) => {
  if (typeof value === "number") return value;

  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
};

const formatXAxisTime = (
  timestamp,
  historyWindow,
  formatMode = "auto",
  visibleDurationMs = null
) => {
  const date = new Date(timestamp);

  const duration =
    Number(visibleDurationMs);

  const veryShortRange =
    Number.isFinite(duration) &&
    duration > 0 &&
    duration <= 5 * 60 * 1000;

  if (formatMode === "time") {
    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      ...(veryShortRange
        ? { second: "2-digit" }
        : {}),
    });
  }

  if (formatMode === "date") {
    return date.toLocaleDateString([], {
      month: "short",
      day: "numeric",
    });
  }

  if (formatMode === "datetime") {
    return `${date.toLocaleDateString([], {
      month: "short",
      day: "numeric",
    })} ${date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })}`;
  }

  const dateBasedRanges = [
    "2d",
    "7d",
    "30d",
    "90d",
    "6mo",
    "1y",
    "2y",
    "5y",
    "yesterday",
    "dayBeforeYesterday",
    "thisWeek",
    "previousWeek",
    "thisMonth",
    "previousMonth",
    "previousQuarter",
    "thisYear",
    "previousYear",
    "custom",
  ];

  if (dateBasedRanges.includes(historyWindow)) {
    if (
      ["90d", "6mo", "1y", "2y", "5y"].includes(
        historyWindow
      )
    ) {
      return date.toLocaleDateString([], {
        month: "short",
        year: "numeric",
      });
    }

    return date.toLocaleDateString([], {
      month: "short",
      day: "numeric",
    });
  }

  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    ...(veryShortRange
      ? { second: "2-digit" }
      : {}),
  });
};

const formatLatestValue = (value) => {
  const numeric = Number(value);

  if (!Number.isFinite(numeric)) {
    return "—";
  }

  if (Math.abs(numeric) >= 1000) {
    return numeric.toLocaleString(undefined, {
      maximumFractionDigits: 1,
    });
  }

  return numeric.toFixed(
    Number.isInteger(numeric) ? 0 : 1
  );
};

const formatYAxisTick = (value) => {
  const numeric = Number(value);

  if (!Number.isFinite(numeric)) {
    return value;
  }

  const isInteger =
    Number.isInteger(numeric);
  const absoluteValue =
    Math.abs(numeric);

  // Smart scaling can legitimately produce fractional ticks for small ranges.
  // Keep large engineering values clean, but do not turn 2.5 into a misleading 3.
  const maximumFractionDigits =
    isInteger
      ? 0
      : absoluteValue < 1
      ? 2
      : 1;

  return numeric.toLocaleString(undefined, {
    maximumFractionDigits,
  });
};

const getNiceStepCandidates = (rawStep) => {
  const numeric = Math.abs(
    Number(rawStep)
  );

  if (
    !Number.isFinite(numeric) ||
    numeric <= 0
  ) {
    return [1];
  }

  const magnitude = Math.pow(
    10,
    Math.floor(
      Math.log10(numeric)
    )
  );

  // Try neighboring engineering-friendly steps and choose the one that
  // produces a tick count closest to the requested count. This avoids
  // overly large jumps such as 0-60 for data whose natural ceiling is 50.
  const bases = [
    1,
    2,
    2.5,
    5,
    10,
  ];

  return Array.from(
    new Set(
      [-1, 0, 1].flatMap(
        (powerOffset) =>
          bases.map(
            (base) =>
              base *
              magnitude *
              Math.pow(
                10,
                powerOffset
              )
          )
      )
    )
  )
    .filter(
      (step) =>
        Number.isFinite(step) &&
        step > 0
    )
    .sort((a, b) => a - b);
};

const buildNiceAxis = (
  domain,
  requestedTickCount = 5
) => {
  if (
    !Array.isArray(domain) ||
    domain.length < 2
  ) {
    return {
      domain,
      ticks: undefined,
    };
  }

  const rawMin =
    Number(domain[0]);
  const rawMax =
    Number(domain[1]);

  if (
    !Number.isFinite(rawMin) ||
    !Number.isFinite(rawMax) ||
    rawMax <= rawMin
  ) {
    return {
      domain,
      ticks: undefined,
    };
  }

  const tickCount = Math.max(
    2,
    Math.round(
      Number(requestedTickCount) ||
        5
    )
  );

  const rawStep =
    (rawMax - rawMin) /
    Math.max(
      1,
      tickCount - 1
    );

  const candidates =
    getNiceStepCandidates(rawStep);

  const scoredCandidates =
    candidates.map((candidateStep) => {
      const candidateMin =
        Math.floor(
          rawMin / candidateStep
        ) * candidateStep;
      const candidateMax =
        Math.ceil(
          rawMax / candidateStep
        ) * candidateStep;
      const candidateTickCount = Math.max(
        2,
        Math.round(
          (candidateMax - candidateMin) /
            candidateStep
        ) + 1
      );

      return {
        step: candidateStep,
        min: candidateMin,
        max: candidateMax,
        count: candidateTickCount,
        score: Math.abs(
          candidateTickCount - tickCount
        ),
      };
    });

  scoredCandidates.sort((a, b) => {
    if (a.score !== b.score) {
      return a.score - b.score;
    }

    // On a tie, prefer a slightly denser axis over an overly sparse one.
    const aHasEnough =
      a.count >= tickCount;
    const bHasEnough =
      b.count >= tickCount;

    if (aHasEnough !== bHasEnough) {
      return aHasEnough ? -1 : 1;
    }

    return (
      Math.abs(a.step - rawStep) -
      Math.abs(b.step - rawStep)
    );
  });

  const selected =
    scoredCandidates[0];
  const step =
    selected?.step || 1;

  let niceMin =
    selected?.min ?? rawMin;
  let niceMax =
    selected?.max ?? rawMax;

  // Do not force any baseline here. The selected Y-axis mode decides the
  // raw domain first; this function only rounds it to stable, readable ticks.

  if (niceMax <= niceMin) {
    niceMax =
      niceMin + step;
  }

  const ticks = [];

  // Guard prevents floating-point loops.
  for (
    let value = niceMin;
    value <=
      niceMax + step * 0.001;
    value += step
  ) {
    ticks.push(
      Number(
        value.toFixed(10)
      )
    );

    if (ticks.length > 20) {
      break;
    }
  }

  return {
    domain: [
      niceMin,
      niceMax,
    ],
    ticks,
  };
};

const buildFixedAxis = (
  domain,
  configuredInterval = "",
  fallbackTickCount = 5
) => {
  if (!Array.isArray(domain) || domain.length < 2) {
    return {
      domain,
      ticks: undefined,
    };
  }

  const min = Number(domain[0]);
  const max = Number(domain[1]);

  if (
    !Number.isFinite(min) ||
    !Number.isFinite(max) ||
    max <= min
  ) {
    return buildNiceAxis(
      domain,
      fallbackTickCount
    );
  }

  const configured = Number(configuredInterval);
  const fallbackCount = Math.max(
    2,
    Math.round(Number(fallbackTickCount) || 5)
  );

  // If the user leaves Interval blank, keep the requested min/max exact and
  // divide that fixed span into the normal number of major sections.
  const interval =
    Number.isFinite(configured) && configured > 0
      ? configured
      : (max - min) / Math.max(1, fallbackCount - 1);

  if (!Number.isFinite(interval) || interval <= 0) {
    return {
      domain: [min, max],
      ticks: [min, max],
    };
  }

  const ticks = [];
  const epsilon = Math.abs(interval) * 0.000001;

  for (
    let value = min;
    value <= max + epsilon;
    value += interval
  ) {
    ticks.push(Number(value.toFixed(10)));

    if (ticks.length > 100) {
      break;
    }
  }

  // Always label the configured maximum. When the interval divides the span
  // exactly (0,100,200,300,400), this does not add a duplicate.
  const lastTick = ticks[ticks.length - 1];
  if (
    !Number.isFinite(lastTick) ||
    Math.abs(lastTick - max) > epsilon
  ) {
    ticks.push(max);
  }

  return {
    domain: [min, max],
    ticks,
  };
};

const getMajorGridTicks = (
  ticks,
  domain,
  fallbackCount = 5
) => {
  if (
    Array.isArray(ticks) &&
    ticks.length >= 2
  ) {
    return ticks
      .map(Number)
      .filter(Number.isFinite)
      .sort((a, b) => a - b);
  }

  const min = Number(domain?.[0]);
  const max = Number(domain?.[1]);

  if (
    !Number.isFinite(min) ||
    !Number.isFinite(max) ||
    max <= min
  ) {
    return [];
  }

  const count = Math.max(
    2,
    Number(fallbackCount) || 5
  );

  return Array.from(
    { length: count },
    (_, index) =>
      min +
      ((max - min) * index) /
        (count - 1)
  );
};

const buildMinorGridTicks = (
  majorTicks,
  subdivisions = 0
) => {
  if (
    !Array.isArray(majorTicks) ||
    majorTicks.length < 2 ||
    subdivisions <= 0
  ) {
    return [];
  }

  const minorTicks = [];

  for (
    let index = 0;
    index < majorTicks.length - 1;
    index += 1
  ) {
    const start =
      Number(majorTicks[index]);

    const end =
      Number(
        majorTicks[index + 1]
      );

    if (
      !Number.isFinite(start) ||
      !Number.isFinite(end) ||
      end <= start
    ) {
      continue;
    }

    for (
      let division = 1;
      division <= subdivisions;
      division += 1
    ) {
      minorTicks.push(
        start +
          ((end - start) *
            division) /
            (subdivisions + 1)
      );
    }
  }

  return minorTicks;
};

const getFallbackDomain = (
  fallbackRange = { min: 0, max: 100 }
) => {
  const fallbackMin = toFiniteNumber(
    fallbackRange?.min,
    0
  );
  const fallbackMax = toFiniteNumber(
    fallbackRange?.max,
    100
  );

  if (fallbackMax > fallbackMin) {
    return [fallbackMin, fallbackMax];
  }

  return [fallbackMin, fallbackMin + 1];
};

const getFiniteValues = (values = []) =>
  values
    .map(Number)
    .filter(Number.isFinite);

const buildFitDataDomain = (
  values = [],
  fallbackRange = { min: 0, max: 100 },
  paddingRatio = 0.08
) => {
  const finiteValues = getFiniteValues(values);

  if (!finiteValues.length) {
    return getFallbackDomain(fallbackRange);
  }

  const observedMin = Math.min(...finiteValues);
  const observedMax = Math.max(...finiteValues);

  if (observedMin === observedMax) {
    // A completely flat signal still needs visible breathing room.
    // One percent of the signal magnitude keeps values such as 44 psi
    // near 44 instead of expanding all the way to zero.
    const pad = Math.max(
      Math.abs(observedMin) * 0.01,
      0.5
    );

    return [
      observedMin - pad,
      observedMax + pad,
    ];
  }

  const span = observedMax - observedMin;
  const pad = Math.max(
    span * paddingRatio,
    Number.EPSILON
  );

  return [
    observedMin - pad,
    observedMax + pad,
  ];
};

const buildIncludeZeroDomain = (
  values = [],
  fallbackRange = { min: 0, max: 100 }
) => {
  const finiteValues = getFiniteValues(values);

  if (!finiteValues.length) {
    const [fallbackMin, fallbackMax] =
      getFallbackDomain(fallbackRange);

    return [
      Math.min(0, fallbackMin),
      Math.max(0, fallbackMax),
    ];
  }

  const observedMin = Math.min(...finiteValues);
  const observedMax = Math.max(...finiteValues);

  if (observedMin === 0 && observedMax === 0) {
    return [0, 1];
  }

  if (observedMin >= 0) {
    return [0, observedMax];
  }

  if (observedMax <= 0) {
    return [observedMin, 0];
  }

  return [
    observedMin,
    observedMax,
  ];
};

const buildSmartAutoDomain = (
  values = [],
  fallbackRange = { min: 0, max: 100 },
  paddingRatio = 0.08
) => {
  const finiteValues = getFiniteValues(values);

  if (!finiteValues.length) {
    // With no live/history values there is nothing to auto-scale, so the
    // configured engineering range is the most useful fallback.
    return getFallbackDomain(fallbackRange);
  }

  const observedMin = Math.min(...finiteValues);
  const observedMax = Math.max(...finiteValues);

  if (observedMin === 0 && observedMax === 0) {
    return [0, 1];
  }

  // If the signal crosses zero, zero is inherently meaningful and must stay
  // visible. This also handles one side landing exactly on zero.
  if (observedMin <= 0 && observedMax >= 0) {
    return buildIncludeZeroDomain(
      finiteValues,
      fallbackRange,
      paddingRatio
    );
  }

  const [fallbackMin, fallbackMax] =
    getFallbackDomain(fallbackRange);
  const configuredSpan = Math.max(
    0,
    fallbackMax - fallbackMin
  );

  // "Near zero" is relative to both what is currently visible and the
  // configured engineering range. This lets a 0.5 psi reading count as close
  // to zero on a 0-50 psi sensor, while 43-47 psi remains tightly zoomed.
  const observedMagnitude = Math.max(
    Math.abs(observedMin),
    Math.abs(observedMax),
    Number.EPSILON
  );
  const nearZeroThreshold = Math.max(
    observedMagnitude * 0.2,
    configuredSpan * 0.05
  );

  const isNearZero =
    observedMin > 0
      ? observedMin <= nearZeroThreshold
      : Math.abs(observedMax) <= nearZeroThreshold;

  if (isNearZero) {
    return buildIncludeZeroDomain(
      finiteValues,
      fallbackRange,
      paddingRatio
    );
  }

  // Normal steady operation far from zero is easier to inspect with a fitted
  // data domain. Nice-number rounding below keeps the axis calm rather than
  // changing for every tiny live-data movement.
  return buildFitDataDomain(
    finiteValues,
    fallbackRange,
    paddingRatio
  );
};

const buildObservedDomain = (
  values = [],
  fallbackRange = { min: 0, max: 100 },
  mode = "auto",
  paddingRatio = 0.08
) => {
  if (mode === "zero") {
    return buildIncludeZeroDomain(
      values,
      fallbackRange,
      paddingRatio
    );
  }

  if (mode === "fit") {
    return buildFitDataDomain(
      values,
      fallbackRange,
      paddingRatio
    );
  }

  return buildSmartAutoDomain(
    values,
    fallbackRange,
    paddingRatio
  );
};

const getSeriesDomain = (
  chartData,
  key,
  fallbackRange,
  mode = "auto"
) =>
  buildObservedDomain(
    chartData.map((row) => row?.[key]),
    fallbackRange,
    mode,
    0.08
  );

const getCombinedSeriesDomain = (
  chartData,
  keys = [],
  fallbackRange = { min: 0, max: 100 },
  mode = "auto"
) => {
  const values = [];

  chartData.forEach((row) => {
    keys.forEach((key) => {
      values.push(row?.[key]);
    });
  });

  return buildObservedDomain(
    values,
    fallbackRange,
    mode,
    0.1
  );
};

export default function LineWidget({
  data = [],
  lines = [],
  label = "Trend",
  historyWindow = "15m",
  rangeConfig = null,
  rangeConfigs = {},
  dataLabels = {},
  chartDisplay = {},
  gridWidth = null,
  gridHeight = null,
}) {
  const rootRef = useRef(null);

  const measuredSize =
    useWidgetSize(rootRef);

  const width =
    measuredSize.width;

  const height =
    measuredSize.height;

  const parsedGridWidth =
    Number(gridWidth);

  const parsedGridHeight =
    Number(gridHeight);

  const hasGridGeometry =
    Number.isFinite(
      parsedGridWidth
    ) &&
    Number.isFinite(
      parsedGridHeight
    ) &&
    parsedGridWidth > 0 &&
    parsedGridHeight > 0;

  /*
   * IMPORTANT:
   * Builder and Dashboard can have different physical pixel heights because
   * one is an editing workspace and the other fills the runtime viewport.
   *
   * Responsive presentation should therefore follow the SAVED grid span
   * first, not whichever pixel height happens to be measured.
   *
   * Examples:
   *   1x1 -> tiny
   *   2x1 -> compact
   *   4x1 -> compact, but NOT tiny
   *   4x2 -> normal
   *
   * This keeps the same widget configuration visually consistent in
   * Template Builder/Editor and Dashboard.
   */
  const tiny =
    hasGridGeometry
      ? parsedGridWidth <= 1 &&
        parsedGridHeight <= 1
      : measuredSize.tiny;

  const compact =
    hasGridGeometry
      ? parsedGridHeight <= 1 ||
        parsedGridWidth <= 2
      : measuredSize.compact;

  const wide =
    hasGridGeometry
      ? parsedGridWidth >= 3
      : measuredSize.wide;

  const widgetId =
    useId().replace(/:/g, "");

  const display = {
    ...DEFAULT_CHART_DISPLAY,
    ...(chartDisplay || {}),
  };

  // Older templates may contain custom/range/fit/zero. The editor now exposes
  // only two meaningful choices: Smart Auto and Fixed Scale. Preserve old
  // custom/range templates as Fixed; older data-fit modes migrate to Smart Auto.
  const resolvedYAxisMode =
    ["fixed", "custom", "range"].includes(
      display.yAxisMode
    )
      ? "fixed"
      : "auto";

  const isObservedYAxisMode =
    resolvedYAxisMode === "auto";

  const chartStyle =
    display.chartStyle === "area"
      ? "area"
      : "line";

  const isAreaStyle =
    chartStyle === "area";

  const areaOpacity = Math.min(
    0.9,
    Math.max(
      0,
      Number(display.areaOpacity) || 0.35
    )
  );

  const areaEndOpacity = Math.min(
    areaOpacity,
    Math.max(
      0,
      Number(display.areaEndOpacity) || 0.02
    )
  );

  const lineWeightWidths = {
    thin: 1.25,
    normal: 2,
    bold: 3.25,
  };

  const resolvedLineWeight =
    ["thin", "normal", "bold"].includes(
      display.lineWeight
    )
      ? display.lineWeight
      : "normal";

  // Preserve custom numeric stroke widths from older templates.
  // New templates normally use Thin / Normal / Bold.
  const hasLegacyCustomStrokeWidth =
    chartDisplay?.strokeWidth !== undefined &&
    chartDisplay?.lineWeight === undefined;

  const resolvedStrokeWidth =
    hasLegacyCustomStrokeWidth
      ? Math.max(
          1,
          Number(
            chartDisplay.strokeWidth
          ) || 2.5
        )
      : lineWeightWidths[
          resolvedLineWeight
        ];

  const allowedCurveTypes = [
    "linear",
    "monotone",
    "step",
  ];

  const resolvedCurveType =
    allowedCurveTypes.includes(
      display.curveType
    )
      ? display.curveType
      : "linear";

  const linePatternMap = {
    solid: undefined,
    dashed: "8 5",
    dotted: "2 5",
  };

  const resolvedLinePattern =
    ["solid", "dashed", "dotted"].includes(
      display.linePattern
    )
      ? display.linePattern
      : "solid";

  const resolvedStrokeDasharray =
    linePatternMap[
      resolvedLinePattern
    ];

  const chartData = useMemo(
    () =>
      [...data]
        .map((item) => ({
          ...item,
          timestamp: normaliseTimestamp(
            item.timestamp
          ),
        }))
        .filter((item) => item.timestamp > 0)
        .sort(
          (a, b) =>
            a.timestamp - b.timestamp
        ),
    [data]
  );

  const getRangeForKey = (key) => {
    const merged = {
      min: 0,
      max: 100,
      unit: "",
      ...(rangeConfig || {}),
      ...(rangeConfigs?.[key] || {}),
    };

    const min = toFiniteNumber(
      merged.min,
      0
    );

    const configuredMax = toFiniteNumber(
      merged.max,
      100
    );

    return {
      ...merged,
      min,
      max:
        configuredMax > min
          ? configuredMax
          : min + 1,
      unit: String(
        merged.unit || ""
      ).trim(),
    };
  };

  const firstTimestamp =
    chartData[0]?.timestamp;

  const lastTimestamp =
    chartData[
      chartData.length - 1
    ]?.timestamp;

  const visibleDurationMs =
    Number(lastTimestamp) -
    Number(firstTimestamp);

  const visibleLines = lines.filter(
    (line) => line?.key
  );

  const latestRow =
    chartData[
      chartData.length - 1
    ] || {};

  const showLegend =
    display.showLegend &&
    !tiny &&
    visibleLines.length > 1;

  const latestItems = visibleLines.map(
    (line, index) => {
      const range = getRangeForKey(
        line.key
      );

      const name =
        dataLabels?.[line.key] ||
        line.label ||
        line.key;

      const rawValue =
        latestRow?.[line.key];

      return {
        ...line,
        index,
        name,
        range,
        rawValue,
        formattedValue:
          formatLatestValue(rawValue),
      };
    }
  );

  const isSingleSeries =
    visibleLines.length === 1;

  const singleLatestItem =
    isSingleSeries
      ? latestItems[0]
      : null;

  const leftLine =
    visibleLines[0];

  const leftRange = leftLine
    ? getRangeForKey(leftLine.key)
    : {
        min: 0,
        max: 100,
        unit: "",
      };

  const combinedRange = {
    min: Math.min(
      ...visibleLines.map(
        (line) =>
          getRangeForKey(line.key).min
      ),
      leftRange.min
    ),
    max: Math.max(
      ...visibleLines.map(
        (line) =>
          getRangeForKey(line.key).max
      ),
      leftRange.max
    ),
  };

  const observedCombinedDomain =
    getCombinedSeriesDomain(
      chartData,
      visibleLines.map(
        (line) => line.key
      ),
      combinedRange,
      resolvedYAxisMode
    );

  const defaultDomain =
    isObservedYAxisMode
      ? observedCombinedDomain
      : [
          display.yAxisMin === ""
            ? combinedRange.min
            : toFiniteNumber(
                display.yAxisMin,
                combinedRange.min
              ),
          display.yAxisMax === ""
            ? combinedRange.max
            : toFiniteNumber(
                display.yAxisMax,
                combinedRange.max
              ),
        ];

  const yAxisTickCount = Math.max(
    2,
    Number(
      display.yAxisTickCount
    ) || 5
  );

  const gridDensity =
    display.gridDensity ||
    "dense";

  // Keep axis labels relatively sparse even when the user asks for a denser
  // background grid. Dense labels are much harder to scan than dense grid lines.
  const gridYAxisTickCount =
    yAxisTickCount;

  const gridXAxisTickGap =
    gridDensity === "sparse"
      ? 92
      : gridDensity === "normal"
      ? 64
      : 46;

  const defaultNiceAxis =
    resolvedYAxisMode === "fixed"
      ? buildFixedAxis(
          defaultDomain,
          display.yAxisInterval,
          gridYAxisTickCount
        )
      : buildNiceAxis(
          defaultDomain,
          gridYAxisTickCount
        );

  const areaRanges =
    visibleLines.map((line) =>
      getRangeForKey(line.key)
    );

  const areaGlobalMin =
    areaRanges.length
      ? Math.min(
          ...areaRanges.map(
            (range) => range.min
          )
        )
      : 0;

  const areaGlobalMax =
    areaRanges.length
      ? Math.max(
          ...areaRanges.map(
            (range) => range.max
          )
        )
      : 100;

  const areaConfiguredRange = {
    min: areaGlobalMin,
    max: areaGlobalMax,
  };

  const areaObservedDomain =
    getCombinedSeriesDomain(
      chartData,
      visibleLines.map(
        (line) => line.key
      ),
      areaConfiguredRange,
      resolvedYAxisMode
    );

  const areaDomain =
    isObservedYAxisMode
      ? areaObservedDomain
      : [
          display.yAxisMin === ""
            ? areaGlobalMin
            : toFiniteNumber(
                display.yAxisMin,
                areaGlobalMin
              ),
          display.yAxisMax === ""
            ? areaGlobalMax
            : toFiniteNumber(
                display.yAxisMax,
                areaGlobalMax
              ),
        ];

  const areaNiceAxis =
    resolvedYAxisMode === "fixed"
      ? buildFixedAxis(
          areaDomain,
          display.yAxisInterval,
          gridYAxisTickCount
        )
      : buildNiceAxis(
          areaDomain,
          gridYAxisTickCount
        );

  const useMultipleAxes =
    Boolean(
      display.autoScalePerSeries
    ) &&
    visibleLines.length > 1 &&
    !tiny;

  const responsiveSizeKey = `${Math.round(
    width / 12
  )}-${Math.round(height / 12)}`;

  const axisDefinitions =
    useMultipleAxes
      ? visibleLines.map(
          (line, index) => {
            const range =
              getRangeForKey(line.key);

            const rawDomain =
              resolvedYAxisMode ===
              "fixed"
                ? [
                    display.yAxisMin === ""
                      ? range.min
                      : toFiniteNumber(
                          display.yAxisMin,
                          range.min
                        ),
                    display.yAxisMax === ""
                      ? range.max
                      : toFiniteNumber(
                          display.yAxisMax,
                          range.max
                        ),
                  ]
                : getSeriesDomain(
                    chartData,
                    line.key,
                    range,
                    resolvedYAxisMode
                  );

            const niceAxis =
              resolvedYAxisMode ===
              "fixed"
                ? buildFixedAxis(
                    rawDomain,
                    display.yAxisInterval,
                    gridYAxisTickCount
                  )
                : buildNiceAxis(
                    rawDomain,
                    gridYAxisTickCount
                  );

            return {
              id: `series-${index}`,
              key: line.key,
              orientation:
                index % 2 === 0
                  ? "left"
                  : "right",
              domain:
                niceAxis.domain,
              ticks:
                niceAxis.ticks,
              color:
                line.color ||
                "#2563eb",
              unit: range.unit,
            };
          }
        )
      : [
          {
            id: "primary",
            key: leftLine?.key,
            orientation: "left",
            domain:
              defaultNiceAxis.domain,
            ticks:
              defaultNiceAxis.ticks,
            color:
              leftLine?.color ||
              "#2563eb",
            unit: leftRange.unit,
          },
        ];

  /*
   * Minor grid lines are separate from axis labels.
   *
   * Example major labels:
   * 0, 20, 40, 60, 80, 100
   *
   * normal -> adds 10, 30, 50, 70, 90
   * dense  -> adds two lighter lines inside every 20-unit interval
   */
  const minorGridSubdivisions =
    gridDensity === "dense"
      ? 3
      : gridDensity === "normal"
      ? 1
      : 0;

  const areaMajorGridTicks =
    getMajorGridTicks(
      areaNiceAxis.ticks,
      areaNiceAxis.domain,
      yAxisTickCount
    );

  const areaMinorGridTicks =
    buildMinorGridTicks(
      areaMajorGridTicks,
      minorGridSubdivisions
    );

  const primaryAxis =
    axisDefinitions?.[0];

  const lineMajorGridTicks =
    getMajorGridTicks(
      primaryAxis?.ticks,
      primaryAxis?.domain,
      yAxisTickCount
    );

  const lineMinorGridTicks =
    buildMinorGridTicks(
      lineMajorGridTicks,
      minorGridSubdivisions
    );

  if (isAreaStyle) {
    return (
      <div
        ref={rootRef}
        className={`${TECH_SURFACE_CLASS} ${
          tiny
            ? "p-2"
            : "p-2.5"
        } [--chart-grid-major:#94a3b8] [--chart-grid-minor:#cbd5e1] dark:[--chart-grid-major:#64748b] dark:[--chart-grid-minor:#475569]`}
      >
        <TechBackdrop />

        <div className="relative z-10 flex h-full min-h-0 flex-col">
          {/* Keep Area mode visually consistent with the original AreaWidget. */}
          <div
            className="
              mb-1 flex min-w-0
              items-center gap-2
              px-1 pr-14
            "
          >
            <div
              className={`${TECH_HEADER_CLASS} min-w-0 truncate`}
              title={label}
            >
              {label}
            </div>

            {!tiny && (
              <div
                className="
                  shrink-0 rounded-full
                  border border-slate-200
                  bg-slate-50 px-2 py-0.5
                  text-[9px] font-medium
                  text-slate-500
                  dark:border-slate-700
                  dark:bg-slate-800
                  dark:text-slate-300
                "
              >
                {historyWindow}
              </div>
            )}

            {!tiny &&
              isSingleSeries &&
              display.showLatestValues &&
              singleLatestItem && (
                <div
                  className="
                    ml-auto flex shrink-0
                    items-center gap-1.5
                    text-[9px]
                  "
                  title={
                    singleLatestItem.name
                  }
                >
                  <span
                    className="
                      h-1.5 w-1.5
                      rounded-full
                    "
                    style={{
                      backgroundColor:
                        singleLatestItem.color,
                    }}
                  />

                  <span
                    className="
                      font-semibold
                      text-slate-700
                      dark:text-slate-200
                    "
                  >
                    {
                      singleLatestItem.formattedValue
                    }
                    {singleLatestItem.range.unit
                      ? ` ${singleLatestItem.range.unit}`
                      : ""}
                  </span>
                </div>
              )}
          </div>

          <div className="min-h-0 min-w-0 flex-1">
            {chartData.length === 0 ? (
              <div
                className={`flex h-full items-center justify-center text-xs ${TECH_MUTED_CLASS}`}
              >
                No area data available.
              </div>
            ) : (
              <ResponsiveContainer
                key={`area-${responsiveSizeKey}`}
                width="100%"
                height="100%"
                minWidth={0}
                minHeight={0}
                debounce={20}
              >
                <AreaChart
                  data={chartData}
                  margin={{
                    top: tiny ? 0 : 2,
                    right: tiny ? 2 : 5,
                    left: tiny ? -26 : -12,
                    bottom: tiny ? -8 : -4,
                  }}
                >
                  <defs>
                    {visibleLines.map(
                      (line, index) => (
                        <linearGradient
                          key={line.key}
                          id={`area-tech-${widgetId}-${index}`}
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="0%"
                            stopColor={
                              line.color ||
                              "#7CB342"
                            }
                            stopOpacity={
                              areaOpacity
                            }
                          />

                          <stop
                            offset="100%"
                            stopColor={
                              line.color ||
                              "#7CB342"
                            }
                            stopOpacity={
                              areaEndOpacity
                            }
                          />
                        </linearGradient>
                      )
                    )}
                  </defs>

                  {/* Background grid is rendered before the series so it stays behind the data. */}
                  {display.showGrid && (
                    <CartesianGrid
                      stroke="var(--chart-grid-major)"
                      strokeWidth={0.65}
                      opacity={0.12}
                      horizontal={false}
                      vertical
                    />
                  )}

                  {display.showGrid &&
                    areaMajorGridTicks.map(
                      (tick) => (
                        <ReferenceLine
                          key={`area-major-grid-${tick}`}
                          y={tick}
                          stroke="var(--chart-grid-major)"
                          strokeWidth={0.7}
                          opacity={0.18}
                          ifOverflow="extendDomain"
                        />
                      )
                    )}

                  {display.showGrid &&
                    areaMinorGridTicks.map(
                      (tick) => (
                        <ReferenceLine
                          key={`area-minor-grid-${tick}`}
                          y={tick}
                          stroke="var(--chart-grid-minor)"
                          strokeWidth={0.55}
                          opacity={0.07}
                          ifOverflow="extendDomain"
                        />
                      )
                    )}

                  {display.showXAxis && (
                    <XAxis
                      dataKey="timestamp"
                      type="number"
                      scale="time"
                      domain={[
                        firstTimestamp ||
                          "dataMin",
                        lastTimestamp ||
                          "dataMax",
                      ]}
                      tickFormatter={(
                        value
                      ) =>
                        formatXAxisTime(
                          value,
                          historyWindow,
                          display.xAxisFormat,
                          visibleDurationMs
                        )
                      }
                      tick={{
                        fontSize:
                          tiny ? 8 : 10,
                        fill:
                          TECH_AXIS_STROKE,
                      }}
                      stroke={
                        TECH_AXIS_STROKE
                      }
                      axisLine={false}
                      tickLine={false}
                      minTickGap={Math.max(
                        8,
                        Math.min(
                          Number(
                            display.xAxisTickGap
                          ) || 30,
                          gridXAxisTickGap
                        )
                      )}
                      interval="preserveStartEnd"
                    />
                  )}

                  {display.showYAxis && (
                    <YAxis
                      width={
                        tiny ? 30 : 44
                      }
                      tick={{
                        fontSize:
                          tiny ? 8 : 10,
                        fill:
                          TECH_AXIS_STROKE,
                      }}
                      tickFormatter={
                        formatYAxisTick
                      }
                      axisLine={false}
                      tickLine={false}
                      domain={
                        areaNiceAxis.domain
                      }
                      ticks={
                        areaNiceAxis.ticks
                      }
                      tickCount={
                        yAxisTickCount
                      }
                      allowDataOverflow={
                        !isObservedYAxisMode
                      }
                    />
                  )}

                  {display.showTooltip && (
                    <Tooltip
                      labelFormatter={(
                        timestamp
                      ) =>
                        new Date(
                          timestamp
                        ).toLocaleString()
                      }
                      formatter={(
                        value,
                        name,
                        tooltipItem
                      ) => {
                        const key =
                          tooltipItem?.dataKey ||
                          name;

                        const range =
                          getRangeForKey(
                            key
                          );

                        const numeric =
                          Number(value);

                        const formatted =
                          Number.isFinite(
                            numeric
                          )
                            ? numeric.toFixed(
                                1
                              )
                            : value;

                        return [
                          range.unit
                            ? `${formatted} ${range.unit}`
                            : formatted,
                          dataLabels?.[
                            key
                          ] ||
                            visibleLines.find(
                              (line) =>
                                line.key ===
                                key
                            )?.label ||
                            key,
                        ];
                      }}
                      contentStyle={{
                        background:
                          "rgba(15,23,42,0.96)",
                        border:
                          "1px solid rgba(34,211,238,0.18)",
                        borderRadius:
                          "12px",
                        color: "white",
                        fontSize:
                          "11px",
                      }}
                    />
                  )}

                  {display.showLegend &&
                    !tiny &&
                    visibleLines.length >
                      1 && (
                      <Legend
                        wrapperStyle={{
                          fontSize:
                            "10px",
                        }}
                      />
                    )}

                  {visibleLines.map(
                    (line, index) => {
                      const range =
                        getRangeForKey(
                          line.key
                        );

                      const displayName =
                        dataLabels?.[
                          line.key
                        ] ||
                        line.label ||
                        line.key;

                      return (
                        <Area
                          key={line.key}
                          type={
                            resolvedCurveType
                          }
                          dataKey={
                            line.key
                          }
                          name={
                            range.unit
                              ? `${displayName} (${range.unit})`
                              : displayName
                          }
                          stroke={
                            line.color ||
                            "#7CB342"
                          }
                          strokeWidth={
                            resolvedStrokeWidth
                          }
                          strokeDasharray={
                            resolvedStrokeDasharray
                          }
                          fill={`url(#area-tech-${widgetId}-${index})`}
                          dot={
                            display.showDots &&
                            !tiny
                              ? {
                                  r: 2,
                                }
                              : false
                          }
                          activeDot={{
                            r: tiny
                              ? 3
                              : 4,
                          }}
                          connectNulls
                          isAnimationActive={
                            false
                          }
                        />
                      );
                    }
                  )}
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={rootRef}
      className={`${TECH_SURFACE_CLASS} ${
        tiny
          ? "p-1.5"
          : compact
          ? "p-2"
          : "p-2.5"
      } [--chart-grid-major:#94a3b8] [--chart-grid-minor:#cbd5e1] dark:[--chart-grid-major:#64748b] dark:[--chart-grid-minor:#475569]`}
    >
      <TechBackdrop />

      <div className="relative z-10 flex h-full min-h-0 flex-col">
        {/* HEADER */}
        <div
          className={`
            mb-1 min-w-0 pr-14
            ${tiny ? "px-0.5" : "px-1"}
          `}
        >
          <div
            className="
              flex min-w-0
              items-center gap-2
            "
          >
            <div
              className={`${TECH_HEADER_CLASS} min-w-0 truncate`}
              title={label}
            >
              {label}
            </div>

            {!tiny && (
              <div
                className="
                  shrink-0 rounded-full
                  border border-slate-200
                  bg-slate-50 px-2 py-0.5
                  text-[9px] font-medium
                  text-slate-500
                  dark:border-slate-700
                  dark:bg-slate-800
                  dark:text-slate-300
                "
              >
                {historyWindow}
              </div>
            )}

            {!tiny &&
              isSingleSeries &&
              display.showLatestValues &&
              singleLatestItem && (
                <div
                  className="
                    ml-auto flex
                    shrink-0 items-center
                    gap-1.5 text-[9px]
                  "
                  title={
                    singleLatestItem.name
                  }
                >
                  <span
                    className="
                      h-1.5 w-1.5
                      rounded-full
                    "
                    style={{
                      backgroundColor:
                        singleLatestItem.color,
                    }}
                  />

                  <span
                    className="
                      font-semibold
                      text-slate-700
                      dark:text-slate-200
                    "
                  >
                    {
                      singleLatestItem.formattedValue
                    }
                    {singleLatestItem.range.unit
                      ? ` ${singleLatestItem.range.unit}`
                      : ""}
                  </span>
                </div>
              )}
          </div>

          {!tiny &&
            !isSingleSeries &&
            display.showLatestValues &&
            latestItems.length > 0 && (
              <div
                className="
                  mt-1 flex flex-wrap
                  gap-x-3.5 gap-y-1
                "
              >
                {latestItems.map(
                  (item) => (
                    <div
                      key={item.key}
                      className="
                        flex items-center gap-1.5
                        text-[9px]
                      "
                    >
                      <span
                        className="
                          h-1.5 w-1.5
                          rounded-full
                        "
                        style={{
                          backgroundColor:
                            item.color,
                        }}
                      />

                      <span
                        className="
                          max-w-[110px]
                          truncate
                          text-slate-600
                          dark:text-slate-300
                        "
                      >
                        {item.name}
                      </span>

                      <span
                        className="
                          font-semibold
                          text-slate-800
                          dark:text-slate-200
                        "
                      >
                        {item.formattedValue}
                        {item.range.unit
                          ? ` ${item.range.unit}`
                          : ""}
                      </span>
                    </div>
                  )
                )}
              </div>
            )}
        </div>

        {/* CHART */}
        <div className="min-h-0 min-w-0 flex-1">
          {chartData.length === 0 ? (
            <div
              className={`flex h-full items-center justify-center text-xs ${TECH_MUTED_CLASS}`}
            >
              No trend data available.
            </div>
          ) : (
            <ResponsiveContainer
              key={`line-${responsiveSizeKey}`}
              width="100%"
              height="100%"
              minWidth={0}
              minHeight={0}
              debounce={20}
            >
              <ComposedChart
                data={chartData}
                margin={{
                  top: tiny ? 0 : 2,
                  right:
                    useMultipleAxes
                      ? 18
                      : tiny
                      ? 2
                      : 5,
                  left:
                    useMultipleAxes
                      ? 6
                      : tiny
                      ? -26
                      : -12,
                  bottom:
                    showLegend &&
                    !display.compactLegend
                      ? 4
                      : tiny
                      ? -8
                      : -4,
                }}
              >
{/* Background grid is rendered before the series so it stays behind the data. */}
                {display.showGrid && (
                  <CartesianGrid
                    stroke="var(--chart-grid-major)"
                    strokeWidth={0.65}
                    opacity={0.12}
                    horizontal={false}
                    vertical
                  />
                )}

                {display.showGrid &&
                  lineMajorGridTicks.map(
                    (tick) => (
                      <ReferenceLine
                        key={`line-major-grid-${tick}`}
                        y={tick}
                        yAxisId={
                          primaryAxis?.id
                        }
                        stroke="var(--chart-grid-major)"
                        strokeWidth={0.7}
                        opacity={0.18}
                        ifOverflow="extendDomain"
                      />
                    )
                  )}

                {display.showGrid &&
                  lineMinorGridTicks.map(
                    (tick) => (
                      <ReferenceLine
                        key={`line-minor-grid-${tick}`}
                        y={tick}
                        yAxisId={
                          primaryAxis?.id
                        }
                        stroke="var(--chart-grid-minor)"
                        strokeWidth={0.55}
                        opacity={0.07}
                        ifOverflow="extendDomain"
                      />
                    )
                  )}

                {display.showXAxis && (
                  <XAxis
                    dataKey="timestamp"
                    type="number"
                    scale="time"
                    domain={[
                      firstTimestamp ||
                        "dataMin",
                      lastTimestamp ||
                        "dataMax",
                    ]}
                    tickFormatter={(
                      value
                    ) =>
                      formatXAxisTime(
                        value,
                        historyWindow,
                        display.xAxisFormat
                      )
                    }
                    tick={{
                      fontSize:
                        tiny ? 8 : 9,
                      fill:
                        TECH_AXIS_STROKE,
                    }}
                    stroke={
                      TECH_AXIS_STROKE
                    }
                    axisLine={false}
                    tickLine={false}
                    minTickGap={Math.max(
                      8,
                      Math.min(
                        Number(
                          display.xAxisTickGap
                        ) || 30,
                        gridXAxisTickGap
                      )
                    )}
                    interval="preserveStartEnd"
                  />
                )}

                {display.showYAxis &&
                  axisDefinitions.map(
                    (
                      axis,
                      index
                    ) => (
                      <YAxis
                        key={axis.id}
                        yAxisId={
                          axis.id
                        }
                        orientation={
                          axis.orientation
                        }
                        domain={
                          axis.domain
                        }
                        ticks={
                          axis.ticks
                        }
                        width={
                          tiny
                            ? 28
                            : 44
                        }
                        tick={{
                          fontSize:
                            tiny
                              ? 8
                              : 9,
                          fill:
                            useMultipleAxes
                              ? axis.color
                              : TECH_AXIS_STROKE,
                        }}
                        tickFormatter={
                          formatYAxisTick
                        }
                        axisLine={
                          false
                        }
                        tickLine={
                          false
                        }
                        tickCount={
                          yAxisTickCount
                        }
                        allowDataOverflow={
                          !isObservedYAxisMode
                        }
                        hide={
                          useMultipleAxes &&
                          index > 1 &&
                          !wide
                        }
                      />
                    )
                  )}

                {display.showZeroLine && (
                  <ReferenceLine
                    y={0}
                    stroke="#94a3b8"
                    strokeWidth={0.75}
                    opacity={0.22}
                  />
                )}

                {display.showTooltip && (
                  <Tooltip
                    labelFormatter={(
                      timestamp
                    ) =>
                      new Date(
                        timestamp
                      ).toLocaleString()
                    }
                    formatter={(
                      value,
                      name,
                      tooltipItem
                    ) => {
                      const key =
                        tooltipItem?.dataKey ||
                        name;

                      const range =
                        getRangeForKey(
                          key
                        );

                      const number =
                        Number(value);

                      const formatted =
                        Number.isFinite(
                          number
                        )
                          ? number.toFixed(
                              1
                            )
                          : value;

                      return [
                        range.unit
                          ? `${formatted} ${range.unit}`
                          : formatted,
                        dataLabels?.[
                          key
                        ] ||
                          visibleLines.find(
                            (line) =>
                              line.key ===
                              key
                          )?.label ||
                          key,
                      ];
                    }}
                    contentStyle={botanicalTooltipStyle}
                    labelStyle={{
                      color:
                        "#cbd5e1",
                      marginBottom:
                        "4px",
                    }}
                    itemStyle={{
                      color:
                        "#f8fafc",
                    }}
                    cursor={{
                      stroke:
                        "#94a3b8",
                      strokeWidth:
                        1,
                      strokeDasharray:
                        "3 4",
                      opacity:
                        0.35,
                    }}
                  />
                )}

                {showLegend &&
                  !display.compactLegend && (
                    <Legend
                      wrapperStyle={{
                        fontSize:
                          tiny
                            ? "9px"
                            : "10px",
                      }}
                    />
                  )}

                {visibleLines.map(
                  (line, index) => {
                    const range =
                      getRangeForKey(
                        line.key
                      );

                    const displayName =
                      dataLabels?.[
                        line.key
                      ] ||
                      line.label ||
                      line.key;

                    const axisId =
                      useMultipleAxes
                        ? `series-${index}`
                        : "primary";

                    const commonProps = {
                      yAxisId: axisId,
                      type:
                        resolvedCurveType,
                      dataKey: line.key,
                      name: range.unit
                        ? `${displayName} (${range.unit})`
                        : displayName,
                      stroke:
                        line.color ||
                        "#7CB342",
                      strokeWidth:
                        resolvedStrokeWidth,
                      strokeDasharray:
                        resolvedStrokeDasharray,
                      dot:
                        display.showDots &&
                        !tiny
                          ? {
                              r: 2,
                              strokeWidth: 0,
                            }
                          : false,
                      activeDot: {
                        r: tiny
                          ? 3
                          : 4,
                        strokeWidth: 1.5,
                        stroke: "#ffffff",
                      },
                      connectNulls: true,
                      isAnimationActive: false,
                    };

                    return (
                      <Line
                        key={line.key}
                        {...commonProps}
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    );
                  }
                )}
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* COMPACT LEGEND */}
        {showLegend &&
          visibleLines.length > 1 &&
          display.compactLegend &&
          !display.showLatestValues && (
            <div
              className={`
                mt-1.5 flex flex-wrap
                items-center justify-center
                gap-x-3 gap-y-1
                ${
                  compact
                    ? "px-0"
                    : "px-1"
                }
              `}
            >
              {latestItems.map(
                (item) => (
                  <div
                    key={item.key}
                    className="
                      flex min-w-0
                      items-center gap-1.5
                      text-[9px]
                      text-slate-500
                      dark:text-slate-400
                    "
                  >
                    <span
                      className="h-1.5 w-3 shrink-0 rounded-full"
                      style={{
                        backgroundColor:
                          item.color,
                      }}
                    />

                    <span className="max-w-[100px] truncate">
                      {item.name}
                    </span>
                  </div>
                )
              )}
            </div>
          )}
      </div>
    </div>
  );
}
