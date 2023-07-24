import express from 'express'
import { mongo } from '../db/conn.js'
import { v5 as uuidV5 } from 'uuid'

const router = express.Router()

router.put('/:postId', async (req, res) => {
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

    const comment = await mongo.get('comments', generatedId)
    delete comment._id

    comment.user = await mongo.get('users', comment.user)
    delete comment.user._id
    delete comment.user.password

    return res.status(201).json({ comment, message: 'Comment created' })
})

router.get('/:postId', async (req, res) => {
    // Return if `comments` collection doesn't exist
    if (!(await mongo.hasTable('comments'))) return res.status(200).json({ comments: [] })

    const comments = await mongo.getManyBy('comments', 'postId', req.params.postId)

    for (const comment of comments) {
        delete comment._id
        if (comment.deleted) continue

        comment.user = await mongo.get('users', comment.user)
        delete comment.user._id
        delete comment.user.password
    }

    return res.status(200).json({ comments })
})

router.get('/:postId/:id', async (req, res) => {
    const { id } = req.params

    const comment = await mongo.get('comments', id)
    if (!comment) return res.status(404).json({ error: true, message: 'Comment not found' })
    delete comment._id

    if (!comment.deleted) {
        comment.user = await mongo.get('users', comment.user)
        delete comment.user._id
        delete comment.user.password
    }

    return res.status(200).json({ comment, message: 'Comment found' })
})

router.patch('/:postId/:id', async (req, res) => {
    const { id } = req.params

    const { body } = req.body

    if (!body) return res.status(400).json({ error: true, message: 'Comment body is required' })

    const comment = await mongo.get('comments', id)
    if (!comment) return res.status(404).json({ error: true, message: 'Comment not found' })

    const updatedComment = {
        body,
        edited: Date.now()
    }

    try {
        await mongo.update('comments', id, updatedComment)
    } catch (err) {
        return res.status(500).json({ error: true, message: err.message })
    }

    return res
        .status(200)
        .json({ comment: { ...comment, ...updatedComment }, message: 'Comment updated' })
})

router.delete('/:postId/:id', async (req, res) => {
    const { id } = req.params

    const comment = await mongo.get('comments', id)
    if (!comment) return res.status(404).json({ error: true, message: 'Comment not found' })

    try {
        await mongo.update('comments', id, {
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
