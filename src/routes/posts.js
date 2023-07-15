import express from 'express'
import { mongo } from '../db/conn.js'
import { v5 as uuidV5 } from 'uuid'

const router = express.Router()

router.put('/posts', async (req, res, next) => {
    if (!(await mongo.hasTable('posts'))) await mongo.createTable('posts')

    const { userId, title, body, image } = req.body

    const user = await mongo.get('users', userId)
    delete user.password
    delete user._id

    let post
    try {
        post = await mongo.create('posts', uuidV5(Date.now(), uuidV5.URL), {
            user,
            title,
            body,
            image,
            date: new Date(),
            edited: false
        })
    } catch (err) {
        return res.status(500).json({ error: true, message: err.message })
    }

    delete post._id
    return res.status(201).json({ post, message: 'Post created' })
})

export default router
