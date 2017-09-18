const knex = require('./knex')
const bcrypt = require('bcrypt')
const validator = require('validator')

class RegisterError extends Error {
  constructor(message) {
    super(message)
    this.name = 'RegisterError'
  }
}

class LoginError extends Error {
  constructor(message) {
    super(message)
    this.name = 'LoginError'
  }
}

module.exports = {
  LoginError,
  RegisterError,
  createUser(username, password) {
    return new Promise((resolve, reject) => {
      if (!username || !password) {
        reject(new RegisterError('아이디와 비밀번호가 필요합니다.'))
      } else if (!validator.isAlphanumeric(username)) {
        reject(new RegisterError('아이디에는 영문자와 숫자만 허용됩니다.'))
      } else if (username.length > 20) {
        reject(new RegisterError('아이디는 20자를 넘을 수 없습니다.'))
      } else if (!validator.isAscii(password)) {
        reject(new RegisterError('비밀번호에는 Ascii 문자만 허용됩니다.'))
      } else if (password.length < 8) {
        reject(new RegisterError('비밀번호는 8자 이상이어야 합니다.'))
      } else {
        const p = bcrypt.hash(password, 10)
          .then(hashed_password => {
            return knex('user').insert({username, hashed_password})
              .then(([id]) => knex('user').where({id}).first())
          })
        resolve(p)
      }
    })
  },
  compareUser(username, password) {
    return knex('user')
      .where({username})
      .first()
      .then(user => {
        if (user) {
          return Promise.all([user, bcrypt.compare(password, user.hashed_password)])
        } else {
          throw new LoginError('해당하는 아이디가 존재하지 않습니다.')
        }
      })
      .then(([user, isMatched]) => {
        if (!isMatched) {
          throw new LoginError('아이디 혹은 패스워드가 일치하지 않습니다.')
        } else {
          return user
        }
      })
  },
  getUserById(id) {
    return knex('user')
      .where({id})
      .first()
  },
}
