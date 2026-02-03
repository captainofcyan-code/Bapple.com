let player, apples = [], score = 0, timer = 30, gameState = "PLAY"; 
let cartWidth = 160, spawnRate = 40, roundCount = 0; // Doubled width
let floatingTexts = [];
let isPaused = false;

let stats = { red: 0, green: 0, gold: 0, rainbow: 0, rotten: 0, secret: 0 };
let lifetimeRainbows = 0, lifetimeSecret = 0; 

let priceMult = 1.0, secretWorth = 10;
let hasShield = false, shieldActive = false, magnetActive = false; 
let probs = { rainbow: 0.03, gold: 0.06, rotten: 0.01, green: 0.30 }; 

function setup() {
    createCanvas(1200, 800); // DOUBLED SIZE
    player = createVector(width / 2, height - 100); // Adjusted for scale
}

function windowResized() {
    if (fullscreen()) resizeCanvas(windowWidth, windowHeight);
    else resizeCanvas(1200, 800);
    player.y = height - 100;
}

function draw() {
    if (gameState === "PLAY") {
        if (!isPaused) updateGame();
        renderGame();
        if (isPaused) drawPauseOverlay();
    } else {
        showShop();
    }
}

function updateGame() {
    if (lifetimeSecret > 0) secretWorth += random(0.01, 0.05);
    if (frameCount % 60 == 0 && timer > 0) timer--;
    if (timer <= 0) endRound();

    player.x = lerp(player.x, mouseX, 0.2);
    player.x = constrain(player.x, cartWidth / 2, width - cartWidth / 2);

    if (spawnRate > 0 && frameCount % spawnRate == 0) {
        let r = random(1), type = "red";
        if (r < probs.rainbow) type = "rainbow";
        else if (r < probs.rainbow + probs.gold) type = "gold";
        else if (r < probs.rainbow + probs.gold + probs.rotten) type = "rotten";
        else if (r < probs.rainbow + probs.gold + probs.rotten + probs.green) type = "green";
        
        // Scaled size and speed
        let sMult = (type === "rotten") ? random(5, 8) : random(2, 4); 
        let fallSpd = (type === "rotten") ? random(1.5, 3) : random(6, 12);
        apples.push({ x: random(100, width - 100), y: 160, type: type, size: sMult, speed: fallSpd });
    }

    for (let i = apples.length - 1; i >= 0; i--) {
        let a = apples[i]; 
        if (magnetActive && a.type !== "rotten") {
            let angle = atan2(player.y - a.y, player.x - a.x);
            a.x += cos(angle) * 8; // Doubled pull
        }
        a.y += a.speed;
        // Scaled collision box
        if (a.y > player.y && a.y < player.y + 60 && a.x > player.x - cartWidth/2 && a.x < player.x + cartWidth/2) {
            handleCatch(a); apples.splice(i, 1);
        } else if (a.y > height) { apples.splice(i, 1); }
    }
    updatePopups();
}

function renderGame() {
    background(135, 206, 235); drawTree();
    if (shieldActive) { 
        noFill(); stroke(0, 200, 255, 150); strokeWeight(8); 
        arc(player.x, player.y + 20, cartWidth + 40, 120, PI, TWO_PI); 
    }
    drawCart(player.x, player.y);
    for (let a of apples) drawApple(a);
    drawPopups(); drawHUD();
}

function showShop() {
    background(30); fill(255); textAlign(CENTER); 
    textSize(48); text("BAPPLE SHOP", width/2, 80); // Doubled Text
    fill(255, 215, 0); text("Budget: $" + score + " | 🌈: " + lifetimeRainbows, width/2, 140);

    fill(200, 255, 200); textSize(28);
    text(" [1] Cook Sauce ($20) | [3] Cook Recipe ($100)", width/2, 220);

    if (lifetimeSecret > 0) {
        fill(0, 100, 255);
        text("[X] SELL SECRET BLUE: $" + floor(secretWorth), width/2, 300);
    }

    fill(255); textSize(24);
    text("[B] Bigger Cart ($25) | [T] Better Tree ($150)", width/2, 400);
    text("[P] Better Prices ($80) | [S] Shield ($100)", width/2, 450);
    
    if (lifetimeSecret >= 5 && !magnetActive) {
        fill(255, 255, 0); text("[M] CRAFT MAGNET CART (5💙)", width/2, 520);
    }

    fill(100, 255, 100); textSize(40); 
    text("Press 'R' to Start Next Round", width/2, 700);
}

function handleCatch(a) {
    let gain = 0, col = color(0, 255, 0), txt = "";
    if (a.type === "rainbow") { stats.rainbow++; lifetimeRainbows++; txt = "RAINBOW!"; }
    else if (a.type === "rotten") {
        if (shieldActive) { shieldActive = false; hasShield = false; col = color(0, 200, 255); txt = "SHIELDED!"; }
        else { gain = -10 * (a.size/2); lifetimeRainbows = max(0, lifetimeRainbows - 1); col = color(255, 0, 0); txt = "-$" + abs(gain.toFixed(2)) + " & -1🌈"; }
    } else {
        let b = (a.type === "gold" ? 5 : (a.type === "green" ? 2 : 1));
        gain = (b * (a.size/2)) * priceMult; txt = "+$" + gain.toFixed(2);
        if (a.type === "gold") stats.gold++; else if (a.type === "green") stats.green++; else stats.red++;
    }
    score += gain; floatingTexts.push({ x: a.x, y: player.y - 40, val: txt, col: col, life: 255 });
}

function drawApple(a) {
    let d = 20 * a.size; // Size is already scaled in spawn
    if (a.type === "rainbow") { colorMode(HSB); fill(frameCount % 360, 80, 100); noStroke(); ellipse(a.x, a.y, d + 10, d + 10); colorMode(RGB); }
    else if (a.type === "rotten") { fill(60, 40, 20); stroke(100, 80, 0); strokeWeight(6); ellipse(a.x, a.y, d, d); noStroke(); }
    else if (a.type === "green") { fill(0, 192, 0); noStroke(); ellipse(a.x, a.y, d, d); }
    else if (a.type === "gold") { fill(255, 215, 0); noStroke(); ellipse(a.x, a.y, d, d); }
    else { fill(220, 20, 60); noStroke(); ellipse(a.x, a.y, d, d); }
}

function drawHUD() {
    fill(0); textSize(28); textAlign(LEFT); text("$" + nf(score, 1, 2) + " | Rnd: " + roundCount, 40, height - 40);
    textAlign(RIGHT); text("🍎:" + stats.red + " 🍏:" + stats.green + " 🟡:" + stats.gold + " 🌈:" + lifetimeRainbows + " 💙:" + lifetimeSecret, width - 40, height - 40);
    fill(255, 0, 0, 100); rect(0, height - 10, map(timer, 0, 30, 0, width), 10);
}

function drawTree() { 
    fill(101, 67, 33); rect(width/2 - 40, 120, 80, height); 
    fill(34, 139, 34); 
    ellipse(width/2, 120, 600, 300); 
    ellipse(width/2-200, 160, 400, 240); 
    ellipse(width/2+200, 160, 400, 240); 
}

function drawCart(x, y) { 
    push(); translate(x, y); 
    fill(magnetActive ? "silver" : 150, 75, 0); rect(-cartWidth/2, 0, cartWidth, 60, 4); 
    fill(40); ellipse(-cartWidth/3, 60, 30, 30); ellipse(cartWidth/3, 60, 30, 30); 
    pop(); 
}

function keyPressed() {
    if (key === ' ') { if (gameState === "PLAY") isPaused = !isPaused; }
    if (key.toLowerCase() === 'f') fullscreen(!fullscreen());
    if (gameState === "SHOP") {
        if (key === '1' && lifetimeRainbows >= 1) { score += 20; lifetimeRainbows--; }
        if (key === '3' && lifetimeRainbows >= 3) { score += 100; lifetimeRainbows -= 3; }
        if (key.toLowerCase() === 'x' && lifetimeSecret >= 1) { score += floor(secretWorth); lifetimeSecret--; }
        if (key.toLowerCase() === 'm' && lifetimeSecret >= 5) { magnetActive = true; lifetimeSecret -= 5; }
        if (key.toLowerCase() === 'b' && score >= 25) { score -= 25; cartWidth += 40; }
        if (key.toLowerCase() === 't' && score >= 150 && spawnRate > 8) { score -= 150; spawnRate -= 8; }
        if (key.toLowerCase() === 'p' && score >= 80) { score -= 80; priceMult += 0.10; }
        if (key.toLowerCase() === 's' && score >= 100 && !hasShield) { score -= 100; hasShield = true; }
        if (key.toLowerCase() === 'r') { 
            timer = 30; apples = []; floatingTexts = []; isPaused = false;
            shieldActive = hasShield; 
            stats = { red: stats.red, green: 0, gold: 0, rainbow: 0, rotten: 0 }; gameState = "PLAY"; 
        }
    }
}

function drawPauseOverlay() { fill(0, 150); rect(0,0,width,height); fill(255); textAlign(CENTER); textSize(64); text("PAUSED (click space to open)", width/2, height/2); }
function updatePopups() { for (let ft of floatingTexts) { ft.y -= 3; ft.life -= 4; } for (let i = floatingTexts.length-1; i>=0; i--) if (floatingTexts[i].life <= 0) floatingTexts.splice(i,1); }
function drawPopups() { for (let ft of floatingTexts) { ft.col.setAlpha(ft.life); fill(ft.col); textSize(64); textAlign(CENTER, BOTTOM); textStyle(BOLD); text(ft.val, ft.x, ft.y); textStyle(NORMAL); } }
function endRound() { roundCount++; score = Math.max(0, Math.ceil(score)); if (roundCount % 5 === 0) { let kidsMoney = 300 + (150 * (roundCount / 5 - 1)); if (kidsMoney > score) { score = floor(score / 2); alert("The kids took half!"); } else { lifetimeSecret++; lifetimeRainbows = max(0, lifetimeRainbows - 1); alert("Secret Apple obtained!"); } } gameState = "SHOP"; }
