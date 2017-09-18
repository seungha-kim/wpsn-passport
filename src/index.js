require('dotenv').config()

const path = require('path')
const express = require('express')
const bodyParser = require('body-parser')
const cookieSession = require('cookie-session')
const csurf = require('csurf')
const flash = require('connect-flash')
const passport = require('passport')
const LocalStrategy = require('passport-local').Strategy

const util = require('./util')
const query = require('./query')
const mw = require('./middleware')

const PORT = process.env.PORT || 3000

const app = express()

app.set('view engine', 'pug')
app.set('trust proxy')

app.use(express.static(path.join(__dirname, '..', 'public')))
app.use(bodyParser.urlencoded({extended: false}))
app.use(cookieSession({
  name: 'wpsess',
  keys: [
    process.env.SECRET
  ]
}))
app.use(flash())
app.use(csurf())
app.use(mw.insertReq)
app.use(mw.insertToken)

// passport 관련 미들웨어 삽입
app.use(passport.initialize())
app.use(passport.session())

// passport가 유저 정보를 세션에 저장할 수 있도록 직렬화
passport.serializeUser((user, done) => {
  done(null, user.id)
})

// passport가 세션으로부터 유저 객체를 가져올 수 있도록 역직렬화
passport.deserializeUser((id, done) => {
  query.getUserById(id)
    .then(user => {
      if (user) {
        done(null, user) // req.user에 저장됨
      } else {
        done(new Error('해당 아이디를 가진 사용자가 없습니다.'))
      }
    })
})

// passport가 아이디와 암호 기반 인증을 수행하도록 strategy 등록
passport.use(new LocalStrategy((username, password, done) => {
  query.compareUser(username, password)
    .then(user => {
      // 인증 성공
      done(null, user)
    })
    .catch(err => {
      if (err instanceof query.LoginError) {
        // 인증 실패: 사용자 책임
        done(null, false, {message: err.message})
      } else {
        // 인증 실패: 서버 책임
        done(err)
      }
    })
}))

app.get('/', mw.loginRequired, (req, res) => {
  res.render('index.pug', req.user)
})

app.get('/login', (req, res) => {
  res.render('login.pug')
})

// passport-local을 통해 생성한 라우트 핸들러
app.post('/login', passport.authenticate(('local'), {
  successRedirect: '/', // 인증 성공 시 리다이렉트시킬 경로
  failureRedirect: '/login', // 인증 실패 시 리다이렉트시킬 경로
  failureFlash: '아이디 혹은 패스워드가 잘못되었습니다.' // 인증 실패 시 표시할 메시지
}))

app.get('/register', (req, res) => {
  res.render('register.pug')
})

app.post('/register', (req, res, next) => {
  query.createUser(req.body.username, req.body.password)
    .then(user => {
      // passport가 제공하는 `req.login` 메소드
      req.login(user, err => {
        if (err) {
          next(err)
        } else {
          res.redirect('/')
        }
      })
    })
    .catch(util.flashError(req, res))
})

app.post('/logout', (req, res) => {
  // passport가 제공하는 `req.logout` 메소드
  req.logout()
  res.redirect('/login')
})

app.listen(PORT, () => {
  console.log(`listening ${PORT}...`)
})
