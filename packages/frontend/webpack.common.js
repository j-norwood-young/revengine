import path from 'path';
import { fileURLToPath } from 'url';
import MiniCssExtractPlugin from "mini-css-extract-plugin";
import MomentLocalesPlugin from 'moment-locales-webpack-plugin';
import MomentTimezoneDataPlugin from 'moment-timezone-data-webpack-plugin';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default {
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