// Geography uses longitude/latitude in degrees, but SVG stroke widths use
// viewBox units. Project the Game Map paths to a pixel-sized coordinate space:
// 1.2 units is then about 1 pixel, rather than 1.2 *degrees* (a huge ring).
// This changes presentation only; original atlas geometry stays untouched.
export function arcadeMapProjection(bounds,{width=1000,padding=.08}={}){
  if(!Array.isArray(bounds)||bounds.length!==4)throw Error('Invalid map bounds');
  const [minLon,minLat,maxLon,maxLat]=bounds;
  const lonSpan=maxLon-minLon,latSpan=maxLat-minLat;
  if(![...bounds,width,padding].every(Number.isFinite)||lonSpan<=0||latSpan<=0||width<=0||padding<0||padding>.4)
    throw Error('Invalid map projection');
  const height=width*latSpan/lonSpan;
  const lonScale=width/(lonSpan*(1+2*padding));
  const latScale=height/(latSpan*(1+2*padding));
  return {
    width,height,
    viewBox:`0 0 ${width} ${height}`,
    point(lon,lat){
      return [(lon-minLon+lonSpan*padding)*lonScale,(maxLat-lat+latSpan*padding)*latScale];
    },
  };
}
function pathFromRing(ring,project){
  if(!Array.isArray(ring)||ring.length<3)return '';
  const steps=ring.map((point,index)=>{
    const [x,y]=project.point(point[0],point[1]);
    return (index?'L':'M')+x.toFixed(3)+','+y.toFixed(3);
  });
  return steps.join(' ')+' Z';
}
export function arcadeRegionPath(geometry,projection){
  if(!geometry)return '';
  if(geometry.type==='Polygon')return geometry.coordinates.map(ring=>pathFromRing(ring,projection)).join(' ');
  if(geometry.type==='MultiPolygon')return geometry.coordinates.flatMap(polygon=>polygon.map(ring=>pathFromRing(ring,projection))).join(' ');
  return '';
}
