<template lang="pug">
div
    MultiSelect.mb-2(
        :value="quick_date_range_value"
        @input="updateQuickDateRange"
        track-by="label"
        label="label"
        :options="quick_date_range_options"
        :searchable="false"
        :close-on-select="true"
        :show-labels="false"
        :allow-empty="false"
        :disabled="loading_state!=='loaded'"
    )
    DatePicker(
        :value="date_range"
        @input="updateDateRange"
        :range="true"
        :disabled="loading_state!=='loaded'"
    )
</template>

<script>
import { mapState, mapGetters, mapActions } from 'vuex'

export default {
    computed: {
        ...mapState("Article", [ 
            "quick_date_range_value",
            "quick_date_range_options",
            "date_range",
            "loading_state",
        ]),
    },
    methods: {
        ...mapActions("Article", [
            'updateQuickDateRange',
            "updateDateRange",
        ])
    },
}
</script>