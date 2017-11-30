// KHỞI TẠO SERVER NODEJS
var express = require('express');
var app = require('express')();
var server = require('http').Server(app);
// KHỞI TẠO SOCKET.IO
var io = require('socket.io')(server);
app.io = io;

io.attach(server, {
    pingInterval: 10000,
    pingTimeout: 5000,
    cookie: false
});


// THÊM FILE CẤU HÌNH
var config = require('./config.js');
var bodyParser = require('body-parser');
app.use(bodyParser.json({ limit: "50mb" }));
// APP MANAGER FILE
var manager = require("./app.js");
var APP = new manager();
var _ = APP._();
var client = APP.client();
var async = APP.async();
var escapeSQL = APP.escapeSQL();
var users = [];

// MỞ KẾT NỐI CHO SERVER
server.listen(config.server_port, config.server_ip, function() {
    console.log("SERVER RUNNING @ http://" + config.server_ip + ":" + config.server_port);
});
server.timeout = 60000;



io.on('connection', function(socket) {
    console.log(socket.id)
    // --------------------------
    // VERIFY WHEN CONNECT SOCKET
    // --------------------------
    var verify = false;
    setTimeout(function() {
        if (verify == false) {
            if (io.sockets.connected[socket.id]) {
                io.sockets.connected[socket.id].disconnect();
            }
        }
    }, 5000);
    // --------------------------
    // STATUS WHEN CONNECT SOCKET
    // --------------------------
    socket.on('online', function(user) {
        if (typeof user == 'object' && user.access_token && user.id) {
            verify = true;
            user.socket_id = socket.id;
            users.push(user);
            users = _.uniqBy(users, 'id');
            users = _.uniqBy(users, 'socket_id');
            // UPDATE STATUS ONINE
            APP.updateWithSQL("UPDATE `users` SET `status`='online' WHERE `id`=" + user.id, function(status) {
                client.query("UPDATE `informations` SET `socket_id`='" + user.socket_id + "' WHERE `users_id`=" + user.id);
                console.log("USER ONLINE ID: " + user.id + " -- " + socket.id);
                // SET RECEIVED MESSAGE
                var sqlReceived = "UPDATE `message_status` SET `status`=2 WHERE `status`=1 AND `users_id`=" + user.id;
                client.query(sqlReceived);
            });
        } else {
            if (io.sockets.connected[socket.id]) {
                io.sockets.connected[socket.id].disconnect();
            }
        }
    });
    // --------------------------
    // STATUS MESSAGE
    // --------------------------
    socket.on('seen', function(chat) {
        if (typeof chat == 'object' && chat.conversations_id && chat.id) {
            var sqlMess = "SELECT * FROM `message_status` WHERE `conversations_id`=" + chat.conversations_id + " AND `users_id`=" + chat.id;
            APP.getObjectWithSQL(sqlMess, function(statusMessage) {
                if (statusMessage) {
                    var sql = "UPDATE `message_status` SET `status`=3 WHERE `conversations_id`=" + chat.conversations_id + " AND `users_id`=" + chat.id + "";
                    client.query(sql);
                    var sqlSend = "SELECT * FROM `informations` WHERE `users_id` IN (SELECT `users_id` FROM `message_status` WHERE `conversations_id`=" + chat.conversations_id + ") AND `users_id`!=" + chat.id;
                    APP.getObjectWithSQL(sqlSend, function(receiver) {
                        if (receiver) {
                            async.forEachOf(receiver, function(e, i, c) {
                                socket.broadcast.to(receiver[i].socket_id).emit('seen', chat);
                            });
                        }
                    });
                }
            });
        }
    });
    // --------------------------
    // TYPING MESSAGE
    // --------------------------
    socket.on('typing', function(chat) {
        if (typeof chat == 'object' && chat.conversations_id && chat.id) {
            var sqlSend = "SELECT * FROM `informations` WHERE `users_id` IN (SELECT `users_id` FROM `message_status` WHERE `conversations_id`=" + chat.conversations_id + ") AND `users_id`!=" + chat.id;
            APP.getObjectWithSQL(sqlSend, function(receiver) {
                if (receiver) {
                    async.forEachOf(receiver, function(e, i, c) {
                        socket.broadcast.to(receiver[i].socket_id).emit('typing', chat);
                    });
                }
            });
        }
    });
    // --------------------------
    // SOCKET CHAT SEARCHING
    // --------------------------
    socket.on('searchings', function(user) {
        console.log(user);
        // client emit len {id: "1"}
        if (user.id) {
            // GET USER RETURN CONVERSATIONS
            client.query("DELETE FROM `searchings` WHERE `users_id`=" + user.id);
            client.query("INSERT INTO `searchings` SET `users_id`=" + user.id);
            if (user.min_age && user.max_age && user.min_distance && user.max_distance && user.gender && user.latitude && user.longitude) {
                var sqlLocation;
                if (user.gender == 0) {
                    sqlLocation = "SELECT *,ROUND(111.045* DEGREES(ACOS(COS(RADIANS(your_latitude)) * COS(RADIANS(latitude)) * COS(RADIANS(your_longitude) - RADIANS(longitude)) + SIN(RADIANS(your_latitude)) * SIN(RADIANS(latitude)))),2) AS distance FROM users JOIN (SELECT " + parseFloat(user.latitude) + " AS your_latitude, " + parseFloat(user.longitude) + " AS your_longitude ) AS p ON 1=1 WHERE ROUND(111.045* DEGREES(ACOS(COS(RADIANS(your_latitude)) * COS(RADIANS(latitude)) * COS(RADIANS(your_longitude) - RADIANS(longitude)) + SIN(RADIANS(your_latitude)) * SIN(RADIANS(latitude)))),2) > " + parseInt(user.min_distance) + " AND ROUND(111.045* DEGREES(ACOS(COS(RADIANS(your_latitude)) * COS(RADIANS(latitude)) * COS(RADIANS(your_longitude) - RADIANS(longitude)) + SIN(RADIANS(your_latitude)) * SIN(RADIANS(latitude)))),2) < " + parseInt(user.max_distance) + " AND `id`!=" + user.id + " ORDER BY RAND()";
                } else {
                    sqlLocation = "SELECT *,ROUND(111.045* DEGREES(ACOS(COS(RADIANS(your_latitude)) * COS(RADIANS(latitude)) * COS(RADIANS(your_longitude) - RADIANS(longitude)) + SIN(RADIANS(your_latitude)) * SIN(RADIANS(latitude)))),2) AS distance FROM users JOIN (SELECT " + parseFloat(user.latitude) + " AS your_latitude, " + parseFloat(user.longitude) + " AS your_longitude ) AS p ON 1=1 WHERE ROUND(111.045* DEGREES(ACOS(COS(RADIANS(your_latitude)) * COS(RADIANS(latitude)) * COS(RADIANS(your_longitude) - RADIANS(longitude)) + SIN(RADIANS(your_latitude)) * SIN(RADIANS(latitude)))),2) > " + parseInt(user.min_distance) + " AND ROUND(111.045* DEGREES(ACOS(COS(RADIANS(your_latitude)) * COS(RADIANS(latitude)) * COS(RADIANS(your_longitude) - RADIANS(longitude)) + SIN(RADIANS(your_latitude)) * SIN(RADIANS(latitude)))),2) < " + parseInt(user.max_distance) + " AND `id`!=" + user.id + " AND `gender`="+parseInt(user.gender)+" ORDER BY RAND()";
                }
                console.log(sqlLocation);
                APP.getObjectWithSQL(sqlLocation, function(list_users) {
                    if (list_users) {
                        var arrayUser = [];
                        async.forEachOf(list_users, function(ele, j, call) {
                            var birthyear;
                            var birthday = new Date(ele.birthday);
                            birthyear = birthday.getFullYear();
                            var now = (new Date()).getFullYear();
                            var age = now - birthyear;
                            if (!isNaN(birthyear)) {
                                if (age >= user.min_age && age <= user.max_age) {
                                    arrayUser.push(ele);
                                }
                            }
                            if (j == list_users.length - 1) {
                                if (arrayUser.length > 0) {
                                    var random = getRandomInt(0, arrayUser.length);
                                    // CREATE CONVERSATION
                                    var created_at = new Date().getTime();
                                    var conversation = {};
                                    var userSQL = "SELECT * FROM conversations INNER JOIN (SELECT `users_id`,`conversations_id` FROM members) as members ON members.conversations_id = conversations.id AND members.users_id = " + user.id + " ORDER BY `last_action_time`";
                                    APP.getObjectWithSQL(userSQL, function(conversation_list) {
                                        var name = "";
                                        if (conversation_list) {
                                            name = "Stranger " + conversation_list.length;
                                        } else {
                                            name = "Stranger 0";
                                        }
                                        APP.insertWithSQL("INSERT INTO `conversations` SET `name`='" + name + "', `created_at`=" + created_at + ", `last_message`='Created', `last_action_time`=" + created_at + ", `last_id_update`=" + user.id + ", `created_by`=" + user.id, function(stt) {
                                            if (stt) {
                                                conversation.id = stt.id;
                                                conversation.last_message = "Created";
                                                conversation.is_new = 1;
                                                conversation.created_at = created_at;
                                                conversation.last_action_time = created_at;
                                                conversation.created_by = user.id;
                                                conversation.last_id_update = user.id;
                                                conversation.name = name;
                                                conversation.is_read = 1;
                                                var members = [];
                                                var membersData = [];
                                                members.push(user.id);
                                                members.push(arrayUser[random].id);
                                                async.forEachOf(members, function(ele, i, call) {
                                                    client.query("INSERT INTO `members` SET `users_id`=" + ele + ", `conversations_id`=" + stt.id);
                                                    client.query("DELETE FROM `searchings` WHERE `users_id`=" + ele);
                                                    APP.getObjectWithSQL("SELECT " + APP.informationUser() + " FROM `users` WHERE `id`=" + ele, function(memberInConversation) {
                                                        membersData.push(memberInConversation[0]);
                                                        if (i == members.length - 1) {
                                                            conversation.members = membersData;
                                                            // SEND TO USER
                                                            socket.emit('searchings', conversation);
                                                            async.forEachOf(members, function(id_send, j, call) {
                                                                var sqlSend = "SELECT * FROM `informations` WHERE `users_id`=" + id_send;
                                                                APP.getObjectWithSQL(sqlSend, function(receiver) {
                                                                    if (receiver) {
                                                                        socket.broadcast.to(receiver[0].socket_id).emit('searchings', conversation);
                                                                    }
                                                                });
                                                            });
                                                            // END SEND
                                                        }
                                                    });
                                                });
                                            }
                                        });
                                    });
                                } else {
                                    // SEND TO USER
                                    setTimeout(function() {
                                        client.query("DELETE FROM `searchings` WHERE `users_id`=" + user.id);
                                        socket.emit('searchings', 0);
                                    }, 4000);
                                }
                            }
                        });
                    } else {
                        // SEND TO USER
                        setTimeout(function() {
                            client.query("DELETE FROM `searchings` WHERE `users_id`=" + user.id);
                            socket.emit('searchings', 0);
                        }, 4000);
                    }
                });
            } else {
                var sqlFilter = "SELECT * FROM `searchings` WHERE `users_id`!=" + user.id + " ORDER BY RAND() LIMIT 1";
                APP.getObjectWithSQL(sqlFilter, function(data) {
                    if (data) {
                        // CREATE CONVERSATION
                        var created_at = new Date().getTime();
                        var conversation = {};
                        var userSQL = "SELECT * FROM conversations INNER JOIN (SELECT `users_id`,`conversations_id` FROM members) as members ON members.conversations_id = conversations.id AND members.users_id = " + user.id + " ORDER BY `last_action_time`";
                        APP.getObjectWithSQL(userSQL, function(conversation_list) {
                            var name = "";
                            if (conversation_list) {
                                name = "Stranger " + conversation_list.length;
                            } else {
                                name = "Stranger 0";
                            }
                            APP.insertWithSQL("INSERT INTO `conversations` SET `name`='" + name + "', `created_at`=" + created_at + ", `last_message`='Created', `last_action_time`=" + created_at + ", `last_id_update`=" + user.id + ", `created_by`=" + user.id, function(stt) {
                                if (stt) {
                                    conversation.id = stt.id;
                                    conversation.last_message = "Created";
                                    conversation.is_new = 1;
                                    conversation.created_at = created_at;
                                    conversation.last_action_time = created_at;
                                    conversation.created_by = user.id;
                                    conversation.last_id_update = user.id;
                                    conversation.name = name;
                                    conversation.is_read = 1;
                                    var members = [];
                                    var membersData = [];
                                    members.push(user.id);
                                    members.push(data[0].users_id);
                                    async.forEachOf(members, function(ele, i, call) {
                                        client.query("INSERT INTO `members` SET `users_id`=" + ele + ", `conversations_id`=" + stt.id);
                                        client.query("DELETE FROM `searchings` WHERE `users_id`=" + ele);
                                        APP.getObjectWithSQL("SELECT " + APP.informationUser() + " FROM `users` WHERE `id`=" + ele, function(memberInConversation) {
                                            membersData.push(memberInConversation[0]);
                                            if (i == members.length - 1) {
                                                conversation.members = membersData;
                                                // SEND TO USER
                                                socket.emit('searchings', conversation);
                                                async.forEachOf(members, function(id_send, j, call) {
                                                    var sqlSend = "SELECT * FROM `informations` WHERE `users_id`=" + id_send;
                                                    APP.getObjectWithSQL(sqlSend, function(receiver) {
                                                        if (receiver) {
                                                            socket.broadcast.to(receiver[0].socket_id).emit('searchings', conversation);
                                                        }
                                                    });
                                                });
                                                // END SEND
                                            }
                                        });
                                    });
                                }
                            });
                        });
                    } else {
                        // SEND TO USER
                        setTimeout(function() {
                            client.query("DELETE FROM `searchings` WHERE `users_id`=" + user.id);
                            socket.emit('searchings', 0);
                        }, 4000);
                    }
                });
            }
        }
    });
    // --------------------------
    // SOCKET CHAT CONTENT
    // --------------------------
    socket.on('new_message', function(message) {
        if (typeof message == 'object' && message.sender_id && message.content && message.conversations_id) {
            var currentTime = new Date().getTime()
            var obInsert = {
                content: message.content,
                time: currentTime,
                type: message.type,
                conversations_id: message.conversations_id,
                users_id: message.sender_id
            }
            var sqlInsert = escapeSQL.format("INSERT INTO `messages` SET ?", obInsert);
            APP.insertWithSQL(sqlInsert, function(m) {
                message.id = m.id;
                message.time = currentTime;
                async.forEachOf(message.members, function(element, i, callback) {
                    APP.getObjectWithSQL("SELECT * FROM `informations` WHERE `users_id`=" + element.id, function(receiver) {
                        if (receiver) {
                            socket.broadcast.to(receiver[0].socket_id).emit('new_message', message);
                            // INSERT MESSAGE STATUS
                            if (element.id != message.sender_id) {
                                APP.getObjectWithSQL("SELECT * FROM `users` WHERE `status`='online' AND `id`=" + element.id, function(check) {
                                    if (check) {
                                        client.query("INSERT INTO `message_status` SET `status`=2, `messages_id`=" + m.id + ", `conversations_id`=" + message.conversations_id + ", `users_id`=" + element.id);
                                        var messageToMe = message;
                                        messageToMe.status = 2;
                                        socket.emit('new_message', messageToMe);
                                    } else {
                                        client.query("INSERT INTO `message_status` SET `status`=1, `messages_id`=" + m.id + ", `conversations_id`=" + message.conversations_id + ", `users_id`=" + element.id);
                                        var messageToMe = message;
                                        messageToMe.status = 1;
                                        socket.emit('new_message', messageToMe);
                                    }
                                });
                            } else {
                                client.query("INSERT INTO `message_status` SET `status`=3, `messages_id`=" + m.id + ", `conversations_id`=" + message.conversations_id + ", `users_id`=" + element.id);
                            }
                        }
                    });
                });
                // UPDATE CONVERSATION
                client.query("UPDATE `conversations` SET `last_message`='" + message.content + "', `last_action_time`=" + currentTime + ", `last_id_update`=" + message.sender_id + " WHERE `id`=" + message.conversations_id);
                //console.log(message);
            });
        }
    });

    // --------------------------
    // SOCKET CHAT OUT
    // --------------------------
    socket.on('out', function(message) {
        if (typeof message == 'object' && message.conversations_id && message.members) {
            var clienSQL = "UPDATE `conversations` SET `is_new`=0 WHERE `id`=" + message.conversations_id;
            client.query(clienSQL);
            async.forEachOf(message.members, function(element, i, callback) {
                APP.getObjectWithSQL("SELECT * FROM `informations` WHERE `users_id`=" + element.id, function(receiver) {
                    if (receiver) {
                        socket.broadcast.to(receiver[0].socket_id).emit('out', message);
                        socket.emit('out', message);
                    }
                });
            });
        }
    });


    // --------------------------
    // STATUS DISCONNECT SOCKET
    // --------------------------
    socket.on('disconnect', function(data) {
        var tmp = [];
        async.forEachOf(users, function(element, i, callback) {
            if (element.socket_id == socket.id) {
                // UPDATE STATUS OFFLINE
                var currentTime = new Date().getTime();
                APP.updateWithSQL("UPDATE `users` SET `status`='offline', `last_active`=" + currentTime + " WHERE `id`=" + element.id, function(status) {
                    client.query("UPDATE `informations` SET `socket_id`='null' WHERE `users_id`=" + element.id);
                    console.log("USER OFFLINE ID: " + element.id);
                });
            } else {
                tmp.push(element);
            }
            if (i == users.length - 1) {
                users = tmp;
                console.log("----------------------- " + users.length + " PEOPLES ONLINE -----------------------");
            }
        });
    });
    // --------------------------
    // PORT ERROR SOCKET
    // --------------------------
    socket.on('error', function(error) {
        console.log(error);
    });
});







function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}







app.get('/', function(req, res) {
    res.sendFile(__dirname + '/index.html');
});
app.use(function(req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
});
app.use(require('./controllers'));