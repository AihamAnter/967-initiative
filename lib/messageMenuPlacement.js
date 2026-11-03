// Clamp a popup to the visible conversation pane and viewport.
const clamp=(value,min,max)=>Math.max(min,Math.min(value,max));
export function placeMessageMenu(anchor,container,width,height,viewportWidth,viewportHeight){
 const leftEdge=Math.max(8,container.left+6);
 const rightEdge=Math.max(leftEdge+1,Math.min(viewportWidth-8,container.right-6));
 const topEdge=Math.max(8,container.top+6);
 const bottomEdge=Math.max(topEdge+1,Math.min(viewportHeight-8,container.bottom-6));
 const maxWidth=rightEdge-leftEdge,maxHeight=bottomEdge-topEdge;
 const w=Math.min(width,maxWidth),h=Math.min(height,maxHeight);
 const left=clamp(anchor.right-w,leftEdge,rightEdge-w);
 const above=anchor.top-h-7,below=anchor.bottom+7;
 const top=above>=topEdge?above:below+h<=bottomEdge?below:clamp(above,topEdge,bottomEdge-h);
 return {left,top,maxWidth,maxHeight};
}
