'use strict'
//Constants
var GAME_REPEAT_WINDOW = 8; //Check for repeats this far back

//Class Game
function Game(uniqueId) {
	this.board = new Board(uniqueId); //The main (current) board instance		
	uniqueId = this.board.getUniqueId(); //Update
	
	//Add initial state
	this.history = [uniqueId]; //History is for game log
	this.memory = {}; //Memory is for detecting repeats
	this.memory[uniqueId] = true;
	this.undoHistory = [];
	
	this.players = new Players(PLAYER_HUMAN, PLAYER_HUMAN);
		
	this.gameEvents = {}; //Callbacks to update UI
}


//Event methods
Game.prototype.addEventListener = function(name, callback) {	
	this.gameEvents[name] = callback;
}

Game.prototype.startMove = function() {		
	var self = this;
	var currentPlayer = this.players.getCurrent(this.board);
	if (currentPlayer != PLAYER_HUMAN) { //Autoplay AI		
		this.players.getMove(this.board.clone(), function(move) {			
			if (move.sr == NO_MOVES_AVAILABLE) self.gameEvents['noMovesAvailable']();
			else self.gameEvents['move'](move, currentPlayer);
		});
	}	
}

Game.prototype.isValidMove = function(move, initiatingPlayer) {
	if (initiatingPlayer == this.players.getCurrent(this.board)) { 		
		if (this.board.isValid(move)) return true;			
	}
	return false;
}


Game.prototype.makeMove = function(move) {
	var board = this.board;	
	var prevTurn = board.turn;				
	board.makeMove(move); 
	
	//Game over
	if (board.isGameOver(move)) {
		var boardCopy = board.clone();
		boardCopy.changeTurn();
		this.logCurrentState(boardCopy);
		this.onGameOver(board.turn)
	}
		
	//In play
	else {			
		board.changeTurn(); //Change the turn
		
		//History and Memory
		this.logCurrentState(board);
		this.gameEvents['moveMade']();
	}
	
}

Game.prototype.onGameOver = function(winner) {

	//Option to send game analytics if it is a Human winner is playing an AI
	var players = [this.players.player1, this.players.player2];
	var winningPlayer = players[winner];
	var loser = +(!winner);
	var losingPlayer = players[loser];
	var winningHumanVsAI = false; //Don't send for AI players
	if (winningPlayer == PLAYER_HUMAN && losingPlayer != PLAYER_HUMAN) {	
		winningHumanVsAI = true;
	}	

	//Report results - for analysis
	var REPORT_URL = 'http://schneiderbox.net:5000/report';
	
	var args = {};
	var qbns = [];
	var history = this.history;
	for (var i = 0; i < history.length; i++) {
		var qbn = new Board(history[i]).getQBN();
		qbns.push(qbn);
	}		
	args.qbns = qbns;
	args.player1 = Players.getName(players[0]);
	args.player2 = Players.getName(players[1]);
	args.winner = winningPlayer == BOARD_PLAYER1? 'player1' : 'player2';
	
	//ajaxRequest(REPORT_URL, args, function(data) {
	//	//No ack expected...
	//});
	if (losingPlayer == PLAYER_ELEPHANT) Analytics.report(this.getLosingMids(loser));
	
	//Draw the win and other hoopla...
	this.gameEvents['win'](winner, winningHumanVsAI);
		
}

Game.prototype.undoMove = function() {
	if (this.history.length > 1) {			
		var oldId = this.history.pop();
		this.undoHistory.push(oldId);
		delete this.memory[oldId];
		var newId = this.history.slice(-1);
		this.board = new Board(newId);
		return true;		
	}
	return false;
}

Game.prototype.redoMove = function() {	
	if (this.undoHistory.length > 0) {	
		var currentBoard = this.board.bb[this.board.turn];
		var savedId = this.undoHistory.pop();
		this.history.push(savedId);
		this.memory[savedId] = true;
		this.board = new Board(savedId);		
		this.board.changeTurn();		
		var move = BB_deriveMove(currentBoard, this.board.bb[this.board.turn]);		
		
		//Check for Game over		
		if (this.board.isGameOver(move)) this.onGameOver(this.board.turn);		
		else this.board.changeTurn();
		return true;
	}
	return false;
}

//Helper function keep track of game history
Game.prototype.logCurrentState = function(board) {
	var uniqueId = board.getUniqueId();
	this.history.push(uniqueId);
	if (this.memory[uniqueId]) {
		if (this.history.slice(-GAME_REPEAT_WINDOW).indexOf(uniqueId) >= 0) this.gameEvents['repeat']();
	}
	else this.memory[uniqueId] = true;
}

Game.prototype.load = function(gameLog) {
	this.undoHistory = gameLog.reverse().slice(0, -1);
	for (var i = 0; i < gameLog.length; i++) {
		var id = gameLog[i];		
	}	
}

Game.prototype.getLosingMids = function(losingPlayerOffset) {
	//Get mids
	var mids = {};
	var uniqueIds = this.history;
	for (var u = 1 + losingPlayerOffset; u < uniqueIds.length; u+=2) { //Only get loser's moves
		var uid1 = uniqueIds[u-1];
		var uid2 = uniqueIds[u];			
		var pos = BB_midFromUids(uid1, uid2);
		
		mids[uid1] = pos.src + (pos.dest << 8);
	}
	return mids;
}

//end class Game


