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

// Keys
const KEY_W = 87;
const KEY_S = 83;
const KEY_A = 65;
const KEY_D = 68;
const KEY_LEFT = 37;
const KEY_UP = 38;
const KEY_RIGHT = 39;
const KEY_DOWN = 40;
const KEY_Z = 90;
const KEY_SPACE = 32;
const KEY_SHIFT = 16;
const KEY_ENTER = 13;

// Input constants
const INPUT_NONE = 0;
const INPUT_PLAYER_UP = 1;
const INPUT_PLAYER_RIGHT = 2;
const INPUT_PLAYER_DOWN = 3;
const INPUT_PLAYER_LEFT = 4;
const INPUT_WADDLE_UP = 5;
const INPUT_WADDLE_RIGHT = 6;
const INPUT_WADDLE_DOWN = 7;
const INPUT_WADDLE_LEFT = 8;
const INPUT_WAIT = 9;
const INPUT_UNDO = 10;

// Game variables
const TILE_WIDTH = 32;
const TILE_HEIGHT = 32;
const MAP_WIDTH = canvas.width / TILE_WIDTH;
const MAP_HEIGHT = canvas.height / TILE_WIDTH;

const direction_vector = [[0, -1], [1, 0], [0, 1], [-1, 0]];

var input_shift_down = false;
var loaded_state = false;
var states = [get_empty_state()];

setInterval(run, 0);
setInterval(render, FRAME_TIME);

document.addEventListener("DOMContentLoaded", function(){

    let puzzleid = document.getElementById("puzzle-id-input").value;
    if(puzzleid == "PUZZLEID"){

        loaded_state = true;

    }else{

        var xhr = new XMLHttpRequest();
        xhr.open("GET", "/puzzle_data?puzzleid=" + puzzleid, true);
        xhr.responseType = "json";
        xhr.send();
        xhr.onreadystatechange = function(){

            if(xhr.readyState == 4){

                states[0] = xhr.response;
                loaded_state = true;
            }
        }
    }
});

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

window.addEventListener('keydown', function(event){

    let player_move = INPUT_NONE;
    let key = event.keyCode;

    if(key == KEY_UP || key == KEY_W){

        if(input_shift_down){

            player_move = INPUT_WADDLE_UP;

        }else{

            player_move = INPUT_PLAYER_UP;
        }

    }else if(key == KEY_RIGHT || key == KEY_D){

        if(input_shift_down){

            player_move = INPUT_WADDLE_RIGHT;

        }else{

            player_move = INPUT_PLAYER_RIGHT;
        }

    }else if(key == KEY_DOWN || key == KEY_S){

        if(input_shift_down){

            player_move = INPUT_WADDLE_DOWN;

        }else{

            player_move = INPUT_PLAYER_DOWN;
        }

    }else if(key == KEY_LEFT || key == KEY_A){

        if(input_shift_down){

            player_move = INPUT_WADDLE_LEFT;

        }else{

            player_move = INPUT_PLAYER_LEFT;
        }

    }else if(key == KEY_SHIFT){

        input_shift_down = true;

    }else if(key == KEY_Z){

        player_move = INPUT_UNDO;

    }else if(key == KEY_SPACE){

        player_move = INPUT_WAIT;

    }else if(key == KEY_ENTER){

        if(states[states.length - 1].victory != 0){

            while(states.length != 1){

                states.pop();
            }
        }
    }

    if(player_move == INPUT_UNDO){

        if(states.length != 1){

            states.pop();
        }

    }else if(player_move != INPUT_NONE){

        let current_state = states[states.length - 1];
        if(current_state.victory == 0){

            states.push(handle_move(current_state, player_move));
        }
    }

}, false);

window.addEventListener('keyup', function(event){

    let key = event.keyCode;
    if(key == KEY_SHIFT){

        input_shift_down = false;
    }
}, false);

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

function handle_move(previous_state, player_move){

    var new_state = JSON.parse(JSON.stringify(previous_state));

    if(player_move >= INPUT_PLAYER_UP && player_move <= INPUT_PLAYER_LEFT){

        let direction = player_move - INPUT_PLAYER_UP;
        let possible_x = new_state.player_x + direction_vector[direction][0];
        let possible_y = new_state.player_y + direction_vector[direction][1];
        let move_allowed = in_bounds(possible_x, possible_y) && !flockline_occupies(new_state, possible_x, possible_y);

        if(move_allowed){

            // Actually move the player
            new_state.player_x += direction_vector[direction][0];
            new_state.player_y += direction_vector[direction][1];
            new_state.player_direction = direction;

            // Check if player added duckling to flockline
            for(let i = 0; i < new_state.duckling_x.length; i++){

                if(new_state.player_x == new_state.duckling_x[i] && new_state.player_y == new_state.duckling_y[i]){

                    new_state.flockline_x.push(new_state.duckling_x[i]);
                    new_state.flockline_y.push(new_state.duckling_y[i]);
                    new_state.flockline_direction.push(new_state.duckling_direction[i]);

                    new_state.duckling_x.splice(i, 1);
                    new_state.duckling_y.splice(i, 1);
                    new_state.duckling_direction.splice(i, 1);
                    new_state.duckling_waddling.splice(i, 1);
                    new_state.duckling_holds_bread.splice(i, 1);
                    break;
                }
            } // End for each duckling

            // Update each duckling in the flockline path
            for(let i = 0; i < new_state.flockline_x.length; i++){

                let index = new_state.flockline_x.length - 1 - i;
                if(index == 0){

                    new_state.flockline_x[index] = previous_state.player_x;
                    new_state.flockline_y[index] = previous_state.player_y;
                    new_state.flockline_direction[index] = new_state.player_direction;

                }else{

                    new_state.flockline_x[index] = new_state.flockline_x[index - 1];
                    new_state.flockline_y[index] = new_state.flockline_y[index - 1];
                    new_state.flockline_direction[index] = new_state.flockline_direction[index - 1];
                }
            } // End for each flockline
        } // End if move allowed

    // End if input is player movement
    }else if(player_move >= INPUT_WADDLE_UP && player_move <= INPUT_WADDLE_LEFT){

        if(new_state.flockline_x.length != 0){

            let direction = player_move - INPUT_WADDLE_UP;
            let possible_x = new_state.player_x + direction_vector[direction][0];
            let possible_y = new_state.player_y + direction_vector[direction][1];
            let move_allowed = in_bounds(possible_x, possible_y) && !square_occupied(new_state, possible_x, possible_y);

            if(move_allowed){

                new_state.duckling_x.push(new_state.player_x);
                new_state.duckling_y.push(new_state.player_y);
                new_state.duckling_direction.push(direction);
                new_state.duckling_waddling.push(true);
                new_state.duckling_holds_bread.push(false);

                new_state.flockline_x.splice(0, 1);
                new_state.flockline_y.splice(0, 1);
                new_state.flockline_direction.splice(0, 1);

                // Update each duckling in the flockline path
                for(let i = 0; i < new_state.flockline_x.length; i++){

                    new_state.flockline_x[i] = previous_state.flockline_x[i];
                    new_state.flockline_y[i] = previous_state.flockline_y[i];
                    new_state.flockline_direction[i] = previous_state.flockline_direction[i];
                } // End for each flockline
            } // End if move allowed
        } // End if flockline x != 0

    } // End if player movement is waddle

    // If the ducklings are waddling, waddle them along
    for(let i = 0; i < new_state.duckling_x.length; i++){

        if(new_state.duckling_waddling[i]){

            let possible_x = new_state.duckling_x[i] + direction_vector[new_state.duckling_direction[i]][0];
            let possible_y = new_state.duckling_y[i] + direction_vector[new_state.duckling_direction[i]][1];
            let move_allowed = in_bounds(possible_x, possible_y) && !square_occupied(new_state, possible_x, possible_y);

            if(!move_allowed){

                if(player_occupies(new_state, possible_x, possible_y)){

                    new_state.duckling_waddling[i] = false;
                    continue;

                }else{

                    new_state.duckling_direction[i] = (new_state.duckling_direction[i] + 2) % 4;
                    possible_x = new_state.duckling_x[i] + direction_vector[new_state.duckling_direction[i]][0];
                    possible_y = new_state.duckling_y[i] + direction_vector[new_state.duckling_direction[i]][1];
                }
            }

            new_state.duckling_x[i] = possible_x;
            new_state.duckling_y[i] = possible_y;
        }
    }

    // Handle goose movement
    for(let i = 0; i < new_state.goose_x.length; i++){

        goose_pathfind(new_state, i);
    }

    // Check for bread pickups
    for(let i = 0; i < new_state.bread_x.length; i++){

        if(new_state.player_x == new_state.bread_x[i] && new_state.player_y == new_state.bread_y[i]){

            new_state.bread_x.splice(i, 1);
            new_state.bread_y.splice(i, 1);
            continue;
        }

        for(let j = 0; j < new_state.duckling_x.length; j++){

            if(new_state.duckling_x[j] == new_state.bread_x[i] && new_state.duckling_y[j] == new_state.bread_y[i]){

                new_state.bread_x.splice(i, 1);
                new_state.bread_y.splice(i, 1);
                new_state.duckling_holds_bread[j] = true;
                break;
            }
        }

        for(let j = 0; j < new_state.goose_x.length; j++){

            if(new_state.goose_x[j] == new_state.bread_x[i] && new_state.goose_y[j] == new_state.bread_y[i]){

                new_state.victory = -1;
                break;
            }
        }
    }

    if(get_bread_left(new_state) == 0){

        new_state.victory = 1;
    }

    return new_state;
}

function goose_pathfind(current_state, goose_index){

    // Find the goal
    let nearest_bread = -1;
    let nearest_bread_distance = -1;

    for(let i = 0; i < current_state.bread_x.length; i++){

        let bread_dist = Math.abs(current_state.goose_x[goose_index] - current_state.bread_x[i]) + Math.abs(current_state.goose_y[goose_index] - current_state.bread_y[i]);
        if(nearest_bread == -1 || bread_dist < nearest_bread_distance){

            nearest_bread = i;
            nearest_bread_distance = bread_dist;
        }
    }

    if(nearest_bread == -1){

        // Don't chase after non-existant bread
        return;
    }

    let goal_x = current_state.bread_x[nearest_bread];
    let goal_y = current_state.bread_y[nearest_bread];

    let frontier = [{direction: -1, path_length: 0, x: current_state.goose_x[goose_index], y: current_state.goose_y[goose_index], score: nearest_bread_distance}];
    let explored = [];

    while(true){

        // Check that the frontier isn't empty
        if(frontier.length == 0){

            console.log("Goose pathfinding failed!");
            return;
        }

        // Find the smallest node in the frontier
        let smallest_index = 0;
        for(let i = 0; i < frontier.length; i++){

            if(frontier[i].score < frontier[smallest_index].score){

                smallest_index = i;
            }
        }

        // Remove the smallest from the frontier
        let smallest = JSON.parse(JSON.stringify(frontier[smallest_index]));
        frontier.splice(smallest_index, 1);

        // And check if it's the solution
        if(smallest.x == goal_x && smallest.y == goal_y){

            // If it is, move the goose one step along the path and then exit
            current_state.goose_x[goose_index] += direction_vector[smallest.direction][0];
            current_state.goose_y[goose_index] += direction_vector[smallest.direction][1];
            current_state.goose_direction[goose_index] = smallest.direction;
            return;
        }

        // Add it to the explored list
        explored.push(smallest);

        // Expand out all possible paths based on the one we've chosen
        for(let direction = 0; direction < 4; direction++){

            let child_x = smallest.x + direction_vector[direction][0];
            let child_y = smallest.y + direction_vector[direction][1];

            // If the path leads to an invalid square, ignore it
            if(square_occupied(current_state, child_x, child_y) || !in_bounds(child_x, child_y)){

                continue;
            }

            let first_direction = smallest.direction == -1 ? direction : smallest.direction;
            let path_length = smallest.path_length + 1;
            let score = path_length + Math.abs(child_x - goal_x) + Math.abs(child_y - goal_y);
            let child = {direction: first_direction, path_length: path_length, x: child_x, y: child_y, score: score}

            // If in explored, ignore it
            let child_in_explored = false;
            for(let i = 0; i < explored.length; i++){

                if(child.x == explored[i].x && child.y == explored[i].y){

                    child_in_explored = true;
                    break;
                }
            }
            if(child_in_explored){

                continue;
            }

            // If child in frontier, ignore it
            let child_in_frontier = false;
            let frontier_index = -1;
            for(let i = 0; i < frontier.length; i++){

                if(child.x == frontier[i].x && child.y == frontier[i].y){

                    child_in_frontier = true;
                    frontier_index = i;
                    break;
                }
            }
            if(child_in_frontier){

                // If the child is in the frontier but with a smaller cost, replace the frontier version with the current version
                if(child.score < frontier[frontier_index].score){

                    frontier[frontier_index] = JSON.parse(JSON.stringify(child));
                }
                continue;
            }

            // Finally if child is neither in frontier or explored, add it to the frontier
            frontier.push(child);
        }
    }
}

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

    let current_state = states[states.length - 1];

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
