<template lang="pug">
div
    label(for="sections") Sections
    MultiSelect(
        placeholder="Sections"
        :value="sections"
        @input="updateSections"
        :options="section_options"
        :searchable="true"
        :close-on-select="true"
        :multiple="true"
        :disabled="loading_state!=='loaded'"
    )
</template>

<script>
import { mapState, mapGetters, mapActions } from 'vuex'
export default {
    computed: {
        ...mapState("Article", [ 
            "section_options",
            "sections",
            "loading_state",
        ]),
    },
    methods: {
        ...mapActions("Article", [
            "updateSections",
        ])
    },
}
</script>