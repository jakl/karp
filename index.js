/**
 * Karp Server.
 *
 * @author James Koval & Friends <https://github.com/jakl/karp>
 * @license MIT?
 * @version 2
 *
 * :shipit:
 */

"use strict";

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


const express = require('express')
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);

const names = {}

app.set('port', (process.env.PORT || 5000));

app.use(express.static(__dirname + '/'));

app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});

io.on('connection', function(socket){
  names[socket.id] = 'unnamed'

  console.log(`user ${socket.id} connected`);
  players[socket.id] = random_player_fish(socket.id)
  keyboards[socket.id] = empty_keyboard()

  socket.emit('config', config)

  socket.on('disconnect', function(){
    delete players[socket.id]
    delete keyboards[socket.id]

    console.log(`user ${socket.id} disconnected`);
  });

  socket.on('name', name => {
    console.log(`user ${socket.id} is now know as: '${name}'`)
    names[socket.id] = name;
  })

  socket.on('keyboard', function(client_keyboard){
    keyboards[socket.id] = client_keyboard
  });

  socket.on('reset', function(){
    if(!game_over) return; // only allow on game over.
    reset()
  });
});

http.listen(app.get('port'), function(){
  console.log(`listening on ${app.get('port')}`);
});




//================================
// Declare all game constiables (imaginary buckets that hold game information/values)
// Note:
// [] means an array (an auto-numbered list of values, index starts at 0)
// {} means an object (a named list of values, also known as a hash or map)
//================================

const config = require("./config.json")

let game_over   = false // If this is set to true, the game over screen is displayed
let game_over_auto_reset = null
let winner      = null

let ai_quantity = config.start_with
let fishes = []
const players = {}

/**
 * Return all the fishes on the server?
 * @return {Array} Array of fishes.
 */
const all_fishes = () => {
	return fishes.concat(Object.values(players))
}

// === constiables for the keyboard keys that we track for player movement ===
const keyboards = {}

/**
 * Reset the player to a new location.
 * @param   {String} id Player id.
 * @returns {Object}    Player Object.
 */
const reset_player = id => {
  players[id] = random_player_fish(id)
	return players[id]
}


//================================
// Reset all the fish back to start
//================================

const reset = () => {
  fishes = []
  Object.keys(players).forEach(reset_player)
  game_over = false
  ai_quantity = config.start_with

  clearTimeout(game_over_auto_reset)
  game_over_auto_reset = null

  io.emit('game_over', {
    game_over: false,
    winner: false
  })
}
reset()





//================================
// Code for moving each fish individually
//================================

const move_fish = fish => {
  // === move the fish position by an amount that is its speed ===
  fish.x += fish.dx
  fish.y += fish.dy

  if(fish.id) fish.name = names[fish.id]

  if(!fish.name) {
    const names = ['glub...', '*splash*', '???']
    fish.name = names[Math.floor(Math.random() * names.length)];
  }

  const fish_alive = Date.now() - fish.created_at;
  if(fish.type === 'gold' && fish_alive > config.special_fish_timeout) {
    let original_fish = fish;
    fish = random_ai_fish()

    fish.r = original_fish.r
    fish.x = original_fish.x
    fish.y = original_fish.y
  }

  if(fish.type === 'negative' && fish_alive > config.special_fish_timeout) {
    fish = random_ai_fish();
  }


  /* === if the fish goes off an edge, wrap it around === */
  if (fish.x > config.x_scale) {
    fish.x = 0
  }
  if (fish.x < 0) {
    fish.x = config.x_scale
  }
  if (fish.y > config.y_scale) {
    fish.y = 0
  }
  if (fish.y < 0) {
    fish.y = config.y_scale
  }

}

//================================
// Set the speeds for fishes controlled by players, based on keys pressed
//================================

const move_with_keyboard = id => {
  if (!keyboards[id] || !players[id]) { return }

  // === keyboard controls for players ===
  if (keyboards[id].left) {
    players[id].dx = -config.player_speed
  } else if (keyboards[id].right) {
    players[id].dx = config.player_speed
  } else {
    players[id].dx = 0
  }

  if (keyboards[id].up) {
    players[id].dy = -config.player_speed
  } else if (keyboards[id].down) {
    players[id].dy = config.player_speed
  } else {
    players[id].dy = 0
  }
}

//================================
// Code to add AI fish to the pond if there are too few
//================================

const add_ai_fish = () => {
  if(fishes.length > config.max_ai_fish) return; // max

  if (fishes.length < ai_quantity){
    fishes.push(random_ai_fish())
  }
}
// Every 10s add an AI fish
setInterval(() => { ai_quantity++ }, config.ai_reproduction_rate)

//================================
// Generate a randomized fish javascript object
//================================
const random_ai_fish = () => {
  let type = 'positive'
  let color = 'blue';

  // decide which type this fish is
  let negFishChance  = Math.floor(Math.random() * (config.negChance - 0));
  let goldFishChance = Math.floor(Math.random() * (config.goldChance - 0));

  // make a neg?
  if(negFishChance === config.negChance-1) {
    type  = 'negative'
    color = 'green'
  }

  // game winner.
  if(goldFishChance === config.goldChance - 1) {
    type  = 'gold'
    color = 'gold'
  }

  return {
    x: Math.random() * config.x_scale,
    y: Math.random() * config.y_scale,

    dx: Math.random() * config.ai_speed * 2 - config.ai_speed,
    dy: Math.random() * config.ai_speed * 2 - config.ai_speed,

    r: Math.random() * config.max_ai_size + 1,

    type: type,
    created_at: Date.now(),

    color: color,
  }
}

//================================
// Generate a randomized player fish javascript object
//================================
const random_player_fish = id => {
  return {
    id: id,
    x: Math.random() * config.x_scale,
    y: Math.random() * config.y_scale,
    dx: 0,
    dy: 0,
    type: 'player',
    r: config.player_start_size,
    color: "#FF0000",
  }
}


const empty_keyboard = () => {
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
const bump_fish = () => {
  all_fishes().forEach(function(fish, fish_index){
    all_fishes().forEach(function(another_fish, another_fish_index){
      if (another_fish_index == fish_index) { // don't check the same fish against itself
        return
      }

      // Distance formula: √[(x1-x2)²+(y1-y2)²]
      const distance = Math.sqrt(  Math.pow(fish.x - another_fish.x, 2) + Math.pow(fish.y - another_fish.y, 2)  )

      // if the fish are closer than their radiuses, then they are touching
      if (distance < fish.r + another_fish.r) {

        // avoid any issues.
        fish.index         = fish_index;
        another_fish.index = another_fish_index

        /**
         * Find a fish by type.
         *
         * @param  {String} type     Type name.
         * @param  {Object:Fish} one_fish Fish to check.
         * @param  {Object:Fish} two_fish Fish to check.
         * @return {Object}          Matching fish or undefined.
         */
        const find_fish = (type, one_fish, two_fish) => {
          return (one_fish.type === type) ? one_fish :
                 (two_fish.type === type) ? two_fish : undefined
        }

        const negative_fish = find_fish('negative', fish, another_fish)
        const player_fish   = find_fish('player', fish, another_fish)
        const positive_fish = find_fish('positive', fish, another_fish)
        const gold_fish     = find_fish('gold', fish, another_fish)

        // negative fish
        if((player_fish || positive_fish) && negative_fish) {
          const subject_fish = player_fish !== undefined ? player_fish : positive_fish

          subject_fish.r = subject_fish.r / config.neg_reduction
          fishes.splice(negative_fish.index, 1, random_ai_fish())

          return;
        }

        // gold fish
        if(player_fish && gold_fish) {
          player_fish.r = config.x_scale
          return;
        }

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
const eat_fish = (small_fish_index, big_fish_index) => {
  const big_fish = all_fishes()[big_fish_index]
  const small_fish = all_fishes()[small_fish_index]

  // expand big fish to be BIGGER.
  big_fish.r += small_fish.r / big_fish.r

  if (small_fish.id) { // This is a player
    reset_player(small_fish.id)
  } else {
    fishes.splice(small_fish_index, 1, random_ai_fish())
  }

  if (big_fish.r > config.x_scale) {
    if(big_fish.id) {
      winner = names[big_fish.id];
    } else {
      winner = 'AI'
    }

    end_game(winner)
  }
}

const end_game = (winner) => {
  game_over = true

  io.emit('game_over', {
    game_over: game_over,
    winner: winner
  })
  io.emit('fishes', [])

  game_over_auto_reset = setTimeout(() => {
    reset();
  }, config.restart_game_timer)
}

//================================
// Code that will periodically send game information out to any browsers connected
//================================
const update_clients = () => {
  io.emit('fishes', all_fishes().concat(Object.values(players)))
}

//================================
// This is the code that runs over and over again to keep the game moving
//================================
const heartbeat = () => {
  if(game_over) {
    return;
  }

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
const debug = () => {
  console.log("fishes:", fishes, "players:", players,
   "keyboards:", keyboards, "game_over:", game_over)
}

if(process.env.DEBUG) setInterval(debug, 5000)/* Uncomment this line of code to see debug info */
