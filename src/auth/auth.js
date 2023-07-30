import passport from 'passport'
import LocalStrategy from 'passport-local'
import { Strategy as JWTStrategy, ExtractJwt } from 'passport-jwt'
import { mongo } from '../db/conn.js'
import { v5 as uuidV5 } from 'uuid'
import crypto from 'crypto'

/**
 * Configure user registration strategy.
 *
 * The `local` strategy is used to authenticate a user by verifying a username
 * and password.  The strategy requires a `verify` function which receives the
 * credentials (`username` and `password`) submitted by the user.  The function
 * must verify that the password is correct and then invoke `done` with a user
 * object, which will be set at `req.user` in route handlers after
 * authentication.
 *
 * The `verify` function must invoke `done` with one of the following:
 *
 * 1. `done(null, user)` - to authenticate `user`.
 * 2. `done(null, false)` - to deny access.
 * 3. `done(err)` - to indicate an error.
 *
 * Note that `user` must be an object with a `username` and `password` property.
 */
passport.use(
    'signup',
    new LocalStrategy(
        {
            usernameField: 'username',
            passwordField: 'password'
        },
        async function verify(username, password, done) {
            const salt = crypto.randomBytes(16).toString('hex')

            const cb = async function (err, hashedPassword) {
                if (err) {
                    return done(err)
                }

                const generatedId = uuidV5(username, uuidV5.URL)

                const user = {
                    id: generatedId,
                    username,
                    password: hashedPassword.toString('hex'),
                    salt,
                    image: `https://robohash.org/${username}`,
                    description: ''
                }

                try {
                    await mongo.create('users', generatedId, user)

                    // Delete password and salt from user object
                    delete user.password
                    delete user.salt
                    return done(null, user)
                } catch (err) {
                    return done(err)
                }
            }

            crypto.pbkdf2(password, salt, 100000, 64, 'sha3-256', cb)
        }
    )
)

/**
 * Configure user login strategy.
 *
 * The `local` strategy is used to authenticate a user by verifying a username
 * and password.  The strategy requires a `verify` function which receives the
 * credentials (`username` and `password`) submitted by the user.  The function
 * must verify that the password is correct and then invoke `done` with a user
 * object, which will be set at `req.user` in route handlers after
 * authentication.
 *
 * The `verify` function must invoke `done` with one of the following:
 *
 * 1. `done(null, user)` - to authenticate `user`.
 * 2. `done(null, false)` - to deny access.
 * 3. `done(err)` - to indicate an error.
 *
 * Note that `user` must be an object with a `username` and `password` property.
 */
passport.use(
    'login',
    new LocalStrategy(
        {
            usernameField: 'username',
            passwordField: 'password'
        },
        async function verify(username, password, done) {
            try {
                if (!(await mongo.hasTable('users'))) return done('User not found')

                const user = await mongo.findOne('users', { username })

                if (!user) {
                    return done(null, false, { message: 'User not found' })
                }

                // Validate password using crypto
                const validate =
                    crypto
                        .pbkdf2Sync(password, user.salt, 100000, 64, 'sha3-256')
                        .toString('hex') === user.password

                if (!validate) {
                    return done(null, false, { message: 'Wrong Password' })
                }

                // Delete password and salt from user object
                delete user.password
                delete user.salt

                return done(null, user, { message: 'Logged in Successfully' })
            } catch (error) {
                return done(error)
            }
        }
    )
)

/**
 * Configure JWT strategy.
 *
 * The JWT authentication strategy is used to protect endpoints. The strategy
 * receives a JSON Web Token and verifies that it is valid, and then returns
 * the user object associated with the token.
 *
 * The `verify` function must invoke `done` with one of the following:
 *
 * 1. `done(null, user)` - to authenticate `user`.
 * 2. `done(null, false)` - to deny access.
 * 3. `done(err)` - to indicate an error.
 */
passport.use(
    'jwt',
    new JWTStrategy(
        {
            secretOrKey: process.env.JWT_SECRET,
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken()
        },
        async function verify(token, done) {
            try {
                if (!(await mongo.hasTable('users')))
                    return done(null, false, { message: 'User not found' })

                if (!token.id) return done(null, false, { message: 'User not found' })

                const user = await mongo.get('users', token.id)

                if (!user) return done(null, false, { message: 'User not found' })

                return done(null, token.id)
            } catch (error) {
                return done(error)
            }
        }
    )
)
