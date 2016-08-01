var unirest = require('unirest');
var gulp = require('gulp');
var glob = require("glob")
var fs = require('fs');
var token = fs.readFileSync(__dirname + '/token.txt', 'utf8');
if (!token) {
  console.log("WARNING!! token.txt not found in this folder. must contain the github personal access token of gist-masters github account");
}

token = token.replace('\r', '').replace('\n','');

function getSamplesJSON() {
  return JSON.parse(fs.readFileSync('../aurelia-kendoui-samples/samples.json', 'utf-8'));
}

function updateFileInGist(gist, fileName, content) {
  return new Promise((resolve, reject) => {
    let params = { files: {} };
    params.files[fileName] = {
      content: content
    };
    unirest.patch(`https://api.github.com/gists/${gist}`)
    .headers({
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'User-Agent': 'ui-toolkits-gist-tool',
      'authorization': `token ${token}`
    })
    .send(params)
    .end(function (response) {
      if (response.code < 300) {
        resolve(response.body.id);
      } else {
        console.log(response);
        reject(response);
      }
    });
  });
}

gulp.task('update-file-in-all-gists', function (d) {
  var fileName = 'index.html';
  var fileContent = fs.readFileSync('./new-index.html', 'utf-8');

  var sampleGists = getAllSampleGists();

  var promises = [];
  for(let i = 0; i < sampleGists.length; i++) {
    promises.push(() => {
      console.log('patching ' + sampleGists[i]);
      return updateFileInGist(sampleGists[i], fileName, fileContent)
      .then(() => {
        console.log('patched ' + sampleGists[i]);
      }).catch(() => {
        console.log('failed to patch ' + sampleGists[i]);
      });
    });
  }
  runPromiseFuncArraySync(promises)
  .then(() => {
    console.log('done');
    d();
  })

// var promise = new Promise(resolve => resolve());
// for(let i = 0; i < 1000; i++) {
//   promise = promise.then(() => {
//     console.log('done 1');
//     return test();
//   });
// }
//
// promise.then(() => {
//   console.log('done');
//   d();
// })
  // updateFileInGist('194e72fb774a85721df56e3809b98030', fileName, fileContent)
  // .then(() => d())
  // .catch((e) => {
  //   console.log(e);
  //   d();
  // });
});

// you can pass an array of function pointers that return a promise
// and this function will execute them all synchronously
function runPromiseFuncArraySync(promiseFuncArray) {
  return new Promise(resolve => {
    let pr = new Promise(r => r());
    for(let i = 0; i < promiseFuncArray.length; i++) {
      pr = pr.then(() => {
        return promiseFuncArray[i]()
        .then((d) => new Promise(r => {
          setTimeout(() => r(d), 1000);
        }));
      });
    }

    pr = pr.then(() => resolve());
  });
}

function test() {
  return new Promise(resolve => {
    setTimeout(() => resolve(), 1000);
  });
}

function getAllSampleGists() {
  var samplesJSON = getSamplesJSON();
  var gists = [];
  samplesJSON.categories.forEach(cat => {
    let keys = Object.keys(cat.samples);
    keys.forEach(key => {
      if (cat.samples[key].gist) {
        gists.push(cat.samples[key].gist);
      } else {
        gists.push(cat.samples[key]);
      }
    });
  });

  return gists;
}

// no longer works as all gists are in a new json format (samples.json)
// function getGists() {
//   var gists = [];
//
//   return new Promise(resolve => {
//     glob("../aurelia-kendoui-bridge/sample/src/samples/**/registry.json", {}, function (err, files) {
//       for(let i = 0; i < files.length; i++) {
//         var registry = require(files[i]);
//         var keys = Object.keys(registry.samples);
//         for(let x = 0; x < keys.length; x++) {
//           let gist = registry.samples[keys[x]].gist;
//           if (gist) {
//             gists.push({
//               id: gist.replace('https://gist.run/?id=', ''),
//               registry: files[i],
//               sample: keys[x]
//             });
//           }
//         }
//       }
//       resolve(gists);
//     });
//   });
// }

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
      if (response.code < 300) {
        resolve(response.body.id);
      } else {
        console.log(response);
        reject(response);
      }
    });
  });
}

// no longer works as all gists are in a new json format (samples.json)
// gulp.task('fork_all', function (d) {
//   getGists()
//   .then(gists => {
//     let gistCount = gists.length - 1;
//
//     function f(gist) {
//       console.log(`forking ${gist.id}`);
//       return fork(gist.id)
//       .then(newId => {
//         var registry = require(gist.registry);
//         registry.samples[gist.sample].gist = newId;
//         fs.writeFileSync(gist.registry, JSON.stringify(registry, null, 3));
//         console.log(`forked ${gist.id}, new id is ${newId}`);
//       })
//       .catch(() => console.log(`failed to fork ${gist.id}`))
//       .then(() => new Promise(resolve => setTimeout(() => resolve(), 3000)));
//     }
//
//     function after() {
//       gistCount --;
//       if (gistCount >= 0) {
//         return f(gists[gistCount]).then(x => after());
//       }
//       return new Promise(resolve => resolve());
//     }
//
//     let p = f(gists[gistCount])
//     .then(() => after())
//     .then(() => d());
//   });
// });
