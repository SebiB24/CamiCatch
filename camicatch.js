let board;
let context;
const boardWidth = 400;
const boardHeight = 650;

// Player setup
const playerWidth = 100;
const playerHeight = 100;
let player = {
    x: boardWidth / 2 - playerWidth / 2,
    y: boardHeight - playerHeight - 15,
    width: playerWidth,
    height: playerHeight,
    image: null
};

let itemArray = [];
const itemWidth = 70;
const itemHeight = 70;
let baseItemSpeed = 5.5;
const itemSpeedIncrease = 0.1;

// Visual effects
let particles = [];
let stars = [];
let backgroundGradient;
let scoreGlow = 0;

// Game state flags and values
let score = 0;
let level = 1;
let gameOver = false;
let itemSpawnRate = 800;
let itemSpawnTimerId;

// Input tracking
let keys = {};
let touchStartX = 0;
let playerStartX = 0;

// Image pre-loading
let loadedGood = [];
let loadedBad = [];
let playerImage = new Image();

function initializeImages() {
    const goodFiles = ["blackcat.png", "lizard.png", "lotus.png"];
    const badFiles = ["vodka.png", "beer.png", "spider.png"];

    goodFiles.forEach(file => {
        let img = new Image();
        img.src = `./resources/${file}`;
        loadedGood.push(img);
    });

    badFiles.forEach(file => {
        let img = new Image();
        img.src = `./resources/${file}`;
        loadedBad.push(img);
    });

    playerImage.src = "./resources/cami.png";
    player.image = playerImage;
}

window.onload = function () {
    board = document.getElementById("board");
    board.width = boardWidth;
    board.height = boardHeight;
    context = board.getContext("2d");

    initializeImages();

    // Set up the background
    backgroundGradient = context.createLinearGradient(0, 0, 0, boardHeight);
    backgroundGradient.addColorStop(0, '#87ceeb');
    backgroundGradient.addColorStop(0.5, '#d899e5');
    backgroundGradient.addColorStop(1, '#d899e5');

    // Create the star field
    for (let i = 0; i < 20; i++) {
        stars.push({
            x: Math.random() * boardWidth,
            y: Math.random() * boardHeight,
            size: Math.random() * 2 + 1,
            alpha: Math.random() * 0.5 + 0.3,
            twinkle: Math.random() * 0.02 + 0.01
        });
    }

    // Set up event listeners for input
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("keyup", handleKeyUp);
    
    // Touch events for mobile
    board.addEventListener("touchstart", handleTouchStart, { passive: false });
    board.addEventListener("touchmove", handleTouchMove, { passive: false });
    
    // Add tap-to-restart listener for mobile
    board.addEventListener("touchend", handleTapToRestart, { passive: false });
    
    // Mobile control buttons
    document.getElementById("leftBtn").addEventListener("touchstart", () => keys['ArrowLeft'] = true);
    document.getElementById("leftBtn").addEventListener("touchend", () => keys['ArrowLeft'] = false);
    document.getElementById("rightBtn").addEventListener("touchstart", () => keys['ArrowRight'] = true);
    document.getElementById("rightBtn").addEventListener("touchend", () => keys['ArrowRight'] = false);
    
    // Restart button
    document.getElementById("restartBtn").addEventListener("click", restartGame);
    document.getElementById("restartBtn").addEventListener("touchstart", restartGame);

    // Start the game loop and item spawning
    requestAnimationFrame(gameLoop);
    startItemSpawn();
    
    // Check if mobile device and adjust UI
    if (/Mobi|Android/i.test(navigator.userAgent)) {
        document.getElementById("mobileControls").style.display = "flex";
        document.getElementById("instructions").innerHTML = "Tap buttons to move • Catch good items, avoid bad ones!";
    }
};

function gameLoop() {
    // This function will run on every frame
    requestAnimationFrame(gameLoop);

    // Clear and draw the background
    drawBackground();
    if (gameOver) {
        drawGameOver();
        document.getElementById("restartBtn").style.display = "block";
        return;
    } else {
        document.getElementById("restartBtn").style.display = "none";
    }

    // Update and draw game elements
    updatePlayerMovement();
    updateItems();
    updateParticles();
    updateStars();

    drawPlayer();
    drawStars();
    drawUI();
}

function updatePlayerMovement() {
    if (keys['ArrowLeft'] || keys['KeyA']) {
        player.x -= 4;
    }
    if (keys['ArrowRight'] || keys['KeyD']) {
        player.x += 4;
    }
    // Clamp player position within board boundaries
    player.x = Math.max(0, Math.min(player.x, boardWidth - player.width));
}

function updateItems() {
    const currentItemSpeed = baseItemSpeed + (score * itemSpeedIncrease);

    for (let i = itemArray.length - 1; i >= 0; i--) {
        let item = itemArray[i];
        item.y += currentItemSpeed + Math.sin(item.y * 0.01) * 0.5;
        item.rotation += 0.02;

        // Check for collision with player
        if (detectCollision(player, item)) {
            if (item.good) {
                handleGoodItem(item);
            } else {
                handleBadItem(item);
            }
            itemArray.splice(i, 1);
        } else if (item.y > boardHeight) {
            // Remove item if it goes off-screen
            itemArray.splice(i, 1);
        }

        // Draw the item
        drawItem(item);
    }
}

function startItemSpawn() {
    // This is a single, continuous loop that gets re-triggered
    // only when the game is not over.
    if (gameOver) return;

    spawnSingleItem();
    
    // Calculate dynamic spawn rate based on score
    // Items spawn faster as score increases, with a minimum of 300ms
    const dynamicSpawnRate = Math.max(300, itemSpawnRate - (score * 5));
    
    itemSpawnTimerId = setTimeout(startItemSpawn, dynamicSpawnRate);
}

function spawnSingleItem() {
    const randX = Math.random() * (boardWidth - itemWidth);
    const isGood = Math.random() > 0.25;

    const imageArray = isGood ? loadedGood : loadedBad;
    if (imageArray.length === 0) return;

    const selectedImage = imageArray[Math.floor(Math.random() * imageArray.length)];

    const newItem = {
        image: selectedImage,
        x: randX,
        y: -itemHeight,
        width: itemWidth,
        height: itemHeight,
        good: isGood,
        rotation: 0
    };

    itemArray.push(newItem);
}

function handleGoodItem(item) {
    score++;
    scoreGlow = 10;
    createParticles(item.x + item.width / 2, item.y + item.height / 2, '#00ff00', 8);

    if (score % 10 === 0) {
        level++;
        // Decrease spawn rate more aggressively as levels increase
        itemSpawnRate = Math.max(300, itemSpawnRate - 150);
    }
}

function handleBadItem(item) {
    gameOver = true;
    clearTimeout(itemSpawnTimerId);
    createParticles(item.x + item.width / 2, item.y + item.height / 2, '#ff0000', 15);
}

function restartGame() {
    score = 0;
    level = 1;
    gameOver = false;
    itemArray = [];
    particles = [];
    player.x = boardWidth / 2 - playerWidth / 2;
    itemSpawnRate = 800; // Reset to faster initial spawn rate
    scoreGlow = 0;
    startItemSpawn();
}

function drawBackground() {
    context.fillStyle = backgroundGradient;
    context.fillRect(0, 0, boardWidth, boardHeight);
    drawStars();
}

function drawPlayer() {
    if (player.image) {
        context.save();
        context.shadowColor = "#ffff00";
        context.shadowBlur = 15;
        context.drawImage(player.image, player.x, player.y, player.width, player.height);
        context.restore();
    }
}

function drawItem(item) {
    context.save();
    context.translate(item.x + item.width / 2, item.y + item.height / 2);
    context.rotate(item.rotation);
    context.drawImage(item.image, -item.width / 2, -item.height / 2, item.width, item.height);
    context.restore();
}

function drawUI() {
    context.save();
    if (scoreGlow > 0) {
        context.shadowColor = '#ffff00';
        context.shadowBlur = scoreGlow;
        scoreGlow--;
    }
    context.fillStyle = '#ffffff';
    context.strokeStyle = '#000000';
    context.lineWidth = 2;
    context.font = 'bold 28px Arial';
    context.strokeText(`Score: ${score}`, 15, 40);
    context.fillText(`Score: ${score}`, 15, 40);

    context.font = 'bold 20px Arial';
    context.strokeText(`Level: ${level}`, boardWidth - 100, 35);
    context.fillText(`Level: ${level}`, boardWidth - 100, 35);
    context.restore();
}

function drawGameOver() {
    context.fillStyle = 'rgba(0,0,0,0.7)';
    context.fillRect(0, 0, boardWidth, boardHeight);

    context.save();
    context.shadowColor = '#ff0000';
    context.shadowBlur = 20;
    context.fillStyle = '#ffffff';
    context.font = 'bold 36px Arial';
    context.textAlign = 'center';
    context.fillText('GAME OVER', boardWidth / 2, boardHeight / 2 - 40);

    context.font = 'bold 24px Arial';
    context.fillText(`Final Score: ${score}`, boardWidth / 2, boardHeight / 2);

    context.font = '18px Arial';
    context.fillText('Tap anywhere to restart', boardWidth / 2, boardHeight / 2 + 60);
    context.restore();
}

function updateStars() {
    for (let star of stars) {
        star.alpha += star.twinkle;
        if (star.alpha > 0.8 || star.alpha < 0.1) star.twinkle *= -1;
    }
}

function drawStars() {
    for (let star of stars) {
        context.save();
        context.globalAlpha = star.alpha;
        context.fillStyle = '#fff';
        context.beginPath();
        context.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        context.fill();
        context.restore();
    }
}

function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        let p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.1;
        p.alpha -= 0.02;
        p.size *= 0.98;

        context.save();
        context.globalAlpha = p.alpha;
        context.fillStyle = p.color;
        context.beginPath();
        context.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        context.fill();
        context.restore();

        if (p.alpha <= 0) particles.splice(i, 1);
    }
}

function createParticles(x, y, color, count) {
    for (let i = 0; i < count; i++) {
        particles.push({
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * 8,
            vy: (Math.random() - 0.5) * 8 - 2,
            color: color,
            alpha: 1,
            size: Math.random() * 4 + 2
        });
    }
}

function handleKeyDown(e) {
    keys[e.code] = true;
    if (gameOver && (e.code === "Space" || e.code === "Enter")) {
        restartGame();
    }
}

function handleKeyUp(e) {
    keys[e.code] = false;
}

function handleTouchStart(e) {
    e.preventDefault();
    if (e.touches.length === 1) {
        touchStartX = e.touches[0].clientX;
        playerStartX = player.x;
    }
}

function handleTouchMove(e) {
    e.preventDefault();
    if (e.touches.length === 1) {
        const touchX = e.touches[0].clientX;
        const diffX = touchX - touchStartX;
        player.x = Math.max(0, Math.min(playerStartX + diffX, boardWidth - player.width));
    }
}

// NEW FUNCTION: Handle tap to restart on mobile
function handleTapToRestart(e) {
    e.preventDefault();
    if (gameOver) {
        restartGame();
    }
}

function detectCollision(a, b) {
    return a.x < b.x + b.width &&
        a.x + a.width > b.x &&
        a.y < b.y + b.height &&
        a.y + a.height > b.y;
}