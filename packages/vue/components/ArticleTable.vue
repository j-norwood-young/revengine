<template lang="pug">
table.table.table-striped.table-bordered
    thead
        tr
            th Article
            th Hits
            th Newsletter Clicks
            th Subscriber Reads
            th Led to Subscription
            th Score
    tbody
        tr(
            v-for="(article, index) in articles"
            :key="article._id"
        )
            td
                h4 
                    a(v-bind:href="`/article/view/${article._id}`") {{article.title}}
                p 
                    a(href="#") {{ article.author }}
                p {{ article.date_published_formatted }}
                p 
                    .badge.badge-success.mr-1(
                        v-for="(section, i) in article.sections"
                        :key="article._id + 'section' + i"
                    ) {{section}}
                p
                    .badge.badge-primary.mr-1(
                        v-for="(tag, i) in article.tags"
                        :key="article._id + 'tag' + i"
                    ) {{tag}}
            td
                h4 {{Number(article.hits).toLocaleString()}}
                //- p Rank #1
                //- p Percentile 100%
            td
                .badge.badge-danger Coming Soon
                //- h4 20,123
                //- p Rank #1
                //- p Percentile 100%
            td
                .badge.badge-danger Coming Soon
                //- h4 {{Number(article.logged_in_hits_total).toLocaleString()}}
                //- p Rank #1
                //- p Percentile 100%
            td
                //- .badge.badge-danger Coming Soon
                h4 {{Number(article.led_to_subscription_count).toLocaleString()}}
                //- p Rank #1
                //- p Percentile 100%
            td
                .badge.badge-danger Coming Soon
                //- h4 20,123
                //- p Rank #1
                //- p Percentile 100%
</template>

<script>
import { mapState, mapGetters, mapActions } from 'vuex'


export default {
    computed: {
        ...mapState("Article", [ 
            "articles"
        ]),
    },
}
</script>