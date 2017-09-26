require('dotenv').config()

const path = require('path')
const express = require('express')
const bodyParser = require('body-parser')
const jwt = require('jsonwebtoken')
const expressJwt = require('express-jwt')
const cors = require('cors')

const query = require('./query')

const PORT = process.env.PORT || 3000
const JWT_SECRET = process.env.JWT_SECRET

const app = express()
app.use(bodyParser.json())
app.use(cors())

const sendError = res => err => {
  res.status(400).send({
    error: err.name,
    message: err.message
  })
}

app.post('/user', (req, res) => {
  const {username, password} = req.body
  query.createUser(username, password)
    .then(user => {
      const token = jwt.sign({id: user.id}, JWT_SECRET)
      res.send({
        token
      })
    })
    .catch(sendError(res))
})

app.post('/login', (req, res) => {
  const {username, password} = req.body
  query.compareUser(username, password)
    .then(user => {
      const token = jwt.sign({id: user.id}, JWT_SECRET)
      res.send({
        token
      })
    })
    .catch(sendError(res))
})

const authRouter = express.Router() // FIXME
authRouter.use(expressJwt({secret: JWT_SECRET}))

authRouter.get('/todos', (req, res) => {
  query.getTodosByUserId(req.user.id)
    .orderBy('id', 'desc')
    .then(todos => {
      res.send(todos)
    })
    .catch(sendError(res))
})

authRouter.post('/todos', (req, res) => {
  const {title} = req.body
  query.createTodo(req.user.id, title)
    .then(([id]) => query.getTodosByUserId(id))
    .then(todo => {
      res.send(todo)
    })
    .catch(sendError(res))
})

authRouter.get('/todos/:id', (req, res, next) => {
  query.getTodo(req.user.id, req.params.id)
    .then(todo => {
      if (todo) {
        res.send(todo)
      } else {
        next()
      }
    })
    .catch(sendError(res))
})

authRouter.patch('/todos/:id', (req, res) => {
  query.updateTodo(
    req.user.id,
    req.params.id,
    req.body.title,
    req.body.complete
  ).then(() => {
    res.end()
  }).catch(sendError(res))
})

authRouter.delete('/todos/:id', (req, res) => {
  query.deleteTodo(
    req.user.id,
    req.params.id
  ).then(() => {
    res.end()
  }).catch(sendError(res))
})

app.use(authRouter)

app.use((req, res) => {
  res.status(404).end()
})

app.listen(PORT, () => {
  console.log(`listening ${PORT}...`)
})
