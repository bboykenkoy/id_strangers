var express = require('express');
var router = express.Router();
var manager = require("../app.js");
var APP = new manager();
var parser = APP.parser();
var escapeSQL = APP.escapeSQL();
var request = APP.request();
var async = APP.async();

router.post('/signup', parser, function(req, res) {
    if (req.body.id || req.body.coin || !req.body.facebook_id) {
        return res.sendStatus(300);
    }
    delete req.body.created_at;
    req.body.created_at = new Date().getTime();
    APP.isExistsUser("email", req.body.email, function(e1) {
        APP.isExistsUser("username", req.body.username, function(e2) {
            APP.isExistsUser("facebook_id", req.body.facebook_id, function(e3) {
                // Nếu có thông tin ở bảng khác
                var informations = {};
                if (req.body.carrier || req.body.city || req.body.country || req.body.country_code ||
                    req.body.bundle_id || req.body.device_type || req.body.device_token ||
                    req.body.device_id || req.body.device_name || req.body.wifi_name ||
                    req.body.ip_address || req.body.ips) {
                    if (req.body.carrier) {
                        informations.carrier = req.body.carrier;
                        delete req.body.carrier;
                    }
                    if (req.body.city) {
                        informations.city = req.body.city;
                        delete req.body.city;
                    }
                    if (req.body.country) {
                        informations.country = req.body.country;
                        delete req.body.country;
                    }
                    if (req.body.country_code) {
                        informations.country_code = req.body.country_code;
                        delete req.body.country_code;
                    }
                    if (req.body.bundle_id) {
                        informations.bundle_id = req.body.bundle_id;
                        delete req.body.bundle_id;
                    }
                    if (req.body.device_type) {
                        informations.device_type = req.body.device_type;
                        delete req.body.device_type;
                    }
                    if (req.body.device_token) {
                        informations.device_token = req.body.device_token;
                        delete req.body.device_token;
                    }
                    if (req.body.device_id) {
                        informations.device_id = req.body.device_id;
                        delete req.body.device_id;
                    }
                    if (req.body.device_name) {
                        informations.device_name = req.body.device_name;
                        delete req.body.device_name;
                    }
                    if (req.body.wifi_name) {
                        informations.wifi_name = req.body.wifi_name;
                        delete req.body.wifi_name;
                    }
                    if (req.body.ip_address) {
                        informations.ip_address = req.body.ip_address;
                        delete req.body.ip_address;
                    }
                    if (req.body.ips) {
                        informations.ips = req.body.ips;
                        delete req.body.ips;
                    }
                };
                if (e1 == true || e2 == true || e3 == true) {
                    if (e1 == true && e2 == true && e3 == true) {
                        return res.send(echo(404, "This user exists."));
                    } else {
                        if (e1 == true) {
                            return res.send(echo(404, "This email exists."));
                        } else if (e2 == true) {
                            return res.send(echo(404, "This username exists."));
                        } else {
                            return res.send(echo(404, "This facebook user exists."));
                        }
                    }
                } else {
                    // Thêm vào cơ sở dữ liệu user mới
                    var sql = escapeSQL.format("INSERT INTO `users` SET ?", req.body);
                    APP.insertWithSQL(sql, function(status) {
                        if (status) {
                            informations.users_id = status.id;
                            var sql2 = escapeSQL.format("INSERT INTO `informations` SET ?", informations);
                            APP.insertWithSQL(sql2, function(status2) {
                                if (status2) {

                                    return res.send(echo(200, "Registration successfully."));
                                } else {
                                    return res.send(echo(404, "Registration failed."));
                                }
                            });
                        } else {
                            return res.send(echo(404, "Registration failed."));
                        }
                    });
                }
            });
        });
    });
});


router.post('/signin', parser, function(req, res) {
    var facebook_token = req.body.facebook_token;
    var facebook_id = req.body.facebook_id;

    var sqlUser = "SELECT * FROM `users` WHERE `facebook_id`='" + facebook_id + "'";
    APP.getObjectWithSQL(sqlUser, function(u) {
        if (u) {
            var url = "https://graph.facebook.com/me?access_token=" + facebook_token;
            request(url, function(error, response, body) {
                if (response && response.statusCode == 200 && APP.isJsonString(body)) {
                    var fb = JSON.parse(body);
                    if (facebook_id == fb.id) {
                        APP.getObjectWithSQL("SELECT * FROM `users` WHERE `facebook_id`='" + facebook_id + "'", function(user) {
                            if (user) {
                                APP.getObjectWithSQL("SELECT * FROM `informations` WHERE `users_id`=" + user[0].id, function(info) {
                                    APP.createAccessToken(user[0].id, facebook_token, 604800, function(access_token) {
                                        if (info) {
                                            delete info[0].users_id;
                                            user[0].access_token = access_token;
                                            var full = Object.assign(user[0], info[0]);
                                            return res.send(echo(200, full));
                                        } else {
                                            user[0].access_token = access_token;
                                            return res.send(echo(user[0], full));
                                        }
                                    });
                                });
                            } else {
                                return res.send(echo(404, "This user not exists."));
                            }
                        });
                    } else {
                        return res.send(echo(400, "Authenticate failed."));
                    }
                } else {
                    return res.send(echo(400, "Authenticate failed."));
                }
            });
        } else {
            return res.send(echo(404, "This user not exists."));
        }
    });
});

router.post('/update', parser, function(req, res) {
    var access_token = req.body.access_token || req.query.access_token || req.headers['x-access-token'] || req.params.access_token;
    var id = req.body.id || req.query.id || req.params.id;
    if (!req.body.id || req.body.coin) {
        return res.sendStatus(300);
    }
    APP.authenticateWithToken(id, access_token, function(auth) {
        if (auth) {
            delete req.body.access_token;
            // Nếu có thông tin ở bảng khác
            var informations = {};
            if (req.body.carrier || req.body.city || req.body.country || req.body.country_code ||
                req.body.bundle_id || req.body.device_type || req.body.device_token ||
                req.body.device_id || req.body.device_name || req.body.wifi_name ||
                req.body.ip_address || req.body.ips) {
                if (req.body.carrier) {
                    informations.carrier = req.body.carrier;
                    delete req.body.carrier;
                }
                if (req.body.city) {
                    informations.city = req.body.city;
                    delete req.body.city;
                }
                if (req.body.country) {
                    informations.country = req.body.country;
                    delete req.body.country;
                }
                if (req.body.country_code) {
                    informations.country_code = req.body.country_code;
                    delete req.body.country_code;
                }
                if (req.body.bundle_id) {
                    informations.bundle_id = req.body.bundle_id;
                    delete req.body.bundle_id;
                }
                if (req.body.device_type) {
                    informations.device_type = req.body.device_type;
                    delete req.body.device_type;
                }
                if (req.body.device_token) {
                    informations.device_token = req.body.device_token;
                    delete req.body.device_token;
                }
                if (req.body.device_id) {
                    informations.device_id = req.body.device_id;
                    delete req.body.device_id;
                }
                if (req.body.device_name) {
                    informations.device_name = req.body.device_name;
                    delete req.body.device_name;
                }
                if (req.body.wifi_name) {
                    informations.wifi_name = req.body.wifi_name;
                    delete req.body.wifi_name;
                }
                if (req.body.ip_address) {
                    informations.ip_address = req.body.ip_address;
                    delete req.body.ip_address;
                }
                if (req.body.ips) {
                    informations.ips = req.body.ips;
                    delete req.body.ips;
                }
            }
            APP.getObjectWithSQL("SELECT * FROM `users` WHERE `id`=" + id, function(user) {
                if (user) {
                    var sql = escapeSQL.format("UPDATE `users` SET ? WHERE `id` = ?", [req.body, id]);
                    APP.updateWithSQL(sql, function(status) {
                        if (status) {
                            if (APP.size(informations) > 0) {
                                var sql2 = escapeSQL.format("UPDATE `informations` SET ? WHERE `users_id` = ?", [informations, id]);
                                APP.updateWithSQL(sql2, function(status2) {
                                    if (status2) {
                                        return res.send(echo(200, "Update successfully."));
                                    } else {
                                        return res.send(echo(404, "Update failed."));
                                    }
                                });
                            } else {
                                return res.send(echo(200, "Update successfully."));
                            }
                        } else {
                            return res.send(echo(404, "Update failed."));
                        }
                    });
                } else {
                    return res.send(echo(404, "This user not exists."));
                }
            });
        } else {
            return res.send(echo(400, "Authenticate failed."));
        }
    });
});

router.get('/:id/type=conversations', parser, function(req, res) {
    var access_token = req.body.access_token || req.query.access_token || req.headers['x-access-token'] || req.params.access_token;
    var id = req.body.id || req.query.id || req.params.id;
    var page = req.body.page || req.query.page || req.params.page;
    var per_page = req.body.per_page || req.query.per_page || req.params.per_page;
    APP.authenticateWithToken(id, access_token, function(auth) {
        if (auth) {
            var userSQL = "SELECT * FROM conversations INNER JOIN (SELECT `users_id`,`conversations_id` FROM members) as members ON members.conversations_id = conversations.id AND members.users_id = " + id + " ORDER BY `last_action_time` DESC LIMIT " + parseInt(per_page, 10) + " OFFSET " + parseInt(page, 10) * parseInt(per_page, 10) + "";
            APP.getObjectWithSQL(userSQL, function(data){
                if (data) {
                    async.forEachOf(data, function(element, i, callback){
                        var sql = "SELECT "+APP.informationUser()+" FROM `users` WHERE `id` IN (SELECT `users_id` FROM `members` WHERE `conversations_id`=" + element.id + ")";
                        APP.getObjectWithSQL(sql, function(member){
                            data[i].members = member;
                            if (i == data.length-1) {
                                return res.send(echo(200, data));
                            }
                        });
                    });
                } else {
                    return res.send(echo(404, "No have any conversation."));
                }
            });
        } else {
            return res.send(echo(400, "Authenticate failed."));
        }
    });
});


// APP.authenticateWithToken(id, access_token, function(auth) {
//     if (auth) {

//     } else {

//     }
// });

function echo(status, data) {
    return JSON.stringify({
        status: status,
        message: data,
        time: new Date().getTime()
    });
}
module.exports = router;