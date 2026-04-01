//tileObj_Iz.js
"use strict"


function initiateTiles() {
    tileArrALL = [];

    const columns = 10;
    const spacing = TILE_SIZE + 4;  // tile width + padding

    for (let i = 0; i < tileIdArray.length; i++) {
        const id = tileIdArray[i];

        const c = i % columns;
        const r = Math.floor(i / columns);

        const x = c * spacing;
        const y = r * spacing;

        const t = new TileObj(id, i, x, y, 0);
        tileArrALL.push(t);
    }
}

//__________________________________________________
function normalizeZIndices() {
    // 1. Sort by current zIndex (ascending)
    tileArrALL.sort((a, b) => a.zIndex - b.zIndex);

    // 2. Re-assign zIndex based on the new array order (0, 1, 2...)
    for (let i = 0; i < tileArrALL.length; i++) {
        tileArrALL[i].zIndex = i;
    }
}

//__________________________________________________
class TileObj {
    constructor(id, tileIndex, x, y, rotation = 0) {
        this.id = id;               // Unique ID (crucial for multiplayer sync)
        this.tileIndex = tileIndex
        this.initialValue = parseInt(id.split('_')[1]) * 1;
        this.value = this.initialValue
        this.isExcluded = id.endsWith("_X")
        
        this.rotation = rotation;   // 0-3 (0, 90, 180, 270 degrees)
        
        // Positioning
        this.x = x;
        this.y = y;
        this.width = TILE_SIZE;  // Your current draw scale
        this.height = TILE_SIZE;
        
        // Player interaction State
        this.isDragging = false;
        this.heldBy = null;         // For multiplayer locking
        this.zIndex = 0;            // To ensure held tiles are drawn on top

        // Board placement
        this.boardRow = -1
        this.boardCol = -1
        this.isPlaced = false;      // Snap-to-grid status 

    }
    //Is the tile on the board
    isOnBoard() {
        return this.boardRow >= 0 && this.boardCol >= 0;
    }
    // Move logic
    moveTo(nx, ny) {
        this.x = nx - this.width / 2;
        this.y = ny - this.height / 2;
    }

    // Rotation logic (updates the visual 0-3)
    rotateClockwise() {
        // 1. Update visual rotation index (0-3)
        this.rotation = (this.rotation + 1) % 4;
    
        // 2. CRITICAL: Update the logical matching value.
        // Without this, the Solver and Win-Checker will use the old edge values.
        if (typeof ROT !== 'undefined') {
            this.value = ROT[this.initialValue * 4 + this.rotation];
        } else {
            console.warn("ROT table not initialized during rotation.");
        }
    }
    
    draw(ctx, img) {
        const columns = 10;
        const sx = (this.tileIndex % columns) * TILE_SIZE; 
        const sy = Math.floor(this.tileIndex / columns) * TILE_SIZE;
    
        ctx.save();
        // Move to the logical CENTER for rotation
        ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
        ctx.rotate(this.rotation * (Math.PI / 2));
    
        // Draw offset by negative half-width/height
        // This makes the logical this.x/y the visual top-left
        ctx.drawImage(
            img,
            sx, sy, TILE_SIZE, TILE_SIZE,
            -this.width / 2, -this.height / 2, 
            this.width, this.height
        );
        ctx.restore();
    }

}

function layoutTilesInStagingArea() {
    const margin = 20; 
    const tilesPerRow = 10; 

    tileArrALL.forEach((tile, index) => {
        const row = Math.floor(index / tilesPerRow);
        const col = index % tilesPerRow;

        // 1. Reset physical position to the tray
        tile.x = margin + col * (TILE_SIZE + TILE_PADDING);
        tile.y = margin + row * (TILE_SIZE + TILE_PADDING);
        
        // 2. RUTHLESS RESET: Clear all board-related data
        tile.isPlaced = false;
        tile.boardRow = -1;
        tile.boardCol = -1;
        tile.heldBy = null;
        tile.isDragging = false;
        
        // 3. Reset rotation to North (0)
        tile.rotation = 0;
        // Ensure the value matches the 0 rotation
        tile.value = tile.initialValue; 
    });

    // 4. Reset depth sorting so nothing is "buried"
    if (typeof normalizeZIndices === "function") normalizeZIndices();
}
