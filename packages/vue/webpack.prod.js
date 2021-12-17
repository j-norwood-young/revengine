const { merge } = require('webpack-merge');
const common = require('./webpack.common.js');
const CssMinimizerPlugin = require("css-minimizer-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const TerserPlugin = require("terser-webpack-plugin");
const path = require('path');
const WebpackBundleAnalyzer = require("webpack-bundle-analyzer").BundleAnalyzerPlugin;

module.exports = merge(common, {
    mode: 'production',
    output: {
        filename: 'vue.min.js',
    },
    optimization: {
        minimize: true,
        minimizer: [
            new CssMinimizerPlugin({
                minimizerOptions: {
                    preset: [
                        "default",
                        {
                            discardComments: { removeAll: true },
                        },
                    ],
                },
            }),
            new TerserPlugin()
        ],
    },
    plugins: [
        new MiniCssExtractPlugin({
            filename: 'vue.min.css',
        }),
        new WebpackBundleAnalyzer({
            analyzerMode: "static",
            openAnalyzer: false,
            reportFilename: "vue-report.html"
        }),
    ],
});
