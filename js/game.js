//================================
// Declare all game variables (imaginary buckets that hold game information/values)
// Note:
// [] means an array (an auto-numbered list of values, index starts at 0)
// {} means an object (a named list of values, also known as a hash or map)
//================================

// Networking
var socket = io();

// === variables for drawing the game on the screen ===
canvas = document.getElementById("pong_canvas") // This is the <canvas> in the HTML
canvas.width = 700 // The game is this many pixels wide
canvas.height = 600 // The game is this many pixels tall
sheet = canvas.getContext("2d") // This is a leaf of the canvas for 2d drawings (usually called ctx in documentation online)

fish_pic = new Image()
fish_pic.src = 'assets/karp.png'

fish_pic_100 = new Image()
fish_pic_100.src = 'assets/karpx100.png'

fish_pic_big = new Image()
fish_pic_big.src = 'assets/bigkarp.png'


// === variables for tracking objects and state of the game ===

socket.on('new_user', function(user){
  console.log(user)
})

fishes = []
socket.on('fishes', function(server_fishes){
   fishes = server_fishes
});


game_over = false
winner    = null
socket.on('game_over', function(status) {
   game_over = status.game_over
   winner    = status.winner
});


// === variables for the keyboard keys that we track for player movement ===

keyboard = {
  up: false,
  down: false,
  left: false,
  right: false,
}

// emit our name.
socket.emit('name', $('#username').val())



//================================
// Code that runs when keyboard keys are pressed
//================================

window.onkeydown = function(key) {
  if (key.keyCode == 39) {keyboard.right=true}
  if (key.keyCode == 37) {keyboard.left=true}
  if (key.keyCode == 38) {keyboard.up=true}
  if (key.keyCode == 40) {keyboard.down=true}
}

function handleOrientation(event) {
  if(!event.beta || !event.gamma) return;
  var x = Math.floor(event.beta);  // In degree in the range [-180,180]
  var y = Math.floor(event.gamma); // In degree in the range [-90,90]

  // Because we don't want to have the device upside down
  // We constrain the x value to the range [-90,90]
  if (x >  90) { x =  90};
  if (x < -90) { x = -90};

  // To make computation easier we shift the range of
  // x and y to [0,180]
  x += 90;
  y += 90;

  keyboard.right = false;
  keyboard.left  = false;
  keyboard.up    = false;
  keyboard.down  = false;

  // 10 is half the size of the ball
  // It center the positioning point to the center of the ball
  if(y > 100) {
    keyboard.right   = true;
    keyboard.left    = false;
  }

  if(y < 90) {
    keyboard.right   = false;
    keyboard.left    = true;
  }

  if(x < 130) {
    keyboard.up      = true;
    keyboard.down    = false;
  }

  if(x > 110) {
    keyboard.down    = true;
    keyboard.up      = false;
  }

  if(x > 111 && x < 129) {
    keyboard.down = false;
    keyboard.up  = false;
  }
}

window.addEventListener('deviceorientation', handleOrientation);

window.onkeyup = function (key) {
  if (key.keyCode == 39) {keyboard.right=false}
  if (key.keyCode == 37) {keyboard.left=false}
  if (key.keyCode == 38) {keyboard.up=false}
  if (key.keyCode == 40) {keyboard.down=false}
}

//================================
// Code for when the mouse is clicked to restart the game
//================================
canvas.onmousedown = function() {
  if(!game_over) return; // only allow on game over.
  socket.emit('reset')
}


//================================
// Code for drawing each fish
//================================
paint_fish = function(){
  fishes.forEach(function(fish){
    fish.sx = fish.x/100 * 600
    fish.sy = fish.y/100 * 600
    fish.sr = fish.r/100 * 600

    sheet.beginPath()
    sheet.fillStyle = '#7f8c8d'
    if(fish.id === socket.id) {
      sheet.fillStyle = 'red'
      sheet.fontStyle = '14px'
    }

    sheet.fillText(fish.name, fish.sx - 25, fish.sy + fish.sr + 10)

    sheet.beginPath()
    sheet.arc(fish.sx, fish.sy, fish.sr, 0, 2 * Math.PI, false)
    if(fish.id != socket.id && fish.type === 'player') fish.color = 'black'
    sheet.fillStyle = fish.color
    sheet.fill()

    var fishImage = fish_pic
    if(fish.r < 10) fishImage = fish_pic_100;
    if(fish.r > 16) fishImage = fish_pic_big;

    sheet.drawImage(fishImage, fish.sx - fish.sr, fish.sy - fish.sr, fish.sr * 2, fish.sr * 2)

  })
}

//================================
// Code for drawing the game
//================================
paint = function() {
  // Draw the background of the game as a solid black rectangle the size of the canvas
  sheet.fillStyle = '#000066'
  sheet.fillRect(0, 0, canvas.width, canvas.height)

  // call the function to draw each fish
  paint_fish()

  if (game_over) {
    sheet.fillStyle = '#000066'
    sheet.fillRect(0, 0, canvas.width, canvas.height)
    sheet.fillStyle = '#ff1111'
    sheet.font = "18px sans";
    sheet.fillText("A huge fish, "+winner+", ate all life in the pond, permanently destroying the ecosystem.", 10, canvas.height / 2);
    sheet.fillText("(Click to restart)", canvas.width / 2 - 70, canvas.height / 2 + 30);
  }


  /* requestAnimationFrame runs on every screen refresh, about 60 times each second */
  window.requestAnimationFrame(paint)
}
paint() // Call paint once to kick off the infinite loop of animations



//================================
// This is the code that runs over and over again to keep the game moving
//================================

heartbeat = function() {
  socket.emit('keyboard', keyboard)
};

//================================
// This starts the infinite looping heartbeat of the game logic, every 60 milliseconds
//================================
window.setInterval(heartbeat, 60)

/* This debug function can display game information in the console */
debug = function() {
  console.log(fishes, keyboard, fishes.length)
}

window.setInterval(debug, 2000)/* Uncomment this line of code to see debug info */
