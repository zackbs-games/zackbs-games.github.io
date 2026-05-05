import { createHuman } from '../entities/Human.js';
import { LANES } from '../grid.js';

// Each wave is an array of spawn events: { delay, type, lane }
// delay is seconds from wave start (or from previous spawn)
const WAVES = [
  // Wave 1 — just youngsters
  [
    { delay: 0,   type: 'youngster', lane: -1 },
    { delay: 3,   type: 'youngster', lane: -1 },
    { delay: 6,   type: 'youngster', lane: -1 },
  ],
  // Wave 2 — mix
  [
    { delay: 0,   type: 'youngster',  lane: -1 },
    { delay: 2,   type: 'bugCatcher', lane: -1 },
    { delay: 4,   type: 'youngster',  lane: -1 },
    { delay: 6,   type: 'bugCatcher', lane: -1 },
    { delay: 8,   type: 'youngster',  lane: -1 },
  ],
  // Wave 3 — hiker appears
  [
    { delay: 0,   type: 'bugCatcher', lane: -1 },
    { delay: 2,   type: 'hiker',      lane: -1 },
    { delay: 4,   type: 'youngster',  lane: -1 },
    { delay: 5,   type: 'bugCatcher', lane: -1 },
    { delay: 7,   type: 'hiker',      lane: -1 },
    { delay: 10,  type: 'youngster',  lane: -1 },
  ],
  // Wave 4 — swimmers rush
  [
    { delay: 0,   type: 'swimmer',    lane: -1 },
    { delay: 1,   type: 'swimmer',    lane: -1 },
    { delay: 2,   type: 'hiker',      lane: -1 },
    { delay: 3,   type: 'bugCatcher', lane: -1 },
    { delay: 5,   type: 'swimmer',    lane: -1 },
    { delay: 7,   type: 'hiker',      lane: -1 },
    { delay: 9,   type: 'swimmer',    lane: -1 },
  ],
  // Wave 5 — Gym Leader boss wave
  [
    { delay: 0,   type: 'youngster',  lane: -1 },
    { delay: 1,   type: 'bugCatcher', lane: -1 },
    { delay: 2,   type: 'hiker',      lane: -1 },
    { delay: 3,   type: 'swimmer',    lane: -1 },
    { delay: 6,   type: 'gymLeader',  lane: 2  },
    { delay: 8,   type: 'bugCatcher', lane: -1 },
    { delay: 10,  type: 'hiker',      lane: -1 },
    { delay: 12,  type: 'swimmer',    lane: -1 },
  ],
  // Wave 6 — Double gym leaders
  [
    { delay: 0,   type: 'swimmer',    lane: -1 },
    { delay: 1,   type: 'hiker',      lane: -1 },
    { delay: 2,   type: 'swimmer',    lane: -1 },
    { delay: 3,   type: 'bugCatcher', lane: -1 },
    { delay: 5,   type: 'gymLeader',  lane: 1  },
    { delay: 5,   type: 'gymLeader',  lane: 3  },
    { delay: 8,   type: 'hiker',      lane: -1 },
    { delay: 9,   type: 'swimmer',    lane: -1 },
    { delay: 11,  type: 'hiker',      lane: -1 },
    { delay: 13,  type: 'bugCatcher', lane: -1 },
  ],
  // Wave 7 — Swarm: fast spawns, all types
  [
    { delay: 0,   type: 'youngster',  lane: 0  },
    { delay: 0,   type: 'youngster',  lane: 4  },
    { delay: 1,   type: 'bugCatcher', lane: -1 },
    { delay: 2,   type: 'swimmer',    lane: -1 },
    { delay: 3,   type: 'hiker',      lane: -1 },
    { delay: 4,   type: 'swimmer',    lane: -1 },
    { delay: 5,   type: 'bugCatcher', lane: -1 },
    { delay: 6,   type: 'hiker',      lane: -1 },
    { delay: 7,   type: 'gymLeader',  lane: 2  },
    { delay: 8,   type: 'swimmer',    lane: -1 },
    { delay: 9,   type: 'hiker',      lane: -1 },
    { delay: 10,  type: 'swimmer',    lane: -1 },
    { delay: 12,  type: 'gymLeader',  lane: -1 },
  ],
  // Wave 8 — Elite Four warmup: heavy hitters flanked by support
  [
    { delay: 0,   type: 'hiker',      lane: 0  },
    { delay: 0,   type: 'hiker',      lane: 4  },
    { delay: 2,   type: 'swimmer',    lane: -1 },
    { delay: 3,   type: 'gymLeader',  lane: 1  },
    { delay: 3,   type: 'hiker',      lane: 3  },
    { delay: 5,   type: 'swimmer',    lane: -1 },
    { delay: 6,   type: 'bugCatcher', lane: -1 },
    { delay: 7,   type: 'gymLeader',  lane: 3  },
    { delay: 9,   type: 'swimmer',    lane: -1 },
    { delay: 10,  type: 'hiker',      lane: -1 },
    { delay: 11,  type: 'gymLeader',  lane: 2  },
    { delay: 13,  type: 'swimmer',    lane: -1 },
    { delay: 14,  type: 'bugCatcher', lane: -1 },
  ],
  // Wave 9 — All-out assault: non-stop with four gym leaders
  [
    { delay: 0,   type: 'swimmer',    lane: -1 },
    { delay: 1,   type: 'hiker',      lane: -1 },
    { delay: 2,   type: 'gymLeader',  lane: 0  },
    { delay: 2,   type: 'swimmer',    lane: 2  },
    { delay: 3,   type: 'hiker',      lane: -1 },
    { delay: 4,   type: 'gymLeader',  lane: 4  },
    { delay: 5,   type: 'swimmer',    lane: -1 },
    { delay: 6,   type: 'hiker',      lane: -1 },
    { delay: 7,   type: 'gymLeader',  lane: 1  },
    { delay: 8,   type: 'swimmer',    lane: -1 },
    { delay: 9,   type: 'bugCatcher', lane: -1 },
    { delay: 10,  type: 'gymLeader',  lane: 3  },
    { delay: 11,  type: 'swimmer',    lane: -1 },
    { delay: 12,  type: 'hiker',      lane: -1 },
    { delay: 13,  type: 'swimmer',    lane: -1 },
  ],
  // Wave 10 — Champion's Final Stand
  [
    { delay: 0,   type: 'gymLeader',  lane: 0  },
    { delay: 0,   type: 'gymLeader',  lane: 4  },
    { delay: 2,   type: 'swimmer',    lane: -1 },
    { delay: 2,   type: 'hiker',      lane: 2  },
    { delay: 4,   type: 'gymLeader',  lane: 2  },
    { delay: 5,   type: 'swimmer',    lane: -1 },
    { delay: 6,   type: 'hiker',      lane: -1 },
    { delay: 7,   type: 'swimmer',    lane: -1 },
    { delay: 8,   type: 'gymLeader',  lane: 1  },
    { delay: 8,   type: 'gymLeader',  lane: 3  },
    { delay: 10,  type: 'swimmer',    lane: -1 },
    { delay: 11,  type: 'hiker',      lane: -1 },
    { delay: 12,  type: 'swimmer',    lane: -1 },
    { delay: 13,  type: 'gymLeader',  lane: -1 },
    { delay: 14,  type: 'hiker',      lane: -1 },
    { delay: 15,  type: 'gymLeader',  lane: -1 },
  ],
];

export class WaveManager {
  constructor(grid) {
    this.grid = grid;
    this.waveIndex = 0;
    this.spawnQueue = [];   // remaining events for current wave
    this.timer = 0;
    this.waveActive = false;
    this.waveCountdown = 10; // seconds before first wave
    this.countingDown = true;
    this.allWavesDone = false;
    this.onSpawn = null;     // callback: (human) => void
    this.bannerTimer = 0;
    this.bannerText = '';
  }

  get totalWaves() { return WAVES.length; }

  startCountdown(seconds = 10) {
    this.waveCountdown = seconds;
    this.countingDown = true;
  }

  update(dt, livingHumans) {
    this.bannerTimer = Math.max(0, this.bannerTimer - dt);

    if (this.countingDown) {
      this.waveCountdown -= dt;
      if (this.waveCountdown <= 0) {
        this.countingDown = false;
        this._startWave(this.waveIndex);
      }
      return;
    }

    if (this.waveActive) {
      this.timer += dt;
      while (this.spawnQueue.length > 0 && this.timer >= this.spawnQueue[0].delay) {
        const evt = this.spawnQueue.shift();
        const lane = evt.lane >= 0 ? evt.lane : Math.floor(Math.random() * LANES);
        const human = createHuman(evt.type, this.grid.spawnX(), this.grid.laneY(lane));
        human.lane = lane;
        if (this.onSpawn) this.onSpawn(human);
      }

      // Wave ends when queue empty AND no humans alive
      if (this.spawnQueue.length === 0 && livingHumans === 0) {
        this.waveActive = false;
        this.waveIndex++;
        if (this.waveIndex >= WAVES.length) {
          this.allWavesDone = true;
        } else {
          this.startCountdown(15);
          this.bannerText = `Wave ${this.waveIndex + 1} incoming!`;
          this.bannerTimer = 3;
        }
      }
    }
  }

  _startWave(idx) {
    if (idx >= WAVES.length) { this.allWavesDone = true; return; }
    const template = WAVES[idx];
    // Convert relative delays to absolute
    let cumulative = 0;
    this.spawnQueue = template.map(e => {
      cumulative += e.delay;
      return { delay: cumulative, type: e.type, lane: e.lane };
    });
    this.timer = 0;
    this.waveActive = true;
    this.bannerText = `Wave ${idx + 1}!`;
    this.bannerTimer = 2.5;
  }
}
