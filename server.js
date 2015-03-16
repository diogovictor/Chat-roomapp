//A bunch of modules
var http = require('http');
var path = require('path');
var async = require('async');
var socketio = require('socket.io');
var express = require('express');
var router = express();
var server = http.createServer(router);
var io = socketio.listen(server);

//the nice way of serving up a folder without needing to do anything too nutty
router.use(express.static(path.resolve(__dirname, 'client')));

//a list of standard rooms although nothing here prevents the creation of more rooms on the client side
var rooms = ["politics", "investing", "coding"];
var games = ["tic tac toe 1", "tic tac toe 2"];
var lastNumberOfPlayers = 0;

//connection is the main event
io.sockets.on('connection', function(socket){
//socket is the interface for one session

//socket.on makes an "event listener" which will trigger the function.
    socket.on("rooms", function(){
//socket.emit fires a message to the client and a payload of a JSON object
//The main philosophy of this setup is to make events and payloads of data, done.

//my choice was to have some fixed topic rooms which a user can request using "rooms"
//I respond with the event "welcome", again not the best choice, make better choices in your code
      socket.emit('welcome', {
        "rooms" : rooms,
        "games" : games
      });
    });

//a little code duplication here, so sue me
    socket.emit('welcome', {
      "rooms" : rooms,
      "games" : games
    });
    
//this is how a session can "join" a side channel (that is socket.join("string"))
//it is up to the server code (this code) to decide if that is meaningful
    socket.on('subscribe', function(room) { 
        console.log('joining room', room);
        socket.join(room);
        
        socket.name = 'Anonymous';
        socket.userType = "localUser";
        socket.playerNumber = 0;
        
        var roster = io.sockets.clients(room);
        var names = [];
        roster.forEach(function(client) {
            console.log('Sending Username: ' + client.name);
            names.push(client.name);
        });
        
        roster.forEach(function(client) {
            client.emit("roster", names);
        });
        
        socket.emit("initializeButtons");
        
    });

    socket.on('unsubscribe', function(room) {  
        console.log('leaving room', room);
//leaving channel "string" or room in this case.
        socket.leave(room);
        
        var roster = io.sockets.clients(room);
        var names = [];
        roster.forEach(function(client) {
            console.log('Sending Username: ' + client.name);
            names.push(client.name);
        });
        
        roster.forEach(function(client) {
            client.emit("roster", names);
        });
        
        /*
        var players = getPlayers(socket, room);
        
        roster.forEach(function(client) {
            client.emit("playersList", players);
        });
        */
        uptadePlayersStatus(room);
        
    });

    
    socket.on('tryToBecomePlayer', function(data) { 
        console.log('trying to become a player in game ', data.gameRoom);
        console.log("Client: ", data.clientName);
        //socket.join(room);
        
        var roster = io.sockets.clients(data.gameRoom);
        var names = [];
        
        var gameMesg;
        var alreadyPlayer = false;
        
         var numPlayers = 0;
         roster.forEach(function(client) {
            
            if(client.userType == "player")
            {
                var playerName = String(client.name || "Anonymous");
                
                if(playerName == data.clientName)
                    alreadyPlayer = true;
                
                if(alreadyPlayer)
                {
                    gameMesg = "Ready to play. Start a new game!";
                    client.emit("gameMessage", gameMesg);
                    return;
                }
                else
                {
                    if(playerName == "Anonymous")
                    playerName = "Player"+client.playerNumber;
                
                    names.push(playerName);
                    numPlayers++;
                    
                    gameMesg = "Ready to play. Start a new game!";
                    client.emit("gameMessage", gameMesg);
                }
                
            }
        });
        
        if(!alreadyPlayer)
        {
            console.log("Number of Players: " , numPlayers);
        
            for(var i = 0; i < names.length; i++)
            {
                console.log("Player " + (i+1) + ": " + names[i] );
            }
            
            
            if(numPlayers < 2)
            {
                console.log("Number of Players less than 2. Client became a player.");
                names.push( String(data.clientName || 'Player'+(numPlayers+1) ) );
                socket.userType = "player";
                socket.playerNumber = (numPlayers+1);
                
                console.log("Uptading players status.");
                uptadePlayersStatus(data.gameRoom);
                
                if(numPlayers == 1)
                {
                    roster.forEach(function(client) {
                
                        if(client.userType == "player")
                        {
                            client.emit("readyToPlay");
                        }
                    });
                    
                    console.log("Required Number of Players achieved. Ready to play.");
                     gameMesg = "Ready to play. Start a new game!";
                        socket.emit("gameMessage", gameMesg);
                }
                else
                {
                    gameMesg = "Waiting second player.";
                    socket.emit("gameMessage", gameMesg);
                    socket.emit("waitingSecondPlayer");
                }
            }
            else
            {
                console.log("Max number of players achieved. Client did not become a player.")
                gameMesg = "The maximum number of players was achieved. You can wait or try another game room.";
                socket.emit("gameMessage", gameMesg);
                socket.emit("waitingList");
            }
        
            lastNumberOfPlayers = numPlayers;
            
            roster.forEach(function(client) {
                client.emit("playersList", names);
            });
        }
        
        
    });
    
    
    socket.on('stroke', function(data) {
        
      if( (data.row >= 0) && (data.col >= 0) && (data.turn == socket.playerNumber) )
      {
        
          if(data.matrix[data.col][data.row] == "f"){
              console.log('New stroke - player ', socket.playerNumber);
                   
                   var socketMsg;
                   var newTurn;
                   if(socket.playerNumber == 1){
                       socketMsg = "drawX";
                       data.matrix[data.col][data.row] = 'x';
                       newTurn = 2; 
                   }
                   else
                   {
                        socketMsg = "drawO";
                        data.matrix[data.col][data.row] = 'o';
                        newTurn = 1;
                   }
                   
                   var roster = io.sockets.clients(data.room);
                   
                   if(checkWinner(data.matrix, socket.playerNumber))
                   {
                       var winner = getPlayerByNumber(data.room, socket.playerNumber);
                       
                       console.log("Player won: ", winner);
                       
                       var newScores;
                       var score1;
                       var score2;
                            
                        if(newTurn == 1)
                        {
                            //newScores= [ data.scores[(newTurn-1)].score, data.scores[(socket.playerNumber-1)].score++ ];
                            score1 = data.scores[(newTurn-1)].score;
                            score2 = data.scores[(socket.playerNumber-1)].score + 1;
                        }
                        else
                        {
                            //newScores= [ data.scores[(socket.playerNumber-1)].score++, data.scores[(newTurn-1)].score ];
                            score1 = data.scores[(socket.playerNumber-1)].score + 1;
                            score2 = data.scores[(newTurn-1)].score;
                        }
                       
                       newScores = [ score1, score2];
                        
                        roster.forEach(function(client) {
                            
                            if( client.userType == "player" )
                            {
                                //client.emit("newTurn", 0);
                                client.emit("endGame");
                                client.emit("gameMessage", "WINNER: " + winner );
                            }
                            
                            client.emit("showWinner", winner);
                            
                            console.log(socketMsg + ' to: ' + client.name);
                            client.emit(socketMsg, data.col, data.row);
                            client.emit("uptadeScores", newScores );
                            
                        });
                        
                   }
                   else if(checkDraw(data.matrix))
                   {
                        roster.forEach(function(client) {
                            
                            if( client.userType == "player" )
                            {
                                //client.emit("newTurn", 0);
                                client.emit("endGame");
                                client.emit("gameMessage", "DRAW" );
                            }
                            
                            client.emit("showWinner", "DRAW - Nobody");
                            
                            console.log(socketMsg + ' to: ' + client.name);
                            client.emit(socketMsg, data.col, data.row);
                            
                        });
                   }
                   else
                   {
                       var playerInNewTurn = getPlayerByNumber(data.room, newTurn);
                       
                       console.log("New turn player: ", playerInNewTurn);
                       
                        roster.forEach(function(client) {
                            
                            if( client.userType == "player" )
                            {
                                
                                client.emit("gameMessage", "Current Player: " + playerInNewTurn );
                                    
                            }
                            
                            console.log(socketMsg + ' to: ' + client.name);
                            client.emit(socketMsg, data.col, data.row);
                            client.emit("newTurn", newTurn);
                        });
                   }
                    
          }
      }
               
        
    });
    
    
    socket.on('newGame', function(data) {
        console.log('Starting a new game', data.room);
        console.log('players: ', data.players);
       var roster = io.sockets.clients(data.room);
        
        roster.forEach(function(client) {
            if( client.userType == "player" )
            {
                console.log('New game to Player: ' + client.name);
                client.emit("newGame");
                
                client.emit("gameMessage", "Current Player: " + data.players[(data.startPlayer-1)] );
            }
            else
                client.emit("newGameViewers");
                
            client.emit("newTurn", data.startPlayer);
            
        });
        
        /*
        var players = getPlayers(data.room);
        io.sockets.in(data.room).emit("playersList", players);
        */
        
        updateLocalUsers(data.room);
        
    });
    
    
    
    socket.on('quitGame', function(data) {
        console.log('quitting game', data.room);
       
       var roster = io.sockets.clients(data.room);
       //var names = [];
        socket.userType = "localUser";
        socket.playerNumber = 0;
        
        roster.forEach(function(client) {
            if( client.userType == "localUser" )
            {
                client.emit("openPlayerPosition");
            }
            
        });
        
        var players = getPlayers(data.room);
        io.sockets.in(data.room).emit("playersList", players);
        
        updateLocalUsers(data.room);
        uptadePlayersStatus(data.room);
        
    });
    
    
     socket.on('zeroutSocores', function(data) {
        console.log('reseting scores ', data.room);
       
       var roster = io.sockets.clients(data.room);
        
        roster.forEach(function(client) {
            client.emit("zeroutSocores", socket.playerNumber);
            
        });
        
        
        var players = getPlayers(data.room);
        io.sockets.in(data.room).emit("playersList", players);
        
        updateLocalUsers(data.room);
        
    });

//this choice (copied from stack overflow) is to let each message send a room in the JSON data
    socket.on('send', function(data) {
        console.log('sending message',data.room);
//this part takes the message and only emits it to people in the same room.
       
        data.name = String(data.name || 'Anonymous');
        io.sockets.in(data.room).emit('message', data);
        
        var players = getPlayers(data.room);
        io.sockets.in(data.room).emit("playersList", players);
        
        
        updateLocalUsers(data.room);
        
    });
    
    socket.on('createRoom', function(data) {
        console.log('creating a new room in the server: ', data.newTopic);
        rooms.push(data.newTopic);
    });
    
    socket.on('createGameRoom', function(data) {
        console.log('creating a new game room in the server: ', data.newTopic);
        games.push(data.newTopic);
    });
    
    
    socket.on('identify', function (name, room) {
      
      socket.name = String(name || 'Anonymous');
       
       console.log("identifying: " + name);
        //users[room].[io.sockets.adapter.rooms[roomId]] = (String(name || 'Anonymous');
        var roster = io.sockets.clients(room);
        var names = [];
        roster.forEach(function(client) {
            console.log('Sending Username: ' + client.name);
            names.push(client.name);
        });
        
        roster.forEach(function(client) {
            client.emit("roster", names);
        });
        
        var players = getPlayers(room);
        io.sockets.in(room).emit("playersList", players);
        
        /*
        roster.forEach(function(client) {
            client.emit("playersList", players);
        });
        */
    });
    

});


function updateLocalUsers(room){
    
    var roster = io.sockets.clients(room);
        var names = [];
        roster.forEach(function(client) {
            console.log('Sending Username: ' + client.name);
            names.push(client.name);
        });
        
        io.sockets.in(room).emit("roster", names);
        
}


function checkWinner(matrix, playerNumber)
{
    var playerSymbol;
    if(playerNumber == 1)
        playerSymbol = 'x';
    else
        playerSymbol = 'o';
    
    console.log("Checking winner with the symbol: ", playerSymbol);
    console.log("MATRIX: ", matrix);
    
    var col = [0,0,0];
    var row = [0,0,0];
    var diagonal = [0,0];
    
    for(var i=0; i<matrix.length; i++)
    {
       for(var j=0; j<matrix[i].length; j++)
       {
           if(matrix[i][j] == playerSymbol)
           {
               col[i]++;
               row[j]++;
               
               if(i == j)
                    diagonal[0]++;
                
                if( ( (i == 0) && (j == 2) ) || ((i == 1) && (j == 1)) || ((i == 2) && (j == 0)) )
                        diagonal[1]++;
                
                
                console.log("COL: ", col);
                console.log("ROW: ", row);
                console.log("DIAGONAL: ", diagonal);
                       
                if( (col[i] == 3) || (row[j] == 3) || (diagonal[0] == 3) || (diagonal[1] == 3) )
                {
                    return true;
                }
           }
       }
    }
    
    return false;
}


function checkDraw(matrix)
{
    for(var i=0; i<matrix.length; i++)
    {
       for(var j=0; j<matrix[i].length; j++)
       {
           if(matrix[i][j] == 'f')
                return false;
       }
    }
    return true;
}

function getPlayerByNumber(room, number)
{
    console.log("Get Player by number: ", number);
    var clientName = "No Player";
    var roster = io.sockets.clients(room);
        roster.forEach(function(client) {
            console.log("Name: ", client.name);
            console.log("Player Number: ", client.playerNumber);
            console.log("User type: ", client.userType);
            if( (client.userType == "player") && (client.playerNumber == number) )
            {
                console.log("Returning: " + client.name);
                clientName = client.name;
                //break;
            }
        });
    return clientName;
}

function getPlayers(room)
{
    var roster = io.sockets.clients(room);
        var players = [];
        var numPlayers = 0;
         roster.forEach(function(client) {
            
             var playerName = String(client.name || "Anonymous");
                if(playerName == "Anonymous")
                    playerName = "Player"+client.playerNumber;
            
            if(client.userType == "player")
            {
                players.push(playerName);
                numPlayers++;
            }
        });
        
        
        if(numPlayers != lastNumberOfPlayers)
            uptadePlayersStatus(room);
        
        lastNumberOfPlayers = numPlayers;
        return players;
}

function uptadePlayersStatus(room)
{
        var roster = io.sockets.clients(room);
        var names = [];
        
       
         var numPlayers = 0;
         roster.forEach(function(client) {
            
            if(client.userType == "player")
            {
                var playerName = String(client.name || "Anonymous");
                if(playerName == "Anonymous")
                    playerName = "Player"+client.playerNumber;
                    
                names.push(playerName);
                numPlayers++;
            }
        });
        
        console.log("Updating - Number of Players: " , numPlayers);
        
        var gameMesg;
        
        if(numPlayers < 1)
        {
            roster.forEach(function(client) {
                if(client.userType != "player")
                {
                    console.log("Sending an open position alert: less than 1 player");
                    client.emit("openPlayerPosition");
                }
            });
        }
        else if(numPlayers == 1)
        {
            roster.forEach(function(client) {
        
                if(client.userType == "player")
                {
                    //client.emit("readyToPlay");
                    gameMesg = "Waiting second player.";
                    client.playerNumber = 1;
                    client.emit("gameMessage", gameMesg);
                    client.emit("waitingSecondPlayer");
                }
                else
                {
                    console.log("Sending an open position alert: 1 player");
                    client.emit("openPlayerPosition", names);
                }
            });
            
        }
        else if(numPlayers == 2)
        {
            roster.forEach(function(client) {
        
                if(client.userType == "player")
                {
                    client.emit("readyToPlay");
                    gameMesg = "Ready to play. Start a new game!";
                    client.emit("gameMessage", gameMesg);
                }
                else
                {
                    gameMesg = "The maximum number of players was achieved. You can wait or try another game room.";
                    client.emit("gameMessage", gameMesg);
                    client.emit("waitingList");
                }
            });
        }
        
        lastNumberOfPlayers = numPlayers;
        roster.forEach(function(client) {
            client.emit("playersList", names);
        });
}

//This is taken from the cloud9 hello world for node since it's sure to work fine
server.listen(process.env.PORT || 3000, process.env.IP || "0.0.0.0", function(){
  var addr = server.address();
  console.log("Chat server listening at", addr.address + ":" + addr.port);
});