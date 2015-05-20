// FACEBOOK API
// "actions": [
//   {
//     "name": "Comment",
//     "link": "https://www.facebook.com/10152790711117595/posts/10152791246797595"
//   },
//   {
//     "name": "Like",
//     "link": "https://www.facebook.com/10152790711117595/posts/10152791246797595"
//   }
// ],

let isLoggedIn = require('./middlewares/isLoggedIn')
let _ = require('lodash')
let Twitter = require('twitter')
let Facebook = require('facebook-node-sdk')
let then = require('express-then')
let rp = require('request-promise')
let fs = require('fs')
  // let google = require('googleapis');
  // let plus = google.plus('v1');
  // let OAuth2 = google.auth.OAuth2;

// let posts = require('../data/posts')
let networks = {
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
  let passport = app.passport
  let twitterConfig = app.config.auth.twitter
  let facebookConfig = app.config.auth.facebook
  let googleConfig = app.config.auth.google

  // Scope specifies the desired data fields from the user account
  let twitterScope = 'email'
  let facebookScope = ['read_stream', 'email']
  let googleScope = ['email', 'profile']

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
    try {
      let twitterClient = new Twitter({
        consumer_key: twitterConfig.consumerKey,
        consumer_secret: twitterConfig.consumerSecret,
        access_token_key: req.user.twitter.token,
        access_token_secret: req.user.twitter.secret
      })


      let response = await rp({
        uri: `https://graph.facebook.com/me/home/?access_token=${req.user.facebook.token}`,
        resolveWithFullResponse: true
      })


      let fbData = JSON.parse(response.body)

      await fs.promise.writeFile('/Users/mlamanu/Desktop/fbdata.json', JSON.stringify(fbData))

      var fbPosts = []
      for (let i = 0; i < fbData.data.length; i++) {
        fbPosts.push({
          id: fbData.data[i].id,
          image: fbData.data[i].picture,
          text: fbData.data[i].description,
          name: fbData.data[i].from.name,
          timestamp: new Date(fbData.data[i].created_time).getTime(),
          // username: fbData.data[i].,
          // liked: fbData.data[i].,
          network: networks.facebook
        })
      }

      console.log(fbPosts)

      let [tweets] = await twitterClient.promise.get('/statuses/home_timeline')

      await fs.promise.writeFile('/Users/mlamanu/Desktop/tweets.json', JSON.stringify(tweets))



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

      // console.log(tweets)



      // let timestamps = []
      // for (let i=0; i<fbPosts.length; i++) {
      //   timestamps.push({})

      // }



      let allPosts = tweets.concat(fbPosts)

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



    let fb = req.body.facebook
    let twitter = req.body.twitter

    if (twitter == 'on') {
      try {
        let twitterClient = new Twitter({
          consumer_key: twitterConfig.consumerKey,
          consumer_secret: twitterConfig.consumerSecret,
          access_token_key: req.user.twitter.token,
          access_token_secret: req.user.twitter.secret
        })
        let text = req.body.text
        if (text.length > 140) {
          return req.flash('error', 'Status is over 140 chars!')
        }
        if (!text) {
          return req.flash('error', 'Status cannot be empty!')
        }
        await twitterClient.promise.post('statuses/update', {
          status: text
        })
        res.redirect('/timeline')

      } catch (e) {
        console.log(e)
      }
    }
    if (fb == 'on') {
      try {
        console.log('REQ.USER.FACEBOOK.ID ====', req.user.facebook.id)
        let message = req.body.text
        let response = await rp({
            uri: `https://graph.facebook.com/${req.user.facebook.id}/feed/?message=${message}&access_token=${req.user.facebook.token}`,
            resolveWithFullResponse: true
          })
          // console.log(response)
      } catch (e) {
        console.log(e)
      }
    }

    res.end()
  }))

  app.post('/like/:platform/:id', isLoggedIn, then(async(req, res) => {
    console.log('PLATFORM = ', req.params.platform)
    console.log('ID       = ', req.params.id)
    switch (req.params.platform.toLowerCase()) {
      case 'facebook':
        console.log('this happened....')
        let response = await rp({
            uri: `https://graph.facebook.com/v2.3/${req.params.id}/likes&access_token=${req.user.facebook.token}`,
            resolveWithFullResponse: true,
            method: 'POST'
          })
          // POST /v2.3/{object-id}/likes HTTP/1.1
        break;
      case 'twitter':
        let twitterClient = new Twitter({
          consumer_key: twitterConfig.consumerKey,
          consumer_secret: twitterConfig.consumerSecret,
          access_token_key: req.user.twitter.token,
          access_token_secret: req.user.twitter.secret
        })
        let id = req.params.id
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
        let twitterClient = new Twitter({
          consumer_key: twitterConfig.consumerKey,
          consumer_secret: twitterConfig.consumerSecret,
          access_token_key: req.user.twitter.token,
          access_token_secret: req.user.twitter.secret
        })
        let id = req.params.id
        await twitterClient.promise.post('favorites/destroy', {
          id
        })
        break;

    }

    res.end()
  }))



  app.get('/share/:platform/:id', isLoggedIn, then(async(req, res) => {
    // get post from id

    switch (req.params.platform.toLowerCase()) {
      case 'facebook':

        break;
      case 'twitter':
        let twitterClient = new Twitter({
          consumer_key: twitterConfig.consumerKey,
          consumer_secret: twitterConfig.consumerSecret,
          access_token_key: req.user.twitter.token,
          access_token_secret: req.user.twitter.secret
        })
        let id = req.params.id
        let post = await twitterClient.promise.get('statuses/show', {
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


  app.post('/share/:id?', isLoggedIn, then(async(req, res) => {

    switch (req.body.network.toLowerCase()) {
      case 'twitter':
        let id = req.params.id
        let twitterClient = new Twitter({
          consumer_key: twitterConfig.consumerKey,
          consumer_secret: twitterConfig.consumerSecret,
          access_token_key: req.user.twitter.token,
          access_token_secret: req.user.twitter.secret
        })

        console.log('req.body ==========')
        console.log(req.body)
        let retweet = req.body.share

        console.log('ID ====')
        console.log(id)
        await twitterClient.promise.post('statuses/retweet', {
          id: id
        })
        break;
      case 'facebook':
        break;
    }


    res.redirect('/timeline')


  }))



  app.post('/reply/:network/:id?', isLoggedIn, then(async(req, res) => {
    var id = req.params.id
    switch (req.params.network.toLowerCase()) {
      case 'twitter':
      console.log('THIS HAPPENED!!!! POST')
        let twitterClient = new Twitter({
          consumer_key: twitterConfig.consumerKey,
          consumer_secret: twitterConfig.consumerSecret,
          access_token_key: req.user.twitter.token,
          access_token_secret: req.user.twitter.secret
        })
        let text = '@' + req.user.twitter.username + ' ' + req.body.reply
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
        break;
    }
    res.redirect('/timeline')
  }))

  app.get('/reply/:network/:id?', isLoggedIn, then(async(req, res) => {
    let network = req.params.network.toLowerCase()
    switch (network) {
      case 'twitter':
      console.log('TWITTER!!!!')
        let twitterClient = new Twitter({
          consumer_key: twitterConfig.consumerKey,
          consumer_secret: twitterConfig.consumerSecret,
          access_token_key: req.user.twitter.token,
          access_token_secret: req.user.twitter.secret
        })
        let post = await twitterClient.promise.get('statuses/show', {
          id: req.params.id,
        })
        break;
      case 'facebook':
        break;
    }

    let username = (network === 'twitter') ? '@' + post[0].user.screen_name : post[0].user.screen_name

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
    failureRedirect: '/',
    failureFlash: true
  }))
}