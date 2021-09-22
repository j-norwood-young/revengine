<template lang="pug">
div
    .row.mb-4
        .col-sm-6
            h1 Editorial Dashboard
            //- h4 12,345 articles
            Sections.mt-4
            Journalists.mt-4
        .col-sm-6
            DateRange
    .row(
        v-if="loading_state==='loading'"
    )
        .col
            h4 Fetching articles...
    .row(
         v-if="loading_state==='loaded'"
    )
        .col
            ArticleTable
</template>

<script>
import { mapState, mapGetters, mapActions } from 'vuex'
import Sections from "./Sections.vue"
import DateRange from "./DateRange.vue"
import ArticleTable from "./ArticleTable.vue"
import Journalists from "./Journalists.vue"

export default {
    components: {
        Sections,
        DateRange,
        ArticleTable,
        Journalists,
    },
    computed: {
        ...mapState("Article", [ 
            "loading_state", 
        ]),
    },
    methods: {
        ...mapActions("Article", [
        ])
    },
    data() {
        return {
            journalists_options: [
                "Jason Norwood-Young",
                "Rowan",
                "Styli"
            ],
            journalists: [],
        }
    },
    async mounted() {
        await this.$store.dispatch("Article/init");
    },
}
</script>