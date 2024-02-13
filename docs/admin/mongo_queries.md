# Mongo Queries

## Get top articles with a specific term

```javascript
var articles_zondo = db.articles.find({ $or: [ { tags: "Zondo" }, { title: /Zondo/ }, { content: /Zondo/ } ] })
var articles_zondo_hits = [];
articles_zondo.forEach(article => {
    var hits = article.hits.reduce((prev, curr) => prev + curr.count, 0);
    articles_zondo_hits.push({ hits, urlid: article.urlid, title: article.title });
})
articles_zondo_hits.sort((a, b) => b.hits - a.hits);
var top_10 = articles_zondo_hits.slice(0, 100);
top_10.forEach(article => {
    print(article.hits + ",https://www.dailymaverick.co.za/article/" + article.urlid);
})
```

## Export TouchBasePro list stats from Daily Maverick Main List for April 2022 to now

```bash
mongoexport \
--host=rs1/rfvengine1,rfvengine2,rfvengine3 \
-f="updatedAt,date,bounces_this_month,bounces_this_week,bounces_this_year,bounces_today,bounces_yesterday,deleted_this_month,deleted_this_week,deleted_this_year,deleted_today,deleted_yesterday,new_active_subscribers_this_month,new_active_subscribers_this_week,new_active_subscribers_this_year,new_active_subscribers_today,new_active_subscribers_yesterday,total_active_subscribers,total_bounces,total_deleted,total_unsubscribes,unsubscribes_this_month,unsubscribes_this_week,unsubscribes_this_year,unsubscribes_today,unsubscribes_yesterday" \
-d revengine-prod -c touchbaseliststats \
-q='{ "touchbaselist_id": { "$oid": "5f33f33a15d01e4d0c699131" }, "date": {"$gte": { "$date": "2022-04-01T00:00:00.001Z" }} }' --type="csv"
```

## Generate a list of the last time a user was seen
    
```javascript
let pipeline = [
    {
        $group: {
            _id: "$email",
            last_date: { $max: "$timestamp" }
        }
    },
    {
        $sort: {
            last_date: -1
        }
    },
    // {
    //     $limit: 100
    // }
]
db.touchbaseevents.aggregate(pipeline)
```

## Merge top articles list with article data

```javascript
db.getCollection('top_1000_articles_by_hits').aggregate([
    {
        $sort: {
            count: -1
        }
    },
    {
        $lookup: {
            from: 'articles',
            localField: 'post_id',
            foreignField: 'post_id',
            as: 'article'
        }
    },
    {
        $unwind: {
            path: '$article'
        }
    },
    {
        $project: {
            _id: 0,
            post_id: 1,
            count: 1,
            headline: '$article.title',
            tags: '$article.tags',
            sections: '$article.sections',
            terms: '$article.terms',
            author: '$article.author',
            date_published: '$article.date_published',
            urlid: '$article.urlid',
        }
    },
    {
        $out: 'top_1000_articles_headlines'
    }
]);
```

## Check that we are saving Sailthru events for each day

```javascript
db.sailthru_message_blast.aggregate([
    { 
        $match: { send_time: { $gte: new Date("2024-02-04")}} 
    }, { 
        $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$send_time" } }, count: { $sum: 1 } } 
    }, {
        $sort: { _id: 1 }
    } 
])
```