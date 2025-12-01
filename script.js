// --- 颜色配置 ---
const COLORS = [
    '#A0A0A0', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', 
    '#FFEEAD', '#D4A5A5', '#9B59B6', '#3498DB', '#E67E22', '#2ECC71'
];

const EMOJI_THEMES = ['🍎', '🍌', '🍇', '🍓', '🍒', '🐶', '🐱', '🐭', '🐹', '🐰', '⚽', '🏀', '⭐', '🎈', '🚗'];

// --- AUDIO MANAGER ---
class AudioManager {
    constructor() {
        this.ctx = null;
    }

    init() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    play(type) {
        if (!this.ctx) this.init();
        const ctx = this.ctx;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        const now = ctx.currentTime;

        switch (type) {
            case 'click': // 短促的高音
                osc.type = 'sine';
                osc.frequency.setValueAtTime(800, now);
                gain.gain.setValueAtTime(0.1, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
                osc.start(now);
                osc.stop(now + 0.1);
                break;
                
            case 'shoot': // 快速升调
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(300, now);
                osc.frequency.linearRampToValueAtTime(600, now + 0.1);
                gain.gain.setValueAtTime(0.1, now);
                gain.gain.linearRampToValueAtTime(0, now + 0.1);
                osc.start(now);
                osc.stop(now + 0.1);
                break;

            case 'pop': // 清脆消除
                osc.type = 'sine';
                osc.frequency.setValueAtTime(600, now);
                osc.frequency.exponentialRampToValueAtTime(1200, now + 0.1);
                gain.gain.setValueAtTime(0.1, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
                osc.start(now);
                osc.stop(now + 0.15);
                break;

            case 'flip': // 纸张声 (用噪音模拟或低频)
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(200, now);
                gain.gain.setValueAtTime(0.05, now);
                gain.gain.linearRampToValueAtTime(0, now + 0.1);
                osc.start(now);
                osc.stop(now + 0.1);
                break;

            case 'match': // 叮咚 (双音)
                this.playTone(523.25, 0.1, 0); // C5
                this.playTone(659.25, 0.2, 0.1); // E5
                break;

            case 'win': // 胜利和弦
                this.playTone(523.25, 0.2, 0);
                this.playTone(659.25, 0.2, 0.1);
                this.playTone(783.99, 0.4, 0.2); // G5
                this.playTone(1046.50, 0.6, 0.3); // C6
                break;
                
            case 'lose': // 失败低音
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(200, now);
                osc.frequency.linearRampToValueAtTime(100, now + 0.5);
                gain.gain.setValueAtTime(0.1, now);
                gain.gain.linearRampToValueAtTime(0, now + 0.5);
                osc.start(now);
                osc.stop(now + 0.5);
                break;
        }
    }

    playTone(freq, duration, delay = 0) {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        
        const now = this.ctx.currentTime + delay;
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.linearRampToValueAtTime(0, now + duration);
        
        osc.start(now);
        osc.stop(now + duration);
    }
}

const audio = new AudioManager();

// --- STORAGE MANAGER ---

class StorageManager {
    constructor() {
        this.key = 'mathFunHubData';
        this.data = this.load();
    }

    load() {
        const stored = localStorage.getItem(this.key);
        if (stored) {
            return JSON.parse(stored);
        }
        return {
            bubble: { maxLevel: 1, highScore: 0 },
            memory: { maxLevel: 1, highScore: 0 }
        };
    }

    save() {
        localStorage.setItem(this.key, JSON.stringify(this.data));
    }

    updateProgress(game, level, score) {
        if (!this.data[game]) return;
        
        if (level > this.data[game].maxLevel) {
            this.data[game].maxLevel = level;
        }
        if (score > this.data[game].highScore) {
            this.data[game].highScore = score;
        }
        this.save();
    }

    getGameData(game) {
        return this.data[game] || { maxLevel: 1, highScore: 0 };
    }
}

const storage = new StorageManager();

// --- APP HUB LOGIC ---

class App {
    constructor() {
        this.screens = {
            hub: document.getElementById('hub-screen'),
            bubble: document.getElementById('bubble-screen'),
            memory: document.getElementById('memory-screen')
        };

        this.bubbleGame = null;
        this.memoryGame = null;

        this.bindEvents();
        this.updateHubStats();
    }

    bindEvents() {
        // Game Selection
        document.querySelectorAll('.game-card').forEach(card => {
            card.addEventListener('click', () => {
                audio.play('click');
                const gameType = card.dataset.game;
                this.startGame(gameType);
            });
        });

        // Back Buttons
        document.querySelectorAll('.back-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                audio.play('click');
                this.showScreen('hub');
                this.stopCurrentGame();
                this.updateHubStats();
            });
        });
    }

    updateHubStats() {
        const bubbleData = storage.getGameData('bubble');
        const memoryData = storage.getGameData('memory');
        
        document.getElementById('hub-score-bubble').textContent = bubbleData.highScore;
        document.getElementById('hub-score-memory').textContent = memoryData.highScore;
    }

    showScreen(name) {
        Object.values(this.screens).forEach(s => s.classList.remove('active'));
        this.screens[name].classList.add('active');
    }

    startGame(type) {
        this.showScreen(type);
        if (type === 'bubble') {
            if (!this.bubbleGame) this.bubbleGame = new BubbleGame();
            this.bubbleGame.start();
        } else if (type === 'memory') {
            if (!this.memoryGame) this.memoryGame = new MemoryGame();
            this.memoryGame.start();
        }
    }

    stopCurrentGame() {
        if (this.bubbleGame) this.bubbleGame.stop();
        if (this.memoryGame) this.memoryGame.stop();
    }
}

// --- MEMORY GAME CLASS ---

class MemoryGame {
    constructor() {
        this.board = document.getElementById('memory-board');
        this.scoreEl = document.getElementById('memory-score');
        this.levelEl = document.getElementById('memory-level');
        this.modal = document.getElementById('memory-modal');
        this.nextBtn = document.getElementById('memory-next-btn');
        
        this.level = 1;
        this.score = 0;
        this.cards = [];
        this.flippedCards = [];
        this.matchedPairs = 0;
        this.totalPairs = 0;
        this.isLocked = false;

        this.nextBtn.addEventListener('click', () => {
            audio.play('click');
            this.initLevel(this.level + 1);
        });
    }

    start() {
        this.score = 0;
        this.scoreEl.textContent = 0;
        this.initLevel(1); 
    }

    stop() {
        this.board.innerHTML = ''; // Clear board
    }

    initLevel(level) {
        this.level = level;
        this.levelEl.textContent = level;
        this.modal.classList.add('hidden');
        this.flippedCards = [];
        this.isLocked = false;
        this.matchedPairs = 0;
        
        // Update storage (level unlock)
        storage.updateProgress('memory', level, this.score);
        
        // Difficulty Settings
        let pairCount = 0;
        if (level === 1) pairCount = 3;       // 6 cards
        else if (level === 2) pairCount = 6;  // 12 cards
        else if (level === 3) pairCount = 8;  // 16 cards
        else pairCount = 10;                  // 20 cards (Max)

        this.totalPairs = pairCount;
        this.generateCards(pairCount);
    }

    generateCards(count) {
        this.board.innerHTML = '';
        const deck = [];

        // Generate pairs (Equation + Answer)
        for (let i = 0; i < count; i++) {
            // Ensure answer <= 10 for kids
            const target = Math.floor(Math.random() * 10) + 1; 
            const a = Math.floor(Math.random() * (target + 1));
            const b = target - a;
            
            // Random Emoji for this pair (Visual Cue)
            const themeEmoji = EMOJI_THEMES[Math.floor(Math.random() * EMOJI_THEMES.length)];
            
            const eqObj = { id: i, type: 'eq', content: `${a}+${b}`, matchId: i, emoji: themeEmoji };
            const ansObj = { id: i, type: 'ans', content: target, matchId: i, emoji: themeEmoji };
            
            deck.push(eqObj, ansObj);
        }

        // Shuffle
        deck.sort(() => Math.random() - 0.5);

        // Render
        // Adjust grid columns based on count
        if (count <= 3) this.board.style.gridTemplateColumns = 'repeat(3, 1fr)';
        else if (count <= 6) this.board.style.gridTemplateColumns = 'repeat(4, 1fr)';
        else this.board.style.gridTemplateColumns = 'repeat(4, 1fr)'; 

        deck.forEach(item => {
            const card = document.createElement('div');
            card.className = 'card';
            card.dataset.matchId = item.matchId;
            
            let contentHtml = '';
            if (item.type === 'ans') {
                // Answer Card: Number + Quantity Emojis
                let emojisHtml = '';
                // Limit to max 10 emojis or handled by CSS grid/flex
                // If number is large, emojis might need to be smaller. 
                // Since max is 10, we can just repeat.
                const emojiStr = item.emoji.repeat(item.content);
                
                contentHtml = `
                    <div class="card-content-wrapper">
                        <span class="card-main-text">${item.content}</span>
                        <div class="card-visuals" title="${item.content} ${item.emoji}">${emojiStr}</div>
                    </div>
                `;
            } else {
                // Equation Card: Just Math
                contentHtml = `<span class="card-main-text">${item.content}</span>`;
            }

            card.innerHTML = `
                <div class="card-inner">
                    <div class="card-front type-${item.type}">
                        ${contentHtml}
                    </div>
                    <div class="card-back">?</div>
                </div>
            `;

            card.addEventListener('click', () => this.flipCard(card));
            this.board.appendChild(card);
        });
    }

    flipCard(card) {
        if (this.isLocked) return;
        if (card.classList.contains('flipped') || card.classList.contains('matched')) return;

        audio.play('flip');
        card.classList.add('flipped');
        this.flippedCards.push(card);

        if (this.flippedCards.length === 2) {
            this.checkMatch();
        }
    }

    checkMatch() {
        this.isLocked = true;
        const [card1, card2] = this.flippedCards;
        const match1 = card1.dataset.matchId;
        const match2 = card2.dataset.matchId;

        if (match1 === match2) {
            // Match!
            setTimeout(() => {
                audio.play('match');
                card1.classList.add('matched');
                card2.classList.add('matched');
                this.flippedCards = [];
                this.isLocked = false;
                this.matchedPairs++;
                this.score += 10;
                this.scoreEl.textContent = this.score;
                
                // Save progress
                storage.updateProgress('memory', this.level, this.score);

                if (this.matchedPairs === this.totalPairs) {
                    setTimeout(() => this.handleWin(), 500);
                }
            }, 500);
        } else {
            // No match
            setTimeout(() => {
                card1.classList.remove('flipped');
                card2.classList.remove('flipped');
                this.flippedCards = [];
                this.isLocked = false;
            }, 1000);
        }
    }

    handleWin() {
        audio.play('win');
        this.modal.classList.remove('hidden');
    }
}

// --- BUBBLE GAME CLASS (Renamed & Adapted) ---

class BubbleGame {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Initial size setup
        this.width = this.canvas.clientWidth;
        this.height = this.canvas.clientHeight;
        this.canvas.width = this.width;
        this.canvas.height = this.height;

        // Config - Initial calculation (will be updated by resizeCanvas)
        this.tileRadius = 25; 
        this.tileDiameter = this.tileRadius * 2;
        this.rowHeight = this.tileRadius * Math.sqrt(3);
        
        // Call resize to set correct initial values based on screen size
        this.resizeCanvas();

        // State
        this.grid = [];
        this.particles = [];
        this.score = 0;
        this.level = 1;
        this.state = 'idle'; // idle, playing, gameover, levelup
        this.maxNumber = 5;
        
        // Player
        this.nextBubble = null;
        this.projectile = null;
        this.angle = -Math.PI / 2;

        // DOM
        this.scoreEl = document.getElementById('bubble-score');
        this.levelEl = document.getElementById('bubble-level');
        this.modal = document.getElementById('bubble-modal');
        this.modalTitle = document.getElementById('bubble-modal-title');
        this.modalMsg = document.getElementById('bubble-modal-message');
        this.modalBtn = document.getElementById('bubble-modal-btn');

        // Events
        window.addEventListener('resize', () => this.handleResize());
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('click', (e) => this.handleClick(e));
        this.canvas.addEventListener('touchstart', (e) => this.handleTouch(e));
        this.modalBtn.addEventListener('click', () => {
            audio.play('click');
            this.nextLevel();
        });

        this.animId = null;
    }

    start() {
        if (this.state === 'playing') return;
        this.resizeCanvas(); 
        this.score = 0; // Reset score for new game session
        this.scoreEl.textContent = 0;
        
        this.initLevel(1);
        this.loop();
    }

    stop() {
        this.state = 'idle';
        cancelAnimationFrame(this.animId);
    }

    resizeCanvas() {
        // 使用 Canvas 实际渲染大小，而非全屏大小
        this.width = this.canvas.clientWidth;
        this.height = this.canvas.clientHeight;
        
        // 设置 Canvas 内部分辨率匹配显示尺寸
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        
        // Responsive Bubble Size
        // Desktop: 25px radius (50px dia)
        // Mobile: fit at least 10 bubbles width-wise
        this.tileRadius = Math.min(25, Math.floor(this.width / 22)); 
        this.tileDiameter = this.tileRadius * 2;
        this.rowHeight = this.tileRadius * Math.sqrt(3);
        
        this.cols = Math.floor(this.width / this.tileDiameter);
        this.rows = Math.floor(this.height / this.rowHeight);
        this.offsetX = (this.width - (this.cols * this.tileDiameter)) / 2 + this.tileRadius;
    }

    initLevel(level) {
        this.level = level;
        this.levelEl.textContent = level;
        this.grid = [];
        
        // Save progress
        storage.updateProgress('bubble', level, this.score);
        
        if (level <= 2) this.maxNumber = 5;
        else if (level <= 5) this.maxNumber = 8;
        else this.maxNumber = 10;

        let initialRows, fillRatio;
        if (level === 1) { initialRows = 3; fillRatio = 0.35; }
        else if (level === 2) { initialRows = 4; fillRatio = 0.6; }
        else if (level === 3) { initialRows = 5; fillRatio = 0.8; }
        else { fillRatio = 1.0; initialRows = Math.min(5 + Math.floor((level - 4) / 2), 10); }
        
        for (let r = 0; r < this.rows; r++) {
            this.grid[r] = new Array(this.cols).fill(null);
            if (r < initialRows) {
                for (let c = 0; c < this.cols; c++) {
                    const center = (this.cols - 1) / 2;
                    const dist = Math.abs(c - center) / (this.cols / 2);
                    if (dist <= fillRatio) {
                        this.grid[r][c] = this.randomValue(this.maxNumber);
                    }
                }
            }
        }

        this.prepareNextBubble();
        this.state = 'playing';
        this.modal.classList.add('hidden');
    }

    randomValue(max) {
        return Math.floor(Math.random() * max) + 1;
    }

    prepareNextBubble() {
        const existingValues = new Set();
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                if (this.grid[r][c] !== null) existingValues.add(this.grid[r][c]);
            }
        }

        let target;
        if (existingValues.size > 0) {
            const arr = Array.from(existingValues);
            target = arr[Math.floor(Math.random() * arr.length)];
        } else {
            this.handleWin();
            return;
        }

        let numA, numB;
        if (target === 1) {
             numA = Math.random() > 0.5 ? 0 : 1;
        } else {
             numA = Math.floor(Math.random() * (target + 1)); 
        }
        numB = target - numA;

        this.nextBubble = {
            value: target,
            equation: `${numA}+${numB}`,
            x: this.width / 2,
            y: this.height - 50,
            radius: this.tileRadius
        };
    }

    loop() {
        if (this.state !== 'idle') {
            this.update();
            this.draw();
            this.animId = requestAnimationFrame(() => this.loop());
        }
    }

    update() {
        if (this.state !== 'playing') return;

        if (this.projectile) {
            const p = this.projectile;
            p.x += p.vx;
            p.y += p.vy;

            if (p.x - p.radius < 0) {
                p.x = p.radius;
                p.vx = -p.vx;
            } else if (p.x + p.radius > this.width) {
                p.x = this.width - p.radius;
                p.vx = -p.vx;
            }

            // 顶部碰撞
            if (p.y - p.radius < 0) {
                this.snapToGrid(p);
                this.projectile = null;
                return;
            }

            for (let r = 0; r < this.rows; r++) {
                for (let c = 0; c < this.cols; c++) {
                    if (this.grid[r][c] !== null) {
                        const pos = this.getGridPos(r, c);
                        const dist = Math.hypot(p.x - pos.x, p.y - pos.y);
                        if (dist < this.tileDiameter - 5) {
                            this.snapToGrid(p);
                            this.projectile = null;
                            return;
                        }
                    }
                }
            }
        }

        for (let i = this.particles.length - 1; i >= 0; i--) {
            const pt = this.particles[i];
            pt.x += pt.vx;
            pt.y += pt.vy;
            pt.vy += 0.5;
            pt.life--;
            if (pt.life <= 0) this.particles.splice(i, 1);
        }
    }

    snapToGrid(p) {
        let bestDist = Infinity;
        let bestR = 0, bestC = 0;

        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                if (this.grid[r][c] === null) {
                    const pos = this.getGridPos(r, c);
                    const dist = Math.hypot(p.x - pos.x, p.y - pos.y);
                    if (dist < bestDist) {
                        bestDist = dist;
                        bestR = r;
                        bestC = c;
                    }
                }
            }
        }

        if (bestR < this.rows) {
            this.grid[bestR][bestC] = p.value;
            
            const matches = this.findMatches(bestR, bestC, p.value);
            const neighbors = this.getNeighbors(bestR, bestC);
            let hitTarget = false;
            for (const n of neighbors) {
                if (this.grid[n.r][n.c] === p.value) {
                    hitTarget = true;
                    break;
                }
            }

            if (hitTarget) {
                audio.play('pop');
                this.removeBubbles(matches);
                this.dropFloatingBubbles();
            } else {
                if (bestR >= this.rows - 2) {
                    this.handleGameOver();
                }
            }
            this.prepareNextBubble();
        }
    }

    findMatches(r, c, value) {
        const matches = [];
        const queue = [{r, c}];
        const visited = new Set([`${r},${c}`]);

        while (queue.length > 0) {
            const curr = queue.shift();
            matches.push(curr);

            const neighbors = this.getNeighbors(curr.r, curr.c);
            for (const n of neighbors) {
                if (!visited.has(`${n.r},${n.c}`) && this.grid[n.r][n.c] === value) {
                    visited.add(`${n.r},${n.c}`);
                    queue.push(n);
                }
            }
        }
        return matches;
    }

    dropFloatingBubbles() {
        const visited = new Set();
        const queue = [];

        for (let c = 0; c < this.cols; c++) {
            if (this.grid[0][c] !== null) {
                queue.push({r: 0, c});
                visited.add(`0,${c}`);
            }
        }

        while (queue.length > 0) {
            const curr = queue.shift();
            const neighbors = this.getNeighbors(curr.r, curr.c);
            for (const n of neighbors) {
                if (this.grid[n.r][n.c] !== null && !visited.has(`${n.r},${n.c}`)) {
                    visited.add(`${n.r},${n.c}`);
                    queue.push(n);
                }
            }
        }

        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                if (this.grid[r][c] !== null && !visited.has(`${r},${c}`)) {
                    this.createParticles(r, c, this.grid[r][c]);
                    this.grid[r][c] = null;
                    this.score += 10;
                }
            }
        }
        // Update Score UI & Storage
        this.scoreEl.textContent = this.score;
        storage.updateProgress('bubble', this.level, this.score);
    }

    removeBubbles(list) {
        list.forEach(({r, c}) => {
            this.createParticles(r, c, this.grid[r][c]);
            this.grid[r][c] = null;
            this.score += 10;
        });
        // Update Score UI & Storage
        this.scoreEl.textContent = this.score;
        storage.updateProgress('bubble', this.level, this.score);
    }

    getNeighbors(r, c) {
        const neighbors = [];
        const isEven = (r % 2 === 0);
        const dirs = isEven ? 
            [[-1, -1], [-1, 0], [0, -1], [0, 1], [1, -1], [1, 0]] :
            [[-1, 0], [-1, 1], [0, -1], [0, 1], [1, 0], [1, 1]];

        for (const [dr, dc] of dirs) {
            const nr = r + dr;
            const nc = c + dc;
            if (nr >= 0 && nr < this.rows && nc >= 0 && nc < this.cols) {
                neighbors.push({r: nr, c: nc});
            }
        }
        return neighbors;
    }

    getGridPos(r, c) {
        const y = r * this.rowHeight + this.tileRadius;
        let x = c * this.tileDiameter + this.tileRadius + this.offsetX;
        if (r % 2 !== 0) { 
            x += this.tileRadius;
        }
        return {x, y};
    }

    createParticles(r, c, val) {
        const pos = this.getGridPos(r, c);
        for (let i = 0; i < 5; i++) {
            this.particles.push({
                x: pos.x,
                y: pos.y,
                vx: (Math.random() - 0.5) * 10,
                vy: (Math.random() - 0.5) * 10,
                life: 30,
                color: COLORS[val] || '#ccc',
                radius: Math.random() * 5 + 2
            });
        }
    }

    handleMouseMove(e) {
        if (this.state !== 'playing') return;
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        this.updateAngle(x, y);
    }

    handleTouch(e) {
        if (this.state !== 'playing') return;
        e.preventDefault();
        const rect = this.canvas.getBoundingClientRect();
        const touch = e.touches[0];
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;
        this.updateAngle(x, y);
        this.fire();
    }

    handleClick(e) {
        if (this.state !== 'playing') return;
        this.fire();
    }

    updateAngle(targetX, targetY) {
        const sourceX = this.width / 2;
        const sourceY = this.height - 50;
        this.angle = Math.atan2(targetY - sourceY, targetX - sourceX);
    }

    fire() {
        if (this.projectile || !this.nextBubble) return;

        audio.play('shoot');
        const speed = 15;
        this.projectile = {
            x: this.width / 2,
            y: this.height - 50,
            vx: Math.cos(this.angle) * speed,
            vy: Math.sin(this.angle) * speed,
            radius: this.tileRadius,
            value: this.nextBubble.value,
            equation: this.nextBubble.equation
        };
    }

    handleResize() {
        this.resizeCanvas();
    }

    handleWin() {
        this.state = 'levelup';
        audio.play('win');
        this.modalTitle.textContent = "太棒了！";
        this.modalMsg.textContent = `完成了第 ${this.level} 关！`;
        this.modal.classList.remove('hidden');
        // Unlock next level
        storage.updateProgress('bubble', this.level + 1, this.score);
    }

    handleGameOver() {
        this.state = 'gameover';
        audio.play('lose');
        this.modalTitle.textContent = "游戏结束";
        this.modalMsg.textContent = "再试一次？";
        this.modalBtn.textContent = "重玩";
        this.modal.classList.remove('hidden');
        this.level = 0; 
    }

    nextLevel() {
        this.initLevel(this.level + 1);
    }

    draw() {
        this.ctx.clearRect(0, 0, this.width, this.height);

        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                const val = this.grid[r][c];
                if (val !== null) {
                    const pos = this.getGridPos(r, c);
                    this.drawBubble(pos.x, pos.y, val);
                }
            }
        }

        this.particles.forEach(p => {
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            this.ctx.fillStyle = p.color;
            this.ctx.fill();
        });

        const sourceX = this.width / 2;
        const sourceY = this.height - 50;
        this.ctx.beginPath();
        this.ctx.moveTo(sourceX, sourceY);
        this.ctx.lineTo(sourceX + Math.cos(this.angle) * 100, sourceY + Math.sin(this.angle) * 100);
        this.ctx.strokeStyle = 'rgba(0,0,0,0.2)';
        this.ctx.lineWidth = 5;
        this.ctx.setLineDash([10, 10]);
        this.ctx.stroke();
        this.ctx.setLineDash([]);

        if (this.projectile) {
            this.drawBubble(this.projectile.x, this.projectile.y, this.projectile.value, this.projectile.equation);
        } else if (this.nextBubble) {
            this.drawBubble(sourceX, sourceY, this.nextBubble.value, this.nextBubble.equation);
        }
    }

    drawBubble(x, y, val, text) {
        this.ctx.beginPath();
        this.ctx.arc(x, y, this.tileRadius - 2, 0, Math.PI * 2);
        this.ctx.fillStyle = COLORS[val] || '#333';
        this.ctx.shadowColor = 'rgba(0,0,0,0.2)';
        this.ctx.shadowBlur = 4;
        this.ctx.shadowOffsetY = 4;
        this.ctx.fill();
        this.ctx.shadowBlur = 0;
        this.ctx.shadowOffsetY = 0;
        
        this.ctx.beginPath();
        this.ctx.arc(x - 8, y - 8, 5, 0, Math.PI * 2);
        this.ctx.fillStyle = 'rgba(255,255,255,0.3)';
        this.ctx.fill();

        this.ctx.fillStyle = 'white';
        this.ctx.font = 'bold 18px Fredoka';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(text || val, x, y);
    }
}

// Initialize App
window.onload = () => {
    new App();
};
