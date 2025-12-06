<script setup>
import { ref, computed, watch, onMounted, shallowRef, markRaw } from 'vue'
import { debounce } from 'lodash-es'

const targetShots = 50
const newShooterName = ref('')
const shooters = shallowRef([]) // shallowRef = way faster
const rounds = shallowRef([])
const currentView = ref(-1)
const showAddRound = ref(false)
const showResumeModal = ref(false)
const savedData = ref(null)

const currentTotal = computed(() => rounds.value.reduce((s, r) => s + r.numShots, 0))
const remaining = computed(() => targetShots - currentTotal.value)

// ⚡ OPTIMIZED: Direct mutation + manual trigger
const toggleShot = (shooter, roundIdx, shotIdx) => {
  shooter.roundScores[roundIdx].shots[shotIdx] = !shooter.roundScores[roundIdx].shots[shotIdx]

  // Bust cache by incrementing version
  scoreCacheVersion.value++

  // Skip the expensive spread operation - just trigger reactivity
  shooters.value = shooters.value
}

// ⚡ OPTIMIZED: Memoized per round per shooter with LRU-style cache limit
const scoreCache = new Map()
const scoreCacheVersion = ref(0)
const MAX_CACHE_SIZE = 100 // Limit cache size for memory efficiency

const getScoreKey = (shooterName, roundIdx) => `${shooterName}-${roundIdx}-${scoreCacheVersion.value}`

const getRoundScore = (shooter, roundIdx) => {
  const key = getScoreKey(shooter.name, roundIdx)

  // Check cache first
  if (scoreCache.has(key)) {
    return scoreCache.get(key)
  }

  // Recalculate
  const shots = shooter.roundScores[roundIdx].shots
  const score = shots.filter(Boolean).length

  // Simple cache size limit
  if (scoreCache.size > MAX_CACHE_SIZE) {
    scoreCache.clear()
  }

  scoreCache.set(key, score)
  return score
}

const getTotalScore = (shooter) => {
  let total = 0
  for (let i = 0; i < rounds.value.length; i++) {
    total += getRoundScore(shooter, i)
  }
  return total
}

// Clear cache when rounds/shooters change structure
const clearScoreCache = () => scoreCache.clear()

// ⚡ OPTIMIZED: Single debounced save (removed duplicate)
const saveToStorage = debounce(() => {
  try {
    localStorage.setItem('shootingData', JSON.stringify({
      shooters: shooters.value,
      rounds: rounds.value
    }))
  } catch (e) {
    console.error('Save failed:', e)
  }
}, 1000) // 1 second - much better for mobile

watch([shooters, rounds], saveToStorage)

const addShooter = () => {
  if (shooters.value.length >= 8 || !newShooterName.value.trim()) return

  const newShooter = {
    name: newShooterName.value.trim(),
    roundScores: rounds.value.map(r => ({ shots: Array(r.numShots).fill(false) }))
  }

  shooters.value = [...shooters.value, newShooter]
  newShooterName.value = ''
  clearScoreCache()
}

const addRound = (num) => {
  rounds.value = [...rounds.value, { numShots: num }]

  shooters.value = shooters.value.map(s => ({
    ...s,
    roundScores: [...s.roundScores, { shots: Array(num).fill(false) }]
  }))

  currentView.value = rounds.value.length - 1
  showAddRound.value = false
  clearScoreCache()
}

const availableOptions = computed(() => {
  const r = remaining.value
  const options = [4, 5, 6].filter(n => n <= r)

  // Add remaining shots option only if it's not already in the list and is > 0
  if (r > 0 && r < 4) {
    options.push(r)
  }

  return options
})

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

  shooters.value = shooters.value.map(s => ({
    ...s,
    roundScores: rounds.value.map(r => ({ shots: Array(r.numShots).fill(false) }))
  }))

  currentView.value = 0
  clearScoreCache()
}

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
  clearScoreCache()
}

onMounted(() => {
  const data = localStorage.getItem('shootingData')
  if (data) {
    try {
      savedData.value = JSON.parse(data)
      showResumeModal.value = true
    } catch (e) {
      console.error('Failed to parse saved data:', e)
      localStorage.removeItem('shootingData')
    }
  }
})
</script>

<template>
  <UApp>
    <NuxtPage>
      <UContainer>
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
          <div class="container">
            <h1 class="text-3xl pb-4">
              Clay Shooting Score Tracker
            </h1>

            <div
                v-if="rounds.length >= 0"
                class="settings"
            >
              <div class="add-shooter flex flex-box">
                <UInput
                    v-model="newShooterName"
                    placeholder="Enter shooter name"
                    class="flex-2/3 min-h-1"
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
              <div class="round-tabs">
                <UButton
                    color="info"
                    :variant="currentView === -1 ? 'solid':'soft'"
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

              <div
                  v-if="currentView === -1"
                  class="summary-view"
              >
                <div
                    v-if="shooters.length > 1"
                    class="mt-8 text-center"
                >
                  <div class="inline-block bg-yellow-500 text-white px-6 py-3 rounded-full text-lg font-bold shadow-xl mb-3">
                    Winner: {{ shooters.reduce((a, b) => getTotalScore(a) >= getTotalScore(b) ? a : b).name }}
                    — {{ Math.max(...shooters.map(getTotalScore)) }}/50
                  </div>
                </div>
                <h2 class="text-2xl font-bold mb-6 text-center">
                  Summary
                </h2>

                <div class="space-y-6">
                  <div
                      v-for="shooter in shooters"
                      :key="shooter.name"
                      class="shooter-summary-card bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700"
                  >
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
                  <div class="shooter-header">
                    <div class="shooter-name">
                      {{ shooter.name }}
                    </div>
                    <div class="live-score">
                      {{ getRoundScore(shooter, currentView) }} / {{ rounds[currentView].numShots }}
                    </div>
                  </div>

                  <div class="shots-grid">
                    <button
                        v-for="(hit, i) in shooter.roundScores[currentView].shots"
                        :key="i"
                        :class="[
                        'shot-btn-native',
                        hit ? 'shot-hit' : 'shot-miss'
                      ]"
                        @click="toggleShot(shooter, currentView, i)"
                    >
                      <span class="shot-text">{{ hit ? 'X' : 'O' }}</span>
                    </button>
                  </div>
                </div>

                <div>
                  <UButton
                      v-if="currentView + 1 < rounds.length"
                      @click="currentView++"
                  >
                    Next Round
                  </UButton>
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

.round-view {
  padding: 0 8px;
}

.shooter-row-mobile {
  border-radius: 16px;
  padding: 16px;
  margin-bottom: 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
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
  color: #059669;
}

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
  min-width: 0 !important;
}

.shots-grid:has(:nth-child(4):last-child) {
  grid-template-columns: repeat(4, 1fr);
}

.shots-grid:has(:nth-child(5):last-child) {
  grid-template-columns: repeat(5, 1fr);
}

/* Native button styling for MAXIMUM mobile performance */
.shot-btn-native {
  width: 100%;
  height: 64px;
  border-radius: 16px;
  border: 2px solid transparent;
  font-size: 28px;
  font-weight: 900;
  cursor: pointer;
  transition: transform 0.1s ease;
  touch-action: manipulation; /* Prevents zoom on double-tap */
  -webkit-tap-highlight-color: transparent; /* Removes iOS tap highlight */
}

.shot-btn-native:active {
  transform: scale(0.95);
}

.shot-hit {
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  color: white;
  border-color: #1d4ed8;
}

.shot-miss {
  background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
  color: white;
  border-color: #d97706;
}

.shot-text {
  display: block;
  line-height: 1;
  font-size: 32px;
}

@media (min-width: 640px) {
  .shots-grid {
    gap: 14px;
    max-width: 500px;
  }

  .shot-btn-native {
    height: 72px;
  }

  .shot-text {
    font-size: 36px;
  }
}
</style>