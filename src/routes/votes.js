import express from 'express'
import { mongo } from '../db/conn.js'

const router = express.Router()

router.post('/:id', async (req, res) => {
    const { id: postId } = req.params
    const { userId, vote } = req.body

    if (typeof userId === 'undefined') {
        return res.status(400).json({ error: true, message: 'Missing userId' })
    }

    if (isNaN(vote)) {
        return res.status(400).json({ error: true, message: 'Missing vote' })
    }

    // Find the user
    if (!(await mongo.has('users', userId)))
        return res.status(404).json({ error: true, message: 'User not found' })

    // Find the post
    if (!(await mongo.has('posts', postId)))
        return res.status(404).json({ error: true, message: 'Post not found' })

    // Create a new table if it doesn't exist
    if (!(await mongo.hasTable('votes'))) {
        await mongo.createTable('votes')
    }

    const votesIndex = { postId, userId }

    const updatedVote = {
        postId,
        userId,
        vote
    }

    try {
        // If vote is 0, delete the vote record
        if (vote === 0) {
            await mongo.deleteRaw('votes', votesIndex)
            return res.status(200).json({ message: 'Voted' })
        } else {
            await mongo.updateRaw('votes', votesIndex, updatedVote, true)
        }
    } catch (err) {
        return res.status(500).json({ error: true, message: err.message })
    }

    return res.status(200).json({ message: 'Voted' })
})

router.get('/:id', async (req, res) => {
    const { id: postId } = req.params
    const { userId } = req.query

    if (typeof userId === 'undefined') {
        return res.status(400).json({ error: true, message: 'Missing userId' })
    }

    try {
        const voteRecord = await mongo.findOne('votes', { postId, userId })

        // If there is no vote record,
        // the user has not voted on this post
        let vote
        if (!voteRecord) {
            vote = 0
        } else {
            vote = voteRecord['vote']
        }

        // Aggregate the votes
        const { reactions } = await mongo
            .aggregate('votes', [
                { $match: { postId } },
                { $group: { _id: null, reactions: { $sum: '$vote' } } }
            ])
            .then((result) => result[0])

        return res.status(200).json({ message: 'Votes retrieved', userVote: vote, reactions })
    } catch (err) {
        return res.status(500).json({ error: true, message: err.message })
    }
})
export default router
