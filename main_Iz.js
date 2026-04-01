// main_Iz.js
"use strict";

/* ============================================================
   MAIN INITIALIZATION
   ============================================================ */
document.addEventListener("DOMContentLoaded", () => {
    // 1. Basic Canvas setup
    canvas = document.getElementById("gameCanvas");
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
    ctx = canvas.getContext("2d");

    // 2. Load Visual Assets
    spriteSheet.src = "tileSpriteSheet6small.png";
    spriteSheet.onload = () => {
        console.log("Assets loaded. Initializing systems...");

        // Initialize the math tables (ROT/EDGE_VAL) for win-checking [0.32]
        if (!ROT_INIT) initRotTable();

        // Register the local player with a unique ID and random color [0.20, 0.24]
        const uid = "p_" + Math.random().toString(36).slice(2, 10);
        const colors = ["yellow", "cyan", "magenta", "lime", "orange", "white", "pink", "aqua"];
        const myColor = colors[Math.floor(Math.random() * colors.length)];
        PlayerManager.initLocalPlayer(uid, "Player " + uid.slice(-3), myColor);

        // Wipe cursor from cloud if player leaves/refreshes [0.20]
        db.ref(`game/players/${uid}`).onDisconnect().remove();

        // 3. Start Data Flow: Listeners must start BEFORE the game loop [0.21, 0.39]
        initMetadataListener();
        initTileListeners();
        initPlayerListeners();
        initBoardListeners();

        // Setup the input layer (mousedown, etc.) [0.13]
        setupInteraction();

        // 4. Start Rendering
        requestAnimationFrame(gameLoop);
    };

    // Initialize the Sidebar UI [0.21, 0.25]
    setupSidebarUI();
});

/* ============================================================
   GAME LOOP
   ============================================================ */
function gameLoop() {
    // 1. Clear with a dark background to match the CSS theme [0.03, 0.12]
    clearCanvas(ctx);

    // 2. Draw the Board slots first (bottom layer) [0.09, 0.10]
    if (gameBoard) {
        gameBoard.draw();
    }

    // 3. Draw Tiles based on zIndex (higher numbers on top) [0.21]
    tileArrALL.sort((a, b) => a.zIndex - b.zIndex);
    for (let t of tileArrALL) {
        t.draw(ctx, spriteSheet);

        // Draw a "halo" frame around tiles currently held by ANY player [0.12, 0.21]
        if (t.heldBy) {
            drawTileFrame(ctx, t, "cyan");
        }
    }

    // 4. Draw cursors for other players [0.21, 0.25]
    PlayerManager.drawOthers(ctx);

    requestAnimationFrame(gameLoop);
}
