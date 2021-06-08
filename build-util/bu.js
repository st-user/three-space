const path = '../three-space-server/dist/index.html';
const packageInfo = require('../package.json');


const replaceVersion = require('./version-replace.js');


replaceVersion(path, packageInfo.version);