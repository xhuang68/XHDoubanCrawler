var fs = require('fs');
var request = require('request');
var cheerio = require('cheerio');
var mkdirp = require('mkdirp');

/* URL seed - how to select seed */
var seedURL = [
        // 'http://movie.douban.com/subject/3008892/', /* 无效测试页面 */
        'http://movie.douban.com/subject/1291832/', /* 低俗小说 Pulp Fiction (1994) */
        // 'http://movie.douban.com/subject/1292233/',  /* 发条橙 A Clockwork Orange (1971) */
        'http://movie.douban.com/subject/1296987/',  /* 安妮·霍尔 Annie Hall (1977) */
        // 'http://movie.douban.com/subject/1780330/', /* 致命魔术 The Prestige (2006) */
        // 'http://movie.douban.com/subject/1303173/',  /* 甲方乙方 (1997) */
        'http://movie.douban.com/subject/1291875/', /* 阳光灿烂的日子 (1994) */
        // 'http://movie.douban.com/subject/1292365/', /* 活着 (1994) */
        // 'http://movie.douban.com/subject/1292434/', /* 一一 (2000) */
        // 'http://movie.douban.com/subject/1293374/', /* 热天午后 Dog Day Afternoon (1975) */
        // 'http://movie.douban.com/subject/21937445/', /* 辩护人 변호인 (2013) */
        // 'http://movie.douban.com/subject/1305690/', /* 阿飞正传 阿飛正傳 (1990) */
        // 'http://movie.douban.com/subject/10537853/', /* 万箭穿心 (2012) */
    ];
var processNum = seedURL.length;
var processingExit = false;
var appSetting = {
    requireMovieNumber: 5000,  /* maximum crawled page number */
    fileNames: {
        urlCrawledFileName: '#CrawledMovieID.txt',  /* save every url crawled */
        urlFoundFileName: '#FoundMovieID.txt',  /* save every url found during the process */
        urlRequiredFileName: '#RequiredMovieID.txt',
        pageFolderName: '#PAGES'
    }
};

/* save url data */
var urlDict  = {};
var urlData = {
    // urlCrawledList: [],  /* store crawled urls */
    // urlRequiredCrawledList: [],
    urlCrawledCount: 0,
    urlRequiredCount: 0,
    urlFoundCount: 0
};
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
Helper.saveRequiredMovie = function(url){
    urlData.urlRequiredCount++;
    fs.appendFile(appSetting.fileNames.urlRequiredFileName, Helper.getNumbersOfUrl(url) + '\r\n', function (err) {
        if (err) throw err;
    });
};
/* helper function to exit process */
Helper.exitCrawler = function(){
    processingExit = true;
    console.log('正在存储结果...');
    var endTime = Date.now();
    setTimeout(function () {
      console.log('任务成功,' + '总共用时: ' + ((endTime - startTime) / 1000) + ('s'));
      process.exit();
    }, 1000);
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
fetchNextURL = function(url) {
    if (processingExit) { return; }
    /* use request module */
    request(
      { url: url,
        headers: {
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/39.0.2171.99 Safari/537.36'
        }
      },
      function (error, response, body) {
        if (processingExit) { return; }
        console.log('遍历深度 =' + level);
        if (error) {
          console.log('此链接爬取出错: ' + url);
          console.log('错误: ' + error);
          console.log();
          return;
        }

        if(response.statusCode === 403){
            // requestOK = false;
            console.log('此链接爬取出错: ' + url);
            console.log('错误: ' + response.statusCode);
            console.log('爬虫被服务器禁止...');
            console.log();
            processingExit = true
            Helper.exitCrawler();
            return;
          }

        console.log('成功爬取到页面: ' + url );
        console.log('已爬页面数 = '+ urlData.urlCrawledCount);
        console.log('已爬有效页面数 = '+ urlData.urlRequiredCount);
        console.log('总共找到的页面数 = ' + urlData.urlFoundCount);

        Helper.saveCrawledURL(url);

        var html = response.body.toString()
        var $ = cheerio.load(html);

        // good page validation
        var isMovie = $('#recommendations h2 i').text() === "喜欢这部电影的人也喜欢";
        if (!isMovie) {
          console.log('注意: 此页面无效!');
          console.log();
          return;
        }

        /* save current page to local file folder */
        var htmlStream = fs.WriteStream('./' + appSetting.fileNames.pageFolderName + '/' + Helper.getNumbersOfUrl(url) + '.html');
        htmlStream.write(html);
        htmlStream.end();
        Helper.saveRequiredMovie(url);

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
                fs.appendFile(appSetting.fileNames.urlFoundFileName, numbers + '\r\n', function (err) {
                    if (err) throw err;
                });
            }
        });
        /* hrefs.length === 0 => no more new hrefs, stop recursion */
        if(hrefs.length === 0){
            console.log('本页面未能爬取到新链接...');
        }

        /* keep requesting if no more than the max page number */
        if(urlData.urlRequiredCount < appSetting.requireMovieNumber){
          console.log();
          for (var i = 0; i < hrefs.length; i++) {
              if (processingExit) { return; }
              fetchNextURL(hrefs[i]);
          }
        } else {
          console.log('爬取到的页面数目已达到预期值...');
          console.log();
          processingExit = true;
          Helper.exitCrawler();
        }
    });
};

/* start process */
var startTime = Date.now();
var pageFolderPath = './' + appSetting.fileNames.pageFolderName;
fs.stat(appSetting.fileNames.pageFolderName, function(err, stats) {
  if (!stats) {
    mkdirp('./' + appSetting.fileNames.pageFolderName, function(err) {
      if (err) throw err;
      startProcess();
    });
  } else {
    startProcess();
  }
});

var startProcess = function () {
  fs.stat(appSetting.fileNames.urlFoundFileName, function(err, stats) {
    if (!stats) {
      seedURL.forEach(function(url) {
        var number = Helper.getNumbersOfUrl(url);
        urlDict[number] = true;
      });

      seedURL.forEach(function(url) {
        fetchNextURL(url);
      });
    } else {
        var requiredMovieID = [];
        var crawledMovieID = [];
        var foundMovieID = [];
        var uncrawledMovieID = [];

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

                if (uncrawledMovieID.length <= 0) {
                  console.log('没有足够多的已发现页面可以爬取...');
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
                  console.log('爬取任务已完成...');
                  return;
                }

                uncrawledMovieID = uncrawledMovieID.map(function(id){
                  return 'http://movie.douban.com/subject/' + id + '/';
                })
                seedURL = uncrawledMovieID.slice(0, Math.min(uncrawledMovieID.length, processNum));

                seedURL.forEach(function(url) {
                  fetchNextURL(url);
                });
              });
            });
          });
        }
      });
    };
