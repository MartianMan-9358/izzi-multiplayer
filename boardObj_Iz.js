"use strict";

function initiateBoard(rows, cols, cellSize, padding = 4){
    gameBoard = new BoardObj (rows, cols, cellSize, padding)
}
//__________________________________________________
class BoardObj {
    constructor(rows, cols, cellSize, padding = 4) {
        this.rows = rows;
        this.cols = cols;
        this.cellSize = cellSize;
        this.padding = padding;
        
        // Logical Board Dimensions (Cells + Gaps)
        // We subtract one padding at the end so there's no "extra" gap on the far right/bottom
        this.width = (cols * cellSize) + ((cols - 1) * padding);
        this.height = (rows * cellSize) + ((rows - 1) * padding);

        // Center on the global canvas (using your CANVAS_WIDTH global)
        this.x = (CANVAS_WIDTH - this.width) / 2;
        this.y = (CANVAS_HEIGHT - this.height) / 2;

        this.cells = [];
        this.initGrid();
    }

    initGrid() {
        this.cells = [];
        for (let r = 0; r < this.rows; r++) {
            const row = [];
            for (let c = 0; c < this.cols; c++) {
                row.push({
                    row: r,
                    col: c,
                    // Math: (Start Pos) + (Column * (Tile + Gap))
                    x: this.x + c * (this.cellSize + this.padding),
                    y: this.y + r * (this.cellSize + this.padding),
                    tileObj: null
                });
            }
            this.cells.push(row);
        }
    }

    // 1. Link a tile to a specific cell
    placeTile(tile, r, c) {
        const cell = this.cells[r][c];
    
        // Safety: Don't place if someone else is already there
        if (cell.tileObj && cell.tileObj !== tile) {
            console.warn(`Cell ${r}_${c} is already occupied!`);
            return false;
        }
    
        // 1. Link the cell to the tile
        cell.tileObj = tile;
    
        // 2. Force the tile to match the cell's exact coordinates
        tile.x = cell.x;
        tile.y = cell.y;
        
        // 3. Update the tile's internal tracking
        tile.boardRow = r;
        tile.boardCol = c;
        tile.isPlaced = true;
        tile.heldBy = null; // Ensure it's no longer "held" once snapped
        
        return true;
    }

    // 2. Clear a cell when a tile is picked up
    removeTile(r, c) {
        if (r < 0 || c < 0 || !this.cells[r] || !this.cells[r][c]) return;
    
        const cell = this.cells[r][c];
    
        // If there is a tile in this cell, detach it fully
        if (cell.tileObj) {
            const tile = cell.tileObj;
            tile.boardRow = -1;
            tile.boardCol = -1;
            tile.isPlaced = false;
            // Important: We do NOT set tile.heldBy here; 
            // handleMouseDown in interaction_Iz.js handles the grab.
        }
    
        // ALWAYS null the cell reference. 
        // This ensures isBoardSolved() correctly sees an empty slot.
        cell.tileObj = null;
    }


    
    // Drawing with global 'ctx' 
    draw() {
        if (!ctx){
            console.log("conctext 2D not set or not available")
            return;
        }
        ctx.save();
        ctx.strokeStyle = "#444";
        ctx.lineWidth = 1;

        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                const cell = this.cells[r][c];
                // Visual Slot
                ctx.strokeRect(cell.x, cell.y, this.cellSize, this.cellSize);
            }
        }
        ctx.restore();
    }

    // Updated hit detection to respect the padding
    getCellAt(px, py) {
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                const cell = this.cells[r][c];
                if (
                    px >= cell.x && px < cell.x + this.cellSize &&
                    py >= cell.y && py < cell.y + this.cellSize
                ) {
                    return cell;
                }
            }
        }
        return null;
    }

    // --- SNAP RADIUS LOGIC ---
    isTileWithinSnapRadius(tile, cell) {
        const tileCX = tile.x + tile.width / 2;
        const tileCY = tile.y + tile.height / 2;
    
        const cellCX = cell.x + this.cellSize / 2;
        const cellCY = cell.y + this.cellSize / 2;
    
        const dx = tileCX - cellCX;
        const dy = tileCY - cellCY;
    
        const snapRadius = 0.5 * this.cellSize;
    
        return (dx * dx + dy * dy) <= (snapRadius * snapRadius);
    }


   isBoardSolved() {
        const totalCells = this.rows * this.cols;
        let fillCnt = 0;
    
        // 1. Check if board is full
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                if (this.cells[r][c].tileObj) fillCnt++;
            }
        }
        if (fillCnt !== totalCells) return false;
    
        // 2. Check edge matches
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                const tile = this.cells[r][c].tileObj;
                const val = tile.value; // rotation-adjusted
    
                // North neighbor
                if (r > 0) {
                    const north = this.cells[r - 1][c].tileObj;
                    if (!north) return false; // should never happen if board is full
                    if (EDGE_VAL[val * 4 + 0] !== EDGE_VAL[north.value * 4 + 2]) {
                        return false;
                    }
                }
    
                // West neighbor
                if (c > 0) {
                    const west = this.cells[r][c - 1].tileObj;
                    if (!west) return false;
                    if (EDGE_VAL[val * 4 + 3] !== EDGE_VAL[west.value * 4 + 1]) {
                        return false;
                    }
                }
            }
        }
    
        return true;
    }

}
