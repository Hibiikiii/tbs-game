import * as THREE from 'three';
import * as CANNON from 'cannon';
import { initializeAuth, addScore, getLeaderboard, showHighscore, getPersonalScore } from './firebase';

/**
 * DOM Elements
 */
const loadingScreen = document.getElementById('loadingScreen');
const nameScreen = document.getElementById('nameScreen');
const gameScreen = document.getElementById('gameScreen');
const playerNameInput = document.getElementById('playerNameInput');
const startButton = document.getElementById('startButton');
const errorMessage = document.getElementById('errorMessage');
const titleScreenElement = document.getElementById("titleScreen");
const leaderboard = document.getElementById("leaderboard");
const scoreElement = document.getElementById("score");
const gameOverElement = document.getElementById("gameOver");
const scoreResultElement = document.getElementById("scoreResult");

/**
 * Variables
 */
let camera, scene, renderer;
let world;
let lastTime = 0;
let stack = [];
let overhangs = [];
const boxHeight = 0.5;
const originalBoxSizeWidth = 2;
const originalBoxSizeDepth = 3;
let ignoreInput = true;
let autopilot = true;
let gameEnded = false;
let sound;
let musicInit = false;
let audioStopped = false;
let robotPrecision;
const minimumDelay = new Promise((resolve) => setTimeout(resolve, 2000));

/**
 * Initialization
 */
function setRobotPrecision() {
  robotPrecision = Math.random() * 1 - 0.5;
  // Let him cook! (or not)
  //robotPrecision = 0.0001;
}

function init() {
  setRobotPrecision();

  // Initialize CannonJS
  world = new CANNON.World();
  world.gravity.set(0, -10, 0);
  world.broadphase = new CANNON.NaiveBroadphase();
  world.solver.iterations = 40;

  // Initialize ThreeJS
  const aspect = window.innerWidth / window.innerHeight;
  const width = 10;
  const height = width / aspect;

  camera = new THREE.OrthographicCamera(
    width / -2,
    width / 2,
    height / 2,
    height / -2,
    0,
    100
  );

  camera.position.set(4, 4, 4);
  camera.lookAt(0, 0, 0);

  scene = new THREE.Scene();

  // Foundation
  addLayer(0, 0, originalBoxSizeWidth, originalBoxSizeDepth);

  // First layer
  addLayer(-10, 0, originalBoxSizeWidth, originalBoxSizeDepth, "x");

  // Set up lights
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambientLight);

  const dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
  dirLight.position.set(10, 20, 0);
  scene.add(dirLight);

  // Set up renderer
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setAnimationLoop(animation);
  document.body.appendChild(renderer.domElement);
}

/**
 * Event Listeners
 */
startButton.addEventListener('click', () => {
  const playerName = playerNameInput.value.trim();
  if (validatePlayerName(playerName)) {
    localStorage.setItem('playerName', playerName);
    try {

    addScore(playerName, 0);
  } catch (error) {
  }
    startGameWithName(playerName);
  }
});

window.addEventListener("mousedown", function (event) {
  if (event.button === 0 && event.target.classList.contains("leaderboard")) {
    leaderboard.style.opacity = 1;
    titleScreenElement.style.opacity = 0;
    ignoreInput = true;
    updateLeaderboard();
    return;
  } else if (leaderboard.style.opacity == 1 && ignoreInput) {
    removeLeaderboard();
    return;
  } else if (ignoreInput || event.button === 2) {
    return;
  } else {
    event.preventDefault();
    eventHandler();
  }
});

window.addEventListener("touchstart", function (event) {
  if (leaderboard.style.opacity == 1 && ignoreInput) {
    removeLeaderboard();
    return;
  } else if (ignoreInput) {
    return;
  } else if (event.target.classList.contains("leaderboard")) {
    leaderboard.style.opacity = 1;
    titleScreenElement.style.opacity = 0;
    ignoreInput = true;
    updateLeaderboard();
    return;
  } else {
    event.preventDefault();
    eventHandler();
  }

});
window.addEventListener("keydown", function (event) {
  if (event.key === " " && !ignoreInput) {
    event.preventDefault();
    eventHandler();
    return;
  } else if (leaderboard.style.opacity == 1 && ignoreInput) {
    removeLeaderboard();
  }
});

function removeLeaderboard() {
  leaderboard.style.opacity = 0;
  titleScreenElement.style.opacity = 1;
  ignoreInput = false;
  return;
}

window.addEventListener("resize", () => {
  const aspect = window.innerWidth / window.innerHeight;
  const width = 10;
  const height = width / aspect;

  camera.top = height / 2;
  camera.bottom = height / -2;

  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.render(scene, camera);
});

/**
 * Game Logic
 */
function validatePlayerName(username) {
  if (username.length === 0) {
    errorMessage.textContent = 'Name cannot be empty.';
    return false;
  }
  if (username.length > 12) {
    errorMessage.textContent = 'Name cannot be longer than 12 characters.';
    return false;
  }
  return true;
}

function startGameWithName(playerName) {
  initializeAuth(() => {
    // Successful authentication callback
    console.log('Authentication successful, initializing game...');
    nameScreen.style.display = 'none';
    showHighscore(() => {
      loadingScreen.style.opacity = 0;
      ignoreInput = false;
      init();
    });
  /*showHighscore(playerName, () => {
    loadingScreen.style.opacity = 0;
    ignoreInput = false;
    init();
  });*/
  }, (error) => {
    // Failure callback
    console.error('Authentication failed:', error);
  });
}

function startGame() {
  autopilot = false;
  gameEnded = false;
  lastTime = 0;
  stack = [];
  overhangs = [];

  if (audioStopped) {
    sound.play();
    audioStopped = false;
  }

  titleScreenElement.style.opacity = 0;
  gameOverElement.style.opacity = 0;
  gameScreen.style.opacity = 1;
  scoreElement.innerText = 0;

  resetWorldAndScene();
}

function resetWorldAndScene() {
  if (world) {
    while (world.bodies.length > 0) {
      world.remove(world.bodies[0]);
    }
  }

  if (scene) {
    while (scene.children.find(c => c.type === "Mesh")) {
      const mesh = scene.children.find(c => c.type === "Mesh");
      scene.remove(mesh);
    }
    addLayer(0, 0, originalBoxSizeWidth, originalBoxSizeDepth);
    addLayer(-10, 0, originalBoxSizeWidth, originalBoxSizeDepth, "x");
  }

  if (camera) {
    camera.position.set(4, 4, 4);
    camera.lookAt(0, 0, 0);
  }
}

function addLayer(x, z, width, depth, direction) {
  const y = boxHeight * stack.length;
  const layer = generateBox(x, y, z, width, depth, false);
  layer.direction = direction;
  stack.push(layer);
}

function addOverhang(x, z, width, depth) {
  const y = boxHeight * (stack.length - 1);
  const overhang = generateBox(x, y, z, width, depth, true);
  overhangs.push(overhang);
}

function generateBox(x, y, z, width, depth, falls) {
  const textureLoader = new THREE.TextureLoader();
  textureLoader.crossOrigin = 'anonymous';

  const configureTexture = (path) => {
    const texture = textureLoader.load(
      path,
      () => { /* console.log(`Texture loaded from ${path}`); */ },
      undefined,
      (err) => { console.error(`Error loading texture from ${path}`, err); }
    );
    texture.repeat.set(1, 1);
    return texture;
  };

  const textures = {
    top: configureTexture('textures/tb_top.png'),
    right: configureTexture('textures/tb_right.png'),
    side: configureTexture('textures/tb_side.png'),
    back: configureTexture('textures/tb_back.png')
  };

  const materials = [
    new THREE.MeshStandardMaterial({ map: textures.right }), // right side
    new THREE.MeshStandardMaterial({ color: 0x004389 }), // left side (just the blue of the book)
    new THREE.MeshStandardMaterial({ map: textures.top }), // top side
    new THREE.MeshStandardMaterial({ map: textures.back }), // bottom side
    new THREE.MeshStandardMaterial({ map: textures.side }), // front side
    new THREE.MeshStandardMaterial({ map: textures.side })  // back side
  ];

  const geometry = new THREE.BoxGeometry(width, boxHeight, depth);

  const mesh = new THREE.Mesh(geometry, materials);
  mesh.position.set(x, y, z);
  scene.add(mesh);

  const shape = new CANNON.Box(new CANNON.Vec3(width / 2, boxHeight / 2, depth / 2));
  let mass = falls ? 5 : 0;
  mass *= width / originalBoxSizeWidth;
  mass *= depth / originalBoxSizeDepth;
  const body = new CANNON.Body({ mass, shape });
  body.position.set(x, y, z);
  world.addBody(body);

  return { threejs: mesh, cannonjs: body, width, depth };
}

function cutBox(topLayer, overlap, size, delta) {
  const direction = topLayer.direction;
  const newWidth = direction === "x" ? overlap : topLayer.width;
  const newDepth = direction === "z" ? overlap : topLayer.depth;

  // Update metadata
  topLayer.width = newWidth;
  topLayer.depth = newDepth;

  // Update ThreeJS model
  topLayer.threejs.scale[direction] = overlap / size;
  topLayer.threejs.position[direction] -= delta / 2;

  // Update CannonJS model
  topLayer.cannonjs.position[direction] -= delta / 2;

  // Replace shape with a smaller one (in CannonJS you can't simply scale a shape)
  const shape = new CANNON.Box(new CANNON.Vec3(newWidth / 2, boxHeight / 2, newDepth / 2));
  topLayer.cannonjs.shapes = [];
  topLayer.cannonjs.addShape(shape);

  // Adjust UV mapping for ThreeJS geometry
  adjustUVs(topLayer.threejs.geometry, size, overlap, direction, delta);
}

function adjustUVs(geometry, originalSize, newSize, direction, delta) {
  const uvAttr = geometry.attributes.uv;
  if (!uvAttr) return;

  const uvArray = uvAttr.array;

  for (let i = 0; i < uvArray.length; i += 2) {
    if (direction === "x") {
      uvArray[i] = (uvArray[i] * originalSize - delta) / newSize;
    } else {
      uvArray[i + 1] = (uvArray[i + 1] * originalSize - delta) / newSize;
    }
  }

  uvAttr.needsUpdate = true;
}

function eventHandler() {
  if (!musicInit) {
    musicInit = true;
    const listener = new THREE.AudioListener();
    camera.add(listener);

    sound = new THREE.Audio(listener);
    const audioLoader = new THREE.AudioLoader();
    audioLoader.load('/sounds/BackgroundMusic.mp3', function (buffer) {
      sound.setBuffer(buffer);
      sound.setLoop(true);
      sound.setVolume(0.05);
      sound.play();
    });
  }

  if (autopilot) {
    startGame();
  } else if (gameEnded) {
    handleRestart();
  } else {
    splitBlockAndAddNextOneIfOverlaps();
  }
}

function handleRestart() {
  if (!autopilot) {
    gameOverElement.style.opacity = 0;
    titleScreenElement.style.opacity = 1;
    gameScreen.style.opacity = 0;
  }
  autopilot = true;
  gameEnded = false;
  lastTime = 0;
  stack = [];
  overhangs = [];
  setRobotPrecision();

  if (world) {
    while (world.bodies.length > 0) {
      world.remove(world.bodies[0]);
    }
  }

  if (scene) {
    while (scene.children.find((c) => c.type === "Mesh")) {
      const mesh = scene.children.find((c) => c.type === "Mesh");
      scene.remove(mesh);
    }

    addLayer(0, 0, originalBoxSizeWidth, originalBoxSizeDepth);
    addLayer(-10, 0, originalBoxSizeWidth, originalBoxSizeDepth, "x");
  }

  if (camera) {
    camera.position.set(4, 4, 4);
    camera.lookAt(0, 0, 0);
  }
}

function splitBlockAndAddNextOneIfOverlaps() {
  if (gameEnded) return;

  const topLayer = stack[stack.length - 1];
  const previousLayer = stack[stack.length - 2];

  const direction = topLayer.direction;

  const size = direction === "x" ? topLayer.width : topLayer.depth;
  const delta = topLayer.threejs.position[direction] - previousLayer.threejs.position[direction];
  const overhangSize = Math.abs(delta);
  const overlap = size - overhangSize;

  if (overlap > 0) {
    cutBox(topLayer, overlap, size, delta);

    const overhangShift = (overlap / 2 + overhangSize / 2) * Math.sign(delta);
    const overhangX = direction === "x" ? topLayer.threejs.position.x + overhangShift : topLayer.threejs.position.x;
    const overhangZ = direction === "z" ? topLayer.threejs.position.z + overhangShift : topLayer.threejs.position.z;
    const overhangWidth = direction === "x" ? overhangSize : topLayer.width;
    const overhangDepth = direction === "z" ? overhangSize : topLayer.depth;

    addOverhang(overhangX, overhangZ, overhangWidth, overhangDepth);

    const nextX = direction === "x" ? topLayer.threejs.position.x : -10;
    const nextZ = direction === "z" ? topLayer.threejs.position.z : -10;
    const newWidth = topLayer.width;
    const newDepth = topLayer.depth;
    const nextDirection = direction === "x" ? "z" : "x";

    scoreElement.innerText = stack.length - 1;

    addLayer(nextX, nextZ, newWidth, newDepth, nextDirection);
  } else {
    missedTheSpot();
  }
}

function missedTheSpot() {
  const topLayer = stack[stack.length - 1];

  addOverhang(topLayer.threejs.position.x, topLayer.threejs.position.z, topLayer.width, topLayer.depth);
  world.remove(topLayer.cannonjs);
  scene.remove(topLayer.threejs);

  gameEnded = true;

  if (autopilot) {
    handleRestart();
  }

  if (gameOverElement && !autopilot) {
    sound.stop();
    audioStopped = true;
    scoreResultElement.innerText = stack.length - 2;
    gameOverElement.style.opacity = 1;
    gameScreen.style.opacity = 0;
    const playerName = localStorage.getItem('playerName');
    try {
    addScore(playerName, stack.length - 2).then(() => {
      updateLeaderboard();
    });
  } catch (error) {
    //console.log(error);
  }
  }
}

function animation(time) {
  if (lastTime) {
    const timePassed = time - lastTime;
    const speed = 0.008;

    const topLayer = stack[stack.length - 1];
    const previousLayer = stack[stack.length - 2];

    const boxShouldMove =
      !gameEnded &&
      (!autopilot ||
        (autopilot &&
          topLayer.threejs.position[topLayer.direction] <
            previousLayer.threejs.position[topLayer.direction] + robotPrecision));

    if (boxShouldMove) {
      topLayer.threejs.position[topLayer.direction] += speed * timePassed;
      topLayer.cannonjs.position[topLayer.direction] += speed * timePassed;

      if (topLayer.threejs.position[topLayer.direction] > 10) {
        missedTheSpot();
      }
    } else {
      if (autopilot) {
        splitBlockAndAddNextOneIfOverlaps();
        setRobotPrecision();
      }
    }

    if (camera.position.y < boxHeight * (stack.length - 2) + 4) {
      camera.position.y += speed * timePassed;
    }

    updatePhysics(timePassed);
    renderer.render(scene, camera);
  }
  lastTime = time;
}

function updatePhysics(timePassed) {
  world.step(timePassed / 1000);

  overhangs.forEach((element) => {
    element.threejs.position.copy(element.cannonjs.position);
    element.threejs.quaternion.copy(element.cannonjs.quaternion);
  });
}

// Initial loading of the game
window.onload = function() {
  loadingScreen.style.opacity = 1;
  const playerName = localStorage.getItem('playerName');
  if (playerName) {
    minimumDelay.then(() => {
      startGameWithName(playerName);
    });
  } else {
    minimumDelay.then(() => {
      loadingScreen.style.opacity = 0;
      nameScreen.style.visibility = 'visible';
    });
  }
};

function updateLeaderboard() {
  const playerName = localStorage.getItem('playerName');
  getLeaderboard((scores) => {
    const leaderboardList = document.getElementById('leaderboard-list');
    leaderboardList.innerHTML = '';

    if (scores.length === 0) {
      const noScoresItem = document.createElement('li');
      noScoresItem.textContent = 'No scores yet. Be the first to play!';
      noScoresItem.style.fontSize = 'initial';
      leaderboardList.appendChild(noScoresItem);
      return;
    }

    let playerInTopTen = false;

    scores.forEach((score, index) => {
      const listItem = document.createElement('li');

      // Set color based on rank
      if (index === 0) {
        listItem.style.color = 'gold';
      } else if (index === 1) {
        listItem.style.color = 'silver';
      } else if (index === 2) {
        listItem.style.color = 'brown';
      } else {
        listItem.style.color = 'white';
      }

      // Add sparkle effect to the player's own entry if they are in the top 10
      if (score.username === playerName) {
        listItem.classList.add('sparkle');
        playerInTopTen = true;
      }

      // Format the score
      let formattedScore = score.score.toString().padStart(6, '0');

      // Calculate dots
      let dots = '.'.repeat(12 - score.username.length + 3);

      listItem.textContent = `${index + 1}. ${score.username}${dots}${formattedScore}`;
      leaderboardList.appendChild(listItem);
    });

    // If the player is not in the top 10, add their entry after the 10th entry
    if (!playerInTopTen) {
      const ownEntry = document.createElement('li');
      ownEntry.classList.add('sparkle');

      getPersonalScore(playerName, (score, rank) => {
        // Format the player's score
        let formattedScore = score.toString().padStart(6, '0');

        // Calculate dots
        let dots = '.'.repeat(12 - playerName.length + 3);

        ownEntry.textContent = `${rank}. ${playerName}${dots}${formattedScore}`;
        leaderboardList.appendChild(ownEntry);
    });
    }
  });
}





