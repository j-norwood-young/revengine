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