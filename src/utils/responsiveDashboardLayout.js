const toPositiveInteger = (value, fallback = 1) => {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    return fallback;
  }

  return Math.max(1, Math.floor(numericValue));
};

export const getResponsiveColumnCount = ({
  availableWidth,
  savedColumns,
  minimumColumnWidth = 210,
  gap = 8,
}) => {
  const columns = toPositiveInteger(savedColumns);
  const width = Number(availableWidth);

  if (!Number.isFinite(width) || width <= 0) {
    return columns;
  }

  const minimumWidth = Math.max(120, Number(minimumColumnWidth) || 210);
  const gridGap = Math.max(0, Number(gap) || 0);
  const columnsThatFit = Math.max(
    1,
    Math.floor((width + gridGap) / (minimumWidth + gridGap))
  );

  return Math.min(columns, columnsThatFit);
};

const isAreaAvailable = (occupied, x, y, width, height) => {
  for (let row = y; row < y + height; row += 1) {
    for (let column = x; column < x + width; column += 1) {
      if (occupied.has(`${column}:${row}`)) {
        return false;
      }
    }
  }

  return true;
};

const occupyArea = (occupied, x, y, width, height) => {
  for (let row = y; row < y + height; row += 1) {
    for (let column = x; column < x + width; column += 1) {
      occupied.add(`${column}:${row}`);
    }
  }
};

export const buildResponsiveDashboardLayout = (
  items = [],
  savedColumns = 1,
  displayColumns = savedColumns
) => {
  const sourceItems = Array.isArray(items) ? items : [];
  const originalColumns = toPositiveInteger(savedColumns);
  const columns = Math.min(
    originalColumns,
    toPositiveInteger(displayColumns, originalColumns)
  );

  if (columns === originalColumns) {
    return sourceItems.map((item) => ({ ...item }));
  }

  const occupied = new Set();
  const sortedItems = sourceItems
    .map((item, originalIndex) => ({ item, originalIndex }))
    .sort((left, right) => {
      const yDifference =
        (Number(left.item?.y) || 0) - (Number(right.item?.y) || 0);

      if (yDifference !== 0) return yDifference;

      const xDifference =
        (Number(left.item?.x) || 0) - (Number(right.item?.x) || 0);

      return xDifference !== 0
        ? xDifference
        : left.originalIndex - right.originalIndex;
    });

  const positioned = new Map();

  sortedItems.forEach(({ item, originalIndex }) => {
    const width = Math.min(columns, toPositiveInteger(item?.w));
    const height = toPositiveInteger(item?.h);
    const preferredX = Math.min(
      Math.max(0, Math.floor(Number(item?.x) || 0)),
      columns - width
    );

    let position = null;

    for (let row = 0; !position; row += 1) {
      const candidates = [
        preferredX,
        ...Array.from({ length: columns - width + 1 }, (_, index) => index),
      ].filter((value, index, values) => values.indexOf(value) === index);

      for (const column of candidates) {
        if (isAreaAvailable(occupied, column, row, width, height)) {
          position = { x: column, y: row, w: width, h: height };
          break;
        }
      }
    }

    occupyArea(
      occupied,
      position.x,
      position.y,
      position.w,
      position.h
    );

    positioned.set(originalIndex, {
      ...item,
      ...position,
    });
  });

  return sourceItems.map((_, index) => positioned.get(index));
};

export const getOccupiedDashboardRows = (items = []) =>
  Math.max(
    1,
    ...(Array.isArray(items) ? items : []).map((item) => {
      const y = Math.max(0, Math.floor(Number(item?.y) || 0));
      const height = toPositiveInteger(item?.h);

      return y + height;
    })
  );
