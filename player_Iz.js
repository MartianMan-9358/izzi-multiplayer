//player_Iz.js
"use strict"

class Player {
    constructor(id, name, color) {
        this.id = id;
        this.name = name;
        this.color = color;
        
        this.mouseX = 0;
        this.mouseY = 0;
        
        this.isDragging = false;
        this.grabbedTile = null; 
    }

    updatePosition(x, y) {
        this.mouseX = x;
        this.mouseY = y;
    }

    grabTile(tile) {
        this.grabbedTile = tile;
        this.isDragging = true;
    }

    releaseTile() {
        this.grabbedTile = null;
        this.isDragging = false;
    }
}

//__________________________________________________
const PlayerManager = {
    me: null,
    others: new Map(),

    initLocalPlayer(id, name, color) {
        this.me = new Player(id, name, color);
    },

    drawOthers(ctx) {
        this.others.forEach(player => {
            ctx.fillStyle = player.color;
            ctx.beginPath();
            ctx.arc(player.mouseX, player.mouseY, 5, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.font = "12px Arial";
            ctx.fillText(player.name, player.mouseX + 10, player.mouseY + 5);
        });
    }
};
