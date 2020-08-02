var canvas = document.getElementById("duckgame");
var context = canvas.getContext("2d");
var running = false;

// Timing variables
const SECOND = 1000;
const FRAME_TIME = SECOND / 60.0;
const UPDATE_TIME = SECOND / 60.0;
var before_time = (new Date).getTime();
var before_sec = before_time;
var frames = 0;
var fps = 0;

// Images
var image_grass_tile = load_image('./res/grass_tile.png');
var image_bread = load_image('./res/bread.png');
var image_momduck = [load_image('./res/momduck_up.png'), load_image('./res/momduck_right.png'), load_image('./res/momduck_down.png'), load_image('./res/momduck_left.png')];
var image_duckling = [load_image('./res/babyduck_up.png'), load_image('./res/babyduck_right.png'), load_image('./res/babyduck_down.png'), load_image('./res/babyduck_left.png')];
var image_goose = [load_image('./res/goose_up.png'), load_image('./res/goose_right.png'), load_image('./res/goose_down.png'), load_image('./res/goose_left.png')];

// Game variables
const TILE_WIDTH = 32;
const TILE_HEIGHT = 32;
const MAP_WIDTH = canvas.width / TILE_WIDTH;
const MAP_HEIGHT = canvas.height / TILE_WIDTH;

var loaded_state = false;
var current_state = get_empty_state();

document.addEventListener("DOMContentLoaded", function(){

    let puzzleid = document.getElementById("puzzle-id-input").value;
    if(puzzleid == "PUZZLEID"){

        loaded_state = true;

    }else{

        var xhr = new XMLHttpRequest();
        xhr.open("GET", "/puzzles/" + puzzleid + ".json", true);
        xhr.responseType = "json";
        xhr.send();
        xhr.onreadystatechange = function(){

            if(xhr.readyState == 4){

                current_state = xhr.response;
                loaded_state = true;
            }
        }
    }
});

function export_state(){

    var save_button = document.getElementById("save-button");

    if(save_button.disabled){

        return;
    }

    var xhr = new XMLHttpRequest();
    var data = {
        puzzleid: document.getElementById("puzzle-id-input").value,
        title: document.getElementById("puzzle-title-input").value,
        state: current_state
    };
    xhr.open("POST", "/puzzle_data", true);
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.send(JSON.stringify(data));

    save_button.value = "Saved";
    save_button.disabled = true;
}

function enable_save_button(){

    var save_button = document.getElementById("save-button");
    if(save_button.disabled){

        save_button.value = "Save";
        save_button.disabled = false;
    }
}
document.getElementById("puzzle-title-input").onchange = enable_save_button();

setInterval(run, 0);
setInterval(render, FRAME_TIME);

function run(){

    var current_time = (new Date).getTime();
    // var delta = (current_time - before_time) / UPDATE_TIME;

    if(current_time - before_sec >= SECOND){

        before_sec += SECOND;
        fps = frames;
        frames = 0;
        // console.log("fps: " + fps);
    }
}

function get_empty_state(){

    return {
        victory: 0,

        player_x: 2,
        player_y: 2,
        player_direction: 1,

        flockline_x: [],
        flockline_y: [],
        flockline_direction: [],

        duckling_x: [],
        duckling_y: [],
        duckling_direction: [],
        duckling_waddling: [],
        duckling_holds_bread: [],

        bread_x: [],
        bread_y: [],

        goose_x: [],
        goose_y: [],
        goose_direction: []
    };
}

canvas.addEventListener('mousedown', function(event){

    if(!loaded_state){

        return;
    }

    if(event.button != 0){

        return;
    }

    enable_save_button();

    let rect = canvas.getBoundingClientRect();
    let mouse_x = event.clientX - rect.left;
    let mouse_y = event.clientY - rect.top;

    let tile_x = Math.floor(mouse_x / TILE_WIDTH);
    let tile_y = Math.floor(mouse_y / TILE_HEIGHT);

    let current_tool = document.getElementById("puzzle-tool-select").value;

    if(current_tool == "erase"){

        for(let i = 0; i < current_state.duckling_x.length; i++){

            if(current_state.duckling_x[i] == tile_x && current_state.duckling_y[i] == tile_y){

                current_state.duckling_x.splice(i, 1);
                current_state.duckling_y.splice(i, 1);
                current_state.duckling_direction.splice(i, 1);
                current_state.duckling_waddling.splice(i, 1);
                current_state.duckling_holds_bread.splice(i, 1);
                break;
            }
        }

        for(let i = 0; i < current_state.bread_x.length; i++){

            if(current_state.bread_x[i] == tile_x && current_state.bread_y[i] == tile_y){

                current_state.bread_x.splice(i, 1);
                current_state.bread_y.splice(i, 1);
                break;
            }
        }

        for(let i = 0; i < current_state.goose_x.length; i++){

            if(current_state.goose_x[i] == tile_x && current_state.goose_y[i] == tile_y){

                current_state.goose_x.splice(i, 1);
                current_state.goose_y.splice(i, 1);
                current_state.goose_direction.splice(i, 1);
                break;
            }
        }

    }else if(!square_occupied(current_state, tile_x, tile_y)){

        if(current_tool == "player"){

            current_state.player_x = tile_x;
            current_state.player_y = tile_y;

        }else if(current_tool == "duckling"){

            current_state.duckling_x.push(tile_x);
            current_state.duckling_y.push(tile_y);
            current_state.duckling_direction.push(1);
            current_state.duckling_waddling.push(false);
            current_state.duckling_holds_bread.push(false);

        }else if(current_tool == "bread"){

            current_state.bread_x.push(tile_x);
            current_state.bread_y.push(tile_y);

        }else if(current_tool == "goose"){

            current_state.goose_x.push(tile_x);
            current_state.goose_y.push(tile_y);
            current_state.goose_direction.push(1);
        }
    }

}, false);

function in_bounds(x, y){

    return x >= 0 && x < MAP_WIDTH && y >= 0 && y < MAP_HEIGHT;
}

function square_occupied(current_state, x, y){

    return player_occupies(current_state, x, y) || flockline_occupies(current_state, x, y) || duckling_occupies(current_state, x, y);
}

function player_occupies(current_state, x, y){

    return current_state.player_x == x && current_state.player_y == y;
}

function flockline_occupies(current_state, x, y){

    for(let i = 0; i < current_state.flockline_x.length; i++){

        if(current_state.flockline_x[i] == x && current_state.flockline_y[i] == y){

            return true;
        }
    }

    return false;
}

function duckling_occupies(current_state, x, y){

    for(let i = 0; i < current_state.duckling_x.length; i++){

        if(current_state.duckling_x[i] == x && current_state.duckling_y[i] == y){

            return true;
        }
    }

    return false;
}

function get_bread_left(current_state){

    let bread_count = current_state.bread_x.length;

    for(let i = 0; i < current_state.duckling_x.length; i++){

        if(current_state.duckling_holds_bread[i]){

            bread_count++;
        }
    }

    return bread_count;
}

function load_image(path){

    return_image = new Image();
    return_image.src = path;

    return return_image;
}

function render(){

    context.clearRect(0, 0, canvas.width, canvas.height);

    if(!loaded_state){

        context.font = "30px sans-serif";
        context.fillStyle = "white";
        context.textAlign = "center";
        context.fillText("Loading...", canvas.width / 2, canvas.height / 2);
        context.textAlign = "left";

        frames++;
        return;
    }

    // Draw background
    for(let i = 0; i < TILE_WIDTH; i++){

        for(let j = 0; j < TILE_HEIGHT; j++){

            context.drawImage(image_grass_tile, i * TILE_WIDTH, j * TILE_HEIGHT);
        }
    }

    // Draw player
    context.drawImage(image_momduck[current_state.player_direction], current_state.player_x * TILE_WIDTH, current_state.player_y * TILE_HEIGHT);

    // Draw duckline
    for(let i = 0; i < current_state.flockline_x.length; i++){

        context.drawImage(image_duckling[current_state.flockline_direction[i]], current_state.flockline_x[i] * TILE_WIDTH, current_state.flockline_y[i] * TILE_HEIGHT);
    }

    // Draw ducklings
    for(let i = 0; i < current_state.duckling_x.length; i++){

        context.drawImage(image_duckling[current_state.duckling_direction[i]], current_state.duckling_x[i] * TILE_WIDTH, current_state.duckling_y[i] * TILE_HEIGHT);
    }

    // Draw bread
    for(let i = 0; i < current_state.bread_x.length; i++){

        context.drawImage(image_bread, current_state.bread_x[i] * TILE_WIDTH, current_state.bread_y[i] * TILE_HEIGHT);
    }

    // Draw geese
    for(let i = 0; i < current_state.goose_x.length; i++){

        context.drawImage(image_goose[current_state.goose_direction[i]], current_state.goose_x[i] * TILE_WIDTH, current_state.goose_y[i] * TILE_HEIGHT);
    }

    // Render UI
    context.font = "16px sans-serif";
    context.fillStyle = "white";
    context.fillText("Bread Left: " + get_bread_left(current_state), 3, 16);

    // Render victory / defeat text
    if(current_state.victory != 0){

        let text = current_state.victory == 1 ? "Victory" : "Defeat";
        context.fillStyle = current_state.victory == 1 ? "green" : "red";
        context.font = "30px sans-serif";
        context.textAlign = "center";
        context.fillText(text, canvas.width / 2, canvas.height / 2);
        context.textAlign = "left";
    }

    frames++;
}
