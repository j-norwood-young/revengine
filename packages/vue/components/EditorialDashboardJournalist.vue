<template lang="pug">
div
    .row.mb-4
        .col-sm-6
            h1 Editorial Dashboard - Journalists
            Sections.mt-4
            Tags.mt-4
        .col-sm-6
            DateRange
    .row(
        v-if="loading_state==='loading'"
    )
        .col
            h4 Fetching journalists...
    .row(
         v-if="loading_state==='loaded'"
    )
        .col
            JournalistTable
</template>

<script>
import { mapState, mapGetters, mapActions } from 'vuex'
import Sections from "./Sections.vue"
import DateRange from "./DateRange.vue"
import JournalistTable from "./JournalistTable.vue"
import Tags from "./Tags.vue"

export default {
    components: {
        Sections,
        DateRange,
        JournalistTable,
        Tags,
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
        return {}
    },
    async mounted() {
        await this.$store.dispatch("Article/init");
    },
}
</script>