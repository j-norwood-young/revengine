<template lang="pug">
div
    label(for="tags") Tags
    MultiSelect(
        placeholder="Tags"
        :value="tags"
        @input="updateTags"
        :options="tag_options"
        :searchable="true"
        :close-on-select="true"
        :multiple="true"
        :disabled="loading_state==='loading'"
        @search-change="findTags"
    )
</template>

<script>
import { mapState, mapActions } from 'vuex'
export default {
    computed: {
        ...mapState("Article", [ 
            "tag_options",
            "tags",
            "loading_state",
        ]),
    },
    methods: {
        ...mapActions("Article", [
            "updateTags",
            "findTags",
        ])
    },
}
</script>