let mongoose = require('mongoose')
let bcrypt = require('bcrypt')
let nodeify = require('bluebird-nodeify')
require('songbird')

let userSchema = mongoose.Schema({
  local: {
    email: {
      type: String
      // required: true
    },
    password: {
      type: String
      // required: true
    }
  },
  facebook: {
    id: String,
    token: String,
    email: String,
    name: String
  },
  twitter: {
    id: String,
    token: String,
    secret: String,
    displayName: String,
    username: String,
  },
  google: {
    id: String,
    token: String,
    name: String,
    email: String
  }
})

// userSchema.pre('save', function(callback) {
//   nodeify(async() => {
//     if (!this.isModified('password')) return callback()
//     this.password = await this.generateHash(this.password)
//   }(), callback)
// })

userSchema.methods.generateHash = async function(password) {
  return await bcrypt.promise.hash(password, 8)
}

userSchema.methods.validatePassword = async function(password) {
  return await bcrypt.promise.compare(password, this.local.password)
}

userSchema.methods.linkAccount = function(type, values) {
  // linkAccount('facebook', ...) => linkFacebookAccount(values)
  return this['link' + _.capitalize(type) + 'Account'](values)
}

userSchema.methods.linkLocalAccount = function({
  email, password
}) {
  throw new Error('Not Implemented.')
}

userSchema.methods.linkFacebookAccount = function({
  account, token
}) {
  throw new Error('Not Implemented.')
}

userSchema.methods.linkTwitterAccount = function({
  account, token
}) {
  throw new Error('Not Implemented.')
}

userSchema.methods.linkGoogleAccount = function({
  account, token
}) {
  throw new Error('Not Implemented.')
}

userSchema.methods.unlinkAccount = function(type) {
  throw new Error('Not Implemented.')
}

module.exports = mongoose.model('User', userSchema)