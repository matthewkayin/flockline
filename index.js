var express = require('express');
var session = require('express-session');
var bodyparser = require('body-parser');
var path = require('path');

var app = express();
app.use(session({
    secret: 'duckduckduck',
    resave: true,
    saveUninitialized: true
}));
app.use(bodyparser.urlencoded({extended: true}));
app.use(bodyparser.json());

app.use('/res', express.static('res'));

app.get('/style.css', function(request, response){

    response.sendFile(path.join(__dirname + "/style.css"));
});

app.get('/style.css', function(request, response){

    response.sendFile(path.join(__dirname + "/style.css"));
});

app.get('/', function(request, response){

    response.sendFile(path.join(__dirname + '/home.html'));
});

app.get('/login', function(request, response){

    response.sendFile(path.join(__dirname + '/login.html'));
});

app.get('/register', function(request, response){

    response.sendFile(path.join(__dirname + '/register.html'));
});

app.listen(3000);
