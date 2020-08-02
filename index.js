var mysql = require('mysql');
var express = require('express');
var session = require('express-session');
var bodyparser = require('body-parser');
var path = require('path');
var fs = require('fs');

var sqlserver = mysql.createConnection({

    host: 'localhost',
    user: 'duckuser',
    password: 'quack',
    database: 'flockline'
});

sqlserver.connect(function(error){

    if(error){

        console.log("Failed to connect to mysql server.");
        throw error;
    }

    console.log("Connected to mysql server.");
});

var app = express();
app.use(session({
    secret: 'duckduckduck',
    resave: true,
    saveUninitialized: true
}));
app.use(bodyparser.urlencoded({extended: true}));
app.use(bodyparser.json());

const queries = {
    register:  'insert into users (username, password) values (?, ?)',
    login: 'select userid, username from users where username = ? and password = ?',
    create_puzzle: 'insert into puzzles (userid, title) values (?, ?)',
    update_puzzle: 'update puzzles set title = ? where puzzleid = ?',
    get_puzzle: 'select puzzleid, userid, title from puzzles where puzzleid = ?',
    get_all_puzzles: 'select puzzleid, userid, title from puzzles',
};

app.use('/res', express.static('res'));
app.use('/puzzles', express.static('puzzles'));
app.use('/style.css', express.static('style.css'));
app.use('/duckedit.js', express.static('duckedit.js'));
app.use('/duckgame.js', express.static('duckgame.js'));

function send_error(error_message, response){

    var error = fs.readFileSync('error.html').toString();
    error = error.replace(/ERRORTEXT/gi, error_message);
    response.send(error);
    response.end();
}

app.get('/', function(request, response){

    if(request.session.loggedin){

        response.redirect('/list');

    }else{

        response.sendFile(path.join(__dirname + '/home.html'));
    }
});

app.get('/login', function(request, response){

    if(request.session.loggedin){

        response.redirect('/');

    }else{

        response.sendFile(path.join(__dirname + '/login.html'));
    }
});

app.get('/register', function(request, response){

    if(request.session.loggedin){

        response.redirect('/list');

    }else{

        response.sendFile(path.join(__dirname + '/register.html'));
    }
});

app.post('/signup', function(request, response){

    sqlserver.query(queries.register, [request.body.username, request.body.password], function(error, results){

        if(error){

            throw error;
        }

        sqlserver.query(queries.login, [request.body.username, request.body.password], function(inner_error, inner_results){

            if(inner_error){

                throw inner_error;
            }

            if(inner_results.length > 0){

                request.session.loggedin = true;
                request.session.userid = inner_results[0].userid;
                request.session.username = inner_results[0].username;
                response.redirect('/');

            }else{

                send_error("Uh oh! You were not able to register successfully!", response);
            }
        });
    });
});

app.post('/auth', function(request, response){

    sqlserver.query(queries.login, [request.body.username, request.body.password], function(error, results){

        if(error){

            throw error;
        }

        if(results.length > 0){

            request.session.loggedin = true;
            request.session.userid = results[0].userid;
            request.session.username = results[0].username;
            response.redirect('/');

        }else{

            send_error("Uh oh! Login failed! You probably hecked up your username or password.", response)
        }
    });
});

app.get('/list', function(request, response){

    var list_page = fs.readFileSync('list.html').toString();
    var logged_in_string = request.session.loggedin ? "user_logged_in = true;" : "user_logged_in = false;";
    list_page = list_page.replace(/\/\/USERLOGGEDIN/gi, logged_in_string);
    if(request.session.loggedin){

        list_page = list_page.replace(/USERNAME/gi, request.session.username);
    }

    sqlserver.query(queries.get_all_puzzles, [], function(error, results){

        if(error){

            throw error;
        }

        var puzzle_items = "";
        for(let i = 0; i < results.length; i++){

            if(results[i].userid == request.session.userid){

                puzzle_items += "<div class=\"puzzle-item-wrapper\"><h1 class=\"small-puzzle-item\" onclick=\"location.href='/play?puzzleid=" + results[i].puzzleid + "';\">" + results[i].title + "</h1><h1 class=\"edit-puzzle-item\" onclick=\"location.href='/edit?puzzleid=" + results[i].puzzleid + "';\">Edit</h1></div>";

            }else{

                puzzle_items += "<h1 class=\"puzzle-item\" onclick=\"location.href='/play?puzzleid=" + results[i].puzzleid + "';\">" + results[i].title + "</h1>"
            }
        }

        list_page = list_page.replace("<!-- PUZZLE LIST -->", puzzle_items);

        response.send(list_page);
        response.end();
    });
});

app.get('/edit', function(request, response){

    if(!request.session.loggedin){

        response.redirect('/');

    }else{

        function send_editpage(puzzleid, puzzle_title){

            var edit_page = fs.readFileSync('editor.html').toString();
            edit_page = edit_page.replace(/PUZZLEID/gi, puzzleid);
            edit_page = edit_page.replace(/PUZZLETITLE/gi, puzzle_title);

            response.send(edit_page);
            response.end();
        }

        if(!request.query.puzzleid){

            send_editpage("PUZZLEID", "New Puzzle");

        }else{

            sqlserver.query(queries.get_puzzle, [request.query.puzzleid], function(error, results){

                if(error){

                    throw error;
                }

                if(results.length == 0){

                    send_error("Uh oh! No puzzle of that id was found!", response);

                }else if(results[0].userid != request.session.userid){

                    send_error("Uh oh! Looks like you don't have access to edit this puzzle!", response);

                }else{

                    send_editpage(request.query.puzzleid.toString(), results[0].title);
                }
            });
        }
    }
});

app.post('/puzzle_data', function(request, response){

    if(!request.session.loggedin){

        response.end();
    }

    function save_puzzle(puzzleid, puzzle_state){

        fs.writeFile("puzzles/" + puzzleid + ".json", JSON.stringify(puzzle_state), function(error){

            if(error){

                throw error;
            }

            response.redirect('/list');
        });
    }

    if(request.body.puzzleid.toString() == "PUZZLEID"){

        sqlserver.query(queries.create_puzzle, [request.session.userid, request.body.title], function(error, results){

            if(error){

                throw error;
            }

            save_puzzle(results.insertId, request.body.state);
        });

    }else{

        sqlserver.query(queries.update_puzzle, [request.body.title, request.body.puzzleid], function(error, results){

            if(error){

                throw error;
            }

            save_puzzle(request.body.puzzleid, request.body.state);
        });
    }
});

app.get('/play', function(request, response){

    if(!request.query.puzzleid){

        send_error("Uh oh! No puzzleid was specified!", response);
    }

    sqlserver.query(queries.get_puzzle, [request.query.puzzleid], function(error, results){

        if(error){

            throw error;
        }

        if(results.length == 0){

            send_error("Uh oh! No puzzle of that id was found!", response);

        }else{

            var play_page = fs.readFileSync('player.html').toString();
            play_page = play_page.replace(/PUZZLEID/gi, request.query.puzzleid.toString());
            play_page = play_page.replace(/PUZZLETITLE/gi, results[0].title);

            response.send(play_page);
            response.end();
        }
    });
});

app.get('*', function(request, response){

    send_error("Uh oh! Looks like this page doesn't exist!", response);
});

app.listen(3000);
