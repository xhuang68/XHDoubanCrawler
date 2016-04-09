var fs = require('fs');
var request = require('request');
var cheerio = require('cheerio');
var Heap = require('heap');
var pinyin = require("pinyin");

/* URL seed - how to select seed */
var seedURL = [
        'http://movie.douban.com/subject/1291832/', /* 低俗小说 Pulp Fiction (1994) */
        'http://movie.douban.com/subject/1292233/',  /* 发条橙 A Clockwork Orange (1971) */
        'http://movie.douban.com/subject/1303173/'  /* 甲方乙方 (1997) */
    ];

var appSetting = {
    requireMovieNumber: 1500,  /* maximum crawled page number */
    requireMovieRating: 8.0,
    fileNames: {
        urlCrawledFileName: 'urlCrawled.txt',  /* save every url crawled */
        urlFoundFileName: 'urlFound.txt',  /* save every url found during the process */
        urlRequiredFileName: 'urlRequired.txt',
        // htmlPageFolderName: 'html-pages', /* save crawled html page */
        movieInfoMarkdownFileName: 'movies.md',
        movieInfoTextFileName: 'movies.txt'
    }
};

/* save url data */
var urlDict  = {};
var urlData = {
    urlCrawledList: [],  /* store crawled urls */
    urlRequiredCrawledList: [],
    urlCrawledCount: 0,
    urlRequiredCount: 0
};
var moviesInfo = new Heap(function(a, b) {
    return a.rating - b.rating;
    // director pinyin order
    // var cmp = pinyin(a.director, { style: pinyin.STYLE_NORMAL})[0][0] < pinyin(b.director, { style: pinyin.STYLE_NORMAL})[0][0];
    // if (cmp) {
    //   return -1;
    // }
    // if (!cmp) {
    //   return 1;
    // }
    // return 0;
});

var processingOutput = false;

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
    urlData.urlCrawledList.push(url);
    fs.appendFile(appSetting.fileNames.urlCrawledFileName, url + '\r\n', function (err) {
        if (err) throw err;
    });
};
Helper.saveRequiredMovie = function(movieInfo){
    urlData.urlRequiredCount++;
    fs.appendFile(appSetting.fileNames.urlRequiredFileName, movieInfo.url + '\r\n', function (err) {
        if (err) throw err;
    });
    moviesInfo.push(movieInfo);
};
/* helper function to write result infomation */
Helper.output = function(){
    while (moviesInfo.nodes.length > 0) {
      var movieInfo = moviesInfo.pop();
      markdownString = 'Movie&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;**' + movieInfo.name + '**&nbsp;&nbsp;<br/>' +
            'Year&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;**' + movieInfo.year + '**&nbsp;&nbsp;<br/>' +
            'Director&nbsp;&nbsp;&nbsp;**' + movieInfo.director + '**&nbsp;&nbsp;<br/>' +
            'Rating&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;**' + movieInfo.rating + '**&nbsp;&nbsp;<br/>' +
            '[Douban 链接](' + movieInfo.url + ')&nbsp;&nbsp;<br/>' +
            '<br/><br/>';
      fs.appendFile(appSetting.fileNames.movieInfoMarkdownFileName, markdownString, function (err) {
        if (err) throw err;
        Helper.exitCrawler();
      })
      textString = movieInfo.name + '   ' + movieInfo.year + '   ' + movieInfo.director + '   ' + movieInfo.rating + '   ' + movieInfo.url + '\n';
      fs.appendFile(appSetting.fileNames.movieInfoTextFileName, textString, function (err) {
        if (err) throw err;
        Helper.exitCrawler();
      })
    }
};
/* helper function to exit process */
Helper.exitCrawler = function(){
    var endTime = Date.now();
    console.log('总共用时: ' + ((endTime - startTime) / 1000) + ('s'));
    process.exit();
};

/* Core functin */
/* fetch data from input url */
/* extract similar urls and remove the duplicate ones */
fetchNextURL = function(url) {
    if (processingOutput) { return; }
    /* use request module */
    request(
      { url: url,
        headers: {
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/39.0.2171.99 Safari/537.36'
        }
      },
      function (error, response, body) {
        if (error) {
          return console.error(error);
        }

        Helper.saveCrawledURL(url);

        console.log('成功爬取到页面： ' + url );
        console.log('已爬页面数 = '+ urlData.urlCrawledCount );
        console.log('已找到符合要求页面数 = '+ moviesInfo.nodes.length );

        var $ = cheerio.load(response.body.toString());

        /* save current page to local file folder */
        var numbers = Helper.getNumbersOfUrl(url);
        // var htmlStream = fs.WriteStream('./' + appSetting.fileNames.htmlPageFolderName + '/movie'+numbers + '.html');
        // htmlStream.write(body);
        // htmlStream.end();

        var rating = parseFloat($('.rating_self strong').text());
        var isMovie = $('#recommendations h2 i').text() === "喜欢这部电影的人也喜欢";

        if (!isMovie) { return; }

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
          // console.log(moviesInfo.nodes.length);
          // console.log(urlData.urlRequiredCount);
        }

        /* find all urls contained in current page */
        /* remove duplicates and put them in hrefs*/
        var hrefs = [];
        $('#recommendations dt a').each( function(index, item) {
            var href = Helper.getUrl( $(item).attr('href') );
            var numbers = Helper.getNumbersOfUrl(href);
            if(!urlDict[numbers]){
                urlDict[numbers] = true;
                hrefs.push(href);
                fs.appendFile(appSetting.fileNames.urlFoundFileName, href+ '\r\n', function (err) {
                    if (err) throw err;
                });
            }
        });
        /* hrefs.length === 0 => no more new hrefs, stop recursion */
        if(hrefs.length === 0){
            console.log('本页面未能爬取到新链接...');
        }

        /* keep requesting if no more than the max page number */
        if(moviesInfo.nodes.length < appSetting.requireMovieNumber){
            for (var i = 0; i < hrefs.length; i++) {
                fetchNextURL(hrefs[i]);
                if (processingOutput) { return; }
            }
        } else {
            console.log('爬取到的页面数目已达到预期值...');
            processingOutput = true;
            Helper.output();
        }
    });
};

/* start process */
var startTime = Date.now();
var textWelcome = 'application: xh-douban-crawler\r\nauthor: xiaohuang\r\ntotal: ' +
                   appSetting.requireMovieNumber +
                   '\r\nrating: >= ' +
                   appSetting.requireMovieRating +
                   '\r\ndate: ' +
                   Date() + '\r\n\r\n------------------------------\r\n\r\n';
var markdownWelcome = 'application: **xh-douban-crawler**&nbsp;&nbsp;<br/>author: **xiaohuang**&nbsp;&nbsp;<br/>total: **' +
                       appSetting.requireMovieNumber +
                       '**&nbsp;&nbsp;<br/>rating: **>= ' +
                       appSetting.requireMovieRating +
                       '**&nbsp;&nbsp;<br/>date: **' +
                       Date() + '**&nbsp;&nbsp;<br/>\r\n\r\n---\r\n\r\n';
fs.writeFile(appSetting.fileNames.movieInfoTextFileName, textWelcome, function(err) {
    if(err) {
        return console.log(err);
    }
    console.log('已新建文档 ' + appSetting.fileNames.movieInfoTextFileName + '...');

    fs.writeFile(appSetting.fileNames.movieInfoMarkdownFileName, markdownWelcome, function(err) {
        if(err) {
            return console.log(err);
        }
        console.log('已新建文档 ' + appSetting.fileNames.movieInfoMarkdownFileName + '...');

        seedURL.forEach(function(url) {
          var number = Helper.getNumbersOfUrl(url);
          urlDict[number] = true;
        })

        seedURL.forEach(function(url) {
          fetchNextURL(url);
        })

        // for (var i = 0; i < seedURL.length; i++) {
        //     fetchNextURL(seedURL[i]);
        // }
    });
});

// for (var i = 0; i < seedURL.length; i++) {
//     fetchNextURL(seedURL[i]);
// }
