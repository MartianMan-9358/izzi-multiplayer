// sidebar_Iz.js
"use strict";

// --- Host detection based on URL (?host=1) ---
function isHost() {
    const params = new URLSearchParams(window.location.search);
    return params.get("host") === "1";
}

// --- Sidebar / Host UI setup ---
function setupSidebarUI() {
    const menuToggle   = document.getElementById("menu-toggle");
    const sidebar      = document.getElementById("sidebar");
    const closeSidebar = document.getElementById("close-sidebar");

    const inputRows       = document.getElementById("inputRows");
    const inputCols       = document.getElementById("inputCols");
    const allowExcluded   = document.getElementById("allowExcluded");
    const btnBuild        = document.getElementById("btnBuild");
    const btnClear        = document.getElementById("btnClear");
    const solutionOnlyChk = document.getElementById("solutionOnly"); // may be null for now

    const btnNuke = document.getElementById("btnNuke");
    

    // 1. Non-hosts: hide sidebar + toggle and bail out
    if (!isHost()) {
        if (menuToggle) menuToggle.classList.add("hidden");
        if (sidebar)    sidebar.classList.add("hidden");
        return;
    }

    // 2. Host: show hamburger
    if (menuToggle) {
        menuToggle.classList.remove("hidden");
        menuToggle.addEventListener("click", () => {
            sidebar && sidebar.classList.add("open");
        });
    }

    if (closeSidebar) {
        closeSidebar.addEventListener("click", () => {
            sidebar && sidebar.classList.remove("open");
        });
    }

    // 3. Close sidebar when clicking outside (host only)
    window.addEventListener("mousedown", (e) => {
        if (!sidebar) return;
        if (!sidebar.classList.contains("open")) return;

        const clickedInside = sidebar.contains(e.target) || e.target === menuToggle;
        if (!clickedInside) {
            sidebar.classList.remove("open");
        }
    });

    // 4. Wire buttons (for now: just log actions)
    if (btnBuild) {
        btnBuild.addEventListener("click", () => {
            const rows = parseInt(inputRows.value, 10) || 8;
            const cols = parseInt(inputCols.value, 10) || 8;
            const allowX = !!allowExcluded.checked;
            const maxCells = allowX ? 70 : 64; //
            const total = rows * cols;
            
            if (total > maxCells) {
                alert(`Grid too large! Max is ${maxCells} cells for this configuration.`);
                return; // Stop the build
            }
            
            console.log("[HOST] Build New Board clicked", { rows, cols, allowX, solutionOnly: solutionOnlyChk.checked });

            buildNewBoard(rows, cols, allowX, solutionOnlyChk.checked);

            // Next step: call a real buildNewBoard(...) here
        });
    }

    if (btnClear) {
        btnClear.textContent = "Reset Current Board"; // rename label
        btnClear.addEventListener("click", () => {
            console.log("[HOST] Reset Current Board clicked");
            resetCurrentBoard();
        });
    }

    if (btnNuke) {
        btnNuke.addEventListener("click", () => {
            // Use the function you just added to state_Iz.js
            nukeDatabase();
        });
    }


}


 
//__________________________________________________
function buildNewBoard(rows, cols, allowExcluded, solutionOnly) {
    if (!isHost()) return;

    const btnBuild = document.getElementById("btnBuild");
    if (btnBuild) btnBuild.disabled = true;

    // 1. Create the Metadata Package
    const metadata = {
        rows: Number(rows) || 8,
        cols: Number(cols) || 8,
        allowExcluded: !!allowExcluded,
        solutionOnly: !!solutionOnly,
        isSolved: false,
        lastReset: Date.now(),
        winners: getWinningTileIds(rows, cols, allowExcluded) || []
    };

    // 2. Write to Cloud: This triggers initMetadataListener for all Guests
    db.ref("game/metadata").set(metadata).then(() => {
        // 3. Filter Tiles Locally
        initiateTiles(); // Rebuild tileArrALL from the master tileIdArray
        let tilesToUse;
        if (solutionOnly) {
            tilesToUse = tileArrALL.filter(t => metadata.winners.includes(t.id));
        } else if (!allowExcluded) {
            tilesToUse = tileArrALL.filter(t => !t.isExcluded);
        } else {
            tilesToUse = [...tileArrALL];
        }

        shuffle(tilesToUse);
        tileArrALL = tilesToUse;

        // 4. Scrub and Rebuild
        wipeRemoteBoard().then(() => {
            layoutTilesInStagingArea(); // Uses the hardened version from tileObj_Iz.js
            initiateBoard(metadata.rows, metadata.cols, CELL_SIZE, CELL_PADDING);
            
            // 5. Mass Sync: Push tray positions to everyone
            tileArrALL.forEach(t => updateRemoteTile(t));
        });
    }).finally(() => {
        if (btnBuild) btnBuild.disabled = false;
    });
}




//__________________________________________________

function resetCurrentBoard() {
    if (!isHost() || !gameBoard) return;

    const r = gameBoard.rows;
    const c = gameBoard.cols;

    // 1. Notify everyone a reset happened (hides win banner)
    db.ref("game/metadata").update({
        lastReset: Date.now(),
        isSolved: false
    });

    // 2. Clear the Board & Re-stage
    wipeRemoteBoard().then(() => {
        layoutTilesInStagingArea(); // Clears isPlaced, boardRow, and heldBy
        initiateBoard(r, c, CELL_SIZE, CELL_PADDING);
        
        // 3. Sync: Force all tiles back to tray positions for all players
        tileArrALL.forEach(t => {
            updateRemoteTile(t); 
        });
        console.log("[HOST] Reset complete.");
    });
}







//DEBUG ONLY
// ============================================================
// DEVELOPMENT DEBUGGING HELPERS (ignored in production)
// ============================================================
window.IZZI_DEBUG_TOOLS = {
    openSidebar() {
        const sidebar = document.getElementById("sidebar");
        if (sidebar) {
            sidebar.classList.remove("hidden"); // <-- FIX
            sidebar.classList.add("open");
            console.log("Sidebar opened (DEV).");
        }
    },
    closeSidebar() {
        const sidebar = document.getElementById("sidebar");
        if (sidebar) {
            sidebar.classList.remove("open");
            console.log("Sidebar closed (DEV).");
        }
    },
    toggleSidebar() {
        const sidebar = document.getElementById("sidebar");
        if (sidebar) {
            sidebar.classList.remove("hidden"); // <-- FIX
            sidebar.classList.toggle("open");
            console.log("Sidebar toggled (DEV).");
        }
    },
    forceHost() {
        console.warn("⚠️ DEV MODE: Host override enabled");
        
        // Override host detection
        window.isHost = () => true;

        // Make sure UI elements are visible
        const sidebar = document.getElementById("sidebar");
        const menuToggle = document.getElementById("menu-toggle");

        sidebar?.classList.remove("hidden");     // <-- FIX
        menuToggle?.classList.remove("hidden");  // <-- FIX

        // Re-run sidebar setup
        setupSidebarUI();

        console.log("Host mode forced (DEV).");
    }
};
