const $ = (id) => document.getElementById(id);

let playing = false;
let paused = false;
let hp = 100;
let kills = 0;
let ammo = 12;
let keys = {};
let bots = [];

$("play").onclick = start;
$("resume").onclick = () => {
  paused = false;
  $("pause").hidden = true;
};
$("home").onclick = home;

document.addEventListener("keydown", (e) => {
  keys[e.key.toLowerCase()] = true;

  if (e.key.toLowerCase() === "r") reload();

  if (e.key === "Escape" && playing) {
    paused = !paused;
    $("pause").hidden = !paused;
  }
});

document.addEventListener("keyup", (e) => {
  keys[e.key.toLowerCase()] = false;
});

document.addEventListener("mousedown", (e) => {
  if (e.button === 0 && playing && !paused) shoot();
});

function start() {
  playing = true;
  paused = false;
  hp = 100;
  kills = 0;
  ammo = 12;

  $("menu").hidden = true;
  $("game").hidden = false;
  $("pause").hidden = true;

  $("message").textContent = "";
  spawnBots();
  updateHud();
}

function home() {
  playing = false;
  paused = false;
  $("game").hidden = true;
  $("menu").hidden = false;
  $("bots").innerHTML = "";
  bots = [];
}

function updateHud() {
  $("hp").textContent = hp;
  $("kills").textContent = kills;
  $("ammo").textContent = ammo;
}

function reload() {
  if (!playing || paused || ammo === 12) return;

  $("message").textContent = "RELOADING...";

  setTimeout(() => {
    if (playing && !paused) {
      ammo = 12;
      $("message").textContent = "";
      updateHud();
    }
  }, 650);
}

function shoot() {
  if (ammo <= 0) {
    $("message").textContent = "PRESS R TO RELOAD";
    return;
  }

  ammo--;

  const alive = bots.filter((b) => b.alive);

  if (alive.length > 0) {
    const target = alive[Math.floor(Math.random() * alive.length)];
    target.alive = false;
    target.el.remove();

    kills++;
    $("message").textContent = "ELIMINATED";

    setTimeout(() => {
      if (playing) $("message").textContent = "";
    }, 350);

    if (kills % 4 === 0) spawnBots();
  }

  updateHud();
}

function spawnBots() {
  bots = [];
  $("bots").innerHTML = "";

  for (let i = 0; i < 4; i++) {
    const el = document.createElement("div");
    el.className = "bot";

    el.style.left = (10 + Math.random() * 78) + "%";
    el.style.top = (25 + Math.random() * 43) + "%";

    const bot = {
      el,
      alive: true
    };

    bots.push(bot);
    $("bots").appendChild(el);
  }
}

function update() {
  if (!playing || paused) return;

  const player = $("player");

  let x = Number(player.dataset.x || 50);
  let y = Number(player.dataset.y || 62);
  const speed = 0.35;

  if (keys.w) y -= speed;
  if (keys.s) y += speed;
  if (keys.a) x -= speed;
  if (keys.d) x += speed;

  x = Math.max(3, Math.min(97, x));
  y = Math.max(25, Math.min(88, y));

  player.dataset.x = x;
  player.dataset.y = y;
  player.style.left = x + "%";
  player.style.top = y + "%";

  if (Math.random() < 0.018) {
    hp -= 10;

    if (hp <= 0) {
      hp = 0;
      updateHud();
      $("message").textContent = "ELIMINATED";

      setTimeout(() => {
        if (playing) start();
      }, 900);

      return;
    }

    updateHud();
  }
}

function loop() {
  update();
  requestAnimationFrame(loop);
}

loop();
