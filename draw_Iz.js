// draw_Iz.js
"use strict";

//__________________________________________________
function clearCanvas(ctx) {
    //shows the div color establihsed in the CSS file
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
}

//__________________________________________________
function drawRect(ctx, x, y, w, h, color, lineWidth = 2) {
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.strokeRect(x, y, w, h);
}


//__________________________________________________
function drawTile(ctx, img, tileData) {
    const { sx, sy, dx, dy, dWidth, dHeight, rotation } = tileData;
    const TILE_SIZE = 40; // Your sheet's tile size

    ctx.save();
    // 1. Move to the center of the destination spot
    ctx.translate(dx + dWidth / 2, dy + dHeight / 2);
    
    // 2. Rotate (rotation is 0, 1, 2, or 3)
    // 90 degrees = Math.PI / 2
    ctx.rotate(rotation * (Math.PI / 2));

    // 3. Draw image centered
    ctx.drawImage(
        img,
        sx, sy, TILE_SIZE, TILE_SIZE,   // Source
        -dWidth / 2, -dHeight / 2, dWidth, dHeight // Destination
    );
    
    ctx.restore();
}


//__________________________________________________
function drawTileFrame(ctx, tile, color = "cyan", lineWidth = 3) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    // Draw 2px outside the tile bounds for a clean "halo" look
    ctx.strokeRect(tile.x - 2, tile.y - 2, tile.width + 4, tile.height + 4);
    ctx.restore();
}
