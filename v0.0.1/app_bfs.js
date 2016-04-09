var fs = require('fs');
var request = require('request');
var cheerio = require('cheerio');
var Heap = require('heap');
var pinyin = require("pinyin");

/* URL seed - how to select seed */
var seedURL = [
        // 'http://movie.douban.com/subject/3008892/', /* 无效测试页面 */
        'http://movie.douban.com/subject/1291832/', /* 低俗小说 Pulp Fiction (1994) */
        'http://movie.douban.com/subject/1292233/',  /* 发条橙 A Clockwork Orange (1971) */
        'http://movie.douban.com/subject/1296987/',  /* 安妮·霍尔 Annie Hall (1977) */
        'http://movie.douban.com/subject/1780330/', /* 致命魔术 The Prestige (2006) */
        'http://movie.douban.com/subject/1303173/',  /* 甲方乙方 (1997) */
        'http://movie.douban.com/subject/1291875/', /* 阳光灿烂的日子 (1994) */
        'http://movie.douban.com/subject/1292365/', /* 活着 (1994) */
        'http://movie.douban.com/subject/1292434/', /* 一一 (2000) */
        'http://movie.douban.com/subject/1293374/', /* 热天午后 Dog Day Afternoon (1975) */
        'http://movie.douban.com/subject/21937445/', /* 辩护人 변호인 (2013) */
        'http://movie.douban.com/subject/1305690/', /* 阿飞正传 阿飛正傳 (1990) */
        'http://movie.douban.com/subject/10537853/', /* 万箭穿心 (2012) */
    ];
var processNum = seedURL.length;
var processingOutput = false;
var requestOK = true;
var SortType = {
  byName: 0,
  byDirector: 1,
  byYear: 2,
  byRating: 3
}
var appSetting = {
    requireMovieNumber: 2000,  /* maximum crawled page number */
    requireMovieRating: 8.0,
    sortType: SortType.byRating,
    fileNames: {
        urlCrawledFileName: '#CrawledMovieID.txt',  /* save every url crawled */
        urlFoundFileName: '#FoundMovieID.txt',  /* save every url found during the process */
        urlRequiredFileName: '#RequiredMovieID.txt',
        movieInfoMarkdownFileName: '#MOVIES.md',
        movieInfoTextFileName: '#MOVIES.txt',
        movieInfoJSONFileName: '#MOVIESJSON.txt'
    }
};

/* save url data */
var urlDict  = {};
var urlQueue = [];
var urlData = {
    // urlCrawledList: [],  /* store crawled urls */
    // urlRequiredCrawledList: [],
    urlCrawledCount: 0,
    urlRequiredCount: 0,
    urlFoundCount: 0
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

/* helper function to process string type url */
/* input: href with parameter (http://example.com/example?example=true)
/* output: clean href without string after '?' */
var Helper = {};
Helper.getUrl = function(href){
    var index = href.indexOf('?');
    var url = href;
    if (index > -1) {
        url = href.substring(0, index);
    }
    return url;
};
Helper.getNumbersOfUrl = function(href){
    var pattern = /\d+/;
    var numbers = pattern.exec(href);
    return numbers;
}
Helper.saveCrawledURL = function(url){
    urlData.urlCrawledCount++;
    fs.appendFile(appSetting.fileNames.urlCrawledFileName, Helper.getNumbersOfUrl(url) + '\r\n', function (err) {
        if (err) throw err;
    });
};
Helper.saveRequiredMovie = function(movieInfo){
    urlData.urlRequiredCount++;
    fs.appendFile(appSetting.fileNames.urlRequiredFileName, Helper.getNumbersOfUrl(movieInfo.url) + '\r\n', function (err) {
        if (err) throw err;
    });
    allMovieInfo.push(movieInfo);
};
/* helper function to handle error | return | complete */
Helper.return = function(urlQueue, taskId) {
  if (urlData.urlRequiredCount >= appSetting.requireMovieNumber) {
    console.log('符合要求的页面数目已达到预期值...');
    processingOutput = true;
    Helper.output();
  } else if (!requestOK) {
    console.log('爬虫被服务器禁止...');
    processingOutput = true;
    Helper.output();
  } else {
    url = urlQueue.shift();
    if (url) {
      fetchNextURL(url, urlQueue, taskId);
    } else {
      processNum--;
      console.log('此并发没有新的网页可以抓取...');
      if (processNum <= 3) {
        processingOutput = true;
        Helper.output();
      }
    }
  }
  console.log();
}
/* helper function to write result infomation */
Helper.output = function(){
    console.log('任务已完成，正在打印爬取结果...');

    var allMovieInfoJSON = JSON.stringify(allMovieInfo.nodes);

    fs.writeFile(appSetting.fileNames.movieInfoJSONFileName, allMovieInfoJSON, 'utf8', function (err) {
      if (err) throw err;

      var textString = 'application: xh-douban-crawler\r\nauthor: xiaohuang\r\ntotal: ' +
                         urlData.urlRequiredCount +
                         '\r\nrating: >= ' +
                         appSetting.requireMovieRating +
                         '\r\ndate: ' +
                         Date() + '\r\n\r\n------------------------------\r\n\r\n';
      var markdownString = 'application: **xh-douban-crawler**&nbsp;&nbsp;<br/>author: **xiaohuang**&nbsp;&nbsp;<br/>total: **' +
                             urlData.urlRequiredCount +
                             '**&nbsp;&nbsp;<br/>rating: **>= ' +
                             appSetting.requireMovieRating +
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
    console.log('任务成功,' + '总共用时: ' + ((endTime - startTime) / 1000) + ('s'));
    process.exit();
};
/* helper function to remove duplicate ids when restart the program */
Helper.findUncrawledMovieID = function(crawledMovieID, foundMovieID) {

  var crawledMovieIDDict = {};

  crawledMovieID.forEach( function (id) {
      crawledMovieIDDict[id] = true;
  })

  var uncrawledMovieID = [];

  foundMovieID.forEach(function(id) {
    if (!crawledMovieIDDict[id] && id != '') {
      uncrawledMovieID.push(id);
    }
  })

  return uncrawledMovieID;
}

/* Core functin */
/* fetch data from input url */
/* extract similar urls and remove the duplicate ones */
var promiseRequest = function (url){
  // console.log("开始爬取页面: " + url);
  return new Promise(function(resolve, reject) {
    request(
      { url: url,
        headers: {
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/39.0.2171.99 Safari/537.36'
        }
      },
      function(error, response, body){
        if (processingOutput) { return; }
        if(error) { reject(error); }
        else {
          if(response.statusCode === 403){
            requestOK = false;
            reject(new Error(response.statusCode));// + ': ' + response.body));
          } else {
            try {
              var html = response.body.toString();
              var obj = {
                url: url,
                html: html
              }
              resolve(obj);
            } catch(e){
              reject(new Error(response.statusCode));// + ': ' + response.body));
            }
          }
        }
      })
  })
};

var fetchNextURL = function (url, urlQueue, taskId) {
  if (processingOutput) { return; }
  promiseRequest(url).then( function(obj) {
    if (processingOutput) { return; }
    var html = obj.html;
    var url = obj.url;
    // console.log(html);
    console.log('任务' + taskId);
    console.log('成功爬取到页面: ' + url );
    console.log('已爬有效页面数 = '+ urlData.urlCrawledCount);
    console.log('符合要求页面数 = '+ urlData.urlRequiredCount);
    console.log('总共找到的页面数 = ' + urlData.urlFoundCount);

    // store both valid and invalid page
    // when restart crawler will ignore these crawled invalid pages
    // these pages do not include those 403 pages
    // 403 pages will skip this 'then' to 'catch'
    Helper.saveCrawledURL(url);

    var $ = cheerio.load(html); // load $(page)
    // console.log(response.body.toString());
    /* save current page to local file folder */
    var numbers = Helper.getNumbersOfUrl(url); // parse movie ID
    var rating = parseFloat($('.rating_self strong').text()); // parse movie rating
    // good page validation
    var isMovie = $('#recommendations h2 i').text() === "喜欢这部电影的人也喜欢";
    if (!isMovie) {
      console.log('注意: 此页面无效!');
      Helper.return(urlQueue, taskId);
      return;
    }

    if (rating >= appSetting.requireMovieRating) {
      var name = $($('h1 span')[0]).text() ? $($('h1 span')[0]).text() : 'Unknown';
      var year = /(\d+)/.exec($($('h1 span')[1]).text()) ? /(\d+)/.exec($($('h1 span')[1]).text())[0] : 'Unknown';
      var director = $($('#info span')[2]).text() ? $($('#info span')[2]).text() : 'Unknown';

      var movieInfo = {
        name: name,
        year: year,
        director: director,
        rating: rating,
        url: url
      }

      Helper.saveRequiredMovie(movieInfo);
    }
    /* find all urls contained in current page */
    /* remove duplicates and put them in hrefs*/
    var hrefs = [];
    $('#recommendations dt a').each( function(index, item) {
        var href = Helper.getUrl( $(item).attr('href') );
        var numbers = Helper.getNumbersOfUrl(href);
        if(!urlDict[numbers]){
            urlDict[numbers] = true;
            urlData.urlFoundCount++;
            hrefs.push(href);
            fs.appendFile(appSetting.fileNames.urlFoundFileName, Helper.getNumbersOfUrl(href) + '\r\n', function (err) {
                if (err) throw err;
            });
        }
    });
    /* hrefs.length === 0 => no more new hrefs, stop recursion */
    if(hrefs.length === 0){
        console.log('此页面未能爬取到新链接...');
    } else {
        urlQueue = urlQueue.concat(hrefs);
    }

    Helper.return(urlQueue, taskId);
  }).catch(function(error) {
    console.log('此链接爬取出错: ' + url);
    console.log('错误: ' + error);
    Helper.return(urlQueue, taskId);
  });
};

/* start process */
var startTime = Date.now();

fs.exists(appSetting.fileNames.movieInfoJSONFileName, (exists) => {
  if (!exists) {
    seedURL.forEach(function(url, index) {
      fs.appendFile(appSetting.fileNames.urlFoundFileName, Helper.getNumbersOfUrl(url) + '\r\n', function (err) {
          if (err) throw err;
      });
      fetchNextURL(url, [], index);
    })
  } else {
      var requiredMovieID = [];
      var crawledMovieID = [];
      var foundMovieID = [];
      var uncrawledMovieID = [];

      fs.readFile(appSetting.fileNames.movieInfoJSONFileName, 'utf8', (err, data) => {
        if (err) throw err;
        var allMovieInfoJSON = JSON.parse(data);
        allMovieInfoJSON.forEach(function(movieInfo) {
          allMovieInfo.push(movieInfo);
        })

        fs.readFile(appSetting.fileNames.urlRequiredFileName, 'utf8', (err, data) => {
          if (err) throw err;

          requiredMovieID = data.split('\r\n');

          fs.readFile(appSetting.fileNames.urlCrawledFileName, 'utf8', (err, data) => {

            if (err) throw err;

            crawledMovieID = data.split('\r\n');

            fs.readFile(appSetting.fileNames.urlFoundFileName, 'utf8', (err, data) => {
              if (err) throw err;
              foundMovieID = data.split('\r\n');

              uncrawledMovieID = Helper.findUncrawledMovieID(crawledMovieID, foundMovieID);

              if (uncrawledMovieID.length <= processNum) {
                console.log('没有足够多的已发现页面可以爬取...');
                console.log('请调整 processNum 或者 requireMovieNumber...');
                return;
              }

              foundMovieID.forEach( function(id) {
                urlDict[id] = true;
              })
              urlData.urlCrawledCount = crawledMovieID.length - 1;
              urlData.urlFoundCount = foundMovieID.length - 1;
              if (requiredMovieID.length < appSetting.requireMovieNumber) {
                urlData.urlRequiredCount = requiredMovieID.length - 1;
              } else {
                return;
              }

              var taskNumbersForEachProcess = parseInt(uncrawledMovieID.length / processNum);
              var urlQueue = [];
              for (var q = 0; q < processNum; q++) {
                var i = 0;
                var queue = [];
                while (i < taskNumbersForEachProcess) {
                  var id = uncrawledMovieID.shift();
                  if (id) {
                    var url = 'http://movie.douban.com/subject/' + id + '/';
                    queue.push(url);
                  }
                  i++;
                }
                urlQueue.push(queue);
              }
              if (uncrawledMovieID.length > 0) {
                uncrawledMovieID = uncrawledMovieID.map(function(id){
                  return 'http://movie.douban.com/subject/' + id + '/';
                })
                urlQueue[0] = urlQueue[0].concat(uncrawledMovieID);
              }

              for (var i = 0; i < processNum; i++) {
                var url = urlQueue[i].shift();
                fetchNextURL(url, urlQueue[i], i);
              }
            });
          });
        });
      });
    }
  });
