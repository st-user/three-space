const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');
const packageInfo = require('./package.json');
const path = require('path');

const SITE_ROOT = packageInfo.siteRoot;

module.exports = {
    entry: {
        main: './src/index.js',
        style: './src/style.js'
    },
    output: {
        filename: `./${SITE_ROOT}/js/[name].js`,
        path: path.resolve(__dirname, 'dist/'),
    },
    module: {
        rules: [
            {
                test: /\.css$/i,
                use: [
                    {
                        loader: 'style-loader',
                        options: {
                            injectType: 'singletonStyleTag'
                        }
                    },
                    'css-loader'],
            },
            {
                test: /\.(png|svg|jpg|jpeg|gif)$/i,
                type: 'asset/resource',
                generator: {
                    filename: `${SITE_ROOT}/[hash][ext]?q=${packageInfo.version}`
                }
            },
            {
                test: /\.m?js$/,
                exclude: /node_modules/,
                use: {
                    loader: 'babel-loader',
                    options: {
                        presets: ['@babel/preset-env']
                    }
                }
            }
        ],
    },
    plugins: [
        new CleanWebpackPlugin(),
        new CopyPlugin({
            patterns: [
                { from: './html/index.html', to: `./${SITE_ROOT}` },
                { from: './sound/sample_voice.mp3', to: `./${SITE_ROOT}/sound` },
                { from: './gltf/simple_person/simple_person_blue.glb', to: `./${SITE_ROOT}/gltf/simple_person_blue.glb` },
                { from: './.vrm/walk.json', to: `./${SITE_ROOT}/.vrm/animation` },
            ],
        })
    ]
};
