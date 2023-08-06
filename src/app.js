// Packages
import createError from 'http-errors'
import express from 'express'
import logger from 'morgan'
import cors from 'cors'
import 'dotenv/config'

// MongoDB
import { mongo } from './db/conn.js'
await mongo.init().then(() => console.log('MongoDB connected!'))

// Routes
import indexRouter from './routes/index.js'
import authRouter from './routes/auth.js'
import usersRouter from './routes/users.js'
import postsRouter from './routes/posts.js'
import commentsRouter from './routes/comments.js'
import votesRouter from './routes/votes.js'

const app = express()

// Configure CORS
if (!process.env.FRONTEND_URL)
    console.warn('FRONTEND_URL not set. The default value is http://localhost:5173')

app.use(
    cors({
        origin: process.env.FRONTEND_URL || 'http://localhost:5173',
        optionsSuccessStatus: 200
    })
)

// Initialize authentication
import './auth/auth.js'

// Throw error if JWT_SECRET is not set
if (!process.env.JWT_SECRET) {
    console.error('JWT_SECRET not set')
    process.exit(1)
}

app.use(logger('dev'))
app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use(express.static('public'))

app.use('/', indexRouter)
app.use('/auth', authRouter)
app.use('/users', usersRouter)
app.use('/posts', postsRouter)
app.use('/comments', commentsRouter)
app.use('/votes', votesRouter)

// catch 404 and forward to error handler
app.use(function (req, res, next) {
    next(createError(404))
})

// error handler
app.use(function (err, req, res) {
    // set locals, only providing error in development
    res.locals.message = err.message
    res.locals.error = req.app.get('env') === 'development' ? err : {}

    // render the error page
    res.status(err.status || 500)
    res.send({ message: err.message })
})

export default app
