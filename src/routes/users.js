import express from 'express'
import { mongo } from '../db/conn.js'
import { v5 as uuidV5 } from 'uuid'
import { mergeObjects } from '@sapphire/utilities'

const router = express.Router()

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

router.patch('/:id', async (req, res) => {
    const { id } = req.params
    const user = await mongo.get('users', id)

    if (!user) return res.status(404).json({ error: true, message: 'User not found' })
    delete user.password
    delete user._id

    const { username, image, description } = req.body
    await mongo.update(
        'users',
        id,
        mergeObjects(user, {
            username,
            image,
            description
        })
    )

    // Send a JSON response with 200 OK
    return res.status(200).json({ user, message: 'User updated' })
})

export default router
