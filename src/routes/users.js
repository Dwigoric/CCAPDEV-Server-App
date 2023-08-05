import express from 'express'
import { mongo } from '../db/conn.js'
import { v5 as uuidV5 } from 'uuid'
import multer from 'multer'
import passport from 'passport'

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
    const user = await mongo.getBy('users', 'username', username)
    const regEx = /^[0-9A-Za-z]{1,20}$/

    if (!regEx.test(username)) {
        return res.status(400).json({ error: true, message: 'Username is invalid' })
    }

    if (!user) return res.status(404).json({ error: true, message: 'User not found' })

    // Send a JSON response with 200 OK
    delete user.password
    delete user._id
    return res.status(200).json({ user, message: 'User found' })
})

router.patch('/:id', upload.single('avatar'), async (req, res) => {
    passport.authenticate('jwt', { session: false }, async (err, id, info) => {
        if (err) return res.status(500).json({ error: true, message: 'Internal server error' })
        if (info) return res.status(401).json({ error: true, message: info.message })

        const { id: userId } = req.params

        // Check if user is trying to update their own profile
        if (userId !== id) return res.status(403).json({ error: true, message: 'Forbidden' })

        const { username, description } = req.body
        const regEx = /^[0-9A-Za-z]{1,20}$/
        // Check if the name is valid
        if (!regEx.test(username)) {
            return res.status(400).json({ error: true, message: 'Username is invalid' })
    }

        if (!(await mongo.has('users', id)))
            return res.status(404).json({ error: true, message: 'User not found' })

        // Check duplicate username
        const exists = await mongo.findOne('users', { username })
        if (exists && exists._id !== id)
            return res.status(400).json({ error: true, message: 'Username already exists' })

        const updatedUser = {}

        if (username) updatedUser.username = username
        if (description) updatedUser.description = description
        if (req.file) {
            const domain = `${req.protocol}://${req.get('host')}`
            updatedUser.image = `${domain}/images/avatars/${req.file.filename}`
        }

        await mongo.update('users', id, updatedUser)

        // Retrieve the updated user
        const user = await mongo.get('users', id)
        delete user.password
        delete user._id

        // Send a JSON response with 200 OK
        return res.status(200).json({ user, message: 'User updated' })
    })(req, res)
})

export default router
