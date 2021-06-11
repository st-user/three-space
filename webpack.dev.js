const { merge } = require('webpack-merge');// eslint-disable-line
const common = require('./webpack.common.js');// eslint-disable-line
const CopyPlugin = require('copy-webpack-plugin');// eslint-disable-line

module.exports = merge(common, {
    entry: {
        test: './test/js/index.js',
        main: './src/index.devel.js',
    },
    mode: 'development',
    devtool: 'inline-source-map',
    plugins: [
        new CopyPlugin({
            patterns: [
                { from: './html/index_test.html', to: './' }
            ],
        }),
    ]
});
