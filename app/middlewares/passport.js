let passport = require('passport')
let nodeifyit = require('nodeifyit')
let bcrypt = require('bcrypt')
let LocalStrategy = require('passport-local').Strategy
let User = require('../models/user')
let FacebookStrategy = require('passport-facebook').Strategy
let TwitterStrategy = require('passport-twitter').Strategy
let GoogleStrategy = require('passport-google-oauth2').Strategy
require('songbird')

const SALT = bcrypt.genSaltSync(10)

function useExternalPassportStrategy(OauthStrategy, config, field) {
  config.passReqToCallback = true

  passport.use(new OauthStrategy(config, nodeifyit(authCB, {
    spread: true
  })))

  async function authCB(req, token, _ignored_, account) {
    if (req.user) {
          let user = await User.promise.findOne({
      'local.email': req.user.local.email
       })
      if (user) {
        switch (field) {
          case 'facebook':
            console.log('FACEBOOK')
            user.facebook.id = account.id
            user.facebook.token = token
            user.facebook.email = account.emails[0].value
            user.facebook.name = account.name.givenName + ' ' + account.name.familyName
            break;
          case 'twitter':
            console.log('TWITTER')
            user.twitter.id = account.id
            user.twitter.token = token
            user.twitter.secret = _ignored_
            user.twitter.displayName = account.displayName
            user.twitter.username = account.username
            break;
          case 'google':
            console.log('GOOGLE')
            user.google.id = account.id
            user.google.token = token
            user.google.email = account.email
            user.google.name = account.name.givenName + ' ' + account.name.familyName
            break;
        }
        await user.save()
        return user
      }
    } else {
      // !req.user
      //Create the user if none loaded from the database
      //Link the account with the user?
      let dbField = field + '.id'
      let user = await User.promise.findOne({
        dbField: account.id
      })
      if (user) {
        return user
      } else {
        let user = new User()
         switch (field) {
          case 'facebook':
            console.log('FACEBOOK')
            user.facebook.id = account.id
            user.facebook.token = token
            user.facebook.email = account.emails[0].value
            user.facebook.name = account.name.givenName + ' ' + account.name.familyName
            break;
          case 'twitter':
            console.log('TWITTER')
            user.twitter.id = account.id
            user.twitter.token = token
            user.twitter.secret = _ignored_
            user.twitter.displayName = account.displayName
            user.twitter.username = account.username
            break;
          case 'google':
            console.log('GOOGLE')
            user.google.id = account.id
            user.google.token = token
            user.google.email = account.email
            user.google.name = account.name.givenName + ' ' + account.name.familyName
            break;
        }
        await user.save()
        return user
      }
      // 3a. If user exists, we're logging in via the 3rd party account
      // 3b. Otherwise create a user associated with the 3rd party account
    }
  }
}

function configure(config) {
  // Required for session support / persistent login sessions
  passport.serializeUser(nodeifyit(async(user) => user._id))

  passport.deserializeUser(nodeifyit(async(id) => {
    return await User.promise.findById(id)
  }))

  useExternalPassportStrategy(FacebookStrategy, {
    clientID: config.facebook.consumerKey,
    clientSecret: config.facebook.consumerSecret,
    callbackURL: config.facebook.callbackUrl
  }, 'facebook')
  useExternalPassportStrategy(TwitterStrategy, {
    consumerKey: config.twitter.consumerKey,
    consumerSecret: config.twitter.consumerSecret,
    callbackURL: config.twitter.callbackUrl
  }, 'twitter')
  useExternalPassportStrategy(GoogleStrategy, {
    clientID: config.google.clientID,
    clientSecret: config.google.clientSecret,
    callbackURL: config.google.callbackURL
  }, 'google')

  passport.use('local-login', new LocalStrategy({
    usernameField: 'email',
    failureFlash: true
  }, nodeifyit(async(email, password, callback) => {
    let user
    email = email.toLowerCase()

    user = await User.promise.findOne({
      'local.email': email
    })

    if (!user) {
      return [false, {
        message: 'Invalid email'
      }]
    }

    if (!await user.validatePassword(password)) {
      return [false, {
        message: 'Invalid password'
      }]
    }
    return user
  }, {
    spread: true
  })))

  passport.use('local-signup', new LocalStrategy({
    usernameField: 'email',
    failureFlash: true,
    passReqToCallback: true
  }, nodeifyit(async(req, email, password, callback) => {

    email = (email || '').toLowerCase()
      // Is the email taken?
    if (await User.promise.findOne({
        'local.email': email

      })) {
      return [false, {
        message: 'That email is already taken.'
      }]
    }
    // create the user
    let user = new User()
    user.local = {}
    user.local.email = email
    user.local.password = await bcrypt.promise.hash(password, SALT)
    let result = await user.save()
    return result
  }, {
    spread: true
  })))
  return passport
}

module.exports = {
  passport, configure
}