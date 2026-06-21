import { store } from "../main.js";
import { score, totalLevels } from "../score.js";
import { fetchEditors, fetchList } from "../content.js";

import Spinner from "../components/Spinner.js";
import LevelAuthors from "../components/List/LevelAuthors.js";

const roleIconMap = {
    owner: "crown",
    admin: "user-gear",
    helper: "user-shield",
    dev: "code",
    trial: "user-lock",
};

export default {
    components: { Spinner, LevelAuthors },
    template: `
        <main v-if="loading">
            <Spinner></Spinner>
        </main>
        <main v-else class="page-list">
            <div class="list-container">
                <table class="list" v-if="list">
                    <tr v-for="([level, err], i) in list">
                        <td class="rank">
                            <p v-if="i + 1 <= totalLevels" class="type-label-lg">#{{ i + 1 }}</p>
                            <p v-else class="type-label-lg">Legacy</p>
                        </td>
                        <td class="level" :class="{ 'active': selected == i, 'error': !level }">
                            <button @click="selected = i">
                                <span class="type-label-lg">{{ level?.name || \`Error (\${err}.json)\` }}</span>
                            </button>
                        </td>
                    </tr>
                </table>
            </div>
            <div class="level-container">
                <div class="level" v-if="level">
                    <h1>{{ level.name }}</h1>
                    <LevelAuthors :author="level.author" :creators="level.creators" :verifier="level.verifier"></LevelAuthors>
                    <template v-if="isMedalVideo">
                        <div class="missing-video">
                            <div class="missing-video-content">
                                <h2>Medal Videos Cannot Be Embedded</h2>
                                <p>
                                    Click
                                    <a :href="videoSource" target="_blank">
                                        <u>here</u>
                                    </a>
                                    to watch the verification.
                                </p>
                            </div>
                        </div>
                    </template>

                    <template v-else-if="level.verification">

                        <template v-if="!isEmbedVideo">
                            <video class="video" controls>
                                <source :src="video">
                                Your browser does not support the video tag.
                            </video>
                        </template>

                        <template v-else>
                            <iframe
                                class="video"
                                id="videoframe"
                                :src="video"
                                frameborder="0">
                            </iframe>
                        </template>

                    </template>

                    <template v-else>
                        <div class="missing-video">
                            <div class="missing-video-content">
                                <h2>No Verification Available</h2>
                                <p>This level currently has no uploaded verification.</p>
                            </div>
                        </div>
                    </template>
                    <ul class="stats">
                        <li>
                            <div class="type-title-sm">Points when completed</div>
                            <p>{{ score(selected + 1, 100, level.percentToQualify) }}</p>
                        </li>
                        <li>
                            <div class="type-title-sm">ID</div>
                            <p>{{ level.id }}</p>
                        </li>
                        <li>
                            <div class="type-title-sm">Password</div>
                            <p>{{ level.password || 'Free to Copy' }}</p>
                        </li>
                    </ul>
                    <h2>Records</h2>
                    <p v-if="selected + 1 <= totalLevels / 2"><strong>{{ level.percentToQualify }}%</strong> or better to qualify</p>
                    <p v-else-if="selected + 1 <= totalLevels"><strong>100%</strong> or better to qualify</p>
                    <p v-else>This level does not accept new records.</p>
                    <table class="records">
                        <tr v-for="record in level.records" class="record">
                            <td class="percent">
                                <p>{{ record.percent }}%</p>
                            </td>
                            <td class="user">
                                <a :href="record.link" target="_blank" class="type-label-lg">{{ record.user }}</a>
                            </td>
                            <td class="mobile">
                                <img v-if="record.mobile" :src="\`/assets/phone-landscape\${store.dark ? '-dark' : ''}.svg\`" alt="Mobile">
                            </td>
                            <td class="hz">
                                <p>#{{ record.hz }}</p>
                            </td>
                        </tr>
                    </table>
                </div>
                <div v-else class="level" style="height: 100%; justify-content: center; align-items: center;">
                    <p>(ノಠ益ಠ)ノ彡┻━┻</p>
                </div>
            </div>
            <div class="meta-container">
                <div class="meta">
                    <div class="errors" v-show="errors.length > 0">
                        <p class="error" v-for="error of errors">{{ error }}</p>
                    </div>
                    <div class="og">
                        <p class="type-label-md">Website layout made by <a href="https://tsl.pages.dev/" target="_blank">TheShittyList</a></p>
                    </div>
                    <template v-if="editors">
                        <h3>List Editors</h3>
                        <ol class="editors">
                            <li v-for="editor in editors">
                                <img :src="\`/assets/\${roleIconMap[editor.role]}\${store.dark ? '-dark' : ''}.svg\`" :alt="editor.role">
                                <a v-if="editor.link" class="type-label-lg link" target="_blank" :href="editor.link">{{ editor.name }}</a>
                                <p v-else>{{ editor.name }}</p>
                            </li>
                        </ol>
                    </template>
                    <h3>Submission Requirements</h3>
                    <p>
                        Achieved the record without using hacks (List of banned hacks can be found <a href="https://docs.google.com/spreadsheets/d/1evE4nXATxRAQWu2Ajs54E6cVUqHBoSid8I7JauJnOzg/edit?usp=sharing" target="_blank"><u>here</u></a>)
                    </p>
                    <p>
                        Achieved the record on the level that is listed on the site - please check the level ID before you submit a record
                    </p>
                    <p>
                        Have either click/tap sounds or a handcam. (Mods that add click sounds such as click sounds full are not allowed)
                    </p>
                    <p>
                        The recording must have a previous attempt and entire death animation shown before the completion, unless the completion is on the first attempt.
                    </p>
                    <p>
                        The recording must also show the player hit the endwall, or the completion will be invalidated.
                    </p>
                    <p>
                        Do not use secret routes or bug routes
                    </p>
                    <p>
                        Do not use easy modes, only a record of the unmodified level qualifies
                    </p>
                    <p>
                        Only FPS Values of 60 or above are allowed.
                    </p>
                    <p>
                        Once a level falls onto the Legacy List, we accept records for it for 24 hours after it falls off, then afterwards we never accept records for said level
                    </p>
                    <h3>Level Submission Guidelines</h3>
                    <p>
                        Have at least some gameplay (No auto levels)
                    </p>
                    <p>
                        Be an original, uncopied level (Segments of other levels that are 15 seconds long or less are allowed and you can buff or repeat these segments as much as you want (Segments or buffed versions of levels already on the list must have clear, distinct buffs that make the gameplay clearly harder or must have an exstention of the level that is longer than 5 seconds))
                    </p>
                    <p>
                        Be submitted in the google form within a week of verification (Levels that have been on the servers for more than a week will need to have been submitted as a KSG List Open Verification in the discord server before the verification) (The form for submitting levels can be found in the discord server)
                    </p>
                    <p>
                        No Inappropriate content in the level, including but not limited to: gore, sexual content, hate speech, etc.
                    </p>
                    <p>
                        Be 45 seconds long or less.
                    </p>
                    <p>
                        Be uploaded to the geometry dash servers (Levels that get deleted from the servers will be removed from the list)
                    </p>
                    <p>
                        Have a verification that meets the requirements for record submissions (see above)
                    </p>
                    <h3>Additional Information</h3>
                    <p>
                        All levels and completions on this list must be submitted to the discord server in order to be accepted. The discord server is also the best way to contact list staff if you have any questions or concerns about the list. The link to the discord can be found <a href="https://www.discord.com/invite/63CvQswbbY" target="_blank"><u>here</u></a>.
                    </p>
                    <p>
                        Please allow 24-48 hours for a submitted level or record to be placed on the list. If more than 48 hours has passed, please open a general support ticket in the discord server.
                    </p>
                    <p>
                        Please beware that if a submission is found to be cheated in any way, ALL your completions AND verifications WILL BE REMOVED from the list. You may appeal this decision in the discord server by opening a ticket.
                    </p>
                </div>
            </div>
        </main>
    `,
    data: () => ({
        list: [],
        editors: [],
        loading: true,
        selected: 0,
        errors: [],
        totalLevels,
        roleIconMap,
        store
    }),
    computed: {
        isMedalVideo() {
            return this.videoSource.includes("medal.tv");
        },
        level() {
            return this.list[this.selected][0];
        },

        videoSource() {
            return this.level.showcase && this.toggledShowcase
                ? this.level.showcase
                : this.level.verification;
        },

        embedUrl() {
            const url = this.videoSource;

            // YouTube
            if (
                url.includes("youtube.com") ||
                url.includes("youtu.be")
            ) {
                let id = "";

                if (url.includes("watch?v=")) {
                    id = url.split("watch?v=")[1].split("&")[0];
                }
                else if (url.includes("youtu.be/")) {
                    id = url.split("youtu.be/")[1].split("?")[0];
                }
                else if (url.includes("/shorts/")) {
                    id = url.split("/shorts/")[1].split("?")[0];
                }

                return `https://www.youtube.com/embed/${id}`;
            }

            // Streamable
            if (url.includes("streamable.com")) {
                const id = url.split("/").pop().split("?")[0];
                return `https://streamable.com/e/${id}`;
            }

            // Google Drive
            if (url.includes("drive.google.com")) {
            let id = "";

            if (url.includes("/file/d/")) {
                id = url.split("/file/d/")[1].split("/")[0];
            }

            return `https://drive.google.com/file/d/${id}/preview`;
            }

            // Medal
            if (url.includes("medal.tv")) {
                return null;
            }
            // TikTok
            if (url.includes("tiktok.com")) {
                const match = url.match(/video\/(\d+)/);

                if (match && match[1]) {
                    return `https://www.tiktok.com/embed/v2/${match[1]}`;
                }
            }
            
            // Twitch
            if (url.includes("twitch.tv")) {

                // Clips
                if (url.includes("/clip/")) {
                    const slug = url.split("/clip/")[1].split("?")[0];

                    return `https://clips.twitch.tv/embed?clip=${slug}&parent=${window.location.hostname}`;
                }

                // Videos (VODs)
                if (url.includes("/videos/")) {
                    const id = url.split("/videos/")[1].split("?")[0];

                    return `https://player.twitch.tv/?video=v${id}&parent=${window.location.hostname}`;
                }
            }
            return null;
        },

        isEmbedVideo() {
            return this.embedUrl !== null;
        },

        video() {
            return this.embedUrl || this.videoSource;
        },
    },

    async mounted() {
        // Hide loading spinner
        this.list = await fetchList();
        this.editors = await fetchEditors();

        // Error handling
        if (!this.list) {
            this.errors = [
                "Failed to load list. Retry in a few minutes or notify list staff.",
            ];
        } else {
            this.errors.push(
                ...this.list
                    .filter(([_, err]) => err)
                    .map(([_, err]) => {
                        return `Failed to load level. (${err}.json)`;
                    })
            );
            if (!this.editors) {
                this.errors.push("Failed to load list editors.");
            }
        }

        this.loading = false;
    },
    methods: {
        score,
    },
};
