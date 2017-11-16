var express = require('express');
var router = express.Router();
var manager = require("../app.js");
var APP = new manager();
var parser = APP.parser();
var escapeSQL = APP.escapeSQL();
var request = APP.request();





















function echo(status, data) {
    return JSON.stringify({
        status: status,
        message: data,
        time: new Date().getTime()
    });
}
module.exports = router;