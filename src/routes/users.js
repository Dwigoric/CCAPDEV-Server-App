import express from 'express'
import { mongo } from '../db/conn.js'
import { v5 as uuidV5 } from 'uuid'

const router = express.Router()

router.post('/users/login', async (req, res, next) => {
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

router.put('/users/register', async (req, res, next) => {
    if (!(await mongo.hasTable('users'))) await mongo.createTable('users')

    const { username, password } = req.body
    const exists = await mongo.has('users', username)
    if (exists) return res.status(404).json({ error: true, message: 'User already exists' })
    // TODO: Hash passwords

    let user
    try {
        user = await mongo.create('users', uuidV5(username, uuidV5.URL), {
            username,
            password,
            image: `https://robohash.org/${username}`
        })
    } catch (err) {
        return res.status(500).json({ error: true, message: err.message })
    }

    // Send a JSON response with 200 OK
    delete user.password
    delete user._id
    return res.status(201).json({ user, message: 'Register successful' })
})

export default router
