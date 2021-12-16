<template lang="pug">
div
    label(for="journalists") Journalists
    MultiSelect(
        placeholder="Journalists"
        :value="journalists"
        @input="updateJournalists"
        :options="journalist_options"
        :searchable="true"
        :close-on-select="true"
        :multiple="true"
        :disabled="loading_state==='loading'"
    )
</template>

<script>
import { mapState, mapGetters, mapActions } from 'vuex'
export default {
    computed: {
        ...mapState("Article", [ 
            "journalist_options",
            "journalists",
            "loading_state",
        ]),
    },
    methods: {
        ...mapActions("Article", [
            "updateJournalists",
        ])
    },
}
</script>