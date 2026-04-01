//varsGlobal_Iz.js
"use strict"


//__________________________________________________
//Graphics Variables
var canvas;
var ctx;
const CANVAS_WIDTH = 1600;
const CANVAS_HEIGHT = 900;

let SCALE_X = 1;
let SCALE_Y = 1;
let canvasRect = null;


const spriteSheet = new Image();


//__________________________________________________
//Tile  Variables
var tileIdArray = ["tile_000_X", "tile_001", "tile_002", "tile_003", "tile_005", "tile_006", "tile_007", "tile_009", "tile_010", "tile_011", "tile_013", "tile_014", "tile_015", "tile_017", "tile_018", "tile_019", "tile_021", "tile_022", "tile_023", "tile_025", "tile_026", "tile_027", "tile_029", "tile_030", "tile_031", "tile_034", "tile_035", "tile_037", "tile_038", "tile_039", "tile_041", "tile_042", "tile_043", "tile_045", "tile_046", "tile_047", "tile_051_X", "tile_053", "tile_054", "tile_055", "tile_057", "tile_058", "tile_059", "tile_061", "tile_062", "tile_063", "tile_085_X", "tile_086", "tile_087", "tile_090", "tile_091", "tile_094", "tile_095", "tile_102_X", "tile_103", "tile_106", "tile_107", "tile_110", "tile_111", "tile_119", "tile_122", "tile_123", "tile_126", "tile_127", "tile_170_X", "tile_171", "tile_175", "tile_187", "tile_191", "tile_255_X"]
var tileArrALL = []
let TILE_SIZE = 40;
let TILE_PADDING = 4
//__________________________________________________
//Board Variables
var gameBoard
let CELL_SIZE = 40
let CELL_PADDING = 4
// varsGlobal_Iz.js
window.currentRows = 8;
window.currentCols = 8;

//__________________________________________________
//Player Variables


//__________________________________________________
//Firebase Variables
var db 
