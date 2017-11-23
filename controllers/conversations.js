var express = require('express');
var router = express.Router();
var manager = require("../app.js");
var APP = new manager();
var parser = APP.parser();
var escapeSQL = APP.escapeSQL();
var request = APP.request();
var async = APP.async();








router.get('/:id/type=messages', parser, function(req, res) {
    var access_token = req.body.access_token || req.query.access_token || req.headers['x-access-token'] || req.params.access_token;
    var id = req.body.id || req.query.id || req.params.id;
    var page = req.body.page || req.query.page || req.params.page;
    var per_page = req.body.per_page || req.query.per_page || req.params.per_page;
    APP.authenticateWithToken(id, access_token, function(auth) {
        if (auth) {
            var userSQL = "SELECT * FROM `messages` WHERE `conversations_id`=" + id + " ORDER BY `time` ASC LIMIT " + parseInt(per_page, 10) + " OFFSET " + parseInt(page, 10) * parseInt(per_page, 10) + "";
            APP.getObjectWithSQL(userSQL, function(data) {
                if (data) {
                    return res.send(echo(200, data));
                } else {
                    return res.send(echo(404, "No have any messages."));
                }
            });
        } else {
            return res.send(echo(400, "Authenticate failed."));
        }
    });
});












function echo(status, data) {
    return JSON.stringify({
        status: status,
        message: data,
        time: new Date().getTime()
    });
}
module.exports = router;