// Pollyfil object.values because heroku is running old node.js
var reduce = Function.bind.call(Function.call, Array.prototype.reduce);
var isEnumerable = Function.bind.call(Function.call, Object.prototype.propertyIsEnumerable);
var concat = Function.bind.call(Function.call, Array.prototype.concat);
var keys = Reflect.ownKeys;

if (!Object.values) {
	Object.values = function values(O) {
		return reduce(keys(O), (v, k) => concat(v, typeof k === 'string' && isEnumerable(O, k) ? [O[k]] : []), []);
	};
}

// Pollyfill object.keys just in case
if (!Object.keys) Object.keys = function(o) {
  if (o !== Object(o))
    throw new TypeError('Object.keys called on a non-object');
  var k=[],p;
  for (p in o) if (Object.prototype.hasOwnProperty.call(o,p)) k.push(p);
  return k;
}





var express = require('express')
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

app.set('port', (process.env.PORT || 5000));

app.use(express.static(__dirname + '/'));

app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});

io.on('connection', function(socket){
  console.log(`user ${socket.id} connected`);
  players[socket.id] = random_player_fish(socket.id)
  keyboards[socket.id] = empty_keyboard()

  socket.on('disconnect', function(){
    delete players[socket.id]
    delete keyboards[socket.id]
    console.log(`user ${socket.id} disconnected`);
  });
  
  socket.on('keyboard', function(client_keyboard){
    keyboards[socket.id] = client_keyboard
  });
  
  socket.on('reset', function(){
    reset() 
  });
});

http.listen(app.get('port'), function(){
  console.log(`listening on ${app.get('port')}`);
});




//================================
// Declare all game variables (imaginary buckets that hold game information/values)
// Note:
// [] means an array (an auto-numbered list of values, index starts at 0)
// {} means an object (a named list of values, also known as a hash or map)
//================================

game_over = false // If this is set to true, the game over screen is displayed

fishes = []
players = {}
all_fishes = function() { return fishes.concat(Object.values(players)) }

// Start out with 5 AI fish and grow this slowly over time
ai_quantity = 5



// === variables for the keyboard keys that we track for player movement ===

keyboards = {}



reset_player = function(id) {
  players[id] = random_player_fish(id)
}


//================================
// Reset all the fish back to start
//================================

reset = function() {
  fishes = []
  Object.keys(players).forEach(reset_player)
  game_over = false
  ai_quantity = 5
}
reset()





//================================
// Code for moving each fish individually
//================================

move_fish = function(fish) {

  // === move the fish position by an amount that is its speed ===
  fish.x += fish.dx
  fish.y += fish.dy


  /* === if the fish goes off an edge, wrap it around === */
  if (fish.x > 100) {
    fish.x = 0
  }
  if (fish.x < 0) {
    fish.x = 100
  }
  if (fish.y > 100) {
    fish.y = 0
  }
  if (fish.y < 0) {
    fish.y = 100
  }

}




//================================
// Set the speeds for fishes controlled by players, based on keys pressed
//================================

move_with_keyboard = function(id) {
  if (!keyboards[id] || !players[id]) { return }

  // === keyboard controls for players ===
  if (keyboards[id].left) {
    players[id].dx = -1
  } else if (keyboards[id].right) {
    players[id].dx = 1
  } else {
    players[id].dx = 0
  }

  if (keyboards[id].up) {
    players[id].dy = -1
  } else if (keyboards[id].down) {
    players[id].dy = 1
  } else {
    players[id].dy = 0
  }
}




//================================
// Code to add AI fish to the pond if there are too few
//================================

add_ai_fish = function() {

  if (fishes.length < ai_quantity){

    fishes.push(random_ai_fish())

  }
}
// Every 10s add an AI fish
setInterval(function() { ai_quantity++ }, 10000)




//================================
// Generate a randomized fish javascript object
//================================

random_ai_fish = function(){
  return {
    x: Math.random() * 100,
    y: Math.random() * 100,

    dx: Math.random() * 1 - .5,
    dy: Math.random() * 1 - .5,

    r: Math.random() * 5,

    color: '#0000FF',
  }
}

//================================
// Generate a randomized player fish javascript object
//================================

random_player_fish = function(id){
  return {
    id: id,
    x: Math.random() * 100,
    y: Math.random() * 100,
    dx: 0,
    dy: 0,
    r: 3,
    color: "#FF0000",
  }
}


empty_keyboard = function(){
  return {
    up: false,
    down: false,
    left: false,
    right: false,
  }
}



//================================
// Code to check if any fish bumps into any other fish
//================================

bump_fish = function() {
  all_fishes().forEach(function(fish, fish_index){
    all_fishes().forEach(function(another_fish, another_fish_index){
      if (another_fish_index == fish_index) { // don't check the same fish against itself
        return
      }


      // Distance formula: √[(x1-x2)²+(y1-y2)²]
      distance = Math.sqrt(  Math.pow(fish.x - another_fish.x, 2) + Math.pow(fish.y - another_fish.y, 2)  )

      // if the fish are closer than their radiuses, then they are touching
      if (distance < fish.r + another_fish.r) {

        // check which fish is bigger - the bigger one eats the little one
        if (fish.r > another_fish.r) {
          eat_fish(another_fish_index, fish_index)
        } else {
          eat_fish(fish_index, another_fish_index)
        }
      }
    })
  })
}







//================================
// Code for when fish touch, the smaller fish is eaten, the bigger fish grows larger
//================================

eat_fish = function(small_fish_index, big_fish_index){
  big_fish = all_fishes()[big_fish_index]
  small_fish = all_fishes()[small_fish_index]

  big_fish.r += small_fish.r / big_fish.r

  if (small_fish.id) { // This is a player
    reset_player(small_fish.id)
  } else {
    fishes.splice(small_fish_index, 1, random_ai_fish())
  }

  if (big_fish.r > 100) {
    game_over = true
  }
}







//================================
// Code that will periodically send game information out to any browsers connected
//================================

update_clients = function() {
  io.emit('fishes', all_fishes().concat(Object.values(players)))
  io.emit('game_over', game_over)
}





//================================
// This is the code that runs over and over again to keep the game moving
//================================

heartbeat = function() {
  Object.keys(players).forEach(move_with_keyboard)
  all_fishes().forEach(move_fish)
  add_ai_fish()
  bump_fish()
  update_clients()
};




//================================
// This starts the infinite looping heartbeat of the game logic, every 60 milliseconds
//================================
setInterval(heartbeat, 60)



/* This debug function can display game information in the console */
debug = function() {
  console.log(fishes, players, keyboards)
}

//window.setInterval(debug, 2000)/* Uncomment this line of code to see debug info */
