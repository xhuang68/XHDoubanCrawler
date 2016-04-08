var fs = require('fs');
var cheerio = require('cheerio');
var Heap = require('heap');
var pinyin = require("pinyin");

/* URL seed - how to select seed */
var SortType = {
  byName: 0,
  byDirector: 1,
  byYear: 2,
  byRating: 3
}
var appSetting = {
    // requireMovieRating: 8.0,
    sortType: SortType.byDirector,
    fileNames: {
        movieInfoMarkdownFileName: '#MOVIES.md',
        movieInfoTextFileName: '#MOVIES.txt',
        movieInfoJSONFileName: '#MOVIESJSON.txt',
        pageFolderName: '#PAGES'
    },
    description: 'rating: >= 8.0'
};
var allMovieInfo = new Heap(function(a, b) {
  switch(appSetting.sortType) {
    case SortType.byName :
        // movie name pinyin order
        var cmp = pinyin(a.name, { style: pinyin.STYLE_NORMAL})[0][0] < pinyin(b.name, { style: pinyin.STYLE_NORMAL})[0][0];
        if (cmp) {
          return -1;
        }
        if (!cmp) {
          return 1;
        }
        return 0;
        break;
        break;
    case SortType.byDirector:
        // director pinyin order
        var cmp = pinyin(a.director, { style: pinyin.STYLE_NORMAL})[0][0] < pinyin(b.director, { style: pinyin.STYLE_NORMAL})[0][0];
        if (cmp) {
          return -1;
        }
        if (!cmp) {
          return 1;
        }
        return 0;
        break;
    case SortType.byYear:
        return b.year - a.year;
        break;
    case SortType.byRating:
        return b.rating - a.rating;
        break;
    default:
        return b.rating - a.rating;
}
});

/* helper functions */
var Helper = {};

/* helper function to write result infomation */
Helper.output = function(processedNumber){
    console.log('页面处理已完成，正在打印结果...');
    console.log();
    var allMovieInfoJSON = JSON.stringify(allMovieInfo.nodes);

    fs.writeFile(appSetting.fileNames.movieInfoJSONFileName, allMovieInfoJSON, 'utf8', function (err) {
      if (err) throw err;

      var textString = 'application: xh-douban-crawler\r\nauthor: xiaohuang\r\ntotal: ' +
                         processedNumber +
                         '\r\n' +
                         appSetting.description +
                         '\r\ndate: ' +
                         Date() + '\r\n\r\n------------------------------\r\n\r\n';
      var markdownString = 'application: **xh-douban-crawler**&nbsp;&nbsp;<br/>author: **xiaohuang**&nbsp;&nbsp;<br/>total: **' +
                             processedNumber +
                             '**&nbsp;&nbsp;<br/>' +
                             appSetting.description +
                             '**&nbsp;&nbsp;<br/>date: **' +
                             Date() + '**&nbsp;&nbsp;<br/>\r\n\r\n---\r\n\r\n';

      while (allMovieInfo.nodes.length > 0) {
        var movieInfo = allMovieInfo.pop();
        markdownString += 'Movie&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;**' + movieInfo.name + '**&nbsp;&nbsp;<br/>' +
              'Year&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;**' + movieInfo.year + '**&nbsp;&nbsp;<br/>' +
              'Director&nbsp;&nbsp;&nbsp;**' + movieInfo.director + '**&nbsp;&nbsp;<br/>' +
              'Rating&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;**' + movieInfo.rating + '**&nbsp;&nbsp;<br/>' +
              '[Douban 链接](' + movieInfo.url + ')&nbsp;&nbsp;<br/>' +
              '<br/><br/>';
        textString += movieInfo.name + '   ' + movieInfo.year + '   ' + movieInfo.director + '   ' + movieInfo.rating + '   ' + movieInfo.url + '\n';
      }
      fs.writeFile(appSetting.fileNames.movieInfoMarkdownFileName, markdownString, 'utf8', function (err) {
        if (err) throw err;
        fs.writeFile(appSetting.fileNames.movieInfoTextFileName, textString, 'utf8', function (err) {
          if (err) throw err;
          Helper.exitCrawler();
        })
      })
    })
  };

/* helper function to exit process */
Helper.exitCrawler = function(){
    var endTime = Date.now();
    console.log('打印完成,' + '总共用时: ' + ((endTime - startTime) / 1000) + ('s'));
    process.exit();
};

Helper.processNextPage = function(allFileNames) {
  var fileName = allFileNames.shift();
  if (fileName) {
    console.log('开始读取页面: ' + fileName);
    var filePath = './' + appSetting.fileNames.pageFolderName + '/' + fileName;
    fs.readFile(filePath, 'utf-8', function(err, data) {
      if (err) {
        Helper.processNextPage(allFileNames);
      }

      var $ = cheerio.load(data);
      var rating = parseFloat($('.rating_self strong').text());
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

      allMovieInfo.push(movieInfo);
      processedNumber++;
      console.log('成功读取此页面');
      console.log('已处理页面数 = ' + processedNumber);
      console.log();
      Helper.processNextPage(allFileNames);
    });
  } else {
    Helper.output(processedNumber);
  }
}

/* start process */
var startTime = Date.now();
var processedNumber = 0;
fs.readdir('./' + appSetting.fileNames.pageFolderName, function(err, files) {
  if (err) {
    throw err;
  } else {
    console.log('总共页面数 = ' + files.length);
    console.log();
    Helper.processNextPage(files);
  }
});
