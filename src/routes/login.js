import express from 'express'
import { mongo } from '../db/conn.js'

const router = express.Router()

/* POST login details. */
router.post('/login', async (req, res, next) => {
    if (!(await mongo.hasTable('users'))) await mongo.createTable('users')

    const { username, password } = req.body
    const user = await mongo.get('users', username)
    if (!user) return res.status(404).json({ message: 'User not found' })
    // TODO: Hash passwords
    if (user.password !== password) return res.status(401).json({ message: 'Credentials mismatch' })

    // Send a JSON response with 200 OK
    delete user.password
    delete user._id
    return res.status(200).json({ user, message: 'Login successful' })
})

export default router
