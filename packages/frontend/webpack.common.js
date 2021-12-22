const path = require('path');
const MiniCssExtractPlugin = require("mini-css-extract-plugin")
const MomentLocalesPlugin = require('moment-locales-webpack-plugin');
const MomentTimezoneDataPlugin = require('moment-timezone-data-webpack-plugin');

module.exports = {
    entry: ["./src/javascripts/index.js"],
    output: {
        path: path.resolve(__dirname, 'public/assets'),
    },
    module: {
        rules: [
            {
                test: /\.less$/,
                use: [ 
                    MiniCssExtractPlugin.loader,
                    'css-loader', 
                    'less-loader'
                ],
            },
            {
                test: /\.scss$/,
                use: [
                  MiniCssExtractPlugin.loader,
                  "css-loader",
                  "sass-loader"
                ]
            },
            {
                test: /\.css$/,
                use: [
                  MiniCssExtractPlugin.loader,
                  "css-loader"
                ]
            },
            {
                test: /\.pug$/,
                loader: 'pug-loader'
            }
        ]
    },
    plugins: [
        new MiniCssExtractPlugin({
            filename: 'revengine.css',
        }),
        new MomentLocalesPlugin(),
        new MomentTimezoneDataPlugin({
            matchCountries: ["ZA"],
            startYear: 2000,
            endYear: 2050,
        }),
    ],
};