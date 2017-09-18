# WPSN Passport 튜토리얼

Passport는 다양한 인증 수단을 지원할 수 있도록 추상화된 **인증 미들웨어**입니다.

전통적인 웹 개발에서는 사용자 이름과 암호를 이용해 인증을 하는 방식이 대부분이었지만 최근에는 다양한 인증 제공자(Facebook, Twitter, Google 등)를 통한 인증이 많이 활용되는 추세입니다. 그런데 여러 인증 제공자를 활용하기 위해 각각의 인증 제공자를 위한 서버 코드를 따로따로 작성하는 일은 개발자에게는 힘든 작업일 것입니다.

Passport를 사용하면 어떤 인증 방식을 사용하건 간에 통일된 방식으로 인증 절차를 정의할 수 있습니다. Passport가 강제하는 방식으로 인증을 하게 되면, 다양한 인증 수단을 활용하기 위해 필요한 구현 비용이 많이 줄어듭니다.

## Strategy

Passport는 인증 절차를 정의하기 위해 strategy라는 개념을 사용합니다. 특정 인증 방식에 대해 **정해진 방식**대로 strategy를 구현하기만 하면, express와 같은 웹 서버와 쉽게 연동할 수 있습니다.

[다양한 인증 방식을 위한 strategy가 이미 준비되어 있습니다.](http://passportjs.org/) Strategy 마다 구현 방법이 조금씩 다르니, 자세한 구현 방법은 해당 strategy의 문서를 참고해주세요. 아래는 사용자 이름과 암호를 사용하는 인증 절차를 나타내는 `passport-local` strategy 예제입니다.

```js
// passport가 "사용자 이름과 암호 기반 인증"을 수행하도록 strategy 등록
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
```

## passport.authenticate()

위에서 구현한 strategy를 이용해 passport가 인증을 위한 라우트 핸들러를 생성하게 할 수 있습니다.

```js
// passport-local을 통해 생성한 라우트 핸들러
app.post('/login', passport.authenticate(('local'), {
  successRedirect: '/', // 인증 성공 시 리다이렉트시킬 경로
  failureRedirect: '/login', // 인증 실패 시 리다이렉트시킬 경로
  failureFlash: '아이디 혹은 패스워드가 잘못되었습니다.' // 인증 실패 시 표시할 메시지
}))
```

## serializeUser, deserializeUser

프로그램 상의 어떤 객체를 바이너리 혹은 텍스트의 형태로 변환하는 작업을 직렬화(serialization), 그 반대를 역직렬화(deserialization)라고 합니다.

세션을 이용한 인증을 할 때, 일반적으로 user 객체를 대표하는 특정 속성(id 혹은 username)을 세션에 저장하는 작업을 합니다. 또한 세션에 들어있는 유저 정보를 통해 데이터베이스에서 user 객체를 얻어오는 작업도 합니다. 이 또한 각각 직렬화, 역직렬화라고 할 수 있을 것입니다.

passport는 사용 중인 인증 방식에 관계없이 통일된 방식으로 직렬화/역직렬화를 하도록 강제합니다. 이를 따르면 여러 인증 방식을 사용하더라도 문제 없이 세션에 인증 정보를 저장하고 세션으로부터 인증 정보를 추출할 수 있습니다.

```js
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
```

## req.login, req.logout

`req.login(user)`는 `user` 객체를 직렬화한 뒤 세션에 저장해서, 해당 세션을 로그인시키는 메소드입니다. `passport.authenticate` 메소드가 생성한 라우트 핸들러를 사용한다면, 이 라우트 핸들러 안에서 `req.login` 메소드가 호출되기 때문에 **따로 로그인을 시켜줄 필요는 없습니다.** 보통 `req.login` 메소드는 아래와 같이 회원 가입 이후에 자동으로 로그인을 시켜주려는 목적으로 사용됩니다.

```js
app.post('/register', (req, res, next) => {
  query.createUser(req.body.username, req.body.password)
    .then(user => {
      // 회원 가입 시 자동으로 로그인 시키고 리다이렉트
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
```

`req.logout` 메소드는 현재 세션에 들어있는 인증 정보를 지우고 로그아웃을 시키는 메소드입니다. 아래와 같이 사용할 수 있습니다.

```js
app.post('/logout', (req, res) => {
  // passport가 제공하는 `req.logout` 메소드
  req.logout()
  res.redirect('/login')
})
```

## passport.initialize()

Express 앱에서 Passport를 사용하기 위해서는 다음과 같이 미들웨어를 주입해주어야 합니다. 인증 과정에서 세션을 사용하지 않는다면 `passport.session()`은 주입하지 않아도 무방합니다.

```js
// passport 관련 미들웨어 삽입
app.use(passport.initialize())
app.use(passport.session())
```