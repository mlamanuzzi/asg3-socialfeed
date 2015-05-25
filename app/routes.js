var isLoggedIn = require('./middlewares/isLoggedIn')
var _ = require('lodash')
var Twitter = require('twitter')
var TwitterStream = require('node-tweet-stream')
var Facebook = require('facebook-node-sdk')
var then = require('express-then')
var rp = require('request-promise')
var fs = require('fs')

var networks = {
  twitter: {
    icon: 'twitter',
    name: 'Twitter',
    class: 'btn-info'
  },
  facebook: {
    icon: 'facebook',
    name: 'Facebook',
    class: 'btn-info'
  },
  google: {
    icon: 'google-plus',
    name: 'Google+',
    class: 'btn-info'
  }
}
module.exports = (app) => {
  var passport = app.passport
  var twitterConfig = app.config.auth.twitter
  var facebookConfig = app.config.auth.facebook
  var googleConfig = app.config.auth.google

  // Scope specifies the desired data fields from the user account
  var twitterScope = 'email'
  var facebookScope = ['email, user_posts, read_stream, user_likes, publish_actions']
  var googleScope = ['email', 'profile']

  // Authentication route & Callback URL
  app.get('/auth/facebook', passport.authenticate('facebook', {
    // scope: facebookScope
    scope: facebookScope
  }))
  app.get('/auth/facebook/callback', passport.authenticate('facebook', {
    successRedirect: '/profile',
    failureRedirect: '/profile',
    failureFlash: true,
  }))

  // Authorization route & Callback URL
  app.get('/connect/facebook', passport.authorize('facebook', {
    scope: facebookScope
  }))
  app.get('/connect/facebook/callback', passport.authorize('facebook', {
    successRedirect: '/profile',
    failureRedirect: '/profile',
    failureFlash: true
  }))

  app.get('/timeline', isLoggedIn, then(async(req, res) => {
    console.log(req.user)
    // figure out which social networks to pull data from
    var fb = (req.user.facebook) ? true : false
    var twitter = (req.user.twitter) ? true : false
    var allPosts = []
    try {
      var response = await rp({
        uri: `https://graph.facebook.com/me/home/?access_token=${req.user.facebook.token}`,
        resolveWithFullResponse: true
      })

      var fbData = JSON.parse(response.body)
      var fbPosts = []
      for (var i = 0; i < fbData.data.length; i++) {
        var liked = false
        if (fbData.data[i].likes) {
          for (var j = 0; j < fbData.data[i].likes.data.length; j++) {
            if (fbData.data[i].likes.data[j].id == req.user.facebook.id) {
              liked = true
            }
          }
        }
        allPosts.push({
          id: fbData.data[i].id,
          image: fbData.data[i].picture,
          text: fbData.data[i].description,
          name: fbData.data[i].from.name,
          timestamp: new Date(fbData.data[i].created_time).getTime(),
          // username: fbData.data[i].,
          liked: liked,
          network: networks.facebook
        })
      }

      var twitterClient = new Twitter({
        consumer_key: twitterConfig.consumerKey,
        consumer_secret: twitterConfig.consumerSecret,
        access_token_key: req.user.twitter.token,
        access_token_secret: req.user.twitter.secret
      })
      var [tweets] = await twitterClient.promise.get('/statuses/home_timeline')

      tweets = tweets.map(tweet => {
        return {
          id: tweet.id_str,
          image: tweet.user.profile_image_url,
          text: tweet.text,
          name: tweet.user.name,
          username: '@' + tweet.user.screen_name,
          liked: tweet.favorited,
          network: networks.twitter,
          timestamp: new Date(tweet.created_at).getTime()
        }
      })

      _.forEach(tweets, function(n, key) {
        allPosts.push(n)
      });

      res.render('timeline.ejs', {
        posts: allPosts
      })
    } catch (e) {
      console.log(e)
    }
  }))

  // Authentication route & Callback URL
  app.get('/auth/twitter', passport.authenticate('twitter', {
    scope: twitterScope
  }))
  app.get('/auth/twitter/callback', passport.authenticate('twitter', {
    successRedirect: '/profile',
    failureRedirect: '/profile',
    failureFlash: true
  }))

  // Authorization route & Callback URL
  app.get('/connect/twitter', passport.authorize('twitter', {
    scope: twitterScope
  }))
  app.get('/connect/twitter/callback', passport.authorize('twitter', {
    successRedirect: '/profile',
    failureRedirect: '/profile',
    failureFlash: true
  }))

  // Authentication route & Callback URL
  app.get('/auth/google', passport.authenticate('google', {
    scope: googleScope
  }))
  app.get('/auth/google/callback', passport.authenticate('google', {
    successRedirect: '/profile',
    failureRedirect: '/profile',
    failureFlash: true
  }))

  // Authorization route & Callback URL
  app.get('/connect/google', passport.authorize('google', {
    scope: googleScope
  }))
  app.get('/connect/google/callback', passport.authorize('google', {
    successRedirect: '/profile',
    failureRedirect: '/profile',
    failureFlash: true
  }))

  app.get('/compose', isLoggedIn, (req, res) => {
    res.render('compose.ejs', {
      message: req.flash('error')
    })
  })

  app.post('/compose', isLoggedIn, then(async(req, res) => {
    var fb = req.body.facebook
    var twitter = req.body.twitter

    if (twitter == 'on') {
      try {
        var twitterClient = new Twitter({
          consumer_key: twitterConfig.consumerKey,
          consumer_secret: twitterConfig.consumerSecret,
          access_token_key: req.user.twitter.token,
          access_token_secret: req.user.twitter.secret
        })
        var text = req.body.text
        if (text.length > 140) {
          return req.flash('error', 'Status is over 140 chars!')
        }
        if (!text) {
          return req.flash('error', 'Status cannot be empty!')
        }
        await twitterClient.promise.post('statuses/update', {
          status: text
        })
      } catch (e) {
        console.log(e)
      }
    }
    if (fb == 'on') {
      try {
        var message = req.body.text
        var response = await rp({
          uri: `https://graph.facebook.com/${req.user.facebook.id}/feed/?message=${message}&access_token=${req.user.facebook.token}`,
          method: 'POST',
          resolveWithFullResponse: true
        })
      } catch (e) {
        console.log(e)
      }
    }

    res.redirect('/timeline')
  }))

  app.post('/like/:platform/:id', isLoggedIn, then(async(req, res) => {
    switch (req.params.platform.toLowerCase()) {
      case 'facebook':
        var response = await rp({
          uri: `https://graph.facebook.com/${req.params.id}/likes?access_token=${req.user.facebook.token}`,
          resolveWithFullResponse: true,
          method: 'POST'
        })
        break;
      case 'twitter':
        var twitterClient = new Twitter({
          consumer_key: twitterConfig.consumerKey,
          consumer_secret: twitterConfig.consumerSecret,
          access_token_key: req.user.twitter.token,
          access_token_secret: req.user.twitter.secret
        })
        var id = req.params.id
        await twitterClient.promise.post('favorites/create', {
          id
        })
        break;
    }
    res.end()
  }))

  app.post('/unlike/:platform/:id', isLoggedIn, then(async(req, res) => {
    switch (req.params.platform.toLowerCase()) {
      case 'facebook':
        break;
      case 'twitter':
        var twitterClient = new Twitter({
          consumer_key: twitterConfig.consumerKey,
          consumer_secret: twitterConfig.consumerSecret,
          access_token_key: req.user.twitter.token,
          access_token_secret: req.user.twitter.secret
        })
        var id = req.params.id
        await twitterClient.promise.post('favorites/destroy', {
          id
        })
        break;
    }
    res.end()
  }))

  app.get('/share/:platform/:id', isLoggedIn, then(async(req, res) => {
    // get post from id
    var id = req.params.id
    switch (req.params.platform.toLowerCase()) {
      case 'facebook':
        var response = await rp({
          uri: `https://graph.facebook.com/${id}/?access_token=${req.user.facebook.token}`,
          resolveWithFullResponse: true,
        })

        let post = JSON.parse(response.body)
        res.render('share.ejs', {
          post: {
            id: id,
            image: post.picture,
            text: post.story,
            username: post.from.id,
            name: post.from.name,
            network: req.params.platform.toLowerCase()
          }
        })
        break;
      case 'twitter':
        var twitterClient = new Twitter({
          consumer_key: twitterConfig.consumerKey,
          consumer_secret: twitterConfig.consumerSecret,
          access_token_key: req.user.twitter.token,
          access_token_secret: req.user.twitter.secret
        })
        var id = req.params.id
        var post = await twitterClient.promise.get('statuses/show', {
          id
        })
        res.render('share.ejs', {
          post: {
            id: req.params.id,
            image: post[0].user.profile_image_url,
            text: post[0].text,
            username: '@' + post[0].user.screen_name,
            name: post[0].user.name,
            network: req.params.platform.toLowerCase()
          }
        })
        break;
    }
  }))

  app.post('/share/:network/:id', isLoggedIn, then(async(req, res) => {
    var network = req.params.network
    var id = req.params.id
    try {
      switch (network.toLowerCase()) {
        case 'twitter':
          var twitterClient = new Twitter({
            consumer_key: twitterConfig.consumerKey,
            consumer_secret: twitterConfig.consumerSecret,
            access_token_key: req.user.twitter.token,
            access_token_secret: req.user.twitter.secret
          })
          var retweet = req.body.share

          var response = await twitterClient.promise.post('statuses/retweet/' + id)
          console.log(response)
          break;
        case 'facebook':
          var response = await rp({
            uri: `https://graph.facebook.com/${id}/?access_token=${req.user.facebook.token}`,
            resolveWithFullResponse: true,
          })
          var post = JSON.parse(response.body)
          var link = post.link
          var response = await rp({
            uri: `https://graph.facebook.com/me/feed/link=${link}/?access_token=${req.user.facebook.token}`,
            method: 'POST',
            resolveWithFullResponse: true,
          })
          break;
      }
    } catch (e) {
      console.log(e)
    }
    res.redirect('/timeline')
  }))

  app.post('/reply/:network/:id?', isLoggedIn, then(async(req, res) => {
    var id = req.params.id
    switch (req.params.network.toLowerCase()) {
      case 'twitter':
        var twitterClient = new Twitter({
          consumer_key: twitterConfig.consumerKey,
          consumer_secret: twitterConfig.consumerSecret,
          access_token_key: req.user.twitter.token,
          access_token_secret: req.user.twitter.secret
        })
        var text = '@' + req.user.twitter.username + ' ' + req.body.reply
        if (text.length > 140) {
          return req.flash('error', 'Status is over 140 chars!')
        }
        if (!text) {
          return req.flash('error', 'Status cannot be empty!')
        }
        await twitterClient.promise.post('statuses/update', {
          status: text,
          in_reply_to_status_id: id
        })
        break;
      case 'facebook':
        var response = await rp({
          uri: `https://graph.facebook.com/${id}/comments?access_token=${req.user.facebook.token}`,
          message: req.body.reply,
          resolveWithFullResponse: true,
          method: 'POST'
        })
        break;
    }
    res.redirect('/timeline')
  }))

  app.get('/reply/:network/:id?', isLoggedIn, then(async(req, res) => {
    var network = req.params.network.toLowerCase()
    switch (network) {
      case 'twitter':
        var twitterClient = new Twitter({
          consumer_key: twitterConfig.consumerKey,
          consumer_secret: twitterConfig.consumerSecret,
          access_token_key: req.user.twitter.token,
          access_token_secret: req.user.twitter.secret
        })
        var post = await twitterClient.promise.get('statuses/show', {
          id: req.params.id,
        })
        var username = (network === 'twitter') ? '@' + post[0].user.screen_name : post[0].user.screen_name

        res.render('reply.ejs', {
          post: {
            id: req.params.id,
            image: post[0].user.profile_image_url,
            text: post[0].text,
            username: username,
            name: post[0].user.name,
            network: network
          }
        })
        break;
      case 'facebook':
        var response = await rp({
          uri: `https://graph.facebook.com/${req.params.id}?access_token=${req.user.facebook.token}`,
          method: 'GET',
          resolveWithFullResponse: true
        })
        var fRes = JSON.parse(response.body)
        res.render('reply.ejs', {
          post: {
            id: req.params.id,
            image: fRes.picture,
            text: fRes.message,
            username: fRes.from.name,
            name: fRes.from.name,
            network: network
          }
        })
        break;
    }
  }))

  app.get('/', (req, res) => res.render('index.ejs'))

  app.get('/profile', isLoggedIn, (req, res) => {
    res.render('profile.ejs', {
      user: req.user,
      message: req.flash('error')
    })
  })

  app.get('/logout', (req, res) => {
    req.logout()
    res.redirect('/')
  })

  app.get('/login', (req, res) => {
    res.render('login.ejs', {
      message: req.flash('error')
    })
  })

  app.post('/login', passport.authenticate('local-login', {
    successRedirect: '/profile',
    failureRedirect: '/login',
    failureFlash: true
  }))

  app.get('/signup', (req, res) => {
    res.render('signup.ejs', {
      message: req.flash('error')
    })
  })

  app.post('/signup', passport.authenticate('local-signup', {
    successRedirect: '/profile',
    failureRedirect: '/signup',
    failureFlash: true
  }))
}