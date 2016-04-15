var fs = require('fs');
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
    sortType: SortType.byRating,
    fileNames: {
        movieInfoMarkdownFileName: '#MOVIES.md',
        movieInfoTextFileName: '#MOVIES.txt',
        movieInfoJSONFileName: '#MOVIESJSON.txt',
        movieInfoSortedJSONFileName: '#MOVIESSORTEDJSON.txt'
    },
    description: 'rating: >= 8.0'
};
/* initial output datastructure -- heap */
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
/* helper function to sort movie */
Helper.processObject = function(allMovieInfoObject) {
  allMovieInfoObject.forEach(function(movieInfo) {
    allMovieInfo.push(movieInfo);
  })
  Helper.output();
}

/* helper function to write result infomation */
Helper.output = function(){
    console.log('成功读取待处理对象，正在打印结果...');
    console.log();

    var allMovieInfoSortedJSON = [];
    var count = allMovieInfo.nodes.length;
    var textString = 'application: xh-douban-crawler\r\nauthor: xiaohuang\r\ntotal: ' +
                       count +
                       '\r\n' +
                       appSetting.description +
                       '\r\ndate: ' +
                       Date() + '\r\n\r\n------------------------------\r\n\r\n';
    var markdownString = 'application: **xh-douban-crawler**&nbsp;&nbsp;<br/>author: **xiaohuang**&nbsp;&nbsp;<br/>total: **' +
                           count +
                           '**&nbsp;&nbsp;<br/>' +
                           appSetting.description +
                           '**&nbsp;&nbsp;<br/>date: **' +
                           Date() + '**&nbsp;&nbsp;<br/>\r\n\r\n---\r\n\r\n';

    while (allMovieInfo.nodes.length > 0) {
      var movieInfo = allMovieInfo.pop();
      allMovieInfoSortedJSON.push(movieInfo);
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
        allMovieInfoSortedJSONContent = JSON.stringify(allMovieInfoSortedJSON);
        fs.writeFile(appSetting.fileNames.movieInfoSortedJSONFileName, allMovieInfoSortedJSONContent, 'utf8', function (err) {
          if (err) throw err;
        Helper.exitCrawler();
      });
    })
  })
};

/* helper function to exit process */
Helper.exitCrawler = function(){
    var endTime = Date.now();
    console.log('打印完成,' + '总共用时: ' + ((endTime - startTime) / 1000) + ('s'));
    process.exit();
};

/* start process */
var startTime = Date.now();
fs.readFile('./' + appSetting.fileNames.movieInfoJSONFileName, 'utf-8', function(err, data) {
  if (err) {
    console.log('没有找到待处理对象或对象打开有问题!');
  } else {
    var allMovieInfoObject = JSON.parse(data);
    Helper.processObject(allMovieInfoObject);
  }
});
