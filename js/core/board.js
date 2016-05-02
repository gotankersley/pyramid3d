//Enums
var BOARD_PLAYER1 = P1;
var BOARD_PLAYER2 = P2;
var BOARD_EMPTY = P2 + 1;
var INVALID = -1;

//Class Board - A convenient wrapper around the Bitboard 'struct'
function Board(uniqueId) {	
	
	if (uniqueId == undefined) {
		this.bb = BB_new();		
		this.turn = P1;
	}
	else {
		var bitboards = BB_fromUniqueId(uniqueId);
		this.bb = bitboards.slice(0,2);
		this.turn = bitboards[2];
	}
	this.VALID_SQUARES = [ //[row, col]
		[true,false,true,true,false,true],	//Row 0
		[false,true,false,false,true,false],//Row 1
		[true,false,true,true,false,true],  //Row 2
		[true,false,true,true,false,true],  //Row 3
		[false,true,false,false,true,false],//Row 4
		[true,false,true,true,false,true],  //Row 5
	];
}

Board.prototype.changeTurn = function() {
	this.turn = +(!this.turn); //Change turns	
}

Board.prototype.clone = function() {
	var board = new Board();
	board.bb = this.bb.slice();
	board.turn = this.turn;
	return board;	
}

Board.prototype.get = function(r, c) {	
	var bb = this.bb;	
	var mpos = RC_TO_MASK[r][c];
	
	if (bb[P1] & mpos) return BOARD_PLAYER1;
	else if (bb[P2] & mpos) return BOARD_PLAYER2;	
	else return BOARD_EMPTY;
}


Board.prototype.getMoves = function() {
	var movesOut = [];
	var moves = BB_getMoves(this.bb, this.turn);
	var pins = Object.keys(moves);
	for (var i = 0; i < pins.length; i++) {
		var p = pins[i];
		var pinMoves = bitScan(moves[p]);
		for (var n = 0; n < pinMoves.length; n++) {
			movesOut.push({
				sr:POS_TO_R[p],
				sc:POS_TO_C[p],
				dr:POS_TO_R[pinMoves[n]],
				dc:POS_TO_C[pinMoves[n]]
			});							
		}
	}
	return movesOut;
}

Board.prototype.getMovesAssoc = function() {
	var movesOut = {};
	var moves = BB_getMoves(this.bb, this.turn);
	var pins = Object.keys(moves);
	for (var i = 0; i < pins.length; i++) {
		var p = pins[i];
		movesOut[p] = bitScan(moves[p]);
	}
	return movesOut;
}

Board.prototype.getQBN = function() {
	var QBN_EMPTY = 0;
	var QBN_P1 = 1;
	var QBN_P2 = 2;
	var qbn = '';
	var bb = this.bb;
	var player1 = bb[P1];
	var player2 = bb[P2];
	//Output pins
	for (var i = 0; i < 20; i++) {
		var mask = POS_TO_MASK[i];
		if (player1 & mask) qbn += QBN_P1;
		else if (player2 & mask) qbn += QBN_P2;
		else qbn += QBN_EMPTY;
	}
	
	//Output signal masks
	qbn += (player1 & SIGNAL_MASK)? 1 : 0; //Player 1   
	qbn += (player2 & SIGNAL_MASK)? 1 : 0;  //Player 2
	
	//Output turn
	qbn += (this.turn == P1)? QBN_P1 : QBN_P2; 
	
	return qbn;
}

Board.prototype.getUniqueId = function() {	
	return BB_toUniqueId(this.bb, this.turn);
}

Board.prototype.getWinTriangle = function(prevMove) {		
	var bb = this.bb;	
	var player = bb[this.turn];

	//Loop through the available wins to find the matching one
	for (var w = 0; w < WINS.length; w++) {
		var win = WINS[w];
		if ((player & win) == win) {				
			var points = bitScan(win);				
			return [ //Convert points to RC for easier drawing
				{r:POS_TO_R[points[0]], c:POS_TO_C[points[0]]}, //A 
				{r:POS_TO_R[points[1]], c:POS_TO_C[points[1]]}, //B 
				{r:POS_TO_R[points[2]], c:POS_TO_C[points[2]]}, //C 
			];
		}
	}
	
	return null;
}

Board.prototype.getWinTriangle_Varient = function(prevMove) {		
	var bb = this.bb;	
	var player = bb[this.turn];
	var signal = (player & SIGNAL_MASK) >>> 20; //Sure, we COULD use an if here...
	
	//Loop through the available wins to find the matching one
	for (var w = 0; w < WINS.length; w++) {
		var win = WINS[w];
		if ((player & win) == win) {				
			var points = bitScan(win);				
			return [ //Convert points to RC for easier drawing
				{r:POS_TO_R[points[0]], c:POS_TO_C[points[0]]}, //A 
				{r:POS_TO_R[points[1]], c:POS_TO_C[points[1]]}, //B 
				{r:POS_TO_R[points[2]], c:POS_TO_C[points[2]]}, //C 
			];
		}
	}
	
	//Check for center
	var centerMask = QUAD_CENTERS[this.turn][signal];
	centerMask &= player;	
	var pins = bitScan(centerMask);
	if (pins.length == 3) {		
		return [ //Convert points to RC for easier drawing
					{r:POS_TO_R[pins[0]], c:POS_TO_C[pins[0]]}, //A 
					{r:POS_TO_R[pins[1]], c:POS_TO_C[pins[1]]}, //B 
					{r:POS_TO_R[pins[2]], c:POS_TO_C[pins[2]]}, //C 
		];
	}
	return null;
}


Board.prototype.hasSignal = function(player) {
	if (player == BOARD_PLAYER1) return (this.bb[P1] & SIGNAL_MASK);
	else return (this.bb[P2] & SIGNAL_MASK);
}

Board.prototype.isGameOver = function(prevMove) {
	var dest = RC_TO_POS[prevMove.dr][prevMove.dc];	
	var turn = this.turn;
	var player = this.bb[turn];
	return BB_isWin(player, turn, dest);

}

Board.prototype.isValid = function(move) {
	if (move.sr != INVALID && this.VALID_SQUARES[move.sr][move.sc] && this.VALID_SQUARES[move.dr][move.dc]) {
		var moves = this.getMovesAssoc();	
		var src = RC_TO_POS[move.sr][move.sc];
		var dest = RC_TO_POS[move.dr][move.dc];
		if (src in moves) {
			var dests = moves[src];
			if (dests.indexOf(dest) >= 0) return true;
		}
	}
	return false;
}



Board.prototype.makeMove = function(move) {
	//Note that this does NOT change the turn
	var src = RC_TO_POS[move.sr][move.sc];
	var dest = RC_TO_POS[move.dr][move.dc];
	var turn = this.turn;
	var player = this.bb[turn];	
	this.bb[this.turn] = BB_move(player, turn, src, dest);	
}


Board.prototype.qmnToRC = function(qmn) {
	//Quadtria Move Notation: [Source Quad Letter][Source Quad Id] - [Dest Quad Letter][Dest Quad Id]
	// - Case insensitive
	// - May contain a dash
	//Example: A5-B4 = pos 4 -> 8
	qmn = qmn.toLowerCase().replace('-', '');
	var QUAD_LETTER_TO_NUM = {a:0,b:1,c:2,d:3};
	var srcQuadLetter = qmn.charAt(0);
	var destQuadLetter = qmn.charAt(2);
		
	if (srcQuadLetter in QUAD_LETTER_TO_NUM && destQuadLetter in QUAD_LETTER_TO_NUM) {
		var srcQuad = QUAD_LETTER_TO_NUM[srcQuadLetter];
		var destQuad = QUAD_LETTER_TO_NUM[destQuadLetter];
		
		var srcSpot = parseInt(qmn.charAt(1)) - 1;
		var destSpot = parseInt(qmn.charAt(3)) - 1;
		if (srcSpot >= 0 && srcSpot < QUAD_SPACES && destSpot >= 0 && destSpot < QUAD_SPACES) {
			var srcPos = (srcQuad * QUAD_SPACES) + srcSpot;
			var destPos = (destQuad * QUAD_SPACES) + destSpot;
			return {
				sr: POS_TO_R[srcPos],
				sc: POS_TO_C[srcPos],
				dr: POS_TO_R[destPos],
				dc: POS_TO_C[destPos],
			};
		}
		
	}
	return false;
}

Board.prototype.toString = function() {	
	return BB_toString(this.bb) + ',' + this.turn;
}

//End class Board
