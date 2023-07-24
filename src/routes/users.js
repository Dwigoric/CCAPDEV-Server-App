import express from 'express'
import { mongo } from '../db/conn.js'
import { v5 as uuidV5 } from 'uuid'
import multer from 'multer'

const router = express.Router()

const storage = multer.diskStorage({
    destination: 'public/images/avatars',
    filename: (req, file, cb) => {
        // Use UUID v5 to generate a unique filename
        cb(null, `${uuidV5(Date.now().toString(), uuidV5.URL)}_${file.originalname}`)
    }
})

const upload = multer({ storage })

router.post('/login', async (req, res) => {
    if (!(await mongo.hasTable('users')))
        return res.status(404).json({ error: true, message: 'User not found' })

    const { username, password } = req.body
    const user = await mongo.findOne('users', { username })
    if (!user) return res.status(404).json({ error: true, message: 'User not found' })
    // TODO: Hash passwords
    if (user.password !== password)
        return res.status(401).json({ error: true, message: 'Credentials mismatch' })

    // Send a JSON response with 200 OK
    delete user.password
    delete user._id
    return res.status(200).json({ user, message: 'Login successful' })
})

router.put('/register', async (req, res) => {
    if (!(await mongo.hasTable('users'))) await mongo.createTable('users')

    const { username, password } = req.body
    const exists = await mongo.has('users', username)
    if (exists) return res.status(404).json({ error: true, message: 'User already exists' })
    // TODO: Hash passwords

    const generatedId = uuidV5(username, uuidV5.URL)
    const user = {
        id: generatedId,
        username,
        password,
        image: `https://robohash.org/${username}`,
        description: ''
    }
    try {
        await mongo.create('users', generatedId, {
            username,
            password,
            image: `https://robohash.org/${username}`,
            description: ''
        })
    } catch (err) {
        return res.status(500).json({ error: true, message: err.message })
    }

    // Send a JSON response with 200 OK
    delete user.password
    return res.status(201).json({ user, message: 'Register successful' })
})

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
    if (!user) return res.status(404).json({ error: true, message: 'User not found' })

    // Send a JSON response with 200 OK
    delete user.password
    delete user._id
    return res.status(200).json({ user, message: 'User found' })
})

router.patch('/:id', upload.single('avatar'), async (req, res) => {
    const { id } = req.params
    const { username, description } = req.body

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
    delete user._id
    delete user.password

    // Send a JSON response with 200 OK
    return res.status(200).json({ user, message: 'User updated' })
})

export default router
