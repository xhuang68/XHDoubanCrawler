var fs = require('fs');
var cheerio = require('cheerio');

/* URL seed - how to select seed */
var appSetting = {
    requireMovieRating: 8.0,
    fileNames: {
        movieInfoJSONFileName: '#MOVIESJSON.txt',
        pageFolderName: '#PAGES'
    },
};
var allMovieInfo = [];
/* helper functions */
var Helper = {};

/* helper function to write result infomation */
Helper.output = function(){
    console.log('页面处理已完成，正在保存JSON对象...');
    console.log();
    var allMovieInfoJSON = JSON.stringify(allMovieInfo);

    fs.writeFile(appSetting.fileNames.movieInfoJSONFileName, allMovieInfoJSON, 'utf8', function (err) {
      if (err) throw err;
      Helper.exitCrawler();
    });
  };

/* helper function to exit process */
Helper.exitCrawler = function(){
    var endTime = Date.now();
    console.log('保存完成,' + '总共用时: ' + ((endTime - startTime) / 1000) + ('s'));
    process.exit();
};

Helper.processNextPage = function(allFileNames) {
  var fileName = allFileNames.shift();
  if (fileName) {
    console.log('开始读取页面: ' + fileName);
    processedNumber++;
    console.log('已读取页面数 = ' + processedNumber);

    var filePath = './' + appSetting.fileNames.pageFolderName + '/' + fileName;
    fs.readFile(filePath, 'utf-8', function(err, data) {
      if (err) {
        console.log('此页面读取出错...');
        console.log();
        Helper.processNextPage(allFileNames);
        return;
      }

      console.log('成功读取此页面...');

      var $ = cheerio.load(data);
      // good page validation
      var isMovie = $('#recommendations h2 i').text() === "喜欢这部电影的人也喜欢";
      if (!isMovie) {
        console.log('注意: 此页面无效!');
        console.log();
        Helper.processNextPage(allFileNames);
        return;
      }

      processedValidNumber++;

      // parse requirement
      var rating = parseFloat($('.rating_self strong').text());
      if (rating >= appSetting.requireMovieRating) {
        var name = $($('h1 span')[0]).text() ? $($('h1 span')[0]).text() : 'Unknown';
        var year = /(\d+)/.exec($($('h1 span')[1]).text()) ? /(\d+)/.exec($($('h1 span')[1]).text())[0] : 'Unknown';
        var director = $($('#info span')[2]).text() ? $($('#info span')[2]).text() : 'Unknown';
        var movieInfo = {
          name: name,
          year: year,
          director: director,
          rating: rating,
          url: 'https://movie.douban.com/subject/' + fileName.split('.')[0]
        }
        // add to heap and change total count
        allMovieInfo.push(movieInfo);
        requiredNumber++;
      }


      console.log('已处理有效页面数 = ' + processedValidNumber);
      console.log('符合要求页面数 = ' + requiredNumber);
      console.log();
      Helper.processNextPage(allFileNames);
    });
  } else {
    Helper.output();
  }
}

/* start process */
var startTime = Date.now();
var processedNumber = 0;
var processedValidNumber = 0;
var requiredNumber = 0;

fs.readdir('./' + appSetting.fileNames.pageFolderName, function(err, files) {
  if (err) {
    console.log('没有找到待处理页面文件夹或无法打开文件夹!');
  } else {
    console.log('总共页面数 = ' + files.length);
    console.log();
    Helper.processNextPage(files);
  }
});
