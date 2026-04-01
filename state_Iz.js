// state_Iz.js
"use strict";

/* ---------------------------
   WRITERS (Send local data to Cloud)
   --------------------------- */

function broadcastBoardMetadata(rows, cols, allowX, solutionOnly, winners) {
  if (!isHost()) {
    console.warn("Non-host blocked from broadcasting metadata.");
    return;
  }
  
  db.ref("game/metadata").set({
    rows: rows,
    cols: cols,
    allowExcluded: allowX,
    solutionOnly: solutionOnly,
    winners: winners,
    isSolved: false,
    lastReset: Date.now()
  }).catch(err => console.error("Broadcast failed:", err));
}

//__________________________________________________
// state_Iz.js
function updateRemoteTile(tile) {
  const data = {
    x: Math.round(tile.x),
    y: Math.round(tile.y),
    heldBy: tile.heldBy ?? null,
    zIndex: tile.zIndex ?? 0,
    isPlaced: !!tile.isPlaced
  };
  if (tile.rotation !== undefined) data.rotation = tile.rotation;

  // CRITICAL: return this promise so callers can await it
  return db.ref(`game/tiles/${tile.id}`).update(data);
}

//__________________________________________________
function updateLocalCursor(me) {
  db.ref(`game/players/${me.id}`).update({
    name: me.name,
    color: me.color,
    mouseX: Math.round(me.mouseX),
    mouseY: Math.round(me.mouseY)
  });
}

//__________________________________________________
function updateBoardCell(r, c, tileId = null) {
  const path = `game/board/cells/${r}_${c}`;
  // FIX: If no tileId, set to null to DELETE the node. 
  // This is the ONLY way to trigger child_removed listeners.
  return db.ref(path).set(tileId ? { tileId, lastUpdated: Date.now() } : null);
}

/* ---------------------------
   LISTENERS (Receive Cloud data and update Local)
   --------------------------- */

//__________________________________________________
function initTileListeners() {
  const tilesRef = db.ref('game/tiles');

  // Small buffer for updates that arrive before we have the tile in tileArrALL
  window._pendingTileUpdates = window._pendingTileUpdates || new Map();

  // When a tile is added, initialize or apply any pending update
  tilesRef.on('child_added', (snapshot) => {
    const data = snapshot.val();
    const id = snapshot.key;
    const tile = tileArrALL.find(t => t.id === id);

    // If we don't yet have this tile locally, stash the update for later
    if (!tile) {
      if (data) window._pendingTileUpdates.set(id, data);
      return;
    }
    if (!data) return;

    // Initialize fields from cloud for newly added tiles
    tile.x = data.x ?? tile.x;
    tile.y = data.y ?? tile.y;
    tile.zIndex = data.zIndex ?? tile.zIndex;
    tile.heldBy = data.heldBy ?? null;
    tile.isPlaced = !!data.isPlaced;
    tile.rotation = data.rotation ?? tile.rotation;
    tile.value = ROT[tile.initialValue * 4 + tile.rotation];

    // If we had a buffered update, apply and clear it
    if (window._pendingTileUpdates.has(id)) {
      const pending = window._pendingTileUpdates.get(id);
      tile.x = pending.x ?? tile.x;
      tile.y = pending.y ?? tile.y;
      tile.zIndex = pending.zIndex ?? tile.zIndex;
      tile.heldBy = pending.heldBy ?? tile.heldBy;
      tile.isPlaced = !!pending.isPlaced;
      tile.rotation = pending.rotation ?? tile.rotation;
      tile.value = ROT[tile.initialValue * 4 + tile.rotation];
      window._pendingTileUpdates.delete(id);
    }
  });

  tilesRef.on('child_changed', (snapshot) => {
    const data = snapshot.val();
    const id = snapshot.key;
    const tile = tileArrALL.find(t => t.id === id);

    // If we don't yet have this tile locally, buffer the update
    if (!tile) {
      if (data) window._pendingTileUpdates.set(id, data);
      return;
    }
    if (!data) return;

    // If the tile is placed on the board, do not let tile updates move it.
    // Still sync non-pos fields so UI reflects ownership/rotation changes.
    if (tile.isPlaced) {
      tile.heldBy = data.heldBy ?? null;
      tile.zIndex = data.zIndex ?? tile.zIndex;
      tile.rotation = data.rotation ?? tile.rotation;
      tile.value = ROT[tile.initialValue * 4 + tile.rotation];

      
      return;
    }

    // Local drag gate: if *I* am actively dragging this tile, ignore remote pos updates
    const iAmDraggingThis =
      PlayerManager.me &&
      PlayerManager.me.isDragging &&
      PlayerManager.me.grabbedTile &&
      PlayerManager.me.grabbedTile.id === tile.id;

    if (!iAmDraggingThis) {
      tile.x = data.x ?? tile.x;
      tile.y = data.y ?? tile.y;
      tile.zIndex = data.zIndex ?? tile.zIndex;
      tile.heldBy = data.heldBy ?? null;
      tile.isPlaced = !!data.isPlaced;
    }

    // Rotation/value always sync
    tile.rotation = data.rotation ?? tile.rotation;
    tile.value = ROT[tile.initialValue * 4 + tile.rotation];
  });

  // Optional: handle removals if your app deletes tiles
  tilesRef.on('child_removed', (snapshot) => {
    const id = snapshot.key;
    const tile = tileArrALL.find(t => t.id === id);
    if (!tile) {
      // If we had a pending update for a tile that was removed, clear it
      if (window._pendingTileUpdates.has(id)) window._pendingTileUpdates.delete(id);
      return;
    }
    // Mark removed or reset as appropriate
    tile.removed = true;
  });



  
}


//__________________________________________________
function initPlayerListeners() {
  const playersRef = db.ref('game/players');

  const updatePlayer = (snapshot) => {
    if (!snapshot || !snapshot.key) return;
    if (PlayerManager.me && snapshot.key === PlayerManager.me.id) return;
    PlayerManager.others.set(snapshot.key, snapshot.val());
  };

  playersRef.on('child_added', updatePlayer);
  playersRef.on('child_changed', updatePlayer);
  playersRef.on('child_removed', (snapshot) => {
    if (!snapshot || !snapshot.key) return;
    PlayerManager.others.delete(snapshot.key);
  });
}

//__________________________________________________
function initBoardListeners() {
    const boardRef = db.ref('game/board/cells');

    const syncCell = (snapshot, isRemoval = false) => {
        if (!snapshot || !snapshot.key) return;
        const [r, c] = snapshot.key.split('_').map(Number);
        const data = snapshot.val();

        if (isRemoval || data === null || !data.tileId) {
            gameBoard.removeTile(r, c);
        } else {
            const tile = tileArrALL.find(t => t.id === data.tileId);
            if (tile) {
                gameBoard.placeTile(tile, r, c);
                
                // --- THE FIX STARTS HERE ---
                // Sync the rotation and the matching 'value' so the solver sees it
                tile.rotation = data.rotation ?? tile.rotation;
                tile.value = ROT[tile.initialValue * 4 + tile.rotation];
                // --- THE FIX ENDS HERE ---
            }
        }

        if (isHost()) {
            const solved = gameBoard.isBoardSolved();
            db.ref("game/metadata").update({ isSolved: solved });
        }
    };

    boardRef.on('child_added', (snap) => syncCell(snap, false));
    boardRef.on('child_changed', (snap) => syncCell(snap, false));
    boardRef.on('child_removed', (snap) => syncCell(snap, true)); 
}


// 1. Persistent tracker (survives re-initialization)
function initMetadataListener() {
  const metaRef = db.ref('game/metadata');
  
  metaRef.on('value', (snap) => {
    const meta = snap.val();
    if (!meta) return;

    // 1. VISUAL SYNC
    const overlay = document.getElementById("win-overlay");
    if (meta.isSolved) { overlay?.classList.remove("hidden"); } 
    else { overlay?.classList.add("hidden"); }

    // 2. STRUCTURE SYNC
    const resetTime = Number(meta.lastReset) || 0;
    if (window._lastProcessedReset === undefined || resetTime > window._lastProcessedReset) {
      window._lastProcessedReset = resetTime;
      
      const rows = meta.rows || 8;
      const cols = meta.cols || 8;
      const allowExcluded = !!meta.allowExcluded;
      const solutionOnly = !!meta.solutionOnly;
      const winners = meta.winners || [];

      // Rebuild the master list
      initiateTiles(); 

      // FIX: Apply filtering so Guest matches Host's tile set
      if (solutionOnly) {
          tileArrALL = tileArrALL.filter(t => winners.includes(t.id));
      } else if (!allowExcluded) {
          tileArrALL = tileArrALL.filter(t => !t.isExcluded);
      }
      
      // Initialize the physical board grid
      initiateBoard(rows, cols, CELL_SIZE, 4);
      console.log("[GUEST] Board and Tiles synchronized.");
    }
  });
}




/* ---------------------------
   UTILITIES
   --------------------------- */

// state_Iz.js
function wipeRemoteBoard() {
  // CRITICAL: return the promise so callers can chain .then()
  return db.ref("game/board/cells").set(null);
}


/* ---------------------------
   DEBUG
   --------------------------- */

window.debugCloudSync = async function() {
  const snapshot = await db.ref('game').once('value');
  const cloud = snapshot.val();
  if (!cloud) return console.warn("Cloud empty");
  console.group("Cloud snapshot");
  console.log(cloud);
  console.groupEnd();
};

/**
 * DANGER: This wipes the entire game state for everyone instantly.
 */
function nukeDatabase() {
  if (!confirm("Are you sure you want to WIPE the entire database?")) return;

  db.ref("game").set(null)
    .then(() => console.log("--- DATABASE WIPED ---"))
    .catch(err => console.error("Wipe failed:", err));
}
