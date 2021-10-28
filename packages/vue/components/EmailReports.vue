<template lang="pug">
div
    h4 Email Report Schedules
    b-button.btn.btn-success(v-b-modal.modal-new_email_report)
        i.fa.fa-plus
        |  New Report
    div.mt-4(@click="toggleReports")
        .btn.btn-link(v-if="!show_reports && reports.length") Show schedules ({{reports.length}}) 
            i.fa.fa-chevron-right
        .btn.btn-link(v-if="show_reports && reports.length") Hide schedules ({{reports.length}}) 
            i.fa.fa-chevron-down
    div.mt-4(v-if="show_reports")
        b-card(
        ).mt-2(v-for="report, index in reports" :key="index") 
            b-card-title
                b-link(@click="loadReport(report._id)") {{report.name}} 
            b-card-text
                div(v-if="report.period==`daily`")
                    | Daily at {{report.time.join(", ")}}
                div(v-if="report.period==`weekly`")
                    | Weekly on the {{report.day.join(", ")}}
                div(v-if="report.period==`monthly`")
                    | Monthly on {{report.date.join(", ")}}
                div
                    span(v-for="email in report.emails") {{email}}
            b-card-text
                b-link.mt-4(@click="confirmDel(report._id)")
                    | Delete 
                    i.fa.fa-times 
            
            
    b-modal#modal-new_email_report(
        title="New Report"
        @ok="handleOk"
    )
        .form-group
            label(for="report_name") Name
            input.form-control(name="current_report_name" v-bind:value="current_report_name" @input="updateName")
        .form-group
            label(for="emails") Email To
            input.form-control(name="emails" v-bind:value="current_report_emails" @input="updateEmails")
        .form-group
            label(for="schedule") Schedule
            | Send me this report 
            MultiSelect.mb-2(
                placeholder="Period"
                :value="current_report_period"
                @input="selectPeriod"
                :options="period_options"
                :searchable="false"
                :close-on-select="true"
                :show-labels="false"
                :allow-empty="false"
            )
        .form-group(v-if="current_report_period===`daily`")
            | At
            MultiSelect.mb-2(
                placeholder="Select Times"
                :value="current_report_time"
                @input="selectTime"
                :options="time_options"
                :searchable="false"
                :close-on-select="true"
                :show-labels="false"
                :allow-empty="false"
                :multiple="true"
            )
        .form-group(v-if="current_report_period===`weekly`")
            | On
            MultiSelect.mb-2(
                placeholder="Select Days"
                :value="current_report_day"
                @input="selectDay"
                :options="day_options"
                :searchable="false"
                :close-on-select="true"
                :show-labels="false"
                :allow-empty="false"
                :multiple="true"
            )
        .form-group(v-if="current_report_period===`monthly`")
            | On
            MultiSelect.mb-2(
                placeholder="Select Dates"
                :value="current_report_date"
                @input="selectDate"
                :options="date_options"
                :searchable="false"
                :close-on-select="true"
                :show-labels="false"
                :allow-empty="false"
                :multiple="true"
            )
</template>

<script>
import { mapState, mapGetters, mapActions } from 'vuex'
// import Modal from "./Modal.vue";

export default {
    props: [
        "name",
        "emails"
    ],
    components: {
    },
    computed: {
        ...mapState("Article", [ 
            
        ]),
        ...mapState("User", [ 
            "email"
        ]),
        ...mapState("Scheduled_report", [
            "current_report_emails",
            "period_options",
            "time_options",
            "day_options",
            "date_options",
            "current_report_period",
            "current_report_time",
            "current_report_day",
            "current_report_date",
            "loading_state",
            "reports",
            "show_reports",
            "report_name",
            "current_report_name",
            "current_report_emails",
        ])
    },
    methods: {
        ...mapActions("Scheduled_report", [
            "saveReport",
            "selectPeriod",
            "selectTime",
            "selectDay",
            "selectDate",
            "toggleReports",
            "updateName",
            "loadReport"
        ]),
        async handleOk(ev) {
            ev.preventDefault();
            console.log(this.$store.state.Scheduled_report.current_report_period)
            if (!(this.$store.state.Scheduled_report.current_report_period)) return;
            await this.$store.dispatch("Scheduled_report/saveReport");
            this.$nextTick(() => {
                this.$bvModal.hide('modal-new_email_report')
            })
        },
        async confirmDel(report_id) {
            if (confirm("Are you sure you want to delete this report?")) {
                await this.$store.dispatch("Scheduled_report/delReport", report_id);
            }
        },
        updateName(ev) {
            this.$store.dispatch("Scheduled_report/updateName", ev.target.value)
        },
        updateEmails(ev) {
            this.$store.dispatch("Scheduled_report/updateEmails", ev.target.value)
        },
    },
    async mounted() {
        await this.$store.dispatch("Scheduled_report/init");
    },
}
</script>