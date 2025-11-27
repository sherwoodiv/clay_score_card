<!-- app.vue -->
<template>
  <UContainer>
  <!-- Resume Modal – appears only when there's saved data -->
  <UModal v-if="showResumeModal" v-model="showResumeModal" prevent-close>
    <UCard class="w-full max-w-md">
      <template #header>
        <h3 class="text-lg font-semibold">Resume Previous Session?</h3>
      </template>
      <p class="my-4 text-gray-600">
        A previous scoring session was found. Do you want to resume or start fresh?
      </p>
      <template #footer>
        <div class="flex gap-3 justify-end">
          <UButton @click="startNew" color="gray">Start New</UButton>
          <UButton @click="resumeSession" color="primary">Resume</UButton>
        </div>
      </template>
    </UCard>
  </UModal>

  <!-- Main App -->
  <div class="container">
    <h1>Clay Shooting Score Tracker</h1>

    <div class="settings">
      <div class="add-shooter">
        <input v-model="newShooterName" placeholder="Enter shooter name" />
        <button @click="addShooter" :disabled="shooters.length >= 8 || !newShooterName.trim()">
          Add Shooter
        </button>
      </div>
      <button v-if="rounds.length === 0" @click="autoSetup" class="auto-setup">
        Auto Configure Rounds to 50 Shots
      </button>
    </div>

    <div v-if="shooters.length === 0" class="no-shooters">
      Add up to 8 shooters to start.
    </div>

    <div v-else>
      <!-- Round Tabs -->
      <div class="round-tabs">
        <button @click="currentView = -1" :class="{ active: currentView === -1 }">Summary</button>
        <button
          v-for="(round, i) in rounds"
          :key="i"
          @click="currentView = i"
          :class="{ active: currentView === i }"
        >
          Round {{ i + 1 }}
        </button>
        <button v-if="remaining > 0" @click="showAddRound = !showAddRound">+</button>
      </div>

      <!-- Add Round Buttons -->
      <div v-if="showAddRound && remaining > 0" class="add-round">
        <span>Add Round ({{ remaining }} shots left):</span>
        <button
          v-for="n in availableOptions"
          :key="n"
          @click="addRound(n)"
        >
          {{ n }}
        </button>
      </div>

      <div v-if="currentTotal !== 50" class="warning">
        Total shots: {{ currentTotal }} / 50
      </div>

      <!-- Summary View -->
      <div v-if="currentView === -1">
        <table class="summary-table">
          <thead>
            <tr>
              <th>Shooter</th>
              <th v-for="(r, i) in rounds" :key="i">R{{ i + 1 }} ({{ r.numShots }})</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="s in shooters" :key="s.name">
              <td>{{ s.name }}</td>
              <td v-for="(rs, i) in s.roundScores" :key="i">
                {{ getRoundScore(s, i) }}/{{ rounds[i].numShots }}
              </td>
              <td class="font-bold">{{ getTotalScore(s) }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Round View -->
      <div v-else class="round-view">
        <h2>Round {{ currentView + 1 }} ({{ rounds[currentView].numShots }} shots)</h2>
        <div v-for="shooter in shooters" :key="shooter.name" class="shooter-row">
          <div class="shooter-name">{{ shooter.name }}</div>
          <div class="shots">
            <button
              v-for="(hit, i) in shooter.roundScores[currentView].shots"
              :key="i"
              @click="toggleShot(shooter, currentView, i)"
              :class="['shot-toggle', hit ? 'hit' : 'miss']"
            >
              {{ hit ? 'O' : 'X' }}
            </button>
          </div>
          <div class="score">
            {{ getRoundScore(shooter, currentView) }} / {{ rounds[currentView].numShots }}
          </div>
        </div>
      </div>
    </div>
  </div>
 </UContainer>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'

const targetShots = 50
const newShooterName = ref('')
const shooters = ref([])
const rounds = ref([])
const currentView = ref(-1)
const showAddRound = ref(false)
const showResumeModal = ref(false)
const savedData = ref(null)

const currentTotal = computed(() => rounds.value.reduce((s, r) => s + r.numShots, 0))
const remaining = computed(() => targetShots - currentTotal.value)

const availableOptions = computed(() => {
  if (remaining.value <= 0) return []
  const max = Math.min(6, remaining.value)
  const min = remaining.value < 4 ? remaining.value : 4
  return Array.from({ length: max - min + 1 }, (_, i) => max - i)
})

const addShooter = () => {
  if (shooters.value.length >= 8 || !newShooterName.value.trim()) return
  shooters.value.push({
    name: newShooterName.value.trim(),
    roundScores: rounds.value.map(r => ({ shots: Array(r.numShots).fill(false) }))
  })
  newShooterName.value = ''
}

const addRound = (num) => {
  rounds.value.push({ numShots: num })
  shooters.value.forEach(s => s.roundScores.push({ shots: Array(num).fill(false) }))
  currentView.value = rounds.value.length - 1
  showAddRound.value = false
}

const autoSetup = () => {
  if (rounds.value.length) return
  const config = []
  let total = 0
  ;[4, 5].forEach(n => { if (total + n <= 50) { config.push(n); total += n } })
  while (total + 6 <= 50) { config.push(6); total += 6 }
  if (total < 50) config.push(50 - total)
  rounds.value = config.map(n => ({ numShots: n }))
  shooters.value.forEach(s => {
    s.roundScores = rounds.value.map(r => ({ shots: Array(r.numShots).fill(false) }))
  })
  currentView.value = 0
}

const toggleShot = (shooter, roundIdx, shotIdx) => {
  shooter.roundScores[roundIdx].shots[shotIdx] = !shooter.roundScores[roundIdx].shots[shotIdx]
}

const getRoundScore = (shooter, roundIdx) => shooter.roundScores[roundIdx].shots.filter(Boolean).length
const getTotalScore = (shooter) => shooter.roundScores.reduce((s, rs, i) => s + getRoundScore(shooter, i), 0)

// Modal functions
const resumeSession = () => {
  if (savedData.value) {
    rounds.value = savedData.value.rounds
    shooters.value = savedData.value.shooters
  }
  showResumeModal.value = false
  savedData.value = null
}

const startNew = () => {
  localStorage.removeItem('shootingData')
  showResumeModal.value = false
  savedData.value = null
}

onMounted(() => {
  const data = localStorage.getItem('shootingData')
  if (data) {
    savedData.value = JSON.parse(data)
    showResumeModal.value = true
  }
})

watch([shooters, rounds], () => {
  localStorage.setItem('shootingData', JSON.stringify({ shooters: shooters.value, rounds: rounds.value }))
}, { deep: true })
</script>

<style scoped>
/* Your original beautiful styles – unchanged */
.container { max-width: 800px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif; }
.settings { margin-bottom: 20px; }
.add-shooter { display: flex; gap: 10px; margin-bottom: 10px; }
.add-shooter input { flex: 1; padding: 10px; }
.add-shooter button, .auto-setup { padding: 10px 20px; }
.no-shooters { text-align: center; color: #888; margin: 40px 0; }
.round-tabs { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 20px; }
.round-tabs button { padding: 10px 16px; border: 1px solid #ccc; border-radius: 6px; background: #f8f8f8; }
.round-tabs button.active { background: #333; color: white; }
.add-round { display: flex; align-items: center; gap: 12px; margin-bottom: 20px; flex-wrap: wrap; }
.add-round button { padding: 12px 20px; background: #10b981; color: white; border: none; border-radius: 6px; font-weight: bold; }
.warning { color: #dc2626; font-weight: bold; margin-bottom: 20px; }
.summary-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
.summary-table th, .summary-table td { border: 1px solid #ddd; padding: 10px; text-align: center; }
.summary-table th { background: #f3f4f6; }
.shooter-row { display: flex; align-items: center; padding: 16px; margin-bottom: 16px; background: white; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
.shooter-name { flex: 0 0 140px; font-weight: bold; font-size: 1.1em; }
.shots { flex: 1; display: flex; gap: 10px; flex-wrap: wrap; }
.shot-toggle { width: 56px; height: 56px; border: none; border-radius: 50%; font-size: 24px; font-weight: bold; cursor: pointer; transition: all 0.2s; }
.hit { background: #22c55e; color: white; }
.miss { background: #ef4444; color: white; }
.score { flex: 0 0 120px; text-align: right; font-weight: bold; font-size: 1.2em; }

@media (max-width: 640px) {
  .shooter-row { flex-direction: column; align-items: stretch; }
  .shots { justify-content: center; }
  .score { text-align: center; margin-top: 10px; }
}
</style>
