<template lang="pug">
table.table.table-striped.table-bordered
    thead
        tr
            th.revengine-width-700 Article
            th(
                v-for="(field, i) in article_fields"
                :key="field.field"
                
                v-if="visible_fields.includes(field.title)"
            ) 
                i.cursor-pointer.fa.fa-sort-down.mr-1.text-dark(v-if="sort_field===field.field && sort_dir===-1" @click="updateSortField(field.field)")
                i.cursor-pointer.fa.fa-sort-up.mr-1.text-dark(v-if="sort_field===field.field && sort_dir===1" @click="updateSortField(field.field)")
                i.cursor-pointer.fa.fa-sort.mr-1.text-muted(v-if="sort_field!==field.field" @click="updateSortField(field.field)")
                div(v-if="field.info" v-b-popover.hover="field.info" placement="top")
                    | {{field.title}}
                div(v-else)
                    | {{field.title}}
    tbody
        tr(
            v-for="(article, index) in articles"
            :key="article._id"
        )
            td.revengine-width-700
                p {{ article.date_published_formatted }}
                img.float-left.ml-2.mr-2.img-fluid.img-thumbnail(v-bind:src="article.img_thumbnail" style="width: 60px; height: 60px;")
                h4 
                    a(v-bind:href="fullUrl(`/article/view/${article._id}`)") {{article.title}}
                hr
                p 
                    .badge.badge-secondary {{ article.author }}
                        a.ml-2.text-white.fa.fa-plus(@click="addJournalist(article.author)")
                p 
                    .badge.badge-success.mr-1(
                        v-for="(section, i) in article.sections"
                        :key="article._id + 'section' + i"
                    ) {{section}}
                        a.ml-2.text-white.fa.fa-plus(@click="addSection(section)")
                p
                    .badge.badge-lg.badge-primary.mr-1(
                        v-for="(tag, i) in article.tags"
                        :key="article._id + 'tag' + i"
                    ) {{tag}} 
                        a.ml-2.text-white.fa.fa-plus(@click="addTag(tag)")
            td(v-for="field in article_fields"
                :key="field.field"
                v-if="visible_fields.includes(field.title)"
            )
                h4.text-center {{field.fn(article[field.field])}}
                //- - p Rank #1
                p(v-if="article[field.field + '_rank']").text-center.mt-4.text-danger Quantile<br> {{Math.round(article[field.field + "_rank"] * 10000)/100}}%
                p(v-if="field.weight").text-center.mt-4 Weighted Score<br> {{article[field.field + "_rank"] ? Math.round(article[field.field + "_rank"] * field.weight * 100)/100 : 0}} / {{ field.weight }}
                //- p.text-center.mt-4 All Time<br> {{Number(article.total_hits).toLocaleString()}}
</template>

<script>
import { mapState, mapActions } from 'vuex'


export default {
    computed: {
        ...mapState("Article", [ 
            "articles",
            "sort_field",
            "sort_dir",
            "article_fields",
            "visible_fields"
        ]),
    },
    methods: {
        ...mapActions("Article", [
            'updateSortField',
            'addJournalist',
            'addSection',
            'addTag',
        ]),
        fullUrl(url){
            return window.location.origin + url
        }
    },
}
</script>

<style lang="less" scoped>
.revengine-width-700 {
    max-width: 700px;
}
.cursor-pointer {
    cursor: pointer;
}
</style>