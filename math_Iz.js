"use strict"



//__________________________________________________
function isPointInRect(px, py, x, y, width, height) {
  return px >= x && 
         px <= x + width && 
         py >= y && 
         py <= y + height;
}

//__________________________________________________
function isPointInCircle(px, py, cx, cy, radius) {
  const dx = px - cx;
  const dy = py - cy;
  const distanceSquared = dx * dx + dy * dy;
  return distanceSquared <= radius * radius;
}

//__________________________________________________
function circlesOverlap(x1, y1, r1, x2, y2, r2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const distanceSquared = dx * dx + dy * dy;
  const radiusSum = r1 + r2;
  
  return distanceSquared <= radiusSum * radiusSum;
}
//__________________________________________________
function resolveCircleOverlap(c1, c2) {
  let dx = c2.x - c1.x; // Changed from const to let
  let dy = c2.y - c1.y; // Changed from const to let
  const distance = Math.sqrt(dx * dx + dy * dy);
  
  if (distance < c1.r + c2.r) {
    
    if (distance === 0) { dx = 0.0001; } 
    
    const overlap = (c1.r + c2.r - distance);

    const nx = dx / (distance || 0.0001);
    const ny = dy / (distance || 0.0001);

    const moveX = nx * (overlap / 2);
    const moveY = ny * (overlap / 2);

    c1.x -= moveX;
    c1.y -= moveY;
    c2.x += moveX;
    c2.y += moveY;
  }
}



//__________________________________________________
function resolveGlobalCollisions(tiles, passes = 3) {
    for (let i = 0; i < passes; i++) {
        for (let j = 0; j < tiles.length; j++) {
            for (let k = j + 1; k < tiles.length; k++) {
                // Returns true if a push actually happened
                resolveTileCollision(tiles[j], tiles[k]);
            }
        }
    }
}


//__________________________________________________

function resolveTileCollision(tileA, tileB) {
  // A tile is a "wall" if placed OR currently held/dragged by anyone
  const aLocked = tileA.isPlaced || tileA.isDragging || !!tileA.heldBy;
  const bLocked = tileB.isPlaced || tileB.isDragging || !!tileB.heldBy;

  if (aLocked && bLocked) return false; // Both walls = no movement

  const r = tileA.width * 0.25;
  let dx = (tileB.x + tileB.width / 2) - (tileA.x + tileA.width / 2);
  let dy = (tileB.y + tileB.height / 2) - (tileA.y + tileA.height / 2);
  const distance = Math.sqrt(dx * dx + dy * dy);

  if (distance < (r + r)) {
    if (distance === 0) dx = 0.0001; 
    const overlap = (r + r - distance);
    const nx = dx / (distance || 0.0001);
    const ny = dy / (distance || 0.0001);

    let moveA = 0.5, moveB = 0.5;
    if (aLocked) { moveA = 0; moveB = 1.0; }
    else if (bLocked) { moveA = 1.0; moveB = 0; }

    tileA.x -= nx * (overlap * moveA);
    tileA.y -= ny * (overlap * moveA);
    tileB.x += nx * (overlap * moveB);
    tileB.y += ny * (overlap * moveB);
    return true;
  }
  return false;
}




//__________________________________________________
function snapToCell(tile, cell){
    //If cell is already occupied, return false
    const tcx = tile.x + tile.width / 2
    const tcy = tile.y + tile.height / 2
    const t_rad = 0.65 * tile.width/2 
    
    const ccx = cell.x + cell.width / 2
    const ccy = cell.x + cell.width / 2
    return isPointInCircle(ccx, ccy, tcx, tcy, t_rad)
}