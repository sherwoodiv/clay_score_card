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
  ;[4, 5].forEach((n) => {
    if (total + n <= 50) {
      config.push(n)
      total += n
    }
  })
  while (total + 6 <= 50) {
    config.push(6)
    total += 6
  }
  if (total < 50) config.push(50 - total)
  rounds.value = config.map(n => ({ numShots: n }))
  shooters.value.forEach((s) => {
    s.roundScores = rounds.value.map(r => ({ shots: Array(r.numShots).fill(false) }))
  })
  currentView.value = 0
}

const toggleShot = (shooter, roundIdx, shotIdx) => {
  shooter.roundScores[roundIdx].shots[shotIdx] = !shooter.roundScores[roundIdx].shots[shotIdx]
}

const getRoundScore = (shooter, roundIdx) => shooter.roundScores[roundIdx].shots.filter(Boolean).length
const getTotalScore = shooter => shooter.roundScores.reduce((s, rs, i) => s + getRoundScore(shooter, i), 0)

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

<template>
  <UApp>
    <NuxtPage>
      <UContainer>
        <!-- Resume Modal – appears only when there's saved data -->
        <UModal
          v-model:open="showResumeModal"
          :dismissible="false"
          title="Resume Session"
          size="sm"
        >
          <template #body>
            <h3 class="text-2xl">
              Resume Previous Session?
            </h3>
            <p>
              A previous scoring session was found. Do you want to resume or start fresh?
            </p>
            <div class="flex gap-3 justify-end">
              <UButton
                color="warning"
                @click="startNew"
              >
                Start New
              </UButton>
              <UButton
                color="primary"
                @click="resumeSession"
              >
                Resume
              </UButton>
            </div>
          </template>
        </UModal>
        <UCard>
          <!-- Main App -->
          <div class="container">
            <h1 class="text-3xl pb-4">
              Clay Shooting Score Tracker
            </h1>
            <div
              v-if="rounds>-1"
              class="settings"
            >
              <div class="add-shooter flex flex-box">
                <UInput
                  v-model="newShooterName"
                  placeholder="Enter shooter name"
                  class="flex-2/3"
                />
                <UButton
                  :disabled="shooters.length >= 8 || !newShooterName.trim()"
                  @click="addShooter"
                >
                  Add Shooter
                </UButton>
              </div>
              <UButton
                v-if="rounds.length === 0"
                class="auto-setup"
                @click="autoSetup"
              >
                Auto Configure Rounds to 50 Shots
              </UButton>
            </div>

            <div
              v-if="shooters.length === 0"
              class="no-shooters"
            >
              Add up to 8 shooters to start.
            </div>

            <div v-else>
              <!-- Round Tabs -->
              <div class="round-tabs">
                <UButton
                  :variant="currentView === -1 ? 'solid':'subtle'"
                  @click="currentView = -1"
                >
                  Summary
                </UButton>
                <UButton
                  v-for="(round, i) in rounds"
                  :key="i"
                  :variant="currentView === i ? 'solid':'subtle'"
                  @click="currentView = i"
                >
                  Round {{ i + 1 }}
                </UButton>
                <UButton
                  v-if="remaining > 0"
                  class="w-10 place-content-center"
                  @click="showAddRound = !showAddRound"
                >
                  +
                </UButton>
              </div>

              <!-- Add Round Buttons -->
              <div
                v-if="showAddRound && remaining > 0"
                class="add-round"
              >
                <span>Add Round ({{ remaining }} shots left):</span>
                <UButton
                  v-for="n in availableOptions"
                  :key="n"
                  @click="addRound(n)"
                >
                  {{ n }}
                </UButton>
              </div>

              <div
                v-if="currentTotal !== 50"
                class="warning"
              >
                Total shots: {{ currentTotal }} / 50
              </div>

              <!-- Summary View - MOBILE-FIRST CARD LAYOUT -->
              <div
                v-if="currentView === -1"
                class="summary-view"
              >
                <!-- Top Shooter Badge -->
                <div
                  v-if="shooters.length > 1"
                  class="mt-8 text-center"
                >
                  <div class="inline-block bg-yellow-500 text-white px-6 py-3 rounded-full text-lg font-bold shadow-xl">
                    Winner: {{ shooters.reduce((a, b) => getTotalScore(a) >= getTotalScore(b) ? a : b).name }}
                    — {{ Math.max(...shooters.map(getTotalScore)) }}/50
                  </div>
                </div>
                <h2 class="text-2xl font-bold mb-6 text-center">
                  Summary
                </h2>

                <!-- Mobile: One shooter card per row -->
                <div class="space-y-6">
                  <div
                    v-for="shooter in shooters"
                    :key="shooter.name"
                    class="shooter-summary-card bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700"
                  >
                    <!-- Header: Name + Total Score -->
                    <div
                      class="bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-800 dark:to-blue-900 text-white p-4"
                    >
                      <div class="flex justify-between items-center">
                        <h3 class="text-xl font-bold">
                          {{ shooter.name }}
                        </h3>
                        <div class="text-2xl font-black">
                          {{ getTotalScore(shooter) }}<span class="text-lg opacity-90">/50</span>
                          <span
                            v-if="getTotalScore(shooter) === 50"
                            class="ml-2 text-yellow-300"
                          >Perfect!</span>
                        </div>
                      </div>
                    </div>

                    <!-- Rounds Grid -->
                    <div class="p-4 bg-gray-50 dark:bg-gray-900">
                      <div class="grid grid-cols-4 sm:grid-cols-6 gap-3">
                        <div
                          v-for="(round, i) in rounds"
                          :key="i"
                          class="text-center"
                        >
                          <div class="text-xs text-gray-500 dark:text-gray-400 mb-1">
                            R{{ i + 1 }}
                          </div>
                          <div
                            class="font-mono text-lg font-bold rounded-lg px-2 py-1"
                            :class="{
                              'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200':
                                getRoundScore(shooter, i) === round.numShots,
                              'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200':
                                getRoundScore(shooter, i) === 0 && round.numShots > 0,
                              'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300':
                                getRoundScore(shooter, i) > 0 && getRoundScore(shooter, i) < round.numShots
                            }"
                          >
                            {{ getRoundScore(shooter, i) }}/{{ round.numShots }}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Round View – MOBILE-OPTIMIZED -->
              <div
                v-else
                class="round-view mt-6"
              >
                <h2 class="text-2xl font-bold text-center mb-6">
                  Round {{ currentView + 1 }} ({{ rounds[currentView].numShots }} shots)
                </h2>

                <div
                  v-for="shooter in shooters"
                  :key="shooter.name"
                  class="shooter-row-mobile"
                >
                  <!-- Shooter name + live score -->
                  <div class="shooter-header">
                    <div class="shooter-name">
                      {{ shooter.name }}
                    </div>
                    <div class="live-score">
                      {{ getRoundScore(shooter, currentView) }} / {{ rounds[currentView].numShots }}
                    </div>
                  </div>

                  <!-- Shot buttons – tight grid -->
                  <div class="shots-grid">
                    <UButton
                      v-for="(hit, i) in shooter.roundScores[currentView].shots"
                      :key="i"
                      :color="hit ? 'primary' : 'error'"
                      :variant="hit ? 'solid' : 'soft'"
                      size="xl"
                      class="shot-btn flex items-center justify-center"
                      square
                      @click="toggleShot(shooter, currentView, i)"
                    >
                      <span class="text-3xl font-black leading-none">{{ hit ? 'O' : 'X' }}</span>
                    </UButton>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </UCard>
      </UContainer>
    </NuxtPage>
  </UApp>
</template>

<style scoped>
/* Your original beautiful styles – unchanged */
.container {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
  font-family: Arial, sans-serif;
}

.settings {
  margin-bottom: 20px;
}

.add-shooter {
  display: flex;
  gap: 10px;
  margin-bottom: 10px;
}

.add-shooter input {
  flex: 1;
  padding: 10px;
}

.add-shooter button, .auto-setup {
  padding: 10px 20px;
}

.no-shooters {
  text-align: center;
  color: #888;
  margin: 40px 0;
}

.round-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 20px;
}

.round-tabs button {
  padding: 10px 16px;
  border: 1px solid #ccc;
  border-radius: 6px;
  background: #f8f8f8;
}

.round-tabs button.active {
  background: #333;
  color: white;
}

.add-round {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.add-round button {
  padding: 12px 20px;
  background: #10b981;
  color: white;
  border: none;
  border-radius: 6px;
  font-weight: bold;
}

.warning {
  color: #dc2626;
  font-weight: bold;
  margin-bottom: 20px;
}

.summary-view {
  margin-top: 20px;
}

.summary-table {
  min-width: 600px;
}

.summary-table th {
  background: black;
  font-weight: 600;
  padding: 12px 8px;
}

.summary-table td {
  padding: 10px 8px;
}

@media (max-width: 640px) {
  .summary-table {
    font-size: 0.9rem;
  }

  .summary-table th, .summary-table td {
    padding: 8px 4px;
  }
}

/* ─────── MOBILE-FIRST ROUND VIEW ─────── */
.round-view {
  padding: 0 8px;
}

.shooter-row-mobile {
  border-radius: 16px;
  padding: 16px;
  margin-bottom: 16px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.08);
  border: 1px solid #e5e7eb;
}

.shooter-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.shooter-name {
  font-size: 1.25rem;
  font-weight: 700;
}

.live-score {
  font-size: 1.5rem;
  font-weight: 900;
  color: #059669; /* emerald-600 */
}

/* The magic: perfect 6-shot grid on every phone */
.shots-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 10px;
  max-width: 420px;
  margin: 0 auto;
}

.shot-btn {
  width: 100% !important;
  height: 64px !important;
  border-radius: 16px !important;
  font-size: 28px !important;
  font-weight: 900 !important;
  min-width: 0 !important; /* crucial for grid */
}

/* For 4-shot and 5-shot rounds – center them */
.shots-grid:has(:nth-child(4):last-child) { grid-template-columns: repeat(4, 1fr); }
.shots-grid:has(:nth-child(5):last-child) { grid-template-columns: repeat(5, 1fr); }

/* Tablet+ – can go a bit bigger */
@media (min-width: 640px) {
  .shots-grid {
    gap: 14px;
    max-width: 500px;
  }
  .shot-btn {
    height: 72px !important;
  }
}

.shooter-name {
  flex: 0 0 140px;
  font-weight: bold;
  font-size: 1.1em;
}

.shots {
  flex: 1;
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.shot-toggle {
  width: 56px;
  height: 56px;
  border: none;
  border-radius: 50%;
  font-size: 24px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s;
}

.hit {
  color: #22c55e;
}

.miss {
  color: #ef4444;
}

.score {
  flex: 0 0 120px;
  text-align: right;
  font-weight: bold;
  font-size: 1.2em;
}

@media (max-width: 640px) {
  .shooter-row {
    flex-direction: column;
    align-items: stretch;
  }

  .shots {
    justify-content: center;
  }

  .score {
    text-align: center;
    margin-top: 10px;
  }
}
</style>
