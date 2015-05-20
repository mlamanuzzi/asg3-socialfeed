// // config/auth.js
// module.exports = {
//   'development': {
//     'facebook': {
//       'consumerKey': '...',
//       'consumerSecret': '...',
//       'callbackUrl': '...'
//     },
//     'twitter': {
//       'consumerKey': 'OaPwwyfXjd8WkPzPEWPlpT6Fs',
//       'consumerSecret': '...',
//       'callbackUrl': 'http://social-authenticator.com:8000/auth/twitter/callback'
//     },
//     'google': {
//       'consumerKey': '446585441765-unda5mjs6307q1pqobvhiqj87m9m2kh1.apps.googleusercontent.com',
//       'consumerSecret': '...',
//       'callbackUrl': 'http://social-authenticator.com:8000/auth/google/callback'
//     }
//   }
// }

module.exports = {
  'development': {
    'facebook': {
      'consumerKey': '769417776490563',
      'consumerSecret': '0db7e330a877cd2dccffd93d9b31dada',
      'callbackUrl': 'http://socialfeed.com:8000/auth/facebook/callback'
    },
    'twitter': {
      'consumerKey': 'Q92zhOBEdKBskel8Z6RbhlSeZ',
      'consumerSecret': '6fvIbOXXYMtj3yNUT8nzNcVnNJkTI16171DBtpTv0hD1X9e06c',
      'callbackUrl': 'http://socialfeed.com:8000/auth/twitter/callback'
    },
    "google": {
      'clientID': '66613926951-k1kucn93qq6gvkj7q1oqbcorn5rckssh.apps.googleusercontent.com',
      'clientSecret': 'nnX79R-UbX3lfjNjI_xujOFC',
      'callbackURL': 'http://socialfeed.com:8000/auth/google/callback'
    }
  }
}