const clamp = (value, minimum, maximum) =>
  Math.min(maximum, Math.max(minimum, value));

export const calculateCanvasFitZoom = ({
  bounds,
  viewportWidth,
  viewportHeight,
  padding = 28,
  minimumZoom = 0.3,
  maximumZoom = 1.35,
}) => {
  const width = Number(bounds?.width);
  const height = Number(bounds?.height);
  const availableWidth = Number(viewportWidth) - padding * 2;
  const availableHeight = Number(viewportHeight) - padding * 2;

  if (
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    width <= 0 ||
    height <= 0 ||
    !Number.isFinite(availableWidth) ||
    !Number.isFinite(availableHeight) ||
    availableWidth <= 0 ||
    availableHeight <= 0
  ) {
    return 1;
  }

  return clamp(
    Math.min(availableWidth / width, availableHeight / height),
    minimumZoom,
    maximumZoom
  );
};
