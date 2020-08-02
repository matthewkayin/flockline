create database if not exists flockline;
use flockline;

drop table puzzles;
drop table users;

create table users (

    userid int not null primary key auto_increment,
    username varchar(255) not null, 
    password varchar(255) not null
);

create table puzzles (

    puzzleid int not null primary key auto_increment,
    userid int not null,
    title varchar(255) not null,
    foreign key (userid) references users (userid)
);
