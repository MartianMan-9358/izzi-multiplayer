// interaction_Iz.js
"use strict";

function sync() {
  if (typeof broadcastGameState === "function") {
    broadcastGameState();
  }
}

// GLOBAL INTERACTION STATE
let dragOffsetX = 0;
let dragOffsetY = 0;
let lastTapTime = 0;
const inputState = {
  touchActive: false,
  suppressDown: false
};

// EVENT ATTACHMENT
function setupInteraction() {
  const cvs = document.getElementById("gameCanvas");
  const sidebar = document.getElementById("sidebar");

  // Pointer down
  cvs.addEventListener("mousedown", pointerDownFilter);
  cvs.addEventListener("touchstart", pointerDownFilter, { passive: false });

  // Resize -> update scale
  window.addEventListener("resize", () => {
    const rect = canvas.getBoundingClientRect();
    SCALE_X = canvas.width / rect.width;
    SCALE_Y = canvas.height / rect.height;
  });

  // Pointer move
  window.addEventListener("mousemove", (e) => handleMouseMove(normalizeEvent(e)));
  window.addEventListener("touchmove", handleTouchMove, { passive: false });

  // Pointer up
  window.addEventListener("mouseup", (e) => handleMouseUp(normalizeEvent(e)));
  window.addEventListener("touchend", handleTouchEnd);

  // Rotation (mouse only)
  cvs.addEventListener("dblclick", (e) => {
    if (inputState.touchActive) return;
    handleRotate(normalizeEvent(e));
  });

  // Prevent sidebar bleed
  if (sidebar) {
    sidebar.addEventListener("mousedown", (e) => e.stopPropagation());
    sidebar.addEventListener("touchstart", (e) => e.stopPropagation());
  }

  // Prevent context menu on canvas
  cvs.addEventListener("contextmenu", (e) => e.preventDefault());
}

function pointerDownFilter(e) {
  // Block sidebar clicks
  if (e.target.closest("#sidebar")) return;

  if (e.cancelable) e.preventDefault();

  const pos = normalizeEvent(e);

  // Touch logic (double-tap -> rotate)
  if (e.type === "touchstart") {
    const now = Date.now();
    const gap = now - lastTapTime;

    if (gap < 300 && gap > 0) {
      inputState.suppressDown = true;
      handleRotate(pos);
      lastTapTime = 0;
      setTimeout(() => inputState.suppressDown = false, 150);
      return;
    }

    lastTapTime = now;
    inputState.touchActive = true;
    if (inputState.suppressDown) return;
    handleMouseDown(pos);
    return;
  }

  // Mouse logic
  if (inputState.touchActive && e.type === "mousedown") return;
  if (inputState.suppressDown) return;

  handleMouseDown(pos);
}

function normalizeEvent(e) {
  canvasRect = canvas.getBoundingClientRect();
  SCALE_X = canvas.width / canvasRect.width;
  SCALE_Y = canvas.height / canvasRect.height;

  const source =
    (e.touches && e.touches.length > 0) ? e.touches[0] :
    (e.changedTouches && e.changedTouches.length > 0) ? e.changedTouches[0] : e;

  return {
    x: (source.clientX - canvasRect.left) * SCALE_X,
    y: (source.clientY - canvasRect.top) * SCALE_Y,
    type: e.type
  };
}

// MOUSE DOWN — Claim tile, set offsets, raise zIndex
function handleMouseDown(pos) {
    const me = PlayerManager.me;
    if (!me) return;

    me.updatePosition(pos.x, pos.y);
    updateLocalCursor(me);

    let selectedTile = null;
    for (let i = tileArrALL.length - 1; i >= 0; i--) {
        const t = tileArrALL[i];
        if (isPointInRect(pos.x, pos.y, t.x, t.y, t.width, t.height)) {
            selectedTile = t;
            break;
        }
    }

    if (!selectedTile) return;
    if (selectedTile.heldBy && selectedTile.heldBy !== me.id) return;

    if (selectedTile.isPlaced) {
        // 1. Tell the cloud this cell is now empty
        updateBoardCell(selectedTile.boardRow, selectedTile.boardCol, null);
        
        // 2. Clear it locally so the drag feels smooth
        gameBoard.removeTile(selectedTile.boardRow, selectedTile.boardCol);
        selectedTile.isPlaced = false;
    
        // NOTE: Because updateBoardCell was called, the Host's syncCell 
        // will run, see the board is incomplete, and hide the banner.
    }

    dragOffsetX = pos.x - selectedTile.x;
    dragOffsetY = pos.y - selectedTile.y;

    me.grabTile(selectedTile);
    selectedTile.heldBy = me.id;
    selectedTile.isDragging = true;

    db.ref(`game/tiles/${selectedTile.id}`).onDisconnect().update({ heldBy: null });
    
    const topTile = tileArrALL[tileArrALL.length - 1];
    selectedTile.zIndex = (topTile && topTile.zIndex !== undefined) ? topTile.zIndex + 1 : 1;
    
    updateRemoteTile(selectedTile);
}

// MOUSE MOVE — Drag tile + local collision + broadcast
function handleMouseMove(pos) {
  const me = PlayerManager.me;
  if (!me) return;

  // Always sync cursor for others
  me.updatePosition(pos.x, pos.y);
  updateLocalCursor(me);

  // If not dragging, nothing else to do
  if (!me.isDragging || !me.grabbedTile) return;

  const t = me.grabbedTile;

  // Compute clamped new position
  const newX = Math.max(0, Math.min(CANVAS_WIDTH - t.width, pos.x - dragOffsetX));
  const newY = Math.max(0, Math.min(CANVAS_HEIGHT - t.height, pos.y - dragOffsetY));

  // Apply locally for immediate visual feedback
  t.x = newX;
  t.y = newY;

  // Broadcast live position and ownership to cloud
  updateRemoteTile(t);
}

// MOUSE UP — Snap intent, release, final cloud update
function handleMouseUp(pos) {
    const me = PlayerManager.me;
    if (!me || !me.isDragging || !me.grabbedTile) {
        if (me) me.isDragging = false;
        return;
    }

    const tile = me.grabbedTile;
    const finalX = Math.max(0, Math.min(CANVAS_WIDTH - tile.width, pos.x - dragOffsetX));
    const finalY = Math.max(0, Math.min(CANVAS_HEIGHT - tile.height, pos.y - dragOffsetY));

    const cell = gameBoard.getCellAt(finalX + tile.width / 2, finalY + tile.height / 2);
    const releaseProxy = { x: finalX, y: finalY, width: tile.width, height: tile.height };
    
    let snapped = false;
    if (cell && !cell.tileObj && gameBoard.isTileWithinSnapRadius(releaseProxy, cell)) {
        // This write triggers the syncCell listener in state_Iz.js for everyone.
        updateBoardCell(cell.row, cell.col, tile.id);
        snapped = true;
    }

    db.ref(`game/tiles/${tile.id}`).onDisconnect().cancel();
    tile.isDragging = false;
    tile.heldBy = null;
    me.releaseTile();

    if (!snapped) {
        tile.x = finalX;
        tile.y = finalY;
        resolveGlobalCollisions(tileArrALL, 2);
        updateRemoteTile(tile);
    } else {
        // Snapped tiles don't need X/Y updates; the board listener handles placement.
        db.ref(`game/tiles/${tile.id}`).update({
            heldBy: null,
            zIndex: tile.zIndex,
            isPlaced: true
        });
    }
}



// ROTATION — Double-click rotation
function handleRotate(pos) {
    const me = PlayerManager.me;
    if (!me) return;

    me.updatePosition(pos.x, pos.y);
    updateLocalCursor(me);

    let selectedTile = null;
    for (let i = tileArrALL.length - 1; i >= 0; i--) {
        const t = tileArrALL[i];
        if (isPointInRect(pos.x, pos.y, t.x, t.y, t.width, t.height)) {
            selectedTile = t;
            break;
        }
    }

    if (!selectedTile || (selectedTile.heldBy && selectedTile.heldBy !== me.id)) return;

    // Apply rotation locally and sync.
    // If this tile is on the board, the board listener will trigger the Win-Check.
    selectedTile.rotateClockwise();
    updateRemoteTile(selectedTile);
    if (selectedTile.isPlaced) {
        db.ref(`game/board/cells/${selectedTile.boardRow}_${selectedTile.boardCol}`).update({
            rotation: selectedTile.rotation,
            lastUpdated: Date.now() 
        });
    }
}

// TOUCH helpers
function handleTouchMove(e) {
  if (e.cancelable) e.preventDefault();
  handleMouseMove(normalizeEvent(e));
}

function handleTouchEnd(e) {
  const pos = normalizeEvent(e);

  const me = PlayerManager.me;
  if (me) {
    me.updatePosition(pos.x, pos.y);
    updateLocalCursor(me);
  }

  handleMouseUp(pos);
  inputState.touchActive = false;
}
