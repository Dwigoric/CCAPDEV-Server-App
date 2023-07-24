import express from 'express'
import { mongo } from '../db/conn.js'
import { v5 as uuidV5 } from 'uuid'
import multer from 'multer'

const router = express.Router()

const storage = multer.diskStorage({
    destination: 'public/images/posts',
    filename: (req, file, cb) => {
        // Use UUID v5 to generate a unique filename
        cb(null, `${uuidV5(Date.now().toString(), uuidV5.URL)}_${file.originalname}`)
    }
})

const upload = multer({ storage })

router.put('/', upload.single('image'), async (req, res) => {
    // Create `posts` collection if it doesn't exist
    if (!(await mongo.hasTable('posts'))) {
        await mongo.createTable('posts')
        // Create text index for search. Include `title` and `body` fields
        await mongo.db.createIndex('posts', { title: 'text', body: 'text' })

        // Create index for sorting by date
        await mongo.db.createIndex('posts', { date: -1 })
    }

    // Get fields
    const { userId, title, body } = req.body

    // Validate fields
    if (!userId || !title || !body)
        return res.status(400).json({ error: true, message: 'Missing fields' })

    // Verify user exists
    const user = await mongo.get('users', userId)
    if (!user) return res.status(404).json({ error: true, message: 'User not found' })
    delete user._id
    delete user.password

    // Generate UUID v5 for post ID
    const generatedId = uuidV5(Date.now().toString(), uuidV5.URL)

    // Get image path
    const domain = `${req.protocol}://${req.get('host')}`
    const imagePath = req.file ? `${domain}/images/posts/${req.file.filename}` : null

    // Create post
    try {
        await mongo.create('posts', generatedId, {
            user: userId,
            title,
            body,
            image: imagePath,
            date: Date.now(),
            deleted: false
        })
    } catch (err) {
        return res.status(500).json({ error: true, message: err.message })
    }

    // Get post
    const post = await mongo.get('posts', generatedId)
    delete post._id

    // Add user to post
    post.user = user

    // Return post
    return res.status(201).json({ post, message: 'Post created' })
})

router.get('/', async (req, res) => {
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

    // Add user to each post
    for (const post of posts) {
        delete post._id

        if (post.deleted) {
            post.user = {
                id: 'deleted',
                username: 'deleted'
            }
            continue
        }

        const user = await mongo.get('users', post.user)
        delete user._id
        delete user.password
        post.user = user
    }

    // Return posts
    return res.status(206).json({
        posts,
        loadedAll:
            posts.length < 20 ||
            (await mongo.findOne('posts'))?.date === posts[posts.length - 1]?.date
    })
})

router.get('/search', async (req, res, next) => {
    const { q } = req.query

    if (!q) return next()

    const posts = await mongo.db
        .collection('posts')
        .find({ $text: { $search: decodeURIComponent(q) }, deleted: false })
        .toArray()

    // Add user to each post
    for (const post of posts) {
        delete post._id
        const user = await mongo.get('users', post.user)
        delete user._id
        delete user.password
        post.user = user
    }

    // Return posts
    return res.status(200).json({ posts })
})

router.get('/:id', async (req, res) => {
    const { id } = req.params

    const post = await mongo.get('posts', id)
    if (!post) return res.status(404).json({ error: true, message: 'Post not found' })

    delete post._id

    if (post.deleted) {
        post.user = {
            id: 'deleted',
            username: 'deleted'
        }
    } else {
        const user = await mongo.get('users', post.user)
        delete user._id
        delete user.password
        post.user = user
    }

    return res.status(200).json({ post, message: 'Post found' })
})

router.patch('/:id', async (req, res) => {
    const { id } = req.params

    const { title, body } = req.body

    const post = await mongo.get('posts', id)
    if (!post) return res.status(404).json({ error: true, message: 'Post not found' })

    const updatedPost = {
        title: title || post.title,
        body: body || post.body,
        edited: Date.now()
    }

    try {
        await mongo.update('posts', id, updatedPost)
    } catch (err) {
        return res.status(500).json({ error: true, message: err.message })
    }

    return res.status(200).json({ post: { ...post, ...updatedPost }, message: 'Post updated' })
})

router.delete('/:id', async (req, res) => {
    const { id } = req.params

    const post = await mongo.get('posts', id)
    if (!post) return res.status(404).json({ error: true, message: 'Post not found' })

    try {
        await mongo.update('posts', id, {
            deleted: true,
            body: 'This post has been deleted',
            title: 'Deleted',
            user: null
        })
    } catch (err) {
        return res.status(500).json({ error: true, message: err.message })
    }

    return res.status(200).json({ message: 'Post deleted' })
})

router.get('/user/:id', async (req, res) => {
    const { id } = req.params

    const posts = await mongo.db.collection('posts').find({ user: id }).sort({ date: 1 }).toArray()

    // Add user to each post
    for (const post of posts) {
        delete post._id
        const user = await mongo.get('users', post.user)
        delete user._id
        delete user.password
        post.user = user
    }

    return res.status(200).json({ posts })
})

export default router
