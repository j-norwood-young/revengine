#!/bin/sh

# Check if GOOGLE_PROJECT_ID is set
if [ -z "$GOOGLE_PROJECT_ID" ]; then
    echo "Error: GOOGLE_PROJECT_ID environment variable is not set"
    exit 1
fi

echo "Using Google Project ID: $GOOGLE_PROJECT_ID"

# Activate service account
gcloud auth activate-service-account --key-file=$GOOGLE_APPLICATION_CREDENTIALS

# Set the project ID
gcloud config set project $GOOGLE_PROJECT_ID

# Create dataset if it doesnt exist
bq mk --dataset "${GOOGLE_PROJECT_ID}:revengine"

# Create tables if they dont exist
bq mk --table "${GOOGLE_PROJECT_ID}:revengine.woocommerce_subscriptions" id:INT64,billing_interval:INT64,billing_period:STRING,cancelled_email_sent:BOOL,created_via:STRING,customer_id:INT64,customer_ip_address:STRING,customer_note:STRING,customer_user_agent:STRING,date_completed:TIMESTAMP,date_created:TIMESTAMP,date_modified:TIMESTAMP,date_paid:TIMESTAMP,payment_method:STRING,product_name:STRING,product_total:FLOAT64,schedule_next_payment:TIMESTAMP,schedule_start:TIMESTAMP,status:STRING,suspension_count:INT64,total:FLOAT64,utm_source:STRING,utm_medium:STRING,utm_campaign:STRING,utm_term:STRING,device_type:STRING

bq mk --table "${GOOGLE_PROJECT_ID}:revengine.woocommerce_orders" id:INT64,customer_id:INT64,customer_ip_address:STRING,customer_user_agent:STRING,date_completed:TIMESTAMP,date_created:TIMESTAMP,date_modified:TIMESTAMP,date_paid:TIMESTAMP,order_key:STRING,payment_method:STRING,product_name:STRING,total:FLOAT64

bq mk --table "${GOOGLE_PROJECT_ID}:revengine.readers" id:INT64,last_update:TIMESTAMP,paying_customer:BOOL,user_registered:TIMESTAMP,wc_last_active:TIMESTAMP,wp_capabilities_reader:BOOL,wp_capabilities_author:BOOL,wp_capabilities_administrator:BOOL,touchbase_events_last_7_day:INT64,touchbase_events_previous_7_days:INT64,touchbase_events_last_30_days:INT64,touchbase_events_previous_30_days:INT64,recency_score:INT64,recency:TIMESTAMP,frequency_score:INT64,frequency:INT64,monetary_value_score:INT64,monetary_value:FLOAT64,volume_score:INT64,volume:INT64,total_lifetime_value_score:INT64,total_lifetime_value:FLOAT64

bq mk --table "${GOOGLE_PROJECT_ID}:revengine.woocommerce_memberships" id:INT64,customer_id:INT64,status:STRING,start_date:TIMESTAMP,end_date:TIMESTAMP,cancelled_date:TIMESTAMP,date_created:TIMESTAMP,date_modified:TIMESTAMP,order_id:INT64,order_total:FLOAT64,order_date_paid:TIMESTAMP,product_id:INT64,product_name:STRING,paused_date:TIMESTAMP

bq mk --table "${GOOGLE_PROJECT_ID}:revengine.articles" id:INT64,urlid:STRING,author:STRING,date_published:TIMESTAMP,date_modified:TIMESTAMP,excerpt:STRING,title:STRING,type:STRING,tag_1:STRING,tag_2:STRING,tag_3:STRING,section_1:STRING,section_2:STRING,section_3:STRING

bq mk --table "${GOOGLE_PROJECT_ID}:revengine.wordpressusers" id:INT64,user_registered:TIMESTAMP,wp_user_level:STRING,current_login:TIMESTAMP,last_login:TIMESTAMP,dm_status_user:INT64,gender:STRING,user_industry:STRING,wsl_current_provider:STRING,wc_last_active:TIMESTAMP,dm_ad_free_interacted:BOOL,dm_ad_free_toggle:BOOL,last_update:TIMESTAMP,paying_customer:BOOL,cc_expiry_date:TIMESTAMP

bq mk --table "${GOOGLE_PROJECT_ID}:revengine.customer_value" uid:STRING,date_paid:TIMESTAMP,first_payment:TIMESTAMP,last_payment:TIMESTAMP,lifetime_value:FLOAT64,month:STRING,wordpress_id:INT64,month_value:FLOAT64,payment_method:STRING,product_name_first:STRING,product_quantity_first:INT64,product_total_first:FLOAT64,product_name:STRING,recurring_period:STRING

# Start cron
cron

# Show logs
tail -f /var/log/cron.log 