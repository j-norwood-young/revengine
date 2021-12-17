const path = require('path');
const { VueLoaderPlugin } = require("vue-loader");
const MiniCssExtractPlugin = require("mini-css-extract-plugin")
const MomentLocalesPlugin = require('moment-locales-webpack-plugin');
const MomentTimezoneDataPlugin = require('moment-timezone-data-webpack-plugin');

module.exports = {
    entry: './index.js',
    output: {
        path: path.resolve(__dirname, '../frontend/public/assets')
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
                test: /\.vue$/,
                loader: "vue-loader",
            },
            {
                test: /\.pug$/,
                loader: 'pug-plain-loader'
            }
        ]
    },
    plugins: [
        new VueLoaderPlugin(),
        new MiniCssExtractPlugin({
            filename: 'vue.css',
        }),
        new MomentLocalesPlugin(),
        new MomentTimezoneDataPlugin({
            matchCountries: ["ZA"],
            startYear: 2000,
            endYear: 2050,
        }),
    ],
};