<template lang="pug">
b-modal#editorial_dashboard_settings(
    title="Editorial Dashboard Settings"
    v-bind:class="{ visible: show_dashboard_settings }"
    @ok="applyDashboardSettings"
)
    .form-group
        h5(for="visible_fields") Fields
        MultiSelect(
            placeholder="Visible Fields..."
            :value="visible_fields"
            @input="updateVisibleFields"
            :options="article_fields.map(field => field.title)"
            :searchable="true"
            :close-on-select="true"
            :multiple="true"
        )
    .form-group
        h5 Score Weighting
        table
            tbody
                tr
                    td.align-bottom(v-for="field in article_fields" v-if="!field.isScore")
                            label {{ field.title }}
                            input.form-control(type="number" :value="field.weight" min="0" @input="updateFieldWeight({ value: $event.target.value, field: field.field })")
</template>

<script>
import { mapState, mapGetters, mapActions } from 'vuex'
export default {
    computed: {
        ...mapState("Article", [ 
            "article_fields",
            "visible_fields",
            "show_dashboard_settings", 
        ]),
    },
    methods: {
        ...mapActions("Article", [
            "hideDashboardSettings",
            "updateVisibleFields",
            "applyDashboardSettings",
            "updateFieldWeight"
        ]),
    },
}
</script>

<style lang="less" scoped>
    .visible {
        display: block;
    }
    // .modal {
        // position: relative;
    // top: auto;
    // right: auto;
    // bottom: auto;
    // left: auto;
    // z-index: 1;
    // display: block;
    // }
</style>