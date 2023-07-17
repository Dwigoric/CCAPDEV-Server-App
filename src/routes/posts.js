import express from 'express'
import { mongo } from '../db/conn.js'
import { v5 as uuidV5 } from 'uuid'

const router = express.Router()

router.put('/', async (req, res, next) => {
    if (!(await mongo.hasTable('posts'))) await mongo.createTable('posts')

    const { userId, title, body, image } = req.body

    const user = await mongo.get('users', userId)
    delete user.password
    delete user._id

    const post = {
        user: {
            id: user.id,
            username: user.username,
            image: user.image
        },
        title,
        body,
        image,
        date: Date.now(),
        edited: false,
        reactions: 0
    }

    try {
        await mongo.create('posts', uuidV5(Date.now().toString(), uuidV5.URL), post)
    } catch (err) {
        return res.status(500).json({ error: true, message: err.message })
    }

    delete post._id
    return res.status(201).json({ post, message: 'Post created' })
})

router.get('/', async (req, res, next) => {
    // Return if `posts` collection doesn't exist
    if (!(await mongo.hasTable('posts'))) return res.status(200).json({ posts: [] })

    // Use `last` and `limit` query param to paginate
    const { last, limit } = req.query

    const posts = await mongo.getPaginated(
        'posts',
        !limit || Number(limit) > 20 ? 20 : Number(limit),
        {
            key: 'date',
            value: Number(last)
        }
    )

    return res.status(206).json({
        posts,
        loadedAll: (await mongo.findOne('posts'))?.date === posts[posts.length - 1]?.date
    })
})

export default router
