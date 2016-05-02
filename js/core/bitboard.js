/* 
#About: This is a Quadtria bitboard implemented using javascript. 
#Mapping:
 - Bits 0 - 19 correspond to the board position of that number 
 - Bit 20 - Is the signal indicator for if the home quad has been cleared
 - Bits 21 - 31 are unassigned
 - The positions are arranged like this to make each quad's bits adjacent
 
  Physical Board:     ->  Bits positions:
	0 -- 1 - 5 -- 6     [ 31 - 21 ][  20  ][19-15][14-10][ 9-5 ][ 4-0 ] 		
	|  2 |   |  7 |     Unassigned][Signal][Quad3][Quad2][Quad1][Quad0]	
	3 -- 4 - 8 -- 9		
	|    | X |    |
	10 -11 - 15 -16
	| 12 |   | 17 |
	13 -14 - 18 -19
    
*/
//Lib
function bitCount(x) {	
	x = x - ((x >>> 1) & 0x55555555);
	x = (x & 0x33333333) + ((x >>> 2) & 0x33333333);
	return ((((x + (x >>> 4)) & 0x0F0F0F0F) * 0x01010101) >>> 24);
}
function bitScan(x){	
	bits = [];	
    while (x) {
        var minBit = x & -x; // isolate least significant bit
        bits.push(MASK_TO_POS[minBit>>>0]);
		x &= x-1;
	}	
	return bits;
}

//Index maps
var MASK_TO_POS = {0x1:0,0x2:1,0x4:2,0x8:3,0x10:4,0x20:5,0x40:6,0x80:7,0x100:8,0x200:9,0x400:10,0x800:11,0x1000:12,0x2000:13,0x4000:14,0x8000:15,0x10000:16,0x20000:17,0x40000:18,0x80000:19,0x100000:20,0x200000:21};
var POS_TO_MASK = [0x1,0x2,0x4,0x8,0x10,0x20,0x40,0x80,0x100,0x200,0x400,0x800,0x1000,0x2000,0x4000,0x8000,0x10000,0x20000,0x40000,0x80000,0x100000];

var POS_TO_R = [0,0,1,2,2,0,0,1,2,2,3,3,4,5,5,3,3,4,5,5];
var POS_TO_C = [0,2,1,0,2,3,5,4,3,5,0,2,1,0,2,3,5,4,3,5];
var RC_TO_POS = [
	[0,null,1,5,null,6],        //Row 0
	[null,2,null,null,7,null],  //Row 1
	[3,null,4,8,null,9],        //Row 2
	[10,null,11,15,null,16],    //Row 3
	[null,12,null,null,17,null],//Row 4
	[13,null,14,18,null,19],    //Row 5
];

var RC_TO_MASK = [
	[0x1,null,0x2,0x20,null,0x40],				//Row 0
	[null,0x4,null,null,0x80,null],				//Row 1
	[0x8,null,0x10,0x100,null,0x200],			//Row 2
	[0x400,null,0x800,0x8000,null,0x10000],		//Row 3
	[null,0x1000,null,null,0x20000,null],		//Row 4
	[0x2000,null,0x4000,0x40000,null,0x80000],  //Row 5
];
var QUAD_SPACES = 5;
//Enums

var P1 = 0;
var P2 = 1;

//Masks
var SIGNAL_MASK = 0x100000;
var NOT_SIGNAL = 0xfffff; //JS numbers are signed so bitwise NOT's can have unwanted side-effects 
var THREE_NO_WIN1 = 0x15;
var THREE_NO_WIN2 = 0xe;
var BOARD_MASK = 0x1fffff;

var INITIAL_P1 = 0x1f;
var INITIAL_P2 = 0xf8000;

var HOME_QUAD_MASKS = [0x1f, 0xf8000]; //By player
var HOME_QUAD_MASKS_BY_SIGNAL = [[0x1f, 0], [0xf8000,0]]; //By [Player][Signal]
var HOME_QUAD_START = [ [1,0],[0,0] ]; //[Player][Signal] - For iterating through quads and ignoring home if signal not set
var HOME_QUAD_END = [ [4,4],[3,4] ]; //[Player][Signal]
var QUAD_MASKS = [0x1f, 0x3e0, 0x7c00, 0xf8000]; //By quad pos
var CENTER_MASKS = [0x10, 0x100, 0x800, 0x8000]; //TL (4), TR (8), BL(11), BR(15)

var QUAD_CENTERS = [ [0x21080, 0x21084], [0x1084, 0x21084] ]; //[Player][Signal] - For alternate win rule

//Moves
var AVAIL_MOVES = [0xe,0x35,0x1b,0x415,0x890e,0x1c2,0x2a0,0x360,0x8ab0,0x101c0,0x3808,0xd510,0x6c00,0x5400,0x43800,0x70910,0xa8200,0xd8000,0xac000,0x70000]; //By position

//Wins
var QUAD_PIN_COUNT = [0,1,1,2,1,2,2,3,1,2,2,3,2,3,3,4,1,2,2,3,2,3,3,4,2,3,3,4,3,4,4,5]; //Only for Q0
var WINS = [ //No signal
	0x13,0x1a,0x19,0xb,0x7,0x16,0x1c,0xd, //Q0
	0x260,0x340,0x320,0x160,0xe0,0x2c0,0x380,0x1a0, //Q1
	0x4c00,0x6800,0x6400,0x2c00,0x1c00,0x5800,0x7000,0x3400, //Q2
	0x98000,0xd0000,0xc8000,0x58000,0x38000,0xb0000,0xe0000,0x68000 //Q3
]
var NON_HOME_QUAD_WIN = [ //By [player, pos]
	[false,false,false,false,false,true,true,true,true,true,true,true,true,true,true,true,true,true,true,true], //Player 1
	[true,true,true,true,true,true,true,true,true,true,true,true,true,true,true,false,false,false,false,false] //Player 2
];
var HI_TURN = [0, 0x200000];

//Struct BB - Obviously JS doesn't have actual structs. But we are using a similar concept here, avoiding the use of
//classes in order to reduce the additional overhead of prototypes.  (NOTE: I have no idea how big a difference this makes)
function BB_new() {	
	var bb = [
		INITIAL_P1,	//player 1 bitboard
		INITIAL_P2,	//player 2 bitboard						
	];
	return bb;
}


function BB_deriveMove(original, changed) {
	//Derive move made by looking at changed board state	
	original &= NOT_SIGNAL;
	changed &= NOT_SIGNAL;
	var combined = original | changed;
	var src = MASK_TO_POS[changed ^ combined];
	var dest = MASK_TO_POS[original ^ combined];
	return {
		sr:POS_TO_R[src],
		sc:POS_TO_C[src],
		dr:POS_TO_R[dest],
		dc:POS_TO_C[dest]
	}
}

function BB_deriveMovePos(original, changed) {
	//Derive move made by looking at changed board state	
	original &= NOT_SIGNAL;
	changed &= NOT_SIGNAL;
	var combined = original | changed;
	return {src: MASK_TO_POS[changed ^ combined], dest: MASK_TO_POS[original ^ combined]};
	
}

function BB_deriveSrc(original, changed) {
	//Derive move made by looking at changed board state	
	original &= NOT_SIGNAL;
	changed &= NOT_SIGNAL;
	var combined = original | changed;
	return MASK_TO_POS[changed ^ combined];
	
}

function BB_midFromUids(uid1, uid2) {
	var bb1 = BB_fromUniqueId(uid1); 
	var bb2 = BB_fromUniqueId(uid2); 
	var bb1Turn = bb1.pop();
	var bb2Turn = bb2.pop();
	
	return BB_deriveMovePos(bb1[bb1Turn], bb2[bb1Turn]);
}


function BB_getMoves(bb, turn) {	
	var player = bb[turn];
	var opp = bb[+(!turn)]; //+ unary operator to convert bool true value to number
	var pins = bitScan(player);
	var moves = {};
	for (var i = 0; i < pins.length; i++) {
		var p = pins[i];
		var avail = AVAIL_MOVES[p];
		avail &= avail ^ (opp | player); //Can't move to a spot if there is a piece already there	
		moves[p] = avail;
	}
	return moves;
}


//TODO: optimize to return at first win?
function BB_getMoveBoards(player, opp, turn) { 	
	//This returns available moves as board states after the move
	//Note the return is is in the form: [ [All dests][Board][destPos][Board][destPos]... ]
	var boards = [0]; //Zero index for [ALL DESTS]	
	var bothPlayers = opp | player; 
	var pins = player;
	var allDests = 0;
	while (pins) { //Pins bitscan loop
		var minBit = pins & -pins; // isolate least significant bit
		var srcPos = MASK_TO_POS[minBit>>>0];		
		var avail = AVAIL_MOVES[srcPos];
		avail &= avail ^ bothPlayers; //Can't move to a spot if there is a piece already there	
		
		if (avail) { //Ignore pin in there are no available moves 
			allDests |= avail;
			while (avail) { //Avail bitscan loop
				var minBit2 = avail & -avail; // isolate least significant bit
				var destPos = MASK_TO_POS[minBit2>>>0];
				var moved = BB_move(player, turn, srcPos, destPos);
				boards.push(moved);
				boards.push(destPos);
				avail &= avail-1;
			}//end avail bitscan loop
		}
		pins &= pins-1;
	}//End pins bitscan loop
	boards[0] = allDests;
	return boards;
}


function BB_heuristicScoreSide(player, turn) {	
	var score = 0;
	var signal = (player & SIGNAL_MASK) >>> 20; //Sure, we COULD use an if here...
		
	//Loop through quads (ignore home if signal not set)	
	for (var q = HOME_QUAD_START[turn][signal]; q < HOME_QUAD_END[turn][signal]; q++) {
		var quad = (player & QUAD_MASKS[q]) >>> (q * QUAD_SPACES); //Shift all quads to first quad spot
		
		//Adjacent counts
		score += (QUAD_PIN_COUNT[quad]) << 1;  //This should pick up diagonal slant tri's (e.g 0x15, and 0xe)
		
		//All the Q0 wins - 0x13,0x1a,0x19,0xb,0x7,0x16,0x1c,0xd
		score += (QUAD_PIN_COUNT[(quad & 0x13)]) << 1; //Shift by 1 to weight the count so that more adjacents are worth more
		score += (QUAD_PIN_COUNT[(quad & 0x1a)]) << 1;
		score += (QUAD_PIN_COUNT[(quad & 0x19)]) << 1;
		score += (QUAD_PIN_COUNT[(quad & 0xb)]) << 1;
		
		score += (QUAD_PIN_COUNT[(quad & 0x7)]) << 1;
		score += (QUAD_PIN_COUNT[(quad & 0x16)]) << 1;
		score += (QUAD_PIN_COUNT[(quad & 0x1c)]) << 1;
		score += (QUAD_PIN_COUNT[(quad & 0xd)]) << 1;
				
	}
	
	//Center control rewards
	var centerCount = 0;
	if (player & CENTER_MASKS[0]) centerCount++;
	else if (player & CENTER_MASKS[1]) centerCount++;
	else if (player & CENTER_MASKS[2]) centerCount++;
	else if (player & CENTER_MASKS[3]) centerCount++;
	score += Math.min(3, centerCount);		
	
	//Penalty for being stuck in home quad
	var homePins = player & HOME_QUAD_MASKS_BY_SIGNAL[turn][signal];
	if (turn == P1)	score -= QUAD_PIN_COUNT[homePins];
	else score -= (2 * QUAD_PIN_COUNT[homePins>>>15]);
	
	//Moves available 
	var dests = 0;
	while (player) {
        var minBit = player & -player; // isolate least significant bit
        var pin = MASK_TO_POS[minBit>>>0];
		player &= player-1;
		dests |= AVAIL_MOVES[pin];
	}	
	score += bitCount(dests);
	
	return score;
}

function BB_heuristicScoreSide_Varient(player, turn) {
	var score = 0;
	var signal = (player & SIGNAL_MASK) >>> 20; //Sure, we COULD use an if here...
		
	//Loop through quads (ignore home if signal not set)	
	for (var q = HOME_QUAD_START[turn][signal]; q < HOME_QUAD_END[turn][signal]; q++) {
		var quad = (player & QUAD_MASKS[q]) >>> (q * QUAD_SPACES); //Shift all quads to first quad spot
		
		//Adjacent counts
		score += (QUAD_PIN_COUNT[quad]) << 1;  //This should pick up diagonal slant tri's (e.g 0x15, and 0xe)
		
		//All the Q0 wins - 0x13,0x1a,0x19,0xb,0x7,0x16,0x1c,0xd
		score += (QUAD_PIN_COUNT[(quad & 0x13)]) << 1; //Shift by 1 to weight the count so that more adjacents are worth more
		score += (QUAD_PIN_COUNT[(quad & 0x1a)]) << 1;
		score += (QUAD_PIN_COUNT[(quad & 0x19)]) << 1;
		score += (QUAD_PIN_COUNT[(quad & 0xb)]) << 1;
		
		score += (QUAD_PIN_COUNT[(quad & 0x7)]) << 1;
		score += (QUAD_PIN_COUNT[(quad & 0x16)]) << 1;
		score += (QUAD_PIN_COUNT[(quad & 0x1c)]) << 1;
		score += (QUAD_PIN_COUNT[(quad & 0xd)]) << 1;
				
	}
	
	//Center control rewards
	var centerCount = 0;
	if (player & CENTER_MASKS[0]) centerCount++;
	else if (player & CENTER_MASKS[1]) centerCount++;
	else if (player & CENTER_MASKS[2]) centerCount++;
	else if (player & CENTER_MASKS[3]) centerCount++;
	score += Math.min(3, centerCount);		
	
	score = bitCount(QUAD_CENTERS[turn][signal]) << 1; //Varient only
	
	//Penalty for being stuck in home quad
	var homePins = player & HOME_QUAD_MASKS_BY_SIGNAL[turn][signal];
	if (turn == P1)	score -= QUAD_PIN_COUNT[homePins];
	else score -= (2 * QUAD_PIN_COUNT[homePins>>>15]);
	
	
	//Moves available 
	var dests = 0;
	while (player) {
        var minBit = player & -player; // isolate least significant bit
        var pin = MASK_TO_POS[minBit>>>0];
		player &= player-1;
		dests |= AVAIL_MOVES[pin];
	}	
	score += bitCount(dests);
	
	return score;
}


function BB_isWin(player, turn, destPos) {		
	var quadPos = Math.floor(destPos / QUAD_SPACES);	
	var quad = (player & QUAD_MASKS[quadPos]) >>> (quadPos * QUAD_SPACES); //Shift quad to first spot	
	var count = QUAD_PIN_COUNT[quad];
	if (count >= 3) { 		
		if (count == 3) { //Verify that the three forms a valid winning triangle
			if ((quad & THREE_NO_WIN1) != THREE_NO_WIN1 &&
				(quad & THREE_NO_WIN2) != THREE_NO_WIN2) {
				if (player & SIGNAL_MASK) return true; //Home quad cleared, can win anywhere
				else return NON_HOME_QUAD_WIN[turn][destPos]; //Check to make sure the win isn't in the home quad
			}
		}
		else if (player & SIGNAL_MASK) return true; //More than three has to be a winning triangle, and home quad has been cleared
		else return NON_HOME_QUAD_WIN[turn][destPos]; //Has a win, but home quad isn't clear - so make sure win isn't in the home quad
	}
	
	return false;
}

function BB_isWin_Varient(player, turn, destPos) {		
	//Alternate win rules
	var signal = (player & SIGNAL_MASK) >>> 20;
	var centers = QUAD_CENTERS[turn][signal];
	if ((player & centers) == centers) return true;
	
	//Official rules
	var quadPos = Math.floor(destPos / QUAD_SPACES);	
	var quad = (player & QUAD_MASKS[quadPos]) >>> (quadPos * QUAD_SPACES); //Shift quad to first spot	
	var count = QUAD_PIN_COUNT[quad];
	if (count >= 3) { 		
		if (count == 3) { //Verify that the three forms a valid winning triangle
			if ((quad & THREE_NO_WIN1) != THREE_NO_WIN1 &&
				(quad & THREE_NO_WIN2) != THREE_NO_WIN2) {
				if (player & SIGNAL_MASK) return true; //Home quad cleared, can win anywhere
				else return NON_HOME_QUAD_WIN[turn][destPos]; //Check to make sure the win isn't in the home quad
			}
		}
		else if (player & SIGNAL_MASK) return true; //More than three has to be a winning triangle, and home quad has been cleared
		else return NON_HOME_QUAD_WIN[turn][destPos]; //Has a win, but home quad isn't clear - so make sure win isn't in the home quad
	}
	
	return false;
}

function BB_move(player, turn, srcPos, destPos) {
	//This does NOT verify that the move is legal	
	player ^= POS_TO_MASK[srcPos]; //Remove source
	player |= POS_TO_MASK[destPos]; //Add to dest
	
	//Flip the signal if the home quad is clear
	if ((player & HOME_QUAD_MASKS[turn]) === 0) player |= SIGNAL_MASK; 
	return player;
}

function BB_toUniqueId(bb, turn) { //Takes a BB because it is not relative
	//Convert both bitboards to single large number (43 bits)
	//[Turn][P2][P1]	
	var hi = bb[1] | HI_TURN[turn];
	hi = hi*Math.pow(2,21); //Left-shift hi bits 21 places
	return hi + bb[0];
}

function BB_fromUniqueId(id) {
	//Reverse unique id
	//[Turn][P2][P1]
	var hi = id/Math.pow(2,21); //Right-shift hi bits 21 places
	var p2 = hi & BOARD_MASK;
	var p1 = id & BOARD_MASK;
	var turn = (hi & HI_TURN[1])? 1 : 0;	
	return [p1,p2, turn]; //Returns a tripple, not a tupple
}


function BB_url(id) { //id may be either single bitboard, or uniqueId
	var BASE_URL = 'http://gotankersley.github.io/pyramid/';
	
	//Figure out id type
	if (id > BOARD_MASK) { //UniqueId
		return BASE_URL + '?id=' + id;
	}
	else { //Bitboard
		return BASE_URL + 'bit-tool.html?bb=' + id;	
	} 	
}

function BB_toString(bb) {
	return '0x' + bb[P1].toString(16) + ', 0x' + bb[P2].toString(16);
}

//End struct BB