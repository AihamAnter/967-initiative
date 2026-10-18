export default function MapLegend({source}) {
  return <div className="ymap-legend">
    <div><span className="legend-swatch legend-country"/> حدود الجمهورية</div>
    <div><span className="legend-swatch legend-governorate"/> المحافظات</div>
    <div><span className="legend-swatch legend-district"/> المديريات</div>
    <span className="sr-only">مصدر الحدود: {source.provider}</span>
  </div>;
}
