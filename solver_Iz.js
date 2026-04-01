// solver_Iz.js
"use strict";

// --- Global Solver State ---
const EDGE_VAL = new Uint8Array(256 * 4); // [tileValue * 4 + side]
const ROT = new Uint8Array(256 * 4);      // [tileValue * 4 + rotationIndex]
let ROT_INIT = false;
let UsedTiles = [];

/**
 * Port of VBA InitRotTable
 * side: 0=N, 1=E, 2=S, 3=W
 */
function initRotTable() {
    // Initialize the arrays (Assuming global TypedArrays or Arrays)
    // ROT is 256 * 4, EDGE_VAL is 256 * 4
    for (let b = 0; b < 256; b++) {
        // 1. Handle Rotations (2-bit circular left shift)
        // VBA: ((b * 4) Or (b \ 64)) And &HFF
        ROT[b * 4 + 0] = b;
        ROT[b * 4 + 1] = ((b << 2) | (b >>> 6)) & 0xFF;
        ROT[b * 4 + 2] = ((b << 4) | (b >>> 4)) & 0xFF;
        ROT[b * 4 + 3] = ((b << 6) | (b >>> 2)) & 0xFF;

        for (let r = 0; r < 4; r++) {
            let t = ROT[b * 4 + r];

            // 2. Handle Edge Values (Strict VBA Port)
            // side: 0=N, 1=E, 2=S, 3=W
            
            // North: (t And 1) + (t And 2 \ 2)
            EDGE_VAL[t * 4 + 0] = (t & 1) + ((t & 2) >> 1);
            
            // East: (t And 4 \ 4) + (t And 8 \ 8)
            EDGE_VAL[t * 4 + 1] = ((t & 4) >> 2) + ((t & 8) >> 3);
            
            // South: (t And 32 \ 32) + (t And 16 \ 16)
            // Note: VBA order is bit 5 then bit 4
            EDGE_VAL[t * 4 + 2] = ((t & 32) >> 5) + ((t & 16) >> 4);
            
            // West: (t And 128 \ 128) + (t And 64 \ 64)
            // Note: VBA order is bit 7 then bit 6
            EDGE_VAL[t * 4 + 3] = ((t & 128) >> 7) + ((t & 64) >> 6);
        }
    }
    ROT_INIT = true;
}

//__________________________________________________
/**
 * Port of VBA initTiles
 */
function initTiles(allowExcluded) {
    const tiles = [1, 2, 3, 5, 6, 7, 9, 10, 11, 13, 14, 15, 17, 18, 19, 21, 22, 23, 25, 26, 27, 29, 30, 31, 34, 35, 37, 38, 39, 41, 42, 43, 45, 46, 47, 53, 54, 55, 57, 58, 59, 61, 62, 63, 86, 87, 90, 91, 94, 95, 103, 106, 107, 110, 111, 119, 122, 123, 126, 127, 171, 175, 187, 191];
    const exTiles = [0, 51, 85, 102, 170, 255];
    
    let tArr = [...tiles];
    if (allowExcluded) {
        tArr = tArr.concat(exTiles);
    }
    return tArr;
}

//__________________________________________________
/**
 * Fisher-Yates Shuffle (Port of ArrayShuffle)
 */
function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

/**
 * Port of VBA canPlace
 */
function canPlace(brd, r, c, tVal, rows, cols) {
    const t = tVal & 0xFF;

    // North (Check tile above)
    if (r > 0) {
        const neighbor = brd[r - 1][c];
        if (neighbor !== -1) {
            if (EDGE_VAL[t * 4 + 0] !== EDGE_VAL[(neighbor & 0xFF) * 4 + 2]) return false;
        }
    }

    // West (Check tile to the left)
    if (c > 0) {
        const neighbor = brd[r][c - 1];
        if (neighbor !== -1) {
            if (EDGE_VAL[t * 4 + 3] !== EDGE_VAL[(neighbor & 0xFF) * 4 + 1]) return false;
        }
    }

    // South (Check tile below)
    if (r < rows - 1) {
        const neighbor = brd[r + 1][c];
        // Only check if a tile actually exists there (important for non-sequential DFS)
        if (neighbor !== -1) {
            if (EDGE_VAL[t * 4 + 2] !== EDGE_VAL[(neighbor & 0xFF) * 4 + 0]) return false;
        }
    }

    // East (Check tile to the right)
    if (c < cols - 1) {
        const neighbor = brd[r][c + 1]; // FIXED: Use [r][c + 1] for East
        if (neighbor !== -1) {
            if (EDGE_VAL[t * 4 + 1] !== EDGE_VAL[(neighbor & 0xFF) * 4 + 3]) return false;
        }
    }

    return true;
}



/**
 * Port of VBA DFS
 */
function DFS(brd, tArr, r, c, fillCnt, sln, rows, cols) {
    const totalCells = rows * cols;
    if (fillCnt === totalCells) return true;

    for (let i = 0; i < tArr.length; i++) {
        if (!UsedTiles[i]) {
            for (let j = 0; j < 4; j++) {
                // LKUP_BYTEROTATE logic
                let tVal = ROT[tArr[i] * 4 + j];

                if (canPlace(brd, r, c, tVal, rows, cols)) {
                    brd[r][c] = tVal;
                    sln[r][c] = { initVal: tArr[i], tileRotate: j };
                    UsedTiles[i] = true;

                    if (fillCnt + 1 === totalCells) return true;

                    // Next Cell Logic
                    let nextR = (c === cols - 1) ? r + 1 : r;
                    let nextC = (c === cols - 1) ? 0 : c + 1;

                    if (DFS(brd, tArr, nextR, nextC, fillCnt + 1, sln, rows, cols)) return true;

                    // Backtrack
                    UsedTiles[i] = false;
                    brd[r][c] = -1;
                    sln[r][c] = { initVal: -1, tileRotate: -1 };
                }
            }
        }
    }
    return false;
}

/**
 * Main Controller (Port of main_sub)
 */
function solvePuzzle(rCnt, cCnt, allowExcluded) {
    if (!ROT_INIT) initRotTable();

    // Init Board & Solution (2D Arrays)
    const brd = Array.from({ length: rCnt }, () => Array(cCnt).fill(-1));
    const sln = Array.from({ length: rCnt }, () => 
        Array.from({ length: cCnt }, () => ({ initVal: -1, tileRotate: -1 }))
    );


    const tArr = initTiles(allowExcluded);
    UsedTiles = new Array(tArr.length).fill(false);
    shuffle(tArr);

    const startTime = performance.now();
    const success = DFS(brd, tArr, 0, 0, 0, sln, rCnt, cCnt);
    const endTime = performance.now();

    console.log(`Solver Result: ${success ? "Success" : "Failed"} in ${(endTime - startTime).toFixed(2)}ms`);
    return success ? sln : null;
}



/**
 * Port of VBA main_sub()
 * Runs a standalone test of the DFS logic and logs the solution to the console.
 */
function testSolver() {
    console.log("🚀 Starting Solver Test...");
    
    // 1. Setup Grid Dimensions (Ported from rCnt = 7: cCnt = 10)
    const rCnt = 1;
    const cCnt = 70;
    const allowExcluded = true;

    // 2. Initialize Tables (Ported from If Not ROT_INIT Then InitRotTable)
    if (!ROT_INIT) initRotTable();

    // 3. Initialize Board and Solution (Ported from initBoard / initSolution)
    // We use a mapping function to ensure each object in the 2D array is unique
    const brd = Array.from({ length: rCnt }, () => Array(cCnt).fill(-1));
    const sln = Array.from({ length: rCnt }, () => 
        Array.from({ length: cCnt }, () => ({ initVal: -1, tileRotate: -1 }))
    );

    // 4. Initialize and Shuffle Tiles (Ported from initTiles / ArrayShuffle)
    const tArr = initTiles(allowExcluded);
    UsedTiles = new Array(tArr.length).fill(false); // Reset the tracker
    shuffle(tArr);

    // 5. Run DFS and Time it (Ported from Timer - strt)
    const startTime = performance.now();
    const result = DFS(brd, tArr, 0, 0, 0, sln, rCnt, cCnt);
    const endTime = performance.now();

    // 6. Debug Output (Ported from Debug.Print)
    console.log("DFS Result:", result);
    if (result) {
        debugPrintSolution(sln, rCnt, cCnt);
    }
    console.log(`Execution Time: ${(endTime - startTime).toFixed(4)}ms`);
}

/**
 * Port of DebugPrintSolution
 */
function debugPrintSolution(sln, rows, cols) {
    for (let r = 0; r < rows; r++) {
        let rowStr = "";
        for (let c = 0; c < cols; c++) {
            const tile = sln[r][c];
            // Format to match "000(0)" style
            const val = String(tile.initVal).padStart(3, '0');
            rowStr += `${val}(${tile.tileRotate})  `;
        }
        console.log(`Row ${r}: ${rowStr}`);
    }
}



function getWinningTileIds(rCnt, cCnt, allowExcluded) {
    // Standard setup from your testSolver()
    if (!ROT_INIT) initRotTable();
    const brd = Array.from({ length: rCnt }, () => Array(cCnt).fill(-1));
    const sln = Array.from({ length: rCnt }, () => 
        Array.from({ length: cCnt }, () => ({ initVal: -1, tileRotate: -1 }))
    );
    const tArr = initTiles(allowExcluded);
    UsedTiles = new Array(tArr.length).fill(false);
    shuffle(tArr);

    // DFS mutates sln by reference
    const success = DFS(brd, tArr, 0, 0, 0, sln, rCnt, cCnt);

    if (success) {
        // Just return the IDs that belong
        return sln.flat().map(tile => `tile_${String(tile.initVal).padStart(3, '0')}`);
    }
    return null;
}
