<!-- app.vue -->
<template>
  <div class="container">
    <h1>Clay Shooting Score Tracker</h1>
    
    <div class="settings">
      <div class="add-shooter">
        <input v-model="newShooterName" placeholder="Enter shooter name" />
        <button @click="addShooter" :disabled="shooters.length >= 8 || !newShooterName">Add Shooter</button>
      </div>
      <button v-if="rounds.length === 0" @click="autoSetup" class="auto-setup">Auto Configure Rounds to 50 Shots</button>
    </div>
    
    <div v-if="shooters.length === 0" class="no-shooters">Add up to 8 shooters to start.</div>
    
    <div v-else>
      <div class="round-tabs">
        <button @click="currentView = -1" :class="{ active: currentView === -1 }">Summary</button>
        <button v-for="(round, index) in rounds" :key="index" @click="currentView = index" :class="{ active: currentView === index }">Round {{ index + 1 }}</button>
        <button v-if="remaining > 0" @click="showAddRound = !showAddRound">+</button>
      </div>
      
      <div v-if="showAddRound && remaining > 0" class="add-round">
        <label>Add Round ({{ remaining }} shots left):</label>
        <select v-model="newNumShots">
          <option v-for="opt in availableOptions" :key="opt" :value="opt">{{ opt }}</option>
        </select>
        <button @click="addRound" :disabled="!newNumShots">Add</button>
      </div>
      
      <div v-if="currentTotal !== 50" class="warning">Total shots: {{ currentTotal }} / 50. Add more rounds if needed.</div>
      
      <div class="content">
        <div v-if="currentView === -1">
          <table class="summary-table">
            <thead>
              <tr>
                <th>Shooter</th>
                <th v-for="(round, rindex) in rounds" :key="rindex">Round {{ rindex + 1 }} ({{ round.numShots }})</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(shooter, sindex) in shooters" :key="sindex">
                <td>{{ shooter.name }}</td>
                <td v-for="(rs, rindex) in shooter.roundScores" :key="rindex">
                  {{ getRoundScore(shooter, rindex) }} / {{ rounds[rindex].numShots }}
                </td>
                <td>{{ getTotalScore(shooter) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        
        <div v-else class="round-view">
          <h2>Round {{ currentView + 1 }} ({{ rounds[currentView].numShots }} shots)</h2>
          <div v-for="(shooter, sindex) in shooters" :key="sindex" class="shooter-row">
            <div class="shooter-name">{{ shooter.name }}</div>
            <div class="shots">
              <button
                v-for="(shot, shotIndex) in shooter.roundScores[currentView].shots"
                :key="shotIndex"
                :class="['shot-toggle', { hit: shot, miss: !shot }]"
                @click="toggleShot(sindex, currentView, shotIndex)"
              >
                {{ shot ? 'O' : 'X' }}
              </button>
            </div>
            <div class="score">Score: {{ getRoundScore(shooter, currentView) }} / {{ rounds[currentView].numShots }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';

const targetShots = 50;
const newShooterName = ref('');
const shooters = ref([]);
const rounds = ref([]);
const currentView = ref(-1);
const showAddRound = ref(false);
const newNumShots = ref(null);

const currentTotal = computed(() => rounds.value.reduce((sum, r) => sum + r.numShots, 0));
const remaining = computed(() => targetShots - currentTotal.value);

const availableOptions = computed(() => {
  if (remaining.value <= 0) return [];
  const min = remaining.value < 4 ? 1 : 4;
  const max = Math.min(6, remaining.value);
  return Array.from({ length: max - min + 1 }, (_, i) => max - i); // descending
});

const addShooter = () => {
  if (shooters.value.length < 8 && newShooterName.value) {
    shooters.value.push({
      name: newShooterName.value,
      roundScores: rounds.value.map(r => ({ shots: Array(r.numShots).fill(false) }))
    });
    newShooterName.value = '';
  }
};

const addRound = () => {
  if (newNumShots.value && newNumShots.value <= remaining.value) {
    rounds.value.push({ numShots: newNumShots.value });
    shooters.value.forEach(s => {
      s.roundScores.push({ shots: Array(newNumShots.value).fill(false) });
    });
    newNumShots.value = null;
    showAddRound.value = false;
  }
};

const autoSetup = () => {
  if (rounds.value.length > 0) return;
  let configs = [];
  let total = 0;
  [4, 5].forEach(n => {
    if (total + n <= targetShots) {
      configs.push(n);
      total += n;
    }
  });
  while (total + 6 <= targetShots) {
    configs.push(6);
    total += 6;
  }
  const rem = targetShots - total;
  if (rem > 0) configs.push(rem);
  rounds.value = configs.map(numShots => ({ numShots }));
  shooters.value.forEach(s => {
    s.roundScores = rounds.value.map(r => ({ shots: Array(r.numShots).fill(false) }));
  });
};

const toggleShot = (shooterIndex, roundIndex, shotIndex) => {
  const shots = shooters.value[shooterIndex].roundScores[roundIndex].shots;
  shots[shotIndex] = !shots[shotIndex];
};

const getRoundScore = (shooter, roundIndex) => {
  return shooter.roundScores[roundIndex].shots.filter(Boolean).length;
};

const getTotalScore = (shooter) => {
  return shooter.roundScores.reduce((sum, rs, rindex) => sum + getRoundScore(shooter, rindex), 0);
};

onMounted(() => {
  const saved = localStorage.getItem('shootingData');
  if (saved) {
    if (confirm('Resume previous session? Click OK to resume or Cancel to reset.')) {
      const data = JSON.parse(saved);
      rounds.value = data.rounds;
      shooters.value = data.shooters;
    } else {
      localStorage.removeItem('shootingData');
    }
  }
});

watch([shooters, rounds], () => {
  localStorage.setItem('shootingData', JSON.stringify({ shooters: shooters.value, rounds: rounds.value }));
}, { deep: true });
</script>

<style scoped>
.container {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
  font-family: Arial, sans-serif;
}

.settings {
  display: flex;
  flex-direction: column;
  margin-bottom: 20px;
}

.add-shooter {
  display: flex;
  margin-bottom: 10px;
}

.add-shooter input {
  flex: 1;
  padding: 10px;
  margin-right: 10px;
}

.add-shooter button,
.auto-setup {
  padding: 10px 20px;
}

.no-shooters {
  text-align: center;
  color: #888;
}

.round-tabs {
  display: flex;
  flex-wrap: wrap;
  margin-bottom: 20px;
  gap: 5px;
}

.round-tabs button {
  padding: 10px 15px;
  border: 1px solid #ddd;
  background: #f8f8f8;
  cursor: pointer;
  border-radius: 5px;
}

.round-tabs button.active {
  background: #ddd;
}

.add-round {
  display: flex;
  align-items: center;
  margin-bottom: 20px;
}

.add-round label {
  margin-right: 10px;
}

.add-round select {
  padding: 10px;
  margin-right: 10px;
}

.add-round button {
  padding: 10px 20px;
}

.warning {
  color: #f44336;
  margin-bottom: 20px;
}

.summary-table {
  width: 100%;
  border-collapse: collapse;
}

.summary-table th, .summary-table td {
  border: 1px solid #ddd;
  padding: 10px;
  text-align: center;
}

.summary-table th {
  background: #f8f8f8;
}

.round-view {
  display: flex;
  flex-direction: column;
}

.shooter-row {
  display: flex;
  align-items: center;
  margin-bottom: 15px;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 5px;
}

.shooter-name {
  flex: 0 0 150px;
  font-weight: bold;
}

.shots {
  flex: 1;
  display: flex;
  gap: 5px;
  flex-wrap: wrap;
}

.shot-toggle {
  padding: 10px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  min-width: 50px;
  font-size: 18px;
  font-weight: bold;
  transition: background-color 0.3s;
}

.hit {
  background-color: #4CAF50;
  color: white;
}

.miss {
  background-color: #f44336;
  color: white;
}

.score {
  flex: 0 0 120px;
  text-align: right;
  font-weight: bold;
}

/* Mobile optimizations */
@media (max-width: 600px) {
  .shooter-row {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .shots {
    margin: 10px 0;
  }
  
  .score {
    text-align: left;
    width: 100%;
  }
  
  .summary-table {
    font-size: 12px;
  }
  
  .summary-table th, .summary-table td {
    padding: 5px;
  }
}
</style>