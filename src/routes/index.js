import express from 'express'

const router = express.Router()

/* GET home page. */
router.get('/', function (req, res, next) {
    // Send a 200 OK
    res.status(200).send('200 OK')
})

export default router
