import vader from 'vader-sentiment';

const convert_sentiment = sentiment_score => {
    if (sentiment_score < -0.9) return "very negative";
    if (sentiment_score < -0.75) return "mostly negative";
    if (sentiment_score < -0.5) return "negative";
    if (sentiment_score < -0.25) return "somewhat negative";
    if (sentiment_score < -0) return "slightly negative";
    if (sentiment_score < 0.25) return "slightly positive";
    if (sentiment_score < 0.5) return "somewhat positive";
    if (sentiment_score < 0.75) return "positive";
    if (sentiment_score < 0.9) return "mostly positive";
    return "overwhelmingly positive";
}

export const sentiment = content => {
    try {
        const sentiment_score = vader.SentimentIntensityAnalyzer.polarity_scores(content).compound;
        const sentiment = convert_sentiment(sentiment_score);
        return { sentiment, sentiment_score };
    } catch {
        return { sentiment: "Unknown", sentiment_score: 0 }
    }
};