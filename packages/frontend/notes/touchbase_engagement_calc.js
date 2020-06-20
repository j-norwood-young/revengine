tbreaders5.forEach(reader => {
    let engagement_count = 0;
    let email_highest_engagement = 0;
    let rating_tot = 0;
    let touchbase_data = reader.touchbase_data[0];
    for (let key in touchbase_data) {
        let item = touchbase_data[key];
        if (key.indexOf("Engagement") !== -1) {
            let rating = item[0];
            let rating_val = 0;
            if (rating === "D") {
                rating_val = 1;
            } else if (rating === "C") {
                rating_val = 2;
            } else if (rating === "B") {
                rating_val = 3;
            } else if (rating === "A") {
                rating_val = 4;
            }
            engagement_count++;
            rating_tot += rating_val;
            if (rating_val > email_highest_engagement) email_highest_engagement = rating_val;
        }
    }
    let email_average_engagement = Math.floor(rating_tot / engagement_count);
    db.readers.updateOne({ _id: reader._id }, { $set: { email_highest_engagement, email_average_engagement } });
})