// Keep every zoom route (buttons, wheel and pinch) finite and recoverable.
export function zoomMapViewport(viewBox, factor, anchor) {
  if (!viewBox || !Number.isFinite(factor) || factor <= 0 || !anchor ||
      ![viewBox.x, viewBox.y, viewBox.width, viewBox.height, anchor.x, anchor.y].every(Number.isFinite) ||
      viewBox.width <= 0 || viewBox.height <= 0) return viewBox;
  const width = Math.min(60, Math.max(0.015, viewBox.width * factor));
  const height = viewBox.height * width / viewBox.width;
  const ratioX = (anchor.x - viewBox.x) / viewBox.width;
  const ratioY = (anchor.y - viewBox.y) / viewBox.height;
  return {x: anchor.x - width * ratioX, y: anchor.y - height * ratioY, width, height};
}

export function mapScreenPoint(rect, event, viewBox) {
  const scale = Math.min(rect.width / viewBox.width, rect.height / viewBox.height);
  if (!Number.isFinite(scale) || scale <= 0) return {x: viewBox.x, y: viewBox.y};
  // SVG's default xMidYMid meet leaves margins when its aspect ratio differs.
  return {
    x: viewBox.x + (event.clientX - rect.left - (rect.width - viewBox.width * scale) / 2) / scale,
    y: viewBox.y + (event.clientY - rect.top - (rect.height - viewBox.height * scale) / 2) / scale,
  };
}
