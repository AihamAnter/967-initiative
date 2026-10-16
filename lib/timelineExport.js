// Recharts renders legend icons before the plot. Only the wrapper's direct SVG
// contains the axes and data series; exporting the first SVG captures an icon.
export function timelineChartSvg(chartElement) {
  return chartElement?.querySelector('.recharts-wrapper > svg.recharts-surface') || null;
}

function wrappedLines(context, value, width) {
  const lines = [];
  let current = '';
  for (const word of String(value || '').split(/\s+/).filter(Boolean)) {
    const next = current ? `${current} ${word}` : word;
    if (current && context.measureText(next).width > width) {lines.push(current);current = word;}
    else current = next;
  }
  if (current) lines.push(current);
  return lines;
}

export async function timelineChartPng({chartElement, fromYear, toYear, unit, percent, series}) {
  const svg = timelineChartSvg(chartElement);
  if (!svg || !svg.querySelector('.recharts-cartesian-axis')) throw new Error('Chart not ready');
  await document.fonts?.ready;
  const rect = svg.getBoundingClientRect();
  const sourceWidth = Number(svg.getAttribute('width')) || rect.width;
  const sourceHeight = Number(svg.getAttribute('height')) || rect.height;
  if (!(sourceWidth > 0 && sourceHeight > 0)) throw new Error('Chart has no size');
  const imageWidth = sourceWidth + 48, imageHeight = sourceHeight + 16;
  const clone = svg.cloneNode(true);
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.setAttribute('width', String(imageWidth));
  clone.setAttribute('height', String(imageHeight));
  // Recharts may place the last tick beyond its own box (visible in HTML).
  // Include that overflow when the SVG becomes a clipped image resource.
  clone.setAttribute('viewBox', `-24 -8 ${imageWidth} ${imageHeight}`);
  clone.style.fontFamily = 'Arial, sans-serif';
  clone.style.fontSize = getComputedStyle(svg).fontSize;
  // The page's axis-tick CSS is not carried into a serialized SVG image.
  // Keep year labels legible and separated in the standalone export.
  clone.querySelectorAll('.recharts-cartesian-axis-tick-value').forEach(tick => {tick.style.fontSize = '12px';});
  const source = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(clone)], {type: 'image/svg+xml;charset=utf-8'}));
  try {
    const image = new Image();
    await new Promise((resolve, reject) => {image.onload = resolve;image.onerror = () => reject(new Error('Chart image unavailable'));image.src = source;});
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1200, Math.min(2400, Math.round(sourceWidth * 2)));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas unavailable');
    const margin = 48, contentWidth = canvas.width - margin * 2;
    const font = '"IBM Plex Sans Arabic", Tahoma, Arial, sans-serif';
    context.font = `22px ${font}`;
    const mode = percent ? 'نسبة التغير من أول قيمة متاحة في الفترة (%)' : `القيمة الفعلية · الوحدة: ${unit || 'غير محددة'}`;
    const header = wrappedLines(context, `الفترة: من ${fromYear} إلى ${toYear} · ${mode}`, contentWidth);
    const legend = series.map(item => ({...item, lines: wrappedLines(context, `${item.name} · المصدر: ${item.source || 'المصدر غير محدد'}`, contentWidth - 48)}));
    const chartTop = 96 + header.length * 32;
    const chartHeight = Math.round(imageHeight * contentWidth / imageWidth);
    const footerTop = chartTop + chartHeight + 28;
    canvas.height = footerTop + legend.reduce((height, item) => height + item.lines.length * 32 + 12, 0) + 80;
    context.fillStyle = '#F7F4EC';context.fillRect(0, 0, canvas.width, canvas.height);
    context.direction = 'rtl';context.textAlign = 'right';context.textBaseline = 'top';
    context.fillStyle = '#176b75';context.font = `bold 32px ${font}`;
    context.fillText('اليمن عبر الزمن | مبادرة 967', canvas.width - margin, 30);
    context.fillStyle = '#28343a';context.font = `22px ${font}`;
    header.forEach((line, index) => context.fillText(line, canvas.width - margin, 84 + index * 32));
    context.drawImage(image, margin, chartTop, contentWidth, chartHeight);
    let y = footerTop;
    for (const item of legend) {
      context.strokeStyle = item.color || '#176b75';context.lineWidth = 5;
      context.beginPath();context.moveTo(canvas.width - margin - 28, y + 14);context.lineTo(canvas.width - margin, y + 14);context.stroke();
      context.fillStyle = '#28343a';
      item.lines.forEach((line, index) => context.fillText(line, canvas.width - margin - 44, y + index * 32));
      y += item.lines.length * 32 + 12;
    }
    context.fillStyle = '#5e6b6d';context.font = `18px ${font}`;
    context.fillText('النطاق: الجمهورية اليمنية · الفراغات تعني عدم وجود قيمة منشورة', canvas.width - margin, y + 12);
    return await new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('PNG export failed')), 'image/png'));
  } finally {
    URL.revokeObjectURL(source);
  }
}
