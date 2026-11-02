/* =========================================
   HIGHWAY RUSH
========================================= */

const menu = document.getElementById("menu");
const game = document.getElementById("game");

const world = document.getElementById("world");
const player = document.getElementById("player");

const traffic = document.getElementById("traffic");
const trees = document.getElementById("trees");

const scoreElement = document.getElementById("score");
const bestElement = document.getElementById("best");
const speedElement = document.getElementById("speed");

const menuBest = document.getElementById("menuBest");

const countdown = document.getElementById("countdown");

const gameOver = document.getElementById("gameOver");

const finalScore = document.getElementById("finalScore");
const finalBest = document.getElementById("finalBest");

const newRecord = document.getElementById("newRecord");

const retryButton = document.getElementById("retry");
const mainMenuButton = document.getElementById("mainMenu");

const soundButton = document.getElementById("soundButton");

const bgMusic = document.getElementById("bgMusic");


/* =========================================
   GAME SETTINGS
========================================= */

const difficultySettings = {

    easy: {
        startSpeed: 4,
        maxSpeed: 9,
        spawnTime: 1250,
        maxCars: 3
    },

    hard: {
        startSpeed: 5.5,
        maxSpeed: 12,
        spawnTime: 900,
        maxCars: 4
    },

    expert: {
        startSpeed: 7,
        maxSpeed: 15,
        spawnTime: 650,
        maxCars: 5
    }

};


let difficulty = "easy";

let running = false;

let score = 0;

let best =
    Number(
        localStorage.getItem("highwayRushBest")
    ) || 0;

let speed = 0;

let playerX = 50;

let targetX = 50;

let spawnTimer = 0;

let treeTimer = 0;

let lastTime = 0;

let animationFrame = null;

let objects = [];

let treeObjects = [];

let dragging = false;

let soundEnabled = true;


/* =========================================
   AUDIO
========================================= */

let audioContext = null;

let engineOscillator = null;

let engineGain = null;


/* =========================================
   INITIAL UI
========================================= */

menuBest.textContent = best;
bestElement.textContent = best;

bgMusic.volume = 0.35;


/* =========================================
   AUDIO ENGINE
========================================= */

function initAudio() {

    if (audioContext) {

        if (
            audioContext.state ===
            "suspended"
        ) {
            audioContext.resume();
        }

        return;
    }


    audioContext =
        new (
            window.AudioContext ||
            window.webkitAudioContext
        )();


    /*
        Motorcycle engine
    */

    engineOscillator =
        audioContext.createOscillator();

    engineGain =
        audioContext.createGain();


    engineOscillator.type =
        "sawtooth";

    engineOscillator.frequency.value =
        70;


    engineGain.gain.value =
        0.018;


    engineOscillator.connect(
        engineGain
    );

    engineGain.connect(
        audioContext.destination
    );


    engineOscillator.start();

}


/* =========================================
   START BACKGROUND SONG
========================================= */

function startMusic() {

    if (!soundEnabled) return;

    bgMusic.volume = 0.35;

    bgMusic.currentTime = 0;

    bgMusic.play().catch(() => {

        console.log(
            "Music will start after user interaction."
        );

    });

}


/* =========================================
   STOP MUSIC
========================================= */

function stopMusic() {

    bgMusic.pause();

    bgMusic.currentTime = 0;

}


/* =========================================
   SOUND EFFECT
========================================= */

function beep(
    frequency = 500,
    duration = 0.12
) {

    if (!soundEnabled) return;

    initAudio();


    const oscillator =
        audioContext.createOscillator();

    const gain =
        audioContext.createGain();


    oscillator.frequency.value =
        frequency;


    gain.gain.value =
        0.08;


    oscillator.connect(gain);

    gain.connect(
        audioContext.destination
    );


    oscillator.start();


    gain.gain.exponentialRampToValueAtTime(
        0.001,
        audioContext.currentTime +
        duration
    );


    oscillator.stop(
        audioContext.currentTime +
        duration
    );

}


/* =========================================
   CRASH SOUND
========================================= */

function crashSound() {

    if (!soundEnabled) return;

    initAudio();


    const length =
        audioContext.sampleRate *
        0.3;


    const buffer =
        audioContext.createBuffer(
            1,
            length,
            audioContext.sampleRate
        );


    const data =
        buffer.getChannelData(0);


    for (
        let i = 0;
        i < length;
        i++
    ) {

        data[i] =
            (Math.random() * 2 - 1)
            *
            (1 - i / length);

    }


    const source =
        audioContext.createBufferSource();

    const gain =
        audioContext.createGain();


    source.buffer = buffer;

    gain.gain.value = 0.45;


    source.connect(gain);

    gain.connect(
        audioContext.destination
    );


    source.start();

}


/* =========================================
   VOICE
========================================= */

function voice(text) {

    if (!soundEnabled) return;

    if (
        !("speechSynthesis" in window)
    ) {
        return;
    }


    speechSynthesis.cancel();


    const message =
        new SpeechSynthesisUtterance(
            text
        );


    message.rate = 1;

    message.pitch = 1;


    speechSynthesis.speak(
        message
    );

}


/* =========================================
   DIFFICULTY BUTTONS
========================================= */

document
    .querySelectorAll(".difficulty")
    .forEach(button => {

        button.addEventListener(
            "click",
            () => {

                difficulty =
                    button.dataset.level;

                startGame();

            }
        );

    });


/* =========================================
   SOUND BUTTON
========================================= */

soundButton.addEventListener(
    "click",
    () => {

        soundEnabled =
            !soundEnabled;


        if (!soundEnabled) {

            bgMusic.pause();

            soundButton.textContent =
                "🔇 SOUND OFF";

        } else {

            soundButton.textContent =
                "🔊 SOUND ON";

            if (running) {
                startMusic();
            }

        }

    }
);


/* =========================================
   START GAME
========================================= */

function startGame() {

    initAudio();


    if (
        audioContext.state ===
        "suspended"
    ) {
        audioContext.resume();
    }


    menu.style.display = "none";

    game.style.display = "block";

    gameOver.style.display = "none";


    score = 0;

    speed =
        difficultySettings[
            difficulty
        ].startSpeed;


    playerX = 50;

    targetX = 50;


    player.style.left =
        "50%";


    scoreElement.textContent =
        "0";


    bestElement.textContent =
        best;


    speedElement.textContent =
        Math.round(speed * 10);


    traffic.innerHTML = "";

    trees.innerHTML = "";


    objects = [];

    treeObjects = [];


    spawnTimer = 0;

    treeTimer = 0;


    running = false;


    /*
        Start actual background song
    */

    startMusic();


    countdownSequence();

}


/* =========================================
   COUNTDOWN
========================================= */

function countdownSequence() {

    const sequence =
        ["3", "2", "1", "GO!"];


    let index = 0;


    function next() {

        if (
            index >=
            sequence.length
        ) {

            countdown.textContent =
                "";

            running = true;

            lastTime =
                performance.now();


            voice("Go");


            animationFrame =
                requestAnimationFrame(
                    gameLoop
                );

            return;

        }


        const value =
            sequence[index];


        countdown.textContent =
            value;


        if (value === "GO!") {

            beep(900, .18);

        } else {

            beep(500, .12);

            voice(value);

        }


        index++;


        setTimeout(
            next,
            700
        );

    }


    next();

}


/* =========================================
   MAIN GAME LOOP
========================================= */

function gameLoop(time) {

    if (!running) return;


    const delta =
        Math.min(
            (time - lastTime) /
            16.67,
            2
        );


    lastTime = time;


    updateGame(delta);


    animationFrame =
        requestAnimationFrame(
            gameLoop
        );

}


/* =========================================
   GAME UPDATE
========================================= */

function updateGame(delta) {

    const settings =
        difficultySettings[
            difficulty
        ];


    /* SPEED INCREASE */

    speed +=
        0.0025 * delta;


    if (
        speed >
        settings.maxSpeed
    ) {
        speed =
            settings.maxSpeed;
    }


    speedElement.textContent =
        Math.round(speed * 10);


    /* SCORE */

    score +=
        0.035 * delta;


    scoreElement.textContent =
        Math.floor(score);


    /* ENGINE */

    if (
        engineOscillator &&
        engineGain
    ) {

        engineOscillator.frequency.value =
            65 + speed * 9;

    }


    /* SMOOTH PLAYER */

    playerX +=
        (
            targetX -
            playerX
        )
        *
        0.17
        *
        delta;


    player.style.left =
        playerX + "%";


    /* ROAD LINES */

    moveRoad();


    /* SPAWN CARS */

    spawnTimer +=
        16.67 * delta;


    const currentSpawn =
        Math.max(
            400,
            settings.spawnTime -
            speed * 28
        );


    if (
        spawnTimer >
        currentSpawn
    ) {

        spawnTimer = 0;

        if (
            objects.length <
            settings.maxCars
        ) {

            spawnCar();

        }

    }


    /* TREES */

    treeTimer +=
        16.67 * delta;


    if (
        treeTimer >
        550
    ) {

        treeTimer = 0;

        spawnTree("left");

        spawnTree("right");

    }


    /* MOVE CARS */

    for (
        let i = objects.length - 1;
        i >= 0;
        i--
    ) {

        const object =
            objects[i];


        object.y +=
            speed *
            delta;


        object.element.style.transform =
            `translateY(${object.y}px)`;


        if (
            object.y >
            window.innerHeight + 150
        ) {

            object.element.remove();

            objects.splice(i, 1);

            score += 5;

            continue;

        }


        if (
            checkCollision(
                player,
                object.element
            )
        ) {

            endGame();

            return;

        }

    }


    /* MOVE TREES */

    for (
        let i =
            treeObjects.length - 1;
        i >= 0;
        i--
    ) {

        const tree =
            treeObjects[i];


        tree.y +=
            speed *
            1.45 *
            delta;


        tree.element.style.transform =
            `translateY(${tree.y}px)`;


        if (
            tree.y >
            window.innerHeight + 150
        ) {

            tree.element.remove();

            treeObjects.splice(i, 1);

        }

    }

}


/* =========================================
   ROAD MOVEMENT
========================================= */

function moveRoad() {

    const lines =
        document.querySelectorAll(
            ".lane-mark"
        );


    lines.forEach(line => {

        let offset =
            Number(
                line.dataset.offset || 0
            );


        offset +=
            speed * 3.5;


        if (
            offset > 130
        ) {
            offset = 0;
        }


        line.dataset.offset =
            offset;


        line.style.transform =
            `translateY(${offset}px)`;

    });

}


/* =========================================
   SPAWN CAR
========================================= */

function spawnCar() {

    const lanes =
        [29, 50, 71];


    const lane =
        lanes[
            Math.floor(
                Math.random() *
                lanes.length
            )
        ];


    const colors =
        [
            "car-red",
            "car-blue",
            "car-yellow",
            "car-white",
            "car-black",
            "car-grey"
        ];


    const color =
        colors[
            Math.floor(
                Math.random() *
                colors.length
            )
        ];


    const car =
        document.createElement(
            "div"
        );


    car.className =
        `car ${color}`;


    car.style.left =
        `calc(${lane}% - 32px)`;


    car.style.top =
        "-130px";


    traffic.appendChild(
        car
    );


    objects.push({

        element: car,

        y: -130

    });

}


/* =========================================
   SPAWN TREE
========================================= */

function spawnTree(side) {

    const tree =
        document.createElement(
            "div"
        );


    tree.className =
        "tree";


    const leaves =
        document.createElement(
            "div"
        );


    leaves.className =
        "tree-leaves";


    const trunk =
        document.createElement(
            "div"
        );


    trunk.className =
        "tree-trunk";


    tree.appendChild(
        leaves
    );


    tree.appendChild(
        trunk
    );


    if (side === "left") {

        tree.style.left =
            (
                Math.random() * 12 +
                1
            ) + "%";

    } else {

        tree.style.right =
            (
                Math.random() * 12 +
                1
            ) + "%";

    }


    tree.style.top =
        "-110px";


    trees.appendChild(
        tree
    );


    treeObjects.push({

        element: tree,

        y: -110

    });

}


/* =========================================
   COLLISION
========================================= */

function checkCollision(
    playerElement,
    enemyElement
) {

    const playerRect =
        playerElement.getBoundingClientRect();


    const enemyRect =
        enemyElement.getBoundingClientRect();


    const padding = 13;


    return !(
        playerRect.right -
            padding <
            enemyRect.left +
            padding ||

        playerRect.left +
            padding >
            enemyRect.right -
            padding ||

        playerRect.bottom -
            padding <
            enemyRect.top +
            padding ||

        playerRect.top +
            padding >
            enemyRect.bottom -
            padding
    );

}


/* =========================================
   GAME OVER
========================================= */

function endGame() {

    if (!running) return;


    running = false;


    cancelAnimationFrame(
        animationFrame
    );


    stopMusic();


    crashSound();


    voice("Game over");


    const final =
        Math.floor(score);


    let recordBroken = false;


    if (
        final > best
    ) {

        best = final;

        recordBroken = true;


        localStorage.setItem(
            "highwayRushBest",
            best
        );

    }


    finalScore.textContent =
        final;


    finalBest.textContent =
        best;


    bestElement.textContent =
        best;


    if (recordBroken) {

        newRecord.style.display =
            "block";


        setTimeout(() => {

            voice(
                "New record"
            );

        }, 500);

    } else {

        newRecord.style.display =
            "none";

    }


    gameOver.style.display =
        "flex";

}


/* =========================================
   RETRY
========================================= */

retryButton.addEventListener(
    "click",
    () => {

        startGame();

    }
);


/* =========================================
   MAIN MENU
========================================= */

mainMenuButton.addEventListener(
    "click",
    () => {

        running = false;


        cancelAnimationFrame(
            animationFrame
        );


        stopMusic();


        game.style.display =
            "none";


        menu.style.display =
            "flex";


        menuBest.textContent =
            best;

    }
);


/* =========================================
   KEYBOARD
========================================= */

document.addEventListener(
    "keydown",
    event => {

        if (!running) return;


        if (
            event.key ===
                "ArrowLeft" ||

            event.key.toLowerCase() ===
                "a"
        ) {

            targetX -= 8;

        }


        if (
            event.key ===
                "ArrowRight" ||

            event.key.toLowerCase() ===
                "d"
        ) {

            targetX += 8;

        }


        targetX =
            Math.max(
                22,
                Math.min(
                    78,
                    targetX
                )
            );

    }
);


/* =========================================
   MOBILE DRAG
========================================= */

game.addEventListener(
    "pointerdown",
    event => {

        if (!running) return;


        dragging = true;


        game.setPointerCapture(
            event.pointerId
        );


        moveBikeWithPointer(
            event
        );

    }
);


game.addEventListener(
    "pointermove",
    event => {

        if (
            !dragging ||
            !running
        ) {
            return;
        }


        moveBikeWithPointer(
            event
        );

    }
);


game.addEventListener(
    "pointerup",
    event => {

        dragging = false;


        try {

            game.releasePointerCapture(
                event.pointerId
            );

        } catch (error) {}

    }
);


game.addEventListener(
    "pointercancel",
    () => {

        dragging = false;

    }
);


/* =========================================
   MOVE BIKE WITH FINGER
========================================= */

function moveBikeWithPointer(
    event
) {

    const rect =
        world.getBoundingClientRect();


    let position =
        (
            (
                event.clientX -
                rect.left
            ) /
            rect.width
        ) * 100;


    targetX =
        Math.max(
            22,
            Math.min(
                78,
                position
            )
        );

}


/* =========================================
   PREVENT MOBILE SCROLL
========================================= */

game.style.touchAction =
    "none";