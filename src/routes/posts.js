import express from 'express'
import { mongo } from '../db/conn.js'
import { v5 as uuidV5 } from 'uuid'

const router = express.Router()

router.put('/', async (req, res, next) => {
    if (!(await mongo.hasTable('posts'))) {
        await mongo.createTable('posts')
        // Create text index for search. Include `title` and `body` fields
        // Include the `date` field for sorting
        await mongo.db.createIndex('posts', { title: 'text', body: 'text', date: -1 })
    }

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
    if (!(await mongo.hasTable('posts')))
        return res.status(200).json({ posts: [], loadedAll: true })

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

router.get('/search', async (req, res, next) => {
    const { q } = req.query

    if (!q) return next()

    try {
        const posts = await mongo.db
            .collection('posts')
            .find({ $text: { $search: decodeURIComponent(q) } })
            .toArray()

        return res.status(200).json({ posts })
    } catch (err) {
        return res.status(500).json({ error: true, message: err.message })
    }
})

router.get('/:id', async (req, res, next) => {
    const { id } = req.params

    const post = await mongo.get('posts', id)
    if (!post) return res.status(404).json({ error: true, message: 'Post not found' })

    return res.status(200).json({ post, message: 'Post found' })
})

router.patch('/:id', async (req, res, next) => {
    const { id } = req.params

    const { title, body } = req.body

    const post = await mongo.get('posts', id)
    if (!post) return res.status(404).json({ error: true, message: 'Post not found' })

    const updatedPost = {
        ...post,
        title: title || post.title,
        body: body || post.body,
        edited: Date.now()
    }

    try {
        await mongo.update('posts', id, updatedPost)
    } catch (err) {
        return res.status(500).json({ error: true, message: err.message })
    }

    return res.status(200).json({ post: updatedPost, message: 'Post updated' })
})

router.delete('/:id', async (req, res, next) => {
    const { id } = req.params

    const post = await mongo.get('posts', id)
    if (!post) return res.status(404).json({ error: true, message: 'Post not found' })

    try {
        await mongo.delete('posts', id)
    } catch (err) {
        return res.status(500).json({ error: true, message: err.message })
    }

    return res.status(200).json({ message: 'Post deleted' })
})

export default router
