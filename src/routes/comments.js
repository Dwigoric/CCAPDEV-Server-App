import express from 'express'
import { mongo } from '../db/conn.js'
import { v5 as uuidV5 } from 'uuid'

const router = express.Router()

router.put('/:postId', async (req, res, next) => {
    if (!(await mongo.hasTable('comments'))) {
        await mongo.createTable('comments')
        // Create text index for search. Include `title` and `body` fields
        // Azure Cosmos DB supports only one text index per collection, so catch the error
        await mongo.db.createIndex('comments', { body: 'text' }).catch(() => {})

        // Create index for sorting by date
        await mongo.db.createIndex('comments', { date: -1 })
    }

    const { userId, body } = req.body

    const user = await mongo.get('users', userId)
    delete user.password
    delete user._id

    const comment = {
        user: {
            id: user.id,
            username: user.username,
            image: user.image
        },
        body,
        date: Date.now(),
        reactions: 0
    }

    try {
        await mongo.create('comments', uuidV5(Date.now().toString(), uuidV5.URL), comment)
    } catch (err) {
        return res.status(500).json({ error: true, message: err.message })
    }

    delete comment._id
    return res.status(201).json({ comment, message: 'Comment created' })
})

router.get('/:postId', async (req, res, next) => {
    // Return if `comments` collection doesn't exist
    if (!(await mongo.hasTable('comments')))
        return res.status(200).json({ comments: [], loadedAll: true })

    // Use `last` and `limit` query param to paginate
    const { last, limit } = req.query

    const comments = await mongo.getPaginated(
        'comments',
        !limit || Number(limit) > 20 ? 20 : Number(limit),
        {
            key: 'date',
            value: Number(last)
        }
    )

    return res.status(206).json({
        comments,
        loadedAll: (await mongo.findOne('comments'))?.date === comments[comments.length - 1]?.date
    })
})

router.get('/:postId/search', async (req, res, next) => {
    const { q } = req.query

    if (!q) return next()

    try {
        const comments = await mongo.db
            .collection('comments')
            .find({ $text: { $search: decodeURIComponent(q) } })
            .toArray()

        return res.status(200).json({ comments })
    } catch (err) {
        return res.status(500).json({ error: true, message: err.message })
    }
})

router.get('/:postId/:id', async (req, res, next) => {
    const { id } = req.params

    const comment = await mongo.get('comments', id)
    if (!comment) return res.status(404).json({ error: true, message: 'Comment not found' })

    return res.status(200).json({ comment, message: 'Comment found' })
})

router.patch('/:postId/:id', async (req, res, next) => {
    const { id } = req.params

    const { title, body } = req.body

    const comment = await mongo.get('comments', id)
    if (!comment) return res.status(404).json({ error: true, message: 'Comment not found' })

    const updatedcomment = {
        ...comment,
        title: title || comment.title,
        body: body || comment.body,
        edited: Date.now()
    }

    try {
        await mongo.update('comments', id, updatedcomment)
    } catch (err) {
        return res.status(500).json({ error: true, message: err.message })
    }

    return res.status(200).json({ comment: updatedcomment, message: 'Comment updated' })
})

router.delete('/:postId/:id', async (req, res, next) => {
    const { id } = req.params

    const comment = await mongo.get('comments', id)
    if (!comment) return res.status(404).json({ error: true, message: 'Comment not found' })

    try {
        await mongo.delete('comments', id)
    } catch (err) {
        return res.status(500).json({ error: true, message: err.message })
    }

    return res.status(200).json({ message: 'Comment deleted' })
})

export default router
