import express from 'express'
import jwt from 'jsonwebtoken'
import passport from 'passport'

const router = express.Router()

/**
 * POST /login
 *
 * This route authenticates the user by verifying a username and password.
 *
 * A username and password are submitted to this route via an HTML form.
 * The username and password is authenticated using the `local` strategy.
 * The strategy will parse the username and password from the request and
 * call the `verify` function.
 *
 * Upon successful authentication, a login session will be established.  As the
 * user interacts with the app, by clicking links and submitting forms, the
 * subsequent requests will be authenticated by verifying the session.
 */
router.post('/login', async (req, res, next) => {
    passport.authenticate(
        'login',
        {
            session: false
        },
        async (err, user, info) => {
            try {
                if (err) {
                    const error = new Error('An error occurred.')
                    return next(error)
                }

                if (!user) {
                    return res.status(401).json({ message: info.message })
                }

                req.login(user, { session: false }, async (error) => {
                    if (error) return next(error)

                    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET)

                    return res.json({ token })
                })
            } catch (error) {
                return next(error)
            }
        }
    )(req, res, next)
})

/**
 * POST /signup
 *
 * This route creates a new user account.
 *
 * A desired username and password are submitted to this route via an HTML form,
 * which was rendered by the `GET /signup` route.  The password is hashed and
 * then a new user record is inserted into the database.  If the record is
 * successfully created, the app logs the user in.
 */
router.put(
    '/signup',
    passport.authenticate('signup', { session: false }, null),
    function (req, res) {
        const token = jwt.sign({ id: req.user.id }, process.env.JWT_SECRET)

        res.json({ message: 'Signup successful', token })
    }
)

export default router
