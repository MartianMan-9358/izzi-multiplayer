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
    console.log("Assets loaded. Waiting for Firebase Auth...");

    if (!ROT_INIT) initRotTable();

    // 1. Ask Firebase for an anonymous session
    firebase.auth().signInAnonymously()
        .then((userCredential) => {
            // 2. Get the REAL UID from Firebase (e.g., "qX9j...")
            const uid = userCredential.user.uid; 
            console.log("Secure Session Active:", uid);

            const colors = ["yellow", "cyan", "magenta", "lime", "orange", "white", "pink", "aqua"];
            const myColor = colors[Math.floor(Math.random() * colors.length)];

            // 3. Initialize player using the Firebase UID
            PlayerManager.initLocalPlayer(uid, "Player " + uid.slice(-3), myColor);

            // 4. Setup Cloud Cleanup
            db.ref(`game/players/${uid}`).onDisconnect().remove();

            // 5. Start Listeners & Interaction AFTER auth is confirmed
            initMetadataListener();
            initTileListeners();
            initPlayerListeners();
            initBoardListeners();
            setupInteraction();

            // 6. Start the Loop
            requestAnimationFrame(gameLoop);
        })
        .catch(err => {
            console.error("Firebase Auth failed! Check your Config or Console.", err);
        });
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
