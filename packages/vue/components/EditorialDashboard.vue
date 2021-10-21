<template lang="pug">
div
    EditorialDashboardSettings
    .row.mb-4
        .col-sm-6
            h1 Editorial Dashboard
            h4 {{report_name}}
            //- h4 12,345 articles
            Sections.mt-4(v-if="!mail_view")
            Journalists.mt-4(v-if="!mail_view")
            Tags.mt-4(v-if="!mail_view")
        .col-sm-5(v-if="!mail_view")
            DateRange
            EmailReports.mt-4
        .col.text-right(v-if="!mail_view")
            b-button(v-b-modal.editorial_dashboard_settings)
                i.fa.fa-cog(@click="showDashboardSettings")
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
import Tags from "./Tags.vue"
import EditorialDashboardSettings from "./EditorialDashboardSettings.vue"
import EmailReports from "./EmailReports.vue"

export default {
    components: {
        Sections,
        DateRange,
        ArticleTable,
        Journalists,
        Tags,
        EditorialDashboardSettings,
        EmailReports
    },
    computed: {
        ...mapState("Article", [ 
            "loading_state", 
            "mail_view"
        ]),
        ...mapState("Scheduled_report", [
            "report_name"
        ])
    },
    methods: {
        ...mapActions("Article", [
            "showDashboardSettings"
        ]),
    },
    data() {
        return {}
    },
    async mounted() {
        await this.$store.dispatch("Article/init");
        await this.$store.dispatch("User/init");
    },
}
</script>