var config = require('./config.js');
// FILE REQUIRED
var async = require('async');
var _ = require('lodash');
var mysql = require('mysql');
var escapeSQL = require('sqlstring');
var bodyParser = require('body-parser');
var parser = bodyParser.urlencoded({ limit: "50mb", extended: true, parameterLimit: 50000 });
var request = require('request');

let key = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];

var aesjs = require('aes-js');
// INIT VARIABLE MYSQL
var client = mysql.createConnection({
    host: config.mysql_ip,
    user: config.mysql_username,
    password: config.mysql_password,
    database: config.mysql_database
});
client.connect(function(err) {
    if (err) {
        console.error('CONNECT FAILED', err.code);
    } else {
        console.error('CONNECTED TO MYSQL');
    }
});
client.on('error', function(err) {
    if (err.fatal) {
        startConnection();
    }
});
client.query("SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci", function(error, results, fields) {
    if (error) {
        console.log(error);
    } else {
        console.log("SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci");
    }
});
client.query("SET CHARACTER SET utf8mb4", function(error, results, fields) {
    if (error) {
        console.log(error);
    } else {
        console.log("SET CHARACTER SET utf8mb4");
    }
});
// END INIT VARIABLE MYSQL

module.exports = class app {
    isExistsUser(key, value, callback) {
        var sql = "SELECT * FROM `users` WHERE `" + key + "`='" + value + "'";
        client.query(sql, function(error, data, fields) {
            if (error) {
                console.log(error);
                callback(true);
            } else {
                if (data.length) {
                    callback(true);
                } else {
                    callback(false);
                }
            }
        });
    }
    insertWithSQL(sql, callback) {
        client.query(sql, function(error, data, fields) {
            if (error) {
                console.log(error);
                callback();
            } else {
                var id = data.insertId;
                delete data.insertId;
                data.id = id;
                callback(data);
            }
        });
    }
    updateWithSQL(sql, callback) {
        client.query(sql, function(error, data, fields) {
            if (error) {
                console.log(error);
                callback();
            } else {
                callback(data);
            }
        });
    }
    getObjectWithSQL(sql, callback) {
        client.query(sql, function(error, data, fields) {
            if (error) {
                console.log(error);
                callback();
            } else {
                if (data.length > 0) {
                    callback(data);
                } else {
                    callback();
                }
            }
        });
    }
    createAccessToken(id, facebook_token, time, callback) {
        var create_time = new Date().getTime();
        var expire_time = create_time + (time * 1000);
        var users_id = id;
        var object = { id: id, create_time: create_time, expire_time: expire_time };
        var access_token = randomString(5) + encrypt(JSON.stringify(object)) + randomString(5);
        var sql = "INSERT INTO `tokens` SET `facebook_token`='" + facebook_token + "', `create_time`=" + create_time + ", `expire_time`=" + expire_time + ", `access_token`='" + access_token + "', `users_id`='" + users_id + "'";
        client.query(sql, function(error, data, fields) {
            if (error) {
                console.log(error);
                callback();
            } else {
                console.log("Created successfuly access_token for id: " + id);
                callback(access_token);
            }
        });
    }
    authenticateWithToken(id, token, callback) {
        if (typeof token == "string" && token && token.length > 6) {
            // console.log("ACCESS_TOKEN: 1.0 - id: " + id);
            var access_token = token.substring(5, token.length - 5);
            if (isDecrypt(access_token) && isJsonString(isDecrypt(access_token))) {
                try {
                    var user = JSON.parse(decrypt(access_token));
                    var currentTime = new Date().getTime();
                    if (user.expire_time && user.expire_time > currentTime) {
                        if (user.id && user.id == id) {
                            var sql = "SELECT * FROM `tokens` WHERE `access_token`='" + token + "' AND `users_id`='" + id + "'";
                            client.query(sql, function(error, data, fields) {
                                if (error) {
                                    console.log(error);
                                    callback(false);
                                } else {
                                    if (data.length > 0) {
                                        callback(true);
                                    } else {
                                        callback(false);
                                        console.log("ACCESS_TOKEN: 1.11 - id: " + id + " - TOKEN KHÔNG TỒN TẠI");
                                    }
                                }
                            });
                        } else {
                            callback(false);
                            console.log("ACCESS_TOKEN: 1.22 - id: " + id);
                        }
                    } else {
                        callback(false);
                        console.log("ACCESS_TOKEN: 1.33 - id: " + id + " - ĐÃ XÓA TOKEN HẾT HẠN");
                        client.query("DELETE FROM `tokens` WHERE `access_token`='" + token + "' AND `users_id`='" + id + "'");
                    }
                } catch (e) {
                    console.log("ACCESS_TOKEN: 1.44 - id: " + id);
                    callback(false);
                }
            } else {
                console.log("ACCESS_TOKEN: 1.55 - id: " + id);
                callback(false);
            }
        } else {
            console.log("ACCESS_TOKEN: 2.0 - id: " + id);
            callback(false);
        }
    }
    isJsonString(str) {
        try {
            JSON.parse(str);
        } catch (e) {
            return false;
        }
        return true;
    }
    size(obj) {
        var size = 0,
            key;
        for (key in obj) {
            if (obj.hasOwnProperty(key)) size++;
        }
        return size;
    }
    config() {
        return config;
    }
    client() {
        return client;
    }
    lodash() {
        return lodash;
    }
    _() {
        return _;
    }
    async() {
        return async;
    }
    parser() {
        return parser;
    }
    escapeSQL() {
        return escapeSQL;
    }
    request() {
        return request;
    }
}
// FUNCTION ACCESS_TOKEN DECODE & ENCODE
function encrypt(text) {
    var textBytes = aesjs.utils.utf8.toBytes(text);
    var aesCtr = new aesjs.ModeOfOperation.ctr(key, new aesjs.Counter(5));
    var encryptedBytes = aesCtr.encrypt(textBytes);
    var encryptedHex = aesjs.utils.hex.fromBytes(encryptedBytes);
    return encryptedHex;
}

function decrypt(encryptedHex) {
    var encryptedBytes = aesjs.utils.hex.toBytes(encryptedHex);
    var aesCtr = new aesjs.ModeOfOperation.ctr(key, new aesjs.Counter(5));
    var decryptedBytes = aesCtr.decrypt(encryptedBytes);
    var decryptedText = aesjs.utils.utf8.fromBytes(decryptedBytes);
    return decryptedText;
}

function isJsonString(str) {
    try {
        JSON.parse(str);
    } catch (e) {
        return false;
    }
    return true;
}

function isDecrypt(str) {
    try {
        decrypt(str);
    } catch (e) {
        return false;
    }
    return true;
}

function randomString(len) {
    var text = "";
    var charset = "abcdefghijklmnopqrstuvwxyz0123456789";
    for (var i = 0; i < len; i++) {
        text += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return text;
}