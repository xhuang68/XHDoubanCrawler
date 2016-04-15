function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min)) + min;
}

function getRandomMovie() {
    var movie = allMovies[getRandomInt(0, allMovies.length)];
    if (movie) {
        return movie
    } else {
        return getRandomMovie();
    }
}

function pickOnePressed() {
    var movie = getRandomMovie();
    $("#mvname").text(movie.name);
    $("#mvyear").text(movie.year);
    $("#mvdirector").text(movie.director);
    $("#mvurl").attr("href", movie.url);
    $("#mvrating").text(movie.rating);

    var div = $('.movie');
    div.slideDown(1000);
}

function closePressed() {
    var div = $('.movie');
    div.slideUp(1000);
}

function stringifyMovieHtml(movie) {
  return "Movie&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<strong>" +
          movie.name +
          "</strong>&nbsp;&nbsp;<br/>Year&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<strong>" +
          movie.year +
          "</strong>&nbsp;&nbsp;<br/>Director&nbsp;&nbsp;&nbsp;<strong>" +
          movie.director +
          "</strong>&nbsp;&nbsp;<br/>Rating&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<strong>" +
          movie.rating +
          "</strong>&nbsp;&nbsp;<br/><a href=\"" +
          movie.url +
          "\" target=\"_blank\">Douban 链接</a>&nbsp;&nbsp;<br/><br/><br/>";
}

function showFirstTenMovies() {
  var innerHtml = "";
  for (var i = 0; i < 10; i++) {
    var movie = allMovies[movieIndex];
    if (movie) {
      innerHtml += stringifyMovieHtml(movie);
    }
    movieIndex++;
  }
  var div = $(".all");
  var moreHtml = document.createElement('p');
  moreHtml.innerHTML = innerHtml;
  div.append(moreHtml);
}

function loadMore(number){
  if (!moreMovie) { return; }
  var n = number || 10;
  if (movieIndex + n < allMovies.length) {
    var innerHtml = "";
    var i = 0;
    while (i < n) {
      var movie = allMovies[movieIndex];
      if (movie) {
        innerHtml += stringifyMovieHtml(movie);
      }
      movieIndex++;
      i++;
    }
    appendDom(innerHtml);
  }else {
    loadRest();
  }
}

function loadAll(number) {
  if (!moreMovie) { return; }
  var n = number || 300;
  while (movieIndex + n < allMovies.length) {
    loadMore(n);
  }
  loadRest();
}

function loadRest() {
  if (!moreMovie) { return; }
  var innerHtml = "";
  while (allMovies[movieIndex]) {
    var movie = allMovies[movieIndex];
    if (movie) {
      innerHtml += stringifyMovieHtml(movie);
    }
    movieIndex++;
  }
  moreMovie = false;

  appendDom(innerHtml);
}

function appendDom(innerHtml) {
  var div = $(".all");
  var moreHtml = document.createElement('p');
  moreHtml.innerHTML = innerHtml;
  div.append(moreHtml);
  if (!moreMovie) {
    $(".loadbt").hide();
    $(".footer").show();
    animateMonkey();
  }
}

function animateMonkey(monkey) {
  if (monkey) {
      $("#monkey").attr("src", "./sources/monkey2.png")
  } else {
      $("#monkey").attr("src", "./sources/monkey1.png")
  }
  setTimeout(animateMonkey, 500, !monkey);
}

var movieIndex = 0;
var moreMovie = true;
