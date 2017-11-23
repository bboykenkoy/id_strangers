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
            });
        } else {
            if (io.sockets.connected[socket.id]) {
                io.sockets.connected[socket.id].disconnect();
            }
        }
    });
    // --------------------------
    // SOCKET CHAT SEARCHING
    // --------------------------
    socket.on('searchings', function(user) {
        console.log(user);
        // client emit len {id: "1"}
        if (user.id) {
            APP.getObjectWithSQL("SELECT * FROM `searchings` WHERE `users_id`=" + user.id, function(object) {
                if (object) {
                    // GET USER RETURN CONVERSATIONS
                    APP.getObjectWithSQL("SELECT * FROM `searchings` WHERE `users_id`!=" + user.id + " LIMIT 1", function(data) {
                        if (data) {
                            // CREATE CONVERSATION
                            var created_at = new Date().getTime();
                            var conversation = {};
                            var userSQL = "SELECT * FROM conversations INNER JOIN (SELECT `users_id`,`conversations_id` FROM members) as members ON members.conversations_id = conversations.id AND members.users_id = " + user.id;
                            APP.getObjectWithSQL(userSQL, function(conversation_list) {
                                var numberConversation = 0;
                                if (conversation_list) {
                                    numberConversation = conversation_list.length;
                                }
                                APP.insertWithSQL("INSERT INTO `conversations` SET `name`='Stranger', `created_at`=" + created_at + ", `last_message`='Created', `last_action_time`=" + created_at + ", `last_id_update`=" + user.id + ", `created_by`=" + user.id, function(stt) {
                                    if (stt) {
                                        conversation.conversations_id = stt.id;
                                        conversation.name = "Stranger " + numberConversation;
                                        conversation.last_message = "Created";
                                        conversation.is_new = 1;
                                        conversation.created_at = created_at;
                                        conversation.last_action_time = created_at;
                                        conversation.created_by = user.id;
                                        var members = [];
                                        members.push(user.id);
                                        members.push(data[0].users_id);
                                        conversation.members = members;
                                        async.forEachOf(members, function(ele, i, call) {
                                            client.query("INSERT INTO `members` SET `users_id`=" + ele + ", `conversations_id`=" + stt.id);
                                            client.query("DELETE FROM `searchings` WHERE `users_id`=" + ele);
                                            if (i == members.length - 1) {
                                                // SEND TO USER
                                                socket.emit('searchings', conversation);
                                            }
                                        });
                                    }
                                });
                            });
                        } else {
                            // SEND TO USER
                            client.query("DELETE FROM `searchings` WHERE `users_id`=" + user.id);
                            socket.emit('searchings', 0);
                        }
                    });
                } else {
                    client.query("INSERT INTO `searchings` SET `users_id`=" + user.id);
                    // GET USER RETURN CONVERSATIONS
                    APP.getObjectWithSQL("SELECT * FROM `searchings` WHERE `users_id`!=" + user.id + " AND `is_avaliable`=1 LIMIT 1", function(data) {
                        if (data) {
                            // CREATE CONVERSATION
                            var created_at = new Date().getTime();
                            var conversation = {};
                            APP.insertWithSQL("INSERT INTO `conversations` SET `name`='Stranger', `created_at`=" + created_at + ", `last_message`='Created', `last_action_time`=" + created_at + ", `last_id_update`=" + user.id + ", `created_by`=" + user.id, function(stt) {
                                if (stt) {
                                    conversation.conversations_id = stt.id;
                                    conversation.name = "Stranger";
                                    conversation.last_message = "Created";
                                    conversation.is_new = 1;
                                    conversation.created_at = created_at;
                                    conversation.last_action_time = created_at;
                                    conversation.created_by = user.id;
                                    var members = [];
                                    members.push(user.id);
                                    members.push(data[0].users_id);
                                    conversation.members = members;
                                    async.forEachOf(members, function(ele, i, call) {
                                        client.query("INSERT INTO `members` SET `users_id`=" + ele + ", `conversations_id`=" + stt.id);
                                        var sql = "DELETE FROM `searchings` WHERE `users_id`=" + ele;
                                        client.query(sql);
                                        if (i == members.length - 1) {
                                            // SEND TO USER
                                            socket.emit('searchings', conversation);
                                        }
                                    });
                                }
                            });
                        } else {
                            // SEND TO USER
                            socket.emit('searchings', 0);
                        }
                    });
                }
            });
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
                    // INSERT MESSAGE STATUS
                    if (element.id == message.sender_id) {
                        client.query("INSERT INTO `message_status` SET `status`=1, `messages_id`="+m.id+", `users_id`="+element.id);
                    } else {
                        client.query("INSERT INTO `message_status` SET `status`=0, `messages_id`="+m.id+", `users_id`="+element.id);
                    }
                    APP.getObjectWithSQL("SELECT * FROM `informations` WHERE `users_id`=" + element.id, function(receiver) {
                        if (receiver) {
                            socket.broadcast.to(receiver[0].socket_id).emit('new_message', message);
                        }
                    });
                });
                var messageToMe = message;
                messageToMe.status = 1;
                socket.emit('new_message', messageToMe);
                console.log(message);
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