"use strict"
var pins = [];
var m_app; 
var m_data;
var m_scs; 
var m_obj;
var m_trans;
var m_cfg; 
var m_geo;
var m_cam; 

b4w.register("stage", function(exports, require) {

m_app   = require("app");
m_data  = require("data");
m_scs   = require("scenes");
m_obj   = require("objects");
m_trans = require("transform");
m_cfg    = require("config");
m_geo    = require("geometry");
m_cam 	= require ("camera");
//var game = new Game();
var board = new Board();

var MODEL_PATH = "models";
var X = 0;
var Y = 1;
var Z = 2;
var POS3 = [ 
	new Float32Array([0,0,0]), //0
	new Float32Array([5.69922,0,0]), //1
	new Float32Array([2.89533,0,-2.98761]), //2
	new Float32Array([-0.0000029,0,-5.56077]), //3
	new Float32Array([5.6495,0,-5.76782]), //4
	new Float32Array([7.96778,0,0]), //5
	new Float32Array([13.66761,0,0]), //6
	new Float32Array([10.91449,0,-2.98743]), //7
	new Float32Array([8.025785,0,-5.70866]), //8
	new Float32Array([13.67529,0,-5.67908]), //9
	new Float32Array([-0.04917,0,-8.22284]), //10
	new Float32Array([5.68907,0,-8.16368]), //11
	new Float32Array([2.90869,0,-10.91449]), //12
	new Float32Array([0.03956,0,-13.48783]), //13
	new Float32Array([5.65949,0,-13.72446]), //14
	new Float32Array([7.96662,0,-8.22284]), //15
	new Float32Array([13.64571,0,-8.04537]), //16
	new Float32Array([10.8949,0,-10.94407]), //17
	new Float32Array([8.05535,0,-13.54699]), //18
	new Float32Array([13.79359,0,-13.62572]), //19
]


exports.init = function() {
    m_app.init({
        canvas_container_id: "world",
        callback: init_cb,
        physics_enabled: false,
       // show_fps: true,
        alpha: false,
        autoresize: true,
		nla: false,
        console_verbose: true
    });
	
}

function init_cb(canvas_elem, success) {
	canvas_elem.addEventListener("mousedown", main_canvas_click, false);
    if (!success) {
        console.log("b4w init failure");
        return;
    }
    load();
}

var moveSrc;
var moveDest;
var moveObj;
function main_canvas_click(e) {
	e.preventDefault();

    var x = e.clientX;
    var y = e.clientY;

    var obj = m_scs.pick_object(x, y);
	if (obj) {
		if (obj.name.indexOf('pin') === 0) {
			moveSrc = parseInt(obj.name.replace('pin', ''));
			moveObj = obj;
		}
		else if (obj.name.indexOf('sel') === 0) {
			moveDest = parseInt(obj.name.replace('sel', ''));
			onMove(moveObj, moveSrc, moveDest);
			
		}
	}
}

function load() {
    m_data.load(MODEL_PATH + "/scene.json", onLoaded);	
}


function onLoaded(data_id) {
	//Camera
    m_app.enable_camera_controls();
	var cam = m_scs.get_active_camera();
	//m_trans.set_translation(cam, 15, 15, 0);
	var origin = new Float32Array([0,0,0]);
	//m_cam.target_set_pivot(cam, origin);
	
	//Place instances	
	var srcCamel = m_scs.get_object_by_name("camel");
	var srcElephant = m_scs.get_object_by_name("elephant");
	var srcSelector = m_scs.get_object_by_name("selector");
	
	//m_trans.rotate_y_local(srcElephant, Math.PI);
	
	for (var r = 0; r < 6; r++) {
		for (var c = 0; c < 6; c++) {
			if (board.VALID_SQUARES[r][c]) {			
				var p = RC_TO_POS[r][c];
				var type = board.get(r, c);
				var pin = createInstance(srcSelector, 'sel', p, POS3[p][X], POS3[p][Z], BOARD_EMPTY, false);
				if (type != BOARD_EMPTY) {
					var src = (type == BOARD_PLAYER1)? srcCamel : srcElephant;
					var pin = createInstance(src, 'pin', p, POS3[p][X], POS3[p][Z], type);
					
					pins.push(pin);
				}
			}
		}
	}
	
	m_scs.hide_object(srcCamel, false);
	m_scs.hide_object(srcElephant, false);
}

function createInstance(src, name, id, x, z, type, deep) {
	if (typeof (deep) == 'undefined') deep = true;
	var pin = m_obj.copy(src, name + id, deep);
	if (type == BOARD_PLAYER2) m_trans.rotate_y_local(pin, Math.PI);
	if (type != BOARD_EMPTY) m_trans.set_scale(pin, Math.max(1, 0.5 + Math.random()));
	m_trans.set_translation(pin, x, 0, -z);
	m_scs.append_object(pin);	
	return pin;
}

function onMove(obj, src, dest) {
	console.log(moveSrc, moveDest);
	var move = {
		sr: POS_TO_R[src],
		sc: POS_TO_C[src],
		dr: POS_TO_R[dest],
		dc: POS_TO_C[dest],
	};
	if (board.isValid(move)) {
		board.makeMove(move);
		board.changeTurn();
		m_scs.clear_outline_anim(moveObj);
		m_trans.set_translation(moveObj, POS3[moveDest][X], 0, -POS3[moveDest][Z]);
	}
	
}



});

b4w.require("stage").init();