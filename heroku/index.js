var bodyParser = require('body-parser');
var xhub = require('express-x-hub');
var express = require('express');
var app = express();

var publishLike = function(page_id, photo_url) {
  var Likes = Parse.Object.extend('Likes');
  var like = new Likes();
  like.set('page_id', page_id);
  like.set('photo', photo_url);
  like.save(null, {
    success: ,
    error: function(gameScore, error) {
      console.error('Failed to publish a like, with error code: ' + error.message);
    }
  });
}

app.listen(5000);
app.use(xhub({ algorithm: 'sha1', secret: '392daeb911d3b73b8ca42b8bbcf0915e' }));
app.use(bodyParser.json());
app.get('/', function(req, res) {
  console.info(req);
  res.send('It works');
});

app.get(['/facebook'], function(req, res) {
  if (
    req.param('hub.mode') == 'subscribe' &&
    req.param('hub.verify_token') == 'token'
  ) {
    res.send(req.param('hub.challenge'));
  } else {
    res.sendStatus(400);
  }
});

app.post('/facebook', function(req, res) {
  if(req.isXHub) {
    if(req.isXHubValid()) {
      if(req.body.object == 'page') {
        req.body.entry.forEach(function(userEntry) {
          userEntry.changes.forEach(function(change) {
            var value = change.value;
            if(change.field == 'feed' && value.item == 'like' && value.verb == 'add') {
              Parse.Cloud.httpRequest({
                url: 'https://graph.facebook.com/v2.8/' + value.user_id + '/picture?type=large&redirect=0',
                success: function(httpResponse) {
                  publishLike(userEntry.id, httpResponse.data.data.url);
                },
                error:function(httpResponse){
                  console.error('photo retrieval failed with error: ' + httpResponse.message);
                }
              });
            } else {
              console.info('ignoring ' + value.item + ' notification from page ' + userEntry.id);
            } // end of values check
          });
        });
      } else {
        console.error('notification does not belong to a page: ' + JSON.stringify(req.body));
      } // end of page check
    } else {
      console.error('XHub could not be validated: ' + JSON.stringify(req.body));
      res.sendStatus(403);
    } // end of isXHubValid
  } else {
    console.log('Warning - request header X-Hub-Signature not present or invalid');
    res.sendStatus(401);
  } // end of is isXhub

  res.sendStatus(200);
});

module.exports = app;
