import { merge } from 'webpack-merge';
import common from './webpack.common.js';
import CssMinimizerPlugin from "css-minimizer-webpack-plugin";
import MiniCssExtractPlugin from "mini-css-extract-plugin";
import TerserPlugin from "terser-webpack-plugin";
import { BundleAnalyzerPlugin as WebpackBundleAnalyzer } from "webpack-bundle-analyzer";

export default merge(common, {
    mode: 'production',
    output: {
        filename: 'revengine.min.js',
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
            filename: 'revengine.min.css',
        }),
        new WebpackBundleAnalyzer({
            analyzerMode: "static",
            openAnalyzer: false,
            reportFilename: "revengine-report.html"
        }),
    ],
});
