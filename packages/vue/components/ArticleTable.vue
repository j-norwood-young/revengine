<template lang="pug">
table.table.table-striped.table-bordered
    thead
        tr
            th Article
            th(@click="updateSortField('hits')") 
                | Hits
                i.fa.fa-sort-down.ml-1.text-dark(v-if="sort_field==='hits' && sort_dir===-1")
                i.fa.fa-sort-up.ml-1.text-dark(v-if="sort_field==='hits' && sort_dir===1")
                i.fa.fa-sort.ml-1.text-muted(v-if="sort_field!=='hits'")
            th(@click="updateSortField('newsletter')")  
                | Newsletter Clicks
                i.fa.fa-sort-down.ml-1.text-dark(v-if="sort_field==='newsletter' && sort_dir===-1")
                i.fa.fa-sort-up.ml-1.text-dark(v-if="sort_field==='newsletter' && sort_dir===1")
                i.fa.fa-sort.ml-1.text-muted(v-if="sort_field!=='newsletter'")
            th(@click="updateSortField('logged_in_hits_total')") 
                | Logged In Hits
                i.fa.fa-sort-down.ml-1.text-dark(v-if="sort_field==='logged_in_hits_total' && sort_dir===-1")
                i.fa.fa-sort-up.ml-1.text-dark(v-if="sort_field==='logged_in_hits_total' && sort_dir===1")
                i.fa.fa-sort.ml-1.text-muted(v-if="sort_field!=='logged_in_hits_total'")
            th(@click="updateSortField('led_to_subscription_count')") 
                | Led to Subscription
                i.fa.fa-sort-down.ml-1.text-dark(v-if="sort_field==='led_to_subscription_count' && sort_dir===-1")
                i.fa.fa-sort-up.ml-1.text-dark(v-if="sort_field==='led_to_subscription_count' && sort_dir===1")
                i.fa.fa-sort.ml-1.text-muted(v-if="sort_field!=='led_to_subscription_count'")
            th(@click="updateSortField('score')") 
                | Score
                i.fa.fa-sort-down.ml-1.text-dark(v-if="sort_field==='score' && sort_dir===-1")
                i.fa.fa-sort-up.ml-1.text-dark(v-if="sort_field==='score' && sort_dir===1")
                i.fa.fa-sort.ml-1.text-muted(v-if="sort_field!=='score'")
    tbody
        tr(
            v-for="(article, index) in articles"
            :key="article._id"
        )
            td
                img.float-left.ml-2.mr-2.img-fluid.img-thumbnail(v-bind:src="article.img_thumbnail" style="width: 60px; height: 60px;")
                h4 
                    a(v-bind:href="`/article/view/${article._id}`") {{article.title}}
                p 
                    a(href="#" @click="addJournalist(article.author)") {{ article.author }}
                p {{ article.date_published_formatted }}
                p 
                    .badge.badge-success.mr-1(
                        v-for="(section, i) in article.sections"
                        :key="article._id + 'section' + i"
                        @click="addSection(section)"
                    ) {{section}}
                p
                    .badge.badge-primary.mr-1(
                        v-for="(tag, i) in article.tags"
                        :key="article._id + 'tag' + i"
                    ) {{tag}}
            td
                h4.text-center {{Number(article.hits).toLocaleString()}}
                //- - p Rank #1
                p.text-center.mt-4.text-danger Quantile<br> {{Math.round(article.hits_rank * 10000)/100}}%
                p.text-center.mt-4 All Time<br> {{Number(article.total_hits).toLocaleString()}}
            td
                .badge.badge-danger Coming Soon
                //- h4 20,123
                //- p Rank #1
                //- p Percentile 100%
            td
                //- .badge.badge-danger Coming Soon
                h4.text-center {{Number(article.logged_in_hits_total).toLocaleString()}}
                p.text-center.mt-4.text-danger Quantile<br> {{Math.round(article.logged_in_hits_rank * 10000)/100}}%
                //- p Rank #1
                //- p Percentile 100%
            td
                //- .badge.badge-danger Coming Soon
                h4.text-center {{Number(article.led_to_subscription_count).toLocaleString()}}
                p.text-center.mt-4.text-danger Quantile<br> {{Math.round(article.led_to_subscription_rank * 10000)/100}}%
                //- p Rank #1
                //- p Percentile 100%
            td
                //- .badge.badge-danger Coming Soon
                h4.text-center {{Math.round(article.score * 100)}}
                //- h4 20,123
                //- p Rank #1
                //- p Percentile 100%
</template>

<script>
import { mapState, mapActions } from 'vuex'


export default {
    computed: {
        ...mapState("Article", [ 
            "articles",
            "sort_field",
            "sort_dir"
        ]),
    },
    methods: {
        ...mapActions("Article", [
            'updateSortField',
            'addJournalist',
            'addSection'
        ])
    },
}
</script>