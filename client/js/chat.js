//took me a while to realize I needed "ngRoute", that is an update from angular 1.* to 1.*+1 (1.1 to 1.2 perhaps?)
var theapp = angular.module("chatapp", ['ngRoute']);

//the .config command sets up the main routes, I have a single age app repo for you to explore precisely this
theapp.config(["$routeProvider", "$locationProvider", 
//I will say which templates to use and which controllers for the various "screens" I want you to see.
	function($routeProvider, $locationProvider){
	    $routeProvider.when("/room/:topic", {
		    templateUrl : "/chatroom.html",
		    controller  : "RoomController"
	    }).when("/lobby", {
	      templateUrl : "/lobby.html",
	      controller : "LobbyController"
	    }).when("/game/:topic", {
	      templateUrl : "/gameRoom.html",
	      controller : "TicTacController"
	    }).when("/newGameRoom", {
	      templateUrl : "/newGameRoom.html",
	      controller : "NewGameRoomController"
	    }).when("/newRoom", {
	      templateUrl : "/newRoom.html",
	      controller : "NewRoomController"
	    }).otherwise({
		    redirectTo : "/lobby"
	    });
	    $locationProvider.html5Mode(true);
}]);

//I decided to start the socket connection here, before anything has been hooked up anywhere
//The reason was so that I could use the socket in either controller.  
// If I were better at angular I would introduce a factory which would fire up the socket, and I could pass it around to 
// the controllers that needed it.  I'm not trying to get too fancy here, just show you enough to get you running, 
// we'll get more modular as we go.  If you want to improve the code then please do so...
var socket = io.connect();
var rooms = [];
var games = [];
var myroom = "";
//Some duplication here, I listen for a welcome and update the rooms variable.
socket.on("welcome", function(data){
  rooms = data.rooms;
  games = data.games;
  console.log("fresh rooms in");
});


theapp.controller("LobbyController", ["$scope",  
  function($scope){
    $scope.rooms = rooms;
//when you head to the lobby I will log you off of your previous room
    socket.emit("unsubscribe", myroom);
//I will ask the server for the current rooms list
    socket.emit("rooms");
//I will update my rooms list in the scope (so the template has some rooms to work with)
    socket.on("welcome", function(data){
      $scope.rooms = data.rooms;
      $scope.games = data.games;
      $scope.$apply();
    });
    
    $("#btGames").removeClass("btn-inverse");
    $(".gameGroups").hide();
    
    $("#btGames").click(function(){
        $(".discussionGroups").hide();
        $(".gameGroups").show();
        $("#btGames").addClass("btn-inverse");
        $("#btDiscussion").removeClass("btn-inverse");
    });
    
     $("#btDiscussion").click(function(){
        $(".discussionGroups").show();
        $(".gameGroups").hide();
        $("#btGames").removeClass("btn-inverse");
        $("#btDiscussion").addClass("btn-inverse");
    });
    
  }
]);


theapp.controller("RoomController", ["$scope","$routeParams", 
//$routeParams lets me use the URL routes as a variable, a lot like we did with our API work using .htaccess
      function($scope, $routeParams) {
//in the route config up top I made a :topic variable in the url, here is where I read that.
        $scope.roomTopic = $routeParams.topic;
//my server will let me subscribe to that room topic (or any room topic for that matter)
        socket.emit("subscribe", $scope.roomTopic);
        myroom = $scope.roomTopic;
        $scope.messages = [];
        $scope.name = '';
        $scope.text = '';
        
        $scope.color = '#ffffff';
        
        
        socket.on('roster', function (names) {
          $scope.roster = names;
          $scope.$apply();
          names.forEach(function(name){
            console.log("Received Client:" + name);
          });
          
        });
        
//useless listener here...
        socket.on('connect', function () {
          $scope.setName();
        });

//when a new message shows up I will push it into the "scope's" message array, the template will deal with how to display it
        socket.on('message', function (msg) {
          console.log("new message", msg.text);
          switch (msg.text) {
            case ':)':
                msg.text = '<img src="../img/smiley.jpg" width="10%" height="10%">';
                break;
            
            default:
                // code
        }
          $scope.messages.push(msg);
          $scope.$apply();
          var $chat = $(".chatMsg");
          $chat.scrollTop($chat.prop('scrollHeight')+100);
        });

//when the send function is called I will use the current name, roomTopic, and text value to decide what 
//everyone should read
        $scope.send = function send() {
          console.log('Sending message:', $scope.text);
          socket.emit('send', {text: $scope.text, room: $scope.roomTopic, name: $scope.name, color: $scope.color});
          $scope.text = '';
//Also I'll clear the text so you can chat like you expect to chat.
        };

//leftover code from previous version, the server gets a "identify" event with my current name, this helps 
//if you want everyone to get a list of current users (for instance knowing who is still in the room might be a nice feature)
        $scope.setName = function setName() {
          socket.emit('identify', $scope.name, $scope.roomTopic);
        };
        
        
        
  }]);
  
  
  
theapp.controller("NewGameRoomController", ["$scope",
//$routeParams lets me use the URL routes as a variable, a lot like we did with our API work using .htaccess
      function($scope) {

        $scope.newTopic = '';

        $scope.create = function create() {
          console.log('creating a new room:', $scope.newTopic);
          socket.emit('createGameRoom', {newTopic: $scope.newTopic});
          $scope.newTopic = '';
          games.push($scope.newTopic);
          location.assign('https://chat-roomapp-diogovictor.c9.io/');

        };

  }]);
  
  
  
  theapp.controller("NewRoomController", ["$scope",
//$routeParams lets me use the URL routes as a variable, a lot like we did with our API work using .htaccess
      function($scope) {

        $scope.newTopic = '';

        $scope.create = function create() {
          console.log('creating a new room:', $scope.newTopic);
          socket.emit('createRoom', {newTopic: $scope.newTopic});
          $scope.newTopic = '';
          rooms.push($scope.newTopic);
          location.assign('https://chat-roomapp-diogovictor.c9.io/');
        };

  }]);
  
  
  
  //**************************************************************************************************
  
  
  theapp.controller("TicTacController", ["$scope","$routeParams", 
//$routeParams lets me use the URL routes as a variable, a lot like we did with our API work using .htaccess
      function($scope, $routeParams) {
//in the route config up top I made a :topic variable in the url, here is where I read that.
        $scope.gameTopic = $routeParams.topic;
//my server will let me subscribe to that room topic (or any room topic for that matter)
        $scope.name = '';
        socket.emit("subscribe", $scope.gameTopic);
        myroom = $scope.gameTopic;
        $scope.messages = [];
        $scope.text = '';
        
        $scope.playersScore = [{name: "No Player 1", score: 0}, {name: "No Player 2", score: 0}];
        
        $scope.color = '#ffffff';
        $scope.playing = false;
        $scope.lastPlayerStarted = 1;
        
        $scope.turn = 1;
        $scope.matrix =[ ["f","f","f"],["f","f","f"],["f","f","f"] ];
        
        socket.on('roster', function (names) {
          $scope.roster = names;
          $scope.$apply();
          names.forEach(function(name){
            console.log("Received Client:" + name);
          });
          
        });
        
        
        socket.on('playersList', function (names) {
          $scope.players = names;
          
         
          if(names.length > 0)
          {
              $scope.playersScore[0].name = names[0];
               $('.player1').css("background-color","#B13333");
              
              if(names.length > 1)
              {
                $scope.playersScore[1].name = names[1];
                $('.player2').css("background-color","#335BB1");
              }
              else
              {
                $scope.playersScore[1].name = "No Player 2";
                $('.player2').css("background-color","#A0A2A1");
              }
          }
          else
          {
              $scope.playersScore[0].name = "No Player 1";
              $scope.playersScore[1].name = "No Player 2";
              
              $('.player1').css("background-color","#A0A2A1");
              $('.player2').css("background-color","#A0A2A1");
          }
          
          $scope.$apply();
          names.forEach(function(name){
            console.log("Received Player:" + name);
          });
          
        });
        
//useless listener here...
        socket.on('connect', function () {
          $scope.setName();
        });

        
      
        socket.emit("tryToBecomePlayer", {gameRoom: $scope.gameTopic, clientName: $scope.name});

//when a new message shows up I will push it into the "scope's" message array, the template will deal with how to display it
        socket.on('message', function (msg) {
          console.log("new message", msg.text);
          switch (msg.text) {
            case ':)':
                msg.text = '<img src="../img/smiley.jpg" width="10%" height="10%">';
                break;
            
            default:
                // code
          }
          $scope.messages.push(msg);
          $scope.$apply();
          var $chat = $(".chatMsgGame");
          $chat.scrollTop($chat.prop('scrollHeight')+100);
        });


        socket.on('gameMessage', function (msg) {
          console.log("new game message", msg);
          
          //$scope.messages.push(msg);
          
          $('.gameMessage').html(msg);
          
        });
        
        socket.on('initializeButtons', function () {
            $('.btJoin').hide();
            $('.gameWinner').hide();
            
        });
        
        
        socket.on('newGame', function () {
          console.log("New game ", $scope.lastPlayerStarted);
          
          $('.bt1').addClass("disabled");
          $('.bt2').addClass("disabled");
          
          $('.gameWinner').hide();
          
          $scope.playing = true;
          $scope.matrix =[ ["f","f","f"],["f","f","f"],["f","f","f"] ];
          
          $scope.turn = $scope.lastPlayerStarted;
            
          $scope.$apply();
            
          paintBoard();
          
          $('.gameCanvas').click(function(e){
              console.log("Clicking in: - x = ", e.clientX);
              console.log("clicking in: - y = ", e.clientY);
              console.log("TURN: ", $scope.turn);
              console.log("PLAYING: ", $scope.playing);
              var x = e.offsetX;
              var y = e.offsetY;
              
              var row = getRow(y);
              var col = getCol(x);
              
              if($scope.playing)
                  socket.emit("stroke", {room: $scope.gameTopic, row: row, col: col, turn: $scope.turn, scores: $scope.playersScore, matrix: $scope.matrix});
             
          });
          
         
          
        });
        
        
        
        socket.on('newGameViewers', function () {
          console.log("New game");
                
           $('.gameWinner').hide();
            paintBoard();
          
            
            $scope.$apply();
          
        });
        
        
        socket.on('showWinner', function (winner) {
          console.log("Show winner: ", winner);
                
          $('.gameWinner').html(winner + " won!");
          $('.gameWinner').show();
          
        });
        
        socket.on('newTurn', function (newTurn) {
            
            console.log("NEW TURN - change to player ", newTurn);
            
            if(newTurn == 1)
            {
                $('.Player1Name').addClass("currentPlayer");
                $('.Player2Name').removeClass("currentPlayer");
            }
            else if(newTurn == 2)
            {
                $('.Player1Name').removeClass("currentPlayer");
                $('.Player2Name').addClass("currentPlayer");
            }
            
            $scope.turn = newTurn;
            $scope.$apply();
            
        });
        
        
         socket.on('endGame', function () {
            
            console.log("Ending game! ");
            
            if($scope.playing == true){
                 if($scope.lastPlayerStarted == 1)
                    $scope.lastPlayerStarted = 2;
                 else 
                    $scope.lastPlayerStarted = 1;
            }
           
            
            $scope.playing = false;
            $scope.turn = $scope.lastPlayerStarted;
            $scope.$apply();
            
            
            $('.bt1').removeClass("disabled");
            $('.bt2').removeClass("disabled");
            
            $('.bt1').click(function(){
                 if(!$scope.playing)
                 {
                    $scope.turn = $scope.lastPlayerStarted;
                    socket.emit("newGame", {room: $scope.gameTopic, startPlayer: $scope.lastPlayerStarted, players: $scope.players} );
                 }
             });
              
             $('.bt2').click(function(){
                 console.log("quit game from END GAME!");
                 if(!$scope.playing)
                    socket.emit("quitGame", {room: $scope.gameTopic, clientName: $scope.name} );
             });
            
        });
        
        
         socket.on('uptadeScores', function (scores) {
            
            console.log("Update scores:  ", scores);
            
            $scope.playersScore[0].score = scores[0];
            $scope.playersScore[1].score = scores[1];
            $scope.$apply();
        });
        
        socket.on('zeroutSocores', function (playerNumber) {
            
            console.log("Zero out scores: player  ", playerNumber);
            
            $scope.playersScore[(playerNumber-1)].score = 0;
            $scope.$apply();
        });
        
        
        socket.on('readyToPlay', function () {
          console.log("readyToPlay");
          
          $('.btn').removeClass("disabled");
          $('.bt1').show();
          $('.bt2').show();
          $('.btZeroScores').show();
          $('.btJoin').hide();
          
          clearBoard();
          restart();
          
          $scope.playersScore[0].score = 0;
          $scope.playersScore[1].score = 0;
          $scope.$apply();
          
          $('.bt1').click(function(){
              if(!$scope.playing)
                socket.emit("newGame", {room: $scope.gameTopic, startPlayer: $scope.lastPlayerStarted, players: $scope.players} );
          });
          
          $('.bt2').click(function(){
              console.log("quit game from READY TO PLAY!");
              
              if(!$scope.playing)
                socket.emit("quitGame", {room: $scope.gameTopic, clientName: $scope.name} );
          });
          
          $('.btZeroScores').click(function(){
              socket.emit("zeroutSocores", {room: $scope.gameTopic} );
          });
          
        });
        
        
        socket.on('drawX', function (col, row) {
          console.log("drawing X");
          $scope.matrix[col][row] = "x";
          paintX(col, row);
        });
        
        socket.on('drawO', function (col, row) {
          console.log("drawing O");
          $scope.matrix[col][row] = "o";
          paintO(col, row);
        });
        
        
        socket.on('waitingSecondPlayer', function () {
          console.log("waiting second Player");
          
          $('.bt1').addClass("disabled");
          $('.bt1').show();
          $('.bt2').show();
          
        });
        
        socket.on('waitingList', function () {
          console.log("Placed in waiting List");
          
          $('.bt1').hide();
          $('.bt2').hide();
          $('.btJoin').hide();
          $('.btZeroScores').hide();
          /*
          $scope.waitingList.push(socket.id);
          console.log("Added - Waiting List: ", $scope.waitingList);
          */
          
        });
        
        
        socket.on('openPlayerPosition', function (player1) {
          console.log("Player 1 waiting: ", player1);
          
          //$scope.messages.push(msg);
          //$('.gameBt1').html('<a id="btJoinGame" ng-click="joinGame()" class="btn btn-lg btn-primary"> Join Game </a>');
          player1 = String(player1 || "The game");
          var waitingMsg;
          
          if(player1 == "The game")
              waitingMsg = player1 + " is waiting players. Join it now!";
          else
             waitingMsg = player1 + " is waiting a second player. Join the game now!";
          
          $('.gameMessage').html(waitingMsg);
          
          $('.bt1').hide();
          $('.bt2').hide();
          $('.btZeroScores').hide();
          
          $('.btJoin').removeClass("disabled");
          $('.btJoin').show();
          
          $('.btJoin').click(function(){
              socket.emit("tryToBecomePlayer", {gameRoom: $scope.gameTopic, clientName: $scope.name});
          });
          
          
          
        });
        
//when the send function is called I will use the current name, roomTopic, and text value to decide what 
//everyone should read
        $scope.send = function send() {
          console.log('Sending message:', $scope.text);
          socket.emit('send', {text: $scope.text, room: $scope.gameTopic, name: $scope.name, color: $scope.color});
          $scope.text = '';
//Also I'll clear the text so you can chat like you expect to chat.
        };


        $scope.setName = function setName() {
          socket.emit('identify', $scope.name, $scope.gameTopic);
        };
        
        
  }]);
  
  
  
  // **************************************************************************************************
  
  
  function getRow(y){
      
      if(y <= 160)
      {
          return 0;
      }
      else if( (y >= 170) && (y < 330 ) )
      {
          return 1;
      }
      else if( y >= 338)
      {
          return 2;
      }
      else
        return -1;
  }
  
  
  function getCol(x){
      
      if(x <= 163)
      {
          return 0;
      }
      else if( (x >= 170) && (x <= 330 ) )
      {
          return 1;
      }
      else if( x >= 337)
      {
          return 2;
      }
      else
        return -1;
  }
  


//********************** TIC TAC TOE *******************************************************************

var xBoard = 0;
var oBoard = 0;
var begin = true;
var context;
var width, height;

function clearBoard()
{
   var board = document.getElementById('board');
  
   width = board.width;
   height = board.height;
   context = board.getContext('2d');
   
   restart();
}

function paintBoard() {
   var board = document.getElementById('board');
  
   width = board.width;
   height = board.height;
   context = board.getContext('2d');

    restart();

   context.beginPath();
   context.strokeStyle = '#000'; 
   context.lineWidth   = 4;

   context.moveTo((width / 3), 0);
   context.lineTo((width / 3), height);

   context.moveTo((width / 3) * 2, 0);
   context.lineTo((width / 3) * 2, height);

   context.moveTo(0, (height / 3));
   context.lineTo(width, (height / 3));

   context.moveTo(0, (height / 3) * 2);
   context.lineTo(width, (height / 3) * 2);

   context.stroke();
   context.closePath();
}


function paintX(x, y) {

   context.beginPath();

   context.strokeStyle = '#ff0000'; 
   context.lineWidth   = 4;

   var offsetX = (width / 3) * 0.1;
   var offsetY = (height / 3) * 0.1;

   var beginX = x * (width / 3) + offsetX;
   var beginY = y * (height / 3) + offsetY;

   var endX = (x + 1) * (width / 3) - offsetX * 2;
   var endY = (y + 1) * (height / 3) - offsetY * 2;

   context.moveTo(beginX, beginY);
   context.lineTo(endX, endY); 

   context.moveTo(beginX, endY);
   context.lineTo(endX, beginY); 	

   context.stroke();
   context.closePath(); 
}

function paintO(x, y) {
	
   context.beginPath();

   context.strokeStyle = '#0000ff'; 
   context.lineWidth   = 4;

   var offsetX = (width / 3) * 0.1;
   var offsetY = (height / 3) * 0.1;

   var beginX = x * (width / 3) + offsetX;
   var beginY = y * (height / 3) + offsetY;

   var endX = (x + 1) * (width / 3) - offsetX * 2;
   var endY = (y + 1) * (height / 3) - offsetY * 2;

   context.arc(beginX + ((endX - beginX) / 2), beginY + ((endY - beginY) / 2), (endX - beginX) / 2 , 0, Math.PI * 2, true);

   context.stroke();
   context.closePath();
}



function restart() {
   context.clearRect (0, 0, width , height);
   xBoard = 0;
   oBoard = 0;
   //paintBoard();
}






//********************************************************************************************************