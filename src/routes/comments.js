import express from 'express'
import { mongo } from '../db/conn.js'
import { v5 as uuidV5 } from 'uuid'
import passport from 'passport'

const router = express.Router()

router.put('/:postId', async (req, res) => {
    passport.authenticate('jwt', { session: false }, async (err, user, info) => {
        if (err) return res.status(500).json({ error: true, message: 'Internal server error' })
        if (info) return res.status(401).json({ error: true, message: info.message })
        delete user.password

        const { body, postId, parentCommentId } = req.body

        if (!body) return res.status(400).json({ error: true, message: 'Comment body is required' })
        if (body.length > 500)
            return res
                .status(400)
                .json({ error: true, message: 'Comment body cannot be longer than 500 characters' })

        if (!postId)
            return res.status(400).json({ error: true, message: 'Comment postId is required' })

        if (!(await mongo.has('posts', postId)))
            return res.status(404).json({ error: true, message: 'Post not found' })

        // Create `comments` collection if it doesn't exist
        if (!(await mongo.hasTable('comments'))) {
            await mongo.createTable('comments')

            // Create ID index for comments.
            await mongo.db.createIndex('comments', { id: 1 }, { name: 'ID', unique: true })

            // Create user index for equality search.
            await mongo.db.createIndex('comments', { user: 1 }, { name: 'User' })

            // Create post index for equality search.
            await mongo.db.createIndex('comments', { postId: 1 }, { name: 'Post ID' })
        }

        const generatedId = uuidV5(Date.now().toString(), uuidV5.URL)

        const newComment = {
            body,
            user: user.id,
            postId,
            deleted: false,
            parentCommentId: parentCommentId || null,
            date: Date.now()
        }

        try {
            await mongo.create('comments', generatedId, newComment)
        } catch (err) {
            return res.status(500).json({ error: true, message: err.message })
        }

        newComment.user = user

        return res.status(201).json({ comment: newComment, message: 'Comment created' })
    })(req, res)
})

router.get('/user/:userId', async (req, res) => {
    const { userId } = req.params

    if (!(await mongo.has('users', userId))) {
        return res.status(404).json({ error: true, message: 'User not found' })
    }

    const comments = await mongo.getManyBy('comments', 'user', userId)

    for (const comment of comments) {
        if (comment.deleted) continue
        delete comment._id

        const post = await mongo.get('posts', comment.postId)
        if (post.deleted) continue
        delete post._id
        delete post.body
        delete post.image
        delete post.user
        delete post.deleted
        comment.post = post

        comment.user = await mongo.get('users', comment.user)
        delete comment.user._id
        delete comment.user.password
    }

    return res.status(200).json({ comments })
})

router.get('/:postId', async (req, res) => {
    // Return if `comments` collection doesn't exist
    if (!(await mongo.hasTable('comments'))) return res.status(200).json({ comments: [] })

    const { postId } = req.params

    if (!(await mongo.has('posts', postId))) {
        return res.status(400).json({ error: true, message: 'Post not found' })
    }

    const comments = await mongo.getManyBy('comments', 'postId', postId)

    for (const comment of comments) {
        delete comment._id
        if (comment.deleted) continue

        comment.user = await mongo.get('users', comment.user)
        delete comment.user._id
        delete comment.user.password
    }

    return res.status(200).json({ comments })
})

router.patch('/:id', async (req, res) => {
    passport.authenticate('jwt', { session: false }, async (err, user, info) => {
        if (err) return res.status(500).json({ error: true, message: 'Internal server error' })
        if (info) return res.status(401).json({ error: true, message: info.message })
        delete user.password

        const { id } = req.params

        const { body } = req.body

        if (!body) return res.status(400).json({ error: true, message: 'Comment body is required' })
        if (body.length > 500)
            return res
                .status(400)
                .json({ error: true, message: 'Comment body cannot be longer than 500 characters' })

        const comment = await mongo.get('comments', id)
        if (!comment) return res.status(404).json({ error: true, message: 'Comment not found' })

        // Check if user is trying to update their own comment
        if (user.id !== comment.user)
            return res.status(403).json({ error: true, message: 'Forbidden' })

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
    })(req, res)
})

router.delete('/:id', async (req, res) => {
    passport.authenticate('jwt', { session: false }, async (err, user, info) => {
        if (err) return res.status(500).json({ error: true, message: 'Internal server error' })
        if (info) return res.status(401).json({ error: true, message: info.message })
        delete user.password

        const { id } = req.params

        const comment = await mongo.get('comments', id)
        if (!comment) return res.status(404).json({ error: true, message: 'Comment not found' })

        // Check if user is trying to delete their own comment
        if (user.id !== comment.user)
            return res.status(403).json({ error: true, message: 'Forbidden' })

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
    })(req, res)
})

export default router
