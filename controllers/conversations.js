var express = require('express');
var router = express.Router();
var manager = require("../app.js");
var APP = new manager();
var parser = APP.parser();
var escapeSQL = APP.escapeSQL();
var request = APP.request();
var async = APP.async();
var client = APP.client();





router.post('/new', parser, function(req, res) {
    var access_token = req.body.access_token || req.query.access_token || req.headers['x-access-token'] || req.params.access_token;
    var id = req.body.id || req.query.id || req.params.id;
    var friend_id = req.body.friend_id || req.query.friend_id || req.params.friend_id;

    var currentTime = new Date().getTime();
    var object = {
        name: "Stranger " + getRandomInt(1, 200),
        created_at: currentTime,
        last_message: "Created",
        last_action_time: currentTime,
        last_id_update: id,
        created_by: id
    }
    APP.authenticateWithToken(id, access_token, function(auth) {
        if (auth) {
            var clienSQL = escapeSQL.format("INSERT INTO `conversations` SET ?", object);
            APP.insertWithSQL(clienSQL, function(conversation) {
                if (conversation) {
                    client.query("INSERT INTO `members` SET `users_id`=" + id + " `conversations_id`=" + conversation.id);
                    client.query("INSERT INTO `members` SET `users_id`=" + friend_id + " `conversations_id`=" + conversation.id);
                    var userSQL = "SELECT * FROM conversations WHERE `id`=" + conversation.id;
                    APP.getObjectWithSQL(userSQL, function(data) {
                        if (data) {
                            var checkRead = "SELECT * FROM `message_status` WHERE (`status`=1 OR `status`=2) AND `users_id`=" + id + " AND `conversations_id`=" + conversation.id;
                            var sqlMember = "SELECT " + APP.informationUser() + " FROM `users` WHERE `id` IN (SELECT `users_id` FROM `members` WHERE `conversations_id`=" + conversation.id + ")";
                            APP.getObjectWithSQL(checkRead, function(readed) {
                                APP.getObjectWithSQL(sqlMember, function(member) {
                                    if (readed) {
                                        data[0].is_read = 0;
                                    } else {
                                        data[0].is_read = 1;
                                    }
                                    data[0].members = member;
                                    return res.send(echo(200, data[0]));
                                });
                            });
                        } else {
                            return res.send(echo(404, "No have any conversation."));
                        }
                    });
                } else {
                    return res.send(echo(404, "Conversation exists."));
                }
            })
        } else {
            return res.send(echo(400, "Authenticate failed."));
        }
    });
});

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
router.get('/:conversations_id/type=friend', parser, function(req, res) {
    var access_token = req.body.access_token || req.query.access_token || req.headers['x-access-token'] || req.params.access_token;
    var id = req.body.id || req.query.id || req.params.id;
    var conversations_id = req.body.conversations_id || req.query.conversations_id || req.params.conversations_id;
    APP.authenticateWithToken(id, access_token, function(auth) {
        if (auth) {
            var sql = "SELECT * FROM `users` WHERE `id`!=" + id + " AND `id` IN (SELECT `users_id` FROM `members` WHERE `conversations_id`=" + conversations_id + ") LIMIT 1";
            APP.getObjectWithSQL(sql, function(user) {
                if (user) {
                    var sqlInfo = "SELECT `city`,`country`,`country_code` FROM `informations` WHERE `users_id`=" + user[0].id;
                    APP.getObjectWithSQL(sqlInfo, function(info) {
                        if (info) {
                            user[0].city = info[0].city;
                            user[0].country = info[0].country;
                            user[0].country_code = info[0].country_code;
                        }
                        return res.send(echo(200, user[0]));
                    })

                } else {
                    return res.send(echo(404, "No user found"));
                }
            });
        } else {
            return res.send(echo(400, "Authenticate failed."));
        }
    });
});

router.post('/:conversations_id/type=out', parser, function(req, res) {
    var access_token = req.body.access_token || req.query.access_token || req.headers['x-access-token'] || req.params.access_token;
    var id = req.body.id || req.query.id || req.params.id;
    var conversations_id = req.body.conversations_id || req.query.conversations_id || req.params.conversations_id;

    APP.authenticateWithToken(id, access_token, function(auth) {
        if (auth) {
            var clienSQL = "UPDATE `conversations` SET `is_new`=0 WHERE `id`=" + conversations_id;
            APP.updateWithSQL(clienSQL, function(status) {
                if (status) {
                    return res.send(echo(200, "Signout success."));
                } else {
                    return res.send(echo(404, "Conversation exists."));
                }
            })
        } else {
            return res.send(echo(400, "Authenticate failed."));
        }
    });
});





function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}





function echo(status, data) {
    return JSON.stringify({
        status: status,
        message: data,
        time: new Date().getTime()
    });
}
module.exports = router;