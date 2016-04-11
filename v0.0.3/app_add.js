var fs = require('fs');

var appSetting = {
    fileNames: {
        urlFoundFileName: '#FoundMovieID.txt'
    }
};

var more = [];

// [ '8888888',
//   '9999999',
//   '0000000',
//   '1111111',
//   '2222222',
//   '3333333']

var moreStr = '';

more.forEach(function(s) {
  moreStr += s + '\r\n';
})

fs.appendFile(appSetting.fileNames.urlFoundFileName, moreStr, 'utf8', (err) => {
  if (err) throw err;

  console.log('成功添加新的影片ID!');

});
