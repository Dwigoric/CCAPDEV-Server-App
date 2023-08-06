import express from 'express'
import { mongo } from '../db/conn.js'
import { v5 as uuidV5 } from 'uuid'
import multer from 'multer'
import passport from 'passport'
import argon2 from 'argon2'

const router = express.Router()

const storage = multer.diskStorage({
    destination: 'public/images/avatars',
    filename: (req, file, cb) => {
        // Use UUID v5 to generate a unique filename
        cb(null, `${uuidV5(Date.now().toString(), uuidV5.URL)}_${file.originalname}`)
    }
})

const upload = multer({ storage })

router.get('/:id', async (req, res) => {
    const { id } = req.params
    const user = await mongo.get('users', id)
    if (!user) return res.status(404).json({ error: true, message: 'User not found' })

    // Send a JSON response with 200 OK
    delete user.password
    delete user._id
    return res.status(200).json({ user, message: 'User found' })
})

router.get('/username/:username', async (req, res) => {
    const { username } = req.params
    const regEx = /^[0-9A-Za-z]{1,20}$/

    if (!regEx.test(username))
        return res.status(400).json({ error: true, message: 'Username is invalid' })

    const user = await mongo.getBy('users', 'username', username)
    if (!user) return res.status(404).json({ error: true, message: 'User not found' })

    // Send a JSON response with 200 OK
    delete user.password
    delete user._id
    return res.status(200).json({ user, message: 'User found' })
})

router.patch('/:id', upload.single('avatar'), async (req, res) => {
    passport.authenticate('jwt', { session: false }, async (err, user, info) => {
        if (err) return res.status(500).json({ error: true, message: 'Internal server error' })
        if (info) return res.status(401).json({ error: true, message: info.message })

        const { id: userId } = req.params

        // Check if user is trying to update their own profile
        if (userId !== user.id) return res.status(403).json({ error: true, message: 'Forbidden' })

        const { username, description, currentPassword, newPassword } = req.body
        const regEx = /^[0-9A-Za-z]{1,20}$/
        // Check if the name is valid
        if (!regEx.test(username)) {
            return res.status(400).json({ error: true, message: 'Username is invalid' })
        }

        if (!(await mongo.has('users', user.id)))
            return res.status(404).json({ error: true, message: 'User not found' })

        // Check duplicate username
        const exists = await mongo.findOne('users', { username })
        if (exists && exists.id !== user.id)
            return res.status(400).json({ error: true, message: 'Username already exists' })

        // Store updated user data
        const updatedUser = {}

        if (username) updatedUser.username = username
        if (description) updatedUser.description = description
        if (req.file) {
            const domain = `${req.protocol}://${req.get('host')}`
            updatedUser.image = `${domain}/images/avatars/${req.file.filename}`
        }
        if (newPassword) {
            // Check if current password is provided
            if (!currentPassword)
                return res
                    .status(400)
                    .json({ error: true, message: 'Current password is required' })

            if (newPassword.length < 6)
                return res
                    .status(400)
                    .json({ error: true, message: 'Password must be at least 6 characters' })

            // Check if current password is correct
            if (!(await argon2.verify(user.password, currentPassword)))
                return res
                    .status(400)
                    .json({ error: true, message: 'Current password is incorrect' })
            updatedUser.password = await argon2.hash(newPassword)
        }
        delete user.password

        // Update user in database
        await mongo.update('users', user.id, updatedUser)
        delete updatedUser.password

        // Send a JSON response with 200 OK
        return res.status(200).json({
            user: {
                ...user,
                ...updatedUser
            },
            message: 'User updated'
        })
    })(req, res)
})

export default router
