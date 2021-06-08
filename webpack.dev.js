const { merge } = require('webpack-merge');
const common = require('./webpack.common.js');
const CopyPlugin = require('copy-webpack-plugin');

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
