var unirest = require('unirest');
var gulp = require('gulp');
var glob = require("glob")
var fs = require('fs');
var token = fs.readFileSync(__dirname + '/token.txt', 'utf8');
if (!token) {
  console.log("WARNING!! token.txt not found in this folder. must contain the github personal access token of gist-masters github account");
}

token = token.replace('\r', '').replace('\n','');

function getGists() {
  var gists = [];

  return new Promise(resolve => {
    glob("../aurelia-kendoui-bridge/sample/src/samples/**/registry.json", {}, function (err, files) {
      for(let i = 0; i < files.length; i++) {
        var registry = require(files[i]);
        var keys = Object.keys(registry.samples);
        for(let x = 0; x < keys.length; x++) {
          let gist = registry.samples[keys[x]].gist;
          if (gist) {
            gists.push({
              id: gist.replace('https://gist.run/?id=', ''),
              registry: files[i],
              sample: keys[x]
            });
          }
        }
      }
      resolve(gists);
    });
  });
}

function fork(id) {
  return new Promise((resolve, reject) => {
    unirest.post(`https://api.github.com/gists/${id}/forks`)
    .headers({
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'User-Agent': 'ui-toolkits-gist-tool',
      'authorization': `token ${token}`
    })
    .end(function (response) {
      if (response.code === 200) {
        resolve(response.body.id);
      } else {
        console.log(response);
        reject(response);
      }
    });
  });
}

gulp.task('fork_all', function (d) {
  getGists()
  .then(gists => {
    let gistCount = gists.length - 1;

    function f(gist) {
      console.log(`forking ${gist.id}`);
      return fork(gist.id)
      .then(newId => {
        var registry = require(gist.registry);
        registry.samples[gist.sample].gist = newId;
        fs.writeFileSync(gist.registry, JSON.stringify(registry, null, 3));
        console.log(`forked ${gist.id}, new id is ${newId}`);
      })
      .then(() => new Promise(resolve => setTimeout(() => resolve(), 3000)));
    }

    function after() {
      gistCount --;
      if (gistCount >= 0) {
        return f(gists[gistCount]).then(x => after());
      }
      return new Promise(resolve => resolve());
    }

    let p = f(gists[gistCount])
    .then(() => after())
    .then(() => d());
  });
});
