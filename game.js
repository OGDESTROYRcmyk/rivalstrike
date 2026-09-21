import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js";

const menu = document.getElementById("menu");
const game = document.getElementById("game");
const canvas = document.getElementById("scene");
const playBtn = document.getElementById("playBtn");
const resumeBtn = document.getElementById("resumeBtn");
const homeBtn = document.getElementById("homeBtn");
const pause = document.getElementById("pause");
const energyEl = document.getElementById("energy");
const tagsEl = document.getElementById("tags");
const timeEl = document.getElementById("time");
const hint = document.getElementById("hint");

let scene, camera, renderer, clock;
let player, playerVelocityY = 0;
let yaw = 0, pitch = 0;
let playing = false, paused = false;
let energy = 100, tags = 0, timeLeft = 120;
let keys = {};
let enemies = [];
let lastTime = 0;
let roundOver = false;

const arenaSize = 46;
const moveSpeed = 8;
const sprintSpeed = 12;
const gravity = 24;
const jumpPower = 8.5;

playBtn.onclick = startGame;
resumeBtn.onclick = () => {
  paused = false;
  pause.hidden = true;
  lockMouse();
};
homeBtn.onclick = () => {
  unlockMouse();
  paused = false;
  playing = false;
  game.hidden = true;
  menu.hidden = false;
};

window.addEventListener("keydown", (e) => {
  keys[e.key.toLowerCase()] = true;
  if (e.code === "Space") e.preventDefault();
  if (e.code === "Space" && player && player.position.y <= 1.01) playerVelocityY = jumpPower;
  if (e.key === "Escape" && playing && !roundOver) togglePause();
});

window.addEventListener("keyup", (e) => {
  keys[e.key.toLowerCase()] = false;
});

document.addEventListener("mousemove", (e) => {
  if (!playing || paused || document.pointerLockElement !== canvas) return;
  yaw -= e.movementX * 0.0025;
  pitch -= e.movementY * 0.0025;
  pitch = Math.max(-1.25, Math.min(1.25, pitch));
});

canvas.addEventListener("click", () => {
  if (playing && !paused) lockMouse();
});

document.addEventListener("pointerlockchange", () => {
  if (playing && !paused && document.pointerLockElement !== canvas) {
    hint.style.display = "block";
  } else {
    hint.style.display = "none";
  }
});

function lockMouse(){ canvas.requestPointerLock?.(); }

function unlockMouse(){
  if (document.pointerLockElement) document.exitPointerLock();
}

function setup3D(){
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0c1118);
  scene.fog = new THREE.Fog(0x0c1118, 35, 95);

  camera = new THREE.PerspectiveCamera(75, innerWidth / innerHeight, 0.1, 200);

  renderer = new THREE.WebGLRenderer({canvas, antialias:true});
  renderer.setPixelRatio(Math.min(devicePixelRatio,2));
  renderer.setSize(innerWidth, innerHeight);

  clock = new THREE.Clock();

  const hemi = new THREE.HemisphereLight(0xbfd7ff,0x17202b,2.2);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(0xffffff,2.5);
  sun.position.set(10,25,8);
  scene.add(sun);

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(arenaSize,arenaSize),
    new THREE.MeshStandardMaterial({color:0x202a32,roughness:.95})
  );
  floor.rotation.x=-Math.PI/2;
  scene.add(floor);

  const grid = new THREE.GridHelper(arenaSize,23,0x536170,0x323e49);
  grid.position.y=.01;
  scene.add(grid);

  const wallMat = new THREE.MeshStandardMaterial({color:0x36434f});
  const walls = [
    [arenaSize,3,1,0,1.5,-arenaSize/2],
    [arenaSize,3,1,0,1.5,arenaSize/2],
    [1,3,arenaSize,-arenaSize/2,1.5,0],
    [1,3,arenaSize,arenaSize/2,1.5,0]
  ];
  for(const [w,h,d,x,y,z] of walls){
    const m = new THREE.Mesh(new THREE.BoxGeometry(w,h,d),wallMat);
    m.position.set(x,y,z);
    scene.add(m);
  }

  addCover(-12,1.7,-7,5,3,2.5);
  addCover(10,2.2,-10,4,4,2.5);
  addCover(0,1.3,8,6,2.4,2.2);
  addCover(15,1.1,8,3,2,4);
  addCover(-16,1.2,12,4,2.2,3);

  const pad = new THREE.Mesh(
    new THREE.CylinderGeometry(4,4,.15,32),
    new THREE.MeshStandardMaterial({color:0x334e67,emissive:0x0b1724,emissiveIntensity:.7})
  );
  pad.position.set(0,.08,0);
  scene.add(pad);

  player = new THREE.Object3D();
  player.position.set(0,1,14);
  scene.add(player);
  player.add(camera);
  camera.position.set(0,1.0,0);

  spawnEnemies();
}

function addCover(x,y,z,w,h,d){
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(w,h,d),
    new THREE.MeshStandardMaterial({color:0x4a5966,roughness:.85})
  );
  mesh.position.set(x,y,z);
  scene.add(mesh);
}

function makeEnemy(color=0xc85a5a){
  const g = new THREE.Group();

  const body = new THREE.Mesh(
    new THREE.BoxGeometry(.8,1.5,.7),
    new THREE.MeshStandardMaterial({color,roughness:.8})
  );
  body.position.y=.75;
  g.add(body);

  const head = new THREE.Mesh(
    new THREE.SphereGeometry(.42,16,12),
    new THREE.MeshStandardMaterial({color:0xf07a7a,roughness:.7})
  );
  head.position.y=1.8;
  g.add(head);

  return g;
}

function spawnEnemies(){
  for(const e of enemies) scene.remove(e);
  enemies=[];

  const starts=[
    [-18,1,-16],[18,1,-14],[-18,1,15],[18,1,16],[-2,1,-20]
  ];

  for(const pos of starts){
    const e=makeEnemy();
    e.position.set(...pos);
    e.userData.speed=2.1+Math.random()*.8;
    e.userData.active=true;
    scene.add(e);
    enemies.push(e);
  }
}

function startGame(){
  if(!scene) setup3D();
  playing=true;
  paused=false;
  roundOver=false;
  energy=100;
  tags=0;
  timeLeft=120;
  lastTime=performance.now();
  player.position.set(0,1,14);
  yaw=0;
  pitch=0;
  spawnEnemies();
  updateHud();
  menu.hidden=true;
  game.hidden=false;
  hint.style.display="block";
  lockMouse();
  clock.start();
}

function togglePause(){
  paused=!paused;
  pause.hidden=!paused;
  if(paused) unlockMouse(); else lockMouse();
}

function updateHud(){
  energyEl.textContent=Math.max(0,Math.round(energy));
  tagsEl.textContent=tags;
  timeEl.textContent=Math.max(0,Math.ceil(timeLeft));
}

function movePlayer(dt){
  const speed=(keys.shift?sprintSpeed:moveSpeed);
  const forward=new THREE.Vector3(-Math.sin(yaw),0,-Math.cos(yaw));
  const right=new THREE.Vector3(Math.cos(yaw),0,-Math.sin(yaw));
  const dir=new THREE.Vector3();

  if(keys.w) dir.add(forward);
  if(keys.s) dir.sub(forward);
  if(keys.d) dir.add(right);
  if(keys.a) dir.sub(right);

  if(dir.lengthSq()>0) dir.normalize().multiplyScalar(speed*dt);

  player.position.add(dir);

  player.position.x=THREE.MathUtils.clamp(player.position.x,-21.5,21.5);
  player.position.z=THREE.MathUtils.clamp(player.position.z,-21.5,21.5);

  playerVelocityY-=gravity*dt;
  player.position.y+=playerVelocityY*dt;

  if(player.position.y<1){
    player.position.y=1;
    playerVelocityY=0;
  }

  player.rotation.y=yaw;
  camera.rotation.x=pitch;
}

function updateEnemies(dt){
  for(const e of enemies){
    if(!e.userData.active) continue;

    const dx=player.position.x-e.position.x;
    const dz=player.position.z-e.position.z;
    const dist=Math.hypot(dx,dz);

    if(dist>1.55){
      e.position.x+=(dx/dist)*e.userData.speed*dt;
      e.position.z+=(dz/dist)*e.userData.speed*dt;
      e.lookAt(player.position.x,e.position.y,player.position.z);
    } else {
      energy-=dt*13;
      if(energy<=0){
        energy=100;
        player.position.set(0,1,14);
      }
    }

    e.position.x=THREE.MathUtils.clamp(e.position.x,-21,21);
    e.position.z=THREE.MathUtils.clamp(e.position.z,-21,21);
  }
}

function tagNearest(){
  let target=null;
  let best=3.2;

  const facing=new THREE.Vector3(0,0,-1).applyQuaternion(camera.quaternion);
  const origin=new THREE.Vector3();
  camera.getWorldPosition(origin);

  for(const e of enemies){
    if(!e.userData.active) continue;
    const v=e.position.clone().add(new THREE.Vector3(0,1,0)).sub(origin);
    const dist=v.length();
    const dot=facing.dot(v.normalize());

    if(dist<best && dot>.82){
      best=dist;
      target=e;
    }
  }

  if(target){
    tags++;
    target.position.set((Math.random()*38)-19,1,(Math.random()*38)-19);
    updateHud();
  }
}

window.addEventListener("mousedown",(e)=>{
  if(e.button===0 && playing && !paused && document.pointerLockElement===canvas){
    tagNearest();
  }
});

function tick(){
  requestAnimationFrame(tick);
  const now=performance.now();
  let dt=Math.min((now-lastTime)/1000,.05);
  lastTime=now;

  if(playing && !paused && !roundOver){
    movePlayer(dt);
    updateEnemies(dt);
    timeLeft-=dt;

    if(timeLeft<=0){
      timeLeft=0;
      roundOver=true;
      unlockMouse();
      hint.textContent="ROUND OVER — PRESS ESC THEN PLAY AGAIN";
    }
    updateHud();
  }

  if(renderer && scene && camera) renderer.render(scene,camera);
}

window.addEventListener("resize",()=>{
  if(camera && renderer){
    camera.aspect=innerWidth/innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth,innerHeight);
  }
});

tick();
