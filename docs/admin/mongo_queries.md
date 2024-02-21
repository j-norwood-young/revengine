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

## Find readers in sailthru who are missing in readers, and add them

```javascript
db.sailthru_profile.aggregate([
    {
        $lookup: {
            from: "readers",
            localField: "email",
            foreignField: "email",
            as: "matchedDocs"
        }
    },
    {
        $match: {
            matchedDocs: { $size: 0 }
        }
    },
    {
        $project: {
            _id: 0,
            email: 1,
            "vars.first_name": 1,
            "vars.last_name": 1,
        }
    },
    {
        $project: {
            email: 1,
            first_name: "$vars.first_name",
            last_name: "$vars.last_name"
        }
    },
    {
        $out: "missing_readers"
    }
])

db.missing_readers.find().forEach(function(doc) {
    db.readers.insertOne(doc);
});
```

### Fix dates in sailthru_message_blast

```javascript
var cursor = db.sailthru_message_blast.find({ _processed: { $ne: true } }).limit(1000000);
var upserts = [];
cursor.forEach(function(doc) {
    var new_doc = {};
    new_doc.send_time = new Date(doc.send_time);
    if (doc.opens) {
        new_doc.opens = [];
        doc.opens.forEach(function(open) {
            new_doc.opens.push({
                ts: new Date(open.ts)
            });
        });
        new_doc.open_count = new_doc.opens.length;
        new_doc.open_time = new_doc.opens[0].ts;
    }
    if (doc.clicks) {
        new_doc.clicks = [];
        doc.clicks.forEach(function(click) {
            new_doc.clicks.push({
                url: click.url,
                ts: new Date(click.ts)
            });
        });
        new_doc.click_count = new_doc.clicks.length;
        new_doc.click_time = new_doc.clicks[0].ts;
    }
    new_doc._processed = true;
    upserts.push({
        updateOne: {
            filter: { _id: doc._id },
            update: { $set: new_doc }
        }
    });
});
db.sailthru_message_blast.bulkWrite(upserts);
db.sailthru_message_blast.find({ _processed: { $ne: true } }).count();
```

## Check that we are saving Sailthru events for each day

```javascript
var d = new Date();
d.setDate(d.getDate()-7);
db.sailthru_message_blast.aggregate([
    { 
        $match: { open_time: { $gte: d}} 
    }, { 
        $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$open_time" } }, count: { $sum: 1 } } 
    }, {
        $sort: { _id: 1 }
    } 
])
```

## Rename one field to another in a collection

```javascript
db.interactions.updateMany(
  { "count_by_service.service": "sailthru_blast" },
  [
    {
      $addFields: {
        sailthru_blast_open_count: "$count_by_service.count"
      }
    },
    {
      $unset: "count_by_service"
    }
  ]
)
```

## Sum up multiple fields and save as another field

```javascript
db.interactions.updateMany(
  {},
  [
    {
      $set: {
        count: {
          $add: [
            { $ifNull: ["$web_count", 0] },
            { $ifNull: ["$sailthru_blast_open_count", 0] }
          ]
        }
      }
    }
  ]
)
```