// Packages
import createError from 'http-errors'
import express from 'express'
import cookieParser from 'cookie-parser'
import logger from 'morgan'
import cors from 'cors'
import 'dotenv/config'

// MongoDB
import { mongo } from './db/conn.js'
await mongo.init().then(() => console.log('MongoDB connected!'))

// Routes
import indexRouter from './routes/index.js'
import usersRouter from './routes/users.js'
import postsRouter from './routes/posts.js'

const app = express()

// Configure CORS
app.use(
    cors({
        origin:
            process.env.NODE_ENV === 'production' ? process.env.FRONTEND_URL : 'http://localhost',
        optionsSuccessStatus: 200
    })
)

app.use(logger('dev'))
app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use(cookieParser())

app.use('/', indexRouter)
app.use('/users', usersRouter)
app.use('/posts', postsRouter)

// catch 404 and forward to error handler
app.use(function (req, res, next) {
    next(createError(404))
})

// error handler
app.use(function (err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message
    res.locals.error = req.app.get('env') === 'development' ? err : {}

    // render the error page
    res.status(err.status || 500)
    res.send({ message: err.message })
})

export default app
