import express from 'express'
import { mongo } from '../db/conn.js'
import { v5 as uuidV5 } from 'uuid'

const router = express.Router()

router.put('/:postId', async (req, res, next) => {
    try {
        await mongo.create('comments', uuidV5(Date.now().toString(), uuidV5.URL), req.body)
    } catch (err) {
        return res.status(500).json({ error: true, message: err.message })
    }

    return res.status(201).json({ comment: req.body, message: 'Comment created' })
})

router.get('/:postId', async (req, res, next) => {
    // Return if `comments` collection doesn't exist
    if (!(await mongo.hasTable('comments'))) return res.status(200).json({ comments: [] })

    const comments = await mongo.getManyBy('comments', 'postId', req.params.postId)

    return res.status(200).json({ comments })
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
