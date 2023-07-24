import express from 'express'
import { mongo } from '../db/conn.js'
import { v5 as uuidV5 } from 'uuid'

const router = express.Router()

router.put('/:postId', async (req, res, next) => {
    const generatedId = uuidV5(Date.now().toString(), uuidV5.URL)

    const { body, user, postId, parentCommentId } = req.body

    if (!body) return res.status(400).json({ error: true, message: 'Comment body is required' })
    if (!user) return res.status(400).json({ error: true, message: 'Comment user is required' })
    if (!postId) return res.status(400).json({ error: true, message: 'Comment postId is required' })

    if (!(await mongo.has('posts', postId)))
        return res.status(404).json({ error: true, message: 'Post not found' })

    try {
        await mongo.create('comments', generatedId, {
            body,
            user,
            postId,
            deleted: false,
            parentCommentId: parentCommentId || null
        })
    } catch (err) {
        return res.status(500).json({ error: true, message: err.message })
    }

    return res.status(201).json({ generatedId, message: 'Comment created' })
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

    const { body } = req.body

    if (!body) return res.status(400).json({ error: true, message: 'Comment body is required' })

    const comment = await mongo.get('comments', id)
    if (!comment) return res.status(404).json({ error: true, message: 'Comment not found' })

    const updatedComment = {
        ...comment,
        body: body || comment.body,
        edited: Date.now()
    }

    try {
        await mongo.update('comments', id, updatedComment)
    } catch (err) {
        return res.status(500).json({ error: true, message: err.message })
    }

    return res.status(200).json({ comment: updatedComment, message: 'Comment updated' })
})

router.delete('/:postId/:id', async (req, res, next) => {
    const { id } = req.params

    const comment = await mongo.get('comments', id)
    if (!comment) return res.status(404).json({ error: true, message: 'Comment not found' })

    try {
        await mongo.update('comments', id, {
            ...comment,
            body: '[deleted]',
            deleted: true,
            user: null
        })
    } catch (err) {
        return res.status(500).json({ error: true, message: err.message })
    }

    return res.status(200).json({ message: 'Comment deleted' })
})

export default router
