import path from "path";
import { fileURLToPath } from 'url';
import webpack from "webpack";
import HtmlWebpackPlugin from "html-webpack-plugin";
import MiniCssExtractPlugin from "mini-css-extract-plugin";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default {
    mode: "development",
    entry: ['@babel/polyfill', "./src/javascripts/index.js"],
    output: {
        path: path.resolve(__dirname, 'public/assets'),
        filename: 'main.bundle.js'
    },
    module: {
        rules: [
            {
                test: /\.js$/,
                loader: 'babel-loader',
                options: {
                    presets: ["@babel/env"]
                }
            },
            {
                test: /\.pug$/,
                loader: 'pug-loader'
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
				test: /\.ttf$/,
				use: ['file-loader']
			},
            {
				test: /\.css$/,
				use: ['style-loader', 'css-loader']
			},
        ]
    },
    plugins: [
        // new webpack.ProvidePlugin({
        //     $: 'jquery',
        //     "window.jQuery": 'jquery',
        //     "jQuery": "jquery",
        //     jquery: 'jquery',
        //     "window.$": 'jquery'
        // }),
        new MiniCssExtractPlugin({
            filename: 'main.style.css',
        }),
    ],
    stats: {
        colors: true
    },
    devtool: "source-map"
}