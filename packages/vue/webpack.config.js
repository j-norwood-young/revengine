const path = require("path")
const webpack = require("webpack")
const MiniCssExtractPlugin = require("mini-css-extract-plugin")
const { VueLoaderPlugin } = require("vue-loader");

module.exports = {
    mode: "development",
    entry: ['@babel/polyfill', "./index.js"],
    output: {
        path: path.resolve(__dirname, '../frontend/public/assets'),
        filename: 'vue.bundle.js'
    },
    module: {
        rules: [
            {
                test: /\.(js|ts)$/,
                loader: 'babel-loader',
                exclude: /(node_modules|bower_components)/,
                options: {
                    presets: ["@babel/env"],
                    exclude: ["./config.js"]
                }
            },
            {
                test: /\.less$/,
                use: [ 
                    'style-loader',
                    MiniCssExtractPlugin.loader,
                    'css-loader', 
                    'less-loader'
                ],
            },
            {
                test: /\.scss$/,
                use: [
                  "style-loader",
                  MiniCssExtractPlugin.loader,
                  "css-loader",
                  "sass-loader"
                ]
            },
            {
                test: /\.css$/,
                use: [
                  "style-loader",
                  MiniCssExtractPlugin.loader,
                  "css-loader"
                ]
            },
            {
                test: /\.(png|jpg|gif)$/i,
                use: [
                  {
                    loader: 'url-loader',
                    options: {
                      limit: 8192
                    }
                  }
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
        new webpack.ProvidePlugin({
            $: 'jquery',
            "window.jQuery": 'jquery',
            "jQuery": "jquery",
            jquery: 'jquery',
            "window.$": 'jquery'
        }),
        new MiniCssExtractPlugin({
            filename: 'style.css',
        }),
        new webpack.IgnorePlugin(/^\.\/locale$/, /moment$/),
        new VueLoaderPlugin(),
    ],
    stats: {
        colors: true
    },
    devtool: "source-map",
    resolve: {
        alias: {
            'vue$': 'vue/dist/vue.common.js'
        }
    }
}
