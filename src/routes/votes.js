import express from 'express'
import { mongo } from '../db/conn.js'

const router = express.Router()

router.post('/:id', async (req, res) => {
    const { id } = req.params
    const { userId, vote } = req.body

    // Find the user
    const user = await mongo.get('users', userId)
    if (!user) {
        return res.status(404).json({ error: true, message: 'User not found' })
    }

    // Find the post
    const post = await mongo.get('posts', { id: id })
    if (!post) return res.status(404).json({ error: true, message: 'Post not found' })

    //votesIndex
    const votesIndex = {
        userId: userId,
        reactions: vote
    }
    // Create a new  table
    if (!(await mongo.hasTable('votes'))) {
        await mongo.createTable('votes')
    }

    const isVoted = await mongo.findOne('votes', { id: id, userId: userId })

    let newReactions = post.reactions

    if (isVoted) {
        if (isVoted.reactions === 1) {
            newReactions -= 1
        } else if (isVoted.reactions === -1) {
            newReactions += 1
        }
    }

    newReactions += vote

    try {
        await mongo.create('votes', id, votesIndex)
    } catch (err) {
        return res.status(500).json({ error: true, message: err.message })
    }

    const updatedVote = {
        ...post,
        reactions: newReactions
    }
    try {
        await mongo.update('posts', id, updatedVote)
    } catch (err) {
        return res.status(500).json({ error: true, message: err.message })
    }

    return res.status(200).json({ post: updatedVote, message: 'Vote changed' })
})

router.get('/:id', async (req, res) => {
    const { id } = req.params
    const { userId } = req.query

    const isVoted = await mongo.findOne('votes', { id: id, userId: userId })

    if (isVoted) {
        return res.status(100).json({ reactions: isVoted.reactions, message: 'Votes retrieved' })
    } else {
        return res.status(100).json({ reactions: 0, message: 'No votes yet' })
    }
})
export default router
