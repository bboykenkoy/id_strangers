var express = require('express');
var router = express.Router();
var manager = require("../app.js");
var APP = new manager();
var parser = APP.parser();
var escapeSQL = APP.escapeSQL();
var request = APP.request();
var async = APP.async();








router.get('/:conversations_id/type=messages', parser, function(req, res) {
    var access_token = req.body.access_token || req.query.access_token || req.headers['x-access-token'] || req.params.access_token;
    var id = req.body.id || req.query.id || req.params.id;
    var conversations_id = req.body.conversations_id || req.query.conversations_id || req.params.conversations_id;
    var page = req.body.page || req.query.page || req.params.page;
    var per_page = req.body.per_page || req.query.per_page || req.params.per_page;
    APP.authenticateWithToken(id, access_token, function(auth) {
        if (auth) {
            var userSQL = "SELECT * FROM `messages` WHERE `conversations_id`=" + conversations_id + " ORDER BY `time` DESC LIMIT " + parseInt(per_page, 10) + " OFFSET " + parseInt(page, 10) * parseInt(per_page, 10) + "";
            APP.getObjectWithSQL(userSQL, function(data) {
                if (data) {
                    async.forEachOf(data, function(element, i, callback) {
                        var sttSQL = "SELECT `status` FROM `message_status` WHERE `messages_id`=" + element.id + " AND `users_id`!=" + id + "";
                        APP.getObjectWithSQL(sttSQL, function(status) {
                            if (status) {
                                data[i].status = status[0].status;
                            } else {
                                data[i].status = 0;
                            }
                            data[i].sender_id = data[i].users_id;
                            delete data[i].users_id;
                            if (i == data.length - 1) {
                                return res.send(echo(200, data));
                            }
                        });
                    });
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