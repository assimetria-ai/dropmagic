const express = require('express')
const router = express.Router()

// @custom — register your product-specific routers here
router.use(require('../../api/@custom/audit-logs'))
router.use(require('../../api/@custom/errors'))
router.use(require('../../api/@custom/search'))
router.use(require('../../api/@custom/collaborators'))
router.use(require('../../api/@custom/brands'))
router.use(require('../../api/@custom/chatbase'))
router.use(require('../../api/@custom/email-logs'))
router.use(require('../../api/@custom/storage'))
router.use(require('../../api/@custom/blog'))
router.use(require('../../api/@custom/drops'))
router.use(require('../../api/@custom/product-hunt'))
router.use(require('../../api/@custom/goals'))
router.use(require('../../api/@custom/research-findings'))

module.exports = router
