var express = require('express');
	router = express.Router();


router.use('/users', require('./users'));
router.use('/conversations', require('./conversations'));
router.use('/messages', require('./messages'));

module.exports = router;
