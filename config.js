var config = {
	"server_ip": "10.146.0.2", // tạo một biến lưu IP của Server
	"server_port": "8080", // port là 8080
	"mysql_ip":"127.0.0.1", // địa chỉ kết nối tới MySQL
	"mysql_username":"root", // tên đăng nhập MySQL
	"mysql_password":"@!SCS@!", // mật khẩu kết nối tới MySQL
	"mysql_database":"chat_strangers", // chọn database của MySQL
}
module.exports = config; // dòng này là kết nối đối tượng config tới Server NodeJS