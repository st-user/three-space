const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');
const packageInfo = require('./package.json');
const path = require('path');

module.exports = {
    entry: {
        main: './src/index.js',
        style: './src/style.js'
    },
    output: {
        filename: './js/[name].js',
        path: path.resolve(__dirname, '../three-space-server/dist/'),
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
                    filename: `[hash][ext]?q=${packageInfo.version}`
                }
            },
            {
                test: /\.(m?js|ts)$/,
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
                { from: './html/index.html', to: '.' },
                { from: './sound/sample_voice.mp3', to: './sound' },
                { from: './gltf/simple_person/simple_person_blue.glb', to: './gltf/simple_person_blue.glb' },
                { from: './.vrm/walk.json', to: './.vrm/animation' },
            ],
        })
    ]
};
