const moment = require("moment");
const crypto = require("crypto");
const mysql_date_format = 'YYYY-MM-DD HH:mm:ss';
const format_date = d => d ? moment(d).format(mysql_date_format) : null;
const getSource = d => {
    if (!d.meta_data) return null;
    let source = d.meta_data.find(md => (md.key === "ossc_tracking"));
    if (!source) return null;
}

module.exports = [
    {
        collection: "article",
        table: "articles",
        relationships: {
            uid: d => d._id,
            post_id: d => d.post_id,
            slug: d => d.urlid,
            date_published: d => format_date(d.date_published),
            date_modified: d => format_date(d.date_modified),
            content: d => (d.content) ? d.content.replace(/[^\x20-\x7E]+/g, '') : "",
            title: d => d.title,
            excerpt: d => d.excerpt,
            type: d => d.type,
            tags: d => d.tags.join(","),
            sections: d => d.sections.join(","),
            date_updated: d => moment(d.updatedAt).format(mysql_date_format),
        }
    },
    {
        collection: "device",
        table: "devices",
        relationships: {
            uid: d => d._id,
            wordpress_id: d => d.wordpress_id,
            browser: d => d.browser,
            browser_version: d => d.browser_version,
            os: d => d.os,
            os_version: d => d.os_version,
            platform: d => d.platform,
            count: d => d.count,
            date_updated: d => format_date(d.updatedAt),
        }
    },
    {
        collection: "reader",
        table: "readers",
        relationships: {
            uid: d => d._id,
            wordpress_id: d => d.wordpress_id,
            email_md5: d => (d.email) ? crypto.createHash("md5").update(d.email).digest("hex") : null,
            paying_customer: d => d.paying_customer,
            user_registered: d => d.user_registered ? moment(d.user_registered).format(mysql_date_format) : null,
            date_updated: d => moment(d.updatedAt).format(mysql_date_format),
        }
    },
    {
        collection: "rfv",
        table: "rfvs",
        relationships: {
            id: d => d._id,
            date: d => moment(d.date).format(mysql_date_format),
            reader_uid: d => d.reader_id,
            recency_score: d => d.recency_score,
            recency: d => moment(d.recency).format(mysql_date_format),
            recency_quantile_rank: d => d.recency_quantile_rank,
            frequency_score: d => d.frequency_score,
            frequency: d => d.frequency,
            frequency_quantile_rank: d => d.frequency_quantile_rank,
            volume_score: d => d.volume_score,
            volume: d => d.volume,
            volume_quantile_rank: d => d.volume_quantile_rank,
            date_updated: d => moment(d.updatedAt).format(mysql_date_format),
        }
    },
    {
        collection: "touchbaseevent",
        table: "touchbase_events",
        relationships: {
            email_md5: d => (d.email) ? crypto.createHash("md5").update(d.email.toLowerCase()).digest("hex") : null,
            timestamp: d => moment(d.timestamp).format(mysql_date_format),
            event: d => d.event,
            url: d => (d.url) ? d.url.substring(0, 255) : null,
            ip_address: d => d.ip_address,
            latitude: d => d.latitude,
            longitude: d => d.longitude,
            city: d => d.city,
            region: d => d.region,
            country_name: d => d.country_name,
            country_code: d => d.country_code,
            date_updated: d => moment(d.updatedAt).format(mysql_date_format),
            article_uid: d => {
                try {
                    if (!d.url) return null;
                    const article = articles.find(a => d.url.includes(a.urlid));
                    if (article) {
                        return article._id;
                    }
                    return null;
                } catch(err) {
                    return null;
                }
            }
        }
    },
    {
        collection: "woocommerce_order",
        table: "woocommerce_orders",
        relationships: {
            uid: d => d._id,
            wordpress_id: d => d.customer_id,
            ip_address: d => d.customer_ip_address,
            user_agent: d => d.customer_user_agent,
            date_completed: d => format_date(d.date_completed),
            date_created: d => format_date(d.date_created),
            date_paid: d => format_date(d.date_paid),
            payment_method: d => d.payment_method,
            product_name: d => d.products[0] ? d.products[0].name : null,
            total: d => d.total,
            date_updated: d => format_date(d.updatedAt),
        }
    },
    {
        collection: "woocommerce_subscription",
        table: "woocommerce_subscriptions",
        relationships: {
            uid: d => d._id,
            wordpress_id: d => d.customer_id,
            status: d => d.status,
            product_total: d => d.total,
            product_name: d => (d.products.length) ? d.products[0].name : 0,
            billing_period: d => d.billing_period,
            schedule_start: d => format_date(d.schedule_start),
            suspension_count: d => d.suspension_count,
            payment_method: d => d.payment_method,
            source_source: d => {
                const source = getSource(d);
                if (source) return source.value.utmSource;
                return null;
            },
            source_medium: d => {
                const source = getSource(d);
                if (source) return source.value.utmMedium;
                return null;
            },
            source_campaign: d => {
                const source = getSource(d);
                if (source) return source.value.utmCampaign;
                return null;
            },
            source_term: d => {
                const source = getSource(d);
                if (source) return source.value.utmTerm;
                return null;
            },
            source_device: d => {
                const source = getSource(d);
                if (source) return source.value.utmDevice;
                return null;
            },
            date_updated: d => format_date(d.updatedAt),
        }
    },
    
]