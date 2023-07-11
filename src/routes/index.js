import express from 'express'

const router = express.Router()

/* GET home page. */
router.get('/', function (req, res, next) {
    // Send a JSON response with 200 OK
    res.status(200).json({ message: 'Hello, world!' })
})

export default router
