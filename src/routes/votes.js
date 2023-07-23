import express from 'express'
import { mongo } from '../db/conn.js'

const router = express.Router()

router.patch('/:id', async (req, res)  => {
     
     const { id } = req.params
     const { userId, vote } = req.body

     
     //Find the post
     const post = await mongo.get('posts', { id: id })
     if (!post) return res.status(404).json({ error: true, message: 'Post not found' })
     
     //votesIndex
     const votesIndex = {
          userId: userId,
          reactions: vote
     }
     //Create  a new  table
     if (!(await mongo.hasTable('votes')))  { 
          await mongo.createTable('votes')
     }
   
     //await mongo.findOne('votes', { 'id': id})
     const isVoted  = await mongo.findOne('votes', { id: id, userId: userId })

     let newReactions = post.reactions

     if (isVoted) {
          if (isVoted.reactions == 1) {
               newReactions -= 1
          }
          else if (isVoted.reactions == -1) {
               newReactions += 1
          }

          newReactions += vote

          try {
               mongo.update('votes', id, votesIndex)
          } catch (err) {
               return res.status(500).json({ error: true, message: err.message })
          }
     }
     else {
          newReactions += vote

          try {
               await mongo.create('votes', id, votesIndex)
          } catch (err) {
               return res.status(500).json({ error: true, message: err.message })
          }
     }

     

     const updatedVote = {
          ...post,
          reactions: newReactions,
     }
     try {
          await mongo.update('posts', id, updatedVote)
     } catch (err) {
          return res.status(500).json({ error: true, message: err.message })
     }

     return res.status(200).json({ post: updatedVote, message: 'vote changed' })
    
})
router.put('/:id', async (req, res) =>{
     const { id } = req.params
     const { userId } = req.body

     const isVoted  = await mongo.findOne('votes', { id: id, userId: userId })

     if (isVoted) {
          return res.status(200).json({message: "Voted already", reactions: isVoted.reactions})
     }
     else {
          return res.status(500).json({ error: true, message: "Hasn't been voted", reactions: 0 })
     }
})
export default router