import { fetchLeaderboard, fetchLeaderboardAt, fetchHistoryIndex } from '../content.js';
import { localize } from '../util.js';

import Spinner from '../components/Spinner.js';

export default {
    components: {
        Spinner,
    },
    data: () => ({
        leaderboard: [],
        loading: true,
        selected: 0,
        err: [],
        historyDate: '',
        historyTime: '12:00',
        historyLoading: false,
        historyMessage: '',
        isHistoryMode: false,
        historyLabel: '',
        historyTimeZone: '',
        snapshotSaving: false,
        generateNowLoading: false,
        selectedSnapshot: '',
        availableSnapshots: [],
    }),
    template: `
        <main v-if="loading">
            <Spinner></Spinner>
        </main>
        <main v-else class="page-leaderboard-container">
            <div class="page-leaderboard">
                <div class="error-container">
                    <p class="error" v-if="err.length > 0">
                        {{ err.join(', ') }}
                    </p>
                    <div class="history-panel" v-if="!loading">
                        <div class="history-controls">
                            <label>
                                <span>Date</span>
                                <select v-model="selectedSnapshot">
                                    <option value="">Choose a snapshot</option>
                                    <option
                                        v-for="snapshot in availableSnapshots"
                                        :key="snapshot.path"
                                        :value="snapshot.snapshotAt"
                                    >
                                        {{ new Date(snapshot.snapshotAt).toLocaleString() }}
                                    </option>
                                </select>
                            </label>
                            <button class="history-button" @click="loadHistory" :disabled="historyLoading">
                                {{ historyLoading ? 'Loading…' : 'View snapshot' }}
                            </button>
                            <button class="history-button history-button--secondary" @click="generateSnapshot" :disabled="snapshotSaving || !leaderboard.length">
                                {{ snapshotSaving ? 'Saving…' : 'Save snapshot' }}
                            </button>
                            <button class="history-button" @click="generateSnapshotNow" :disabled="generateNowLoading">
                                {{ generateNowLoading ? 'Generating…' : 'Generate snapshot now' }}
                            </button>
                            <button class="history-reset" @click="resetHistory" :disabled="historyLoading">
                                Show live
                            </button>
                        </div>
                        <p class="history-message" v-if="historyMessage">
                            {{ historyMessage }}
                        </p>
                        <p class="history-timezone" v-if="historyTimeZone">
                            {{ historyTimeZone }} Time
                        </p>
                    </div>
                </div>
                <div class="board-container">
                    <table class="board">
                        <tr v-for="(ientry, i) in leaderboard">
                            <td class="rank">
                                <p class="type-label-lg">#{{ i + 1 }}</p>
                            </td>
                            <td class="total">
                                <p class="type-label-lg">{{ localize(ientry.total) }}</p>
                            </td>
                            <td class="user" :class="{ 'active': selected == i }">
                                <button @click="selected = i">
                                    <span class="type-label-lg">{{ ientry.user }}</span>
                                </button>
                            </td>
                        </tr>
                    </table>
                </div>
                <div class="player-container" v-if="entry">
                    <div class="player">
                        <h1>#{{ selected + 1 }} {{ entry.user }}</h1>
                        <h3>{{ entry.total }}</h3>
                        <h2 v-if="entry.verified.length > 0">Verified ({{ entry.verified.length}})</h2>
                        <table class="table">
                            <tr v-for="score in entry.verified">
                                <td class="rank">
                                    <p>#{{ score.rank }}</p>
                                </td>
                                <td class="level">
                                    <a class="type-label-lg" target="_blank" :href="score.link">{{ score.level }}</a>
                                </td>
                                <td class="score">
                                    <p>+{{ localize(score.score) }}</p>
                                </td>
                            </tr>
                        </table>
                        <h2 v-if="entry.completed.length > 0">Completed ({{ entry.completed.length }})</h2>
                        <table class="table">
                            <tr v-for="score in entry.completed">
                                <td class="rank">
                                    <p>#{{ score.rank }}</p>
                                </td>
                                <td class="level">
                                    <a class="type-label-lg" target="_blank" :href="score.link">{{ score.level }}</a>
                                </td>
                                <td class="score">
                                    <p>+{{ localize(score.score) }}</p>
                                </td>
                            </tr>
                        </table>
                        <h2 v-if="entry.progressed.length > 0">Progressed ({{entry.progressed.length}})</h2>
                        <table class="table">
                            <tr v-for="score in entry.progressed">
                                <td class="rank">
                                    <p>#{{ score.rank }}</p>
                                </td>
                                <td class="level">
                                    <a class="type-label-lg" target="_blank" :href="score.link">{{ score.percent }}% {{ score.level }}</a>
                                </td>
                                <td class="score">
                                    <p>+{{ localize(score.score) }}</p>
                                </td>
                            </tr>
                        </table>
                    </div>
                </div>
            </div>
        </main>
    `,
    computed: {
        entry() {
            return this.leaderboard[this.selected];
        },
    },
    async mounted() {
        this.historyTimeZone =
            Intl.DateTimeFormat().resolvedOptions().timeZone ||
            'your browser local timezone';
        this.availableSnapshots = await fetchHistoryIndex();
        const loadedFromQuery = await this.loadFromQuery();
        if (!loadedFromQuery) {
            await this.loadCurrentLeaderboard();
        }
    },
    methods: {
        localize,
        async loadCurrentLeaderboard() {
            const [leaderboard, err] = await fetchLeaderboard();
            this.leaderboard = leaderboard || [];
            this.err = err || [];
            this.loading = false;
            this.isHistoryMode = false;
            this.historyMessage = '';
        },
        generateSnapshot() {
            if (!this.leaderboard || this.leaderboard.length === 0) {
                this.historyMessage = 'There is no leaderboard data to save yet.';
                return;
            }

            this.snapshotSaving = true;
            const timestamp = new Date().toISOString();
            const snapshot = {
                snapshotAt: timestamp,
                leaderboard: this.leaderboard,
                errors: this.err || [],
            };
            const blob = new Blob([JSON.stringify(snapshot, null, 2)], {
                type: 'application/json',
            });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            const filename = `leaderboard-snapshot-${timestamp.replace(/[:.]/g, '-')}.json`;
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            this.snapshotSaving = false;
            this.historyMessage = `Downloaded snapshot: ${filename}`;
        },
        generateSnapshotNow() {
            if (!this.leaderboard || this.leaderboard.length === 0) {
                this.historyMessage = 'There is no leaderboard data to generate yet.';
                return;
            }

            this.generateNowLoading = true;
            this.historyMessage = 'Generating snapshot…';

            const timestamp = new Date().toISOString();
            const snapshot = {
                snapshotAt: timestamp,
                leaderboard: this.leaderboard,
                errors: this.err || [],
            };
            const blob = new Blob([JSON.stringify(snapshot, null, 2)], {
                type: 'application/json',
            });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            const filename = `leaderboard-snapshot-${timestamp.replace(/[:.]/g, '-')}.json`;
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            this.generateNowLoading = false;
            this.historyMessage = `Generated snapshot: ${filename}`;
        },
        async loadHistory() {
            if (!this.selectedSnapshot) {
                this.historyMessage = 'Please choose a snapshot.';
                return;
            }

            this.historyLoading = true;

            const [leaderboard, err] =
                await fetchLeaderboardAt(this.selectedSnapshot);

            this.historyLoading = false;

            if (err.length) {
                this.historyMessage = err[0];
                return;
            }

            this.leaderboard = leaderboard;
            this.err = [];
            this.selected = 0;
            this.isHistoryMode = true;

            this.historyMessage =
                `Viewing snapshot from ${new Date(this.selectedSnapshot).toLocaleString()}`;
        },
        resetHistory() {
            this.$router.replace({
                path: this.$route.path,
                query: {},
            }).catch(() => {});
            this.historyMessage = '';
            this.historyLabel = '';
            this.isHistoryMode = false;
            this.loadCurrentLeaderboard();
        },
        async loadFromQuery() {
            const at = this.$route.query.at;
            if (!at || typeof at !== 'string') {
                return false;
            }

            const date = new Date(at);
            if (Number.isNaN(date.getTime())) {
                return false;
            }

            this.historyDate = date.toISOString().slice(0, 10);
            this.historyTime = date.toISOString().slice(11, 16);
            await this.loadHistory();
            return true;
        },
    },
};
