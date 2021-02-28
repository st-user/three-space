const { merge } = require('webpack-merge');
const common = require('./webpack.common.js');
const LicensePlugin = require('webpack-license-plugin');
const packageInfo = require('./package.json');
const path = require('path');

const SITE_ROOT = packageInfo.siteRoot;

module.exports = merge(common, {
    entry: {
        'license-gen': './license-gen/index.js'
    },
    output: {
        path: path.resolve(__dirname, 'dist-discard/'),
    },
    plugins: [
        new LicensePlugin({
            excludedPackageTest: (packageName, version) => {
                return false;
            },
            outputFilename: `../dist/${SITE_ROOT}/oss-licenses.json`
        })
    ]
});
