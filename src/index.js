const path = require("path");
const http = require("http");
const express = require("express");
const socketio = require("socket.io");
const Filter = require("bad-words");
const { generateMessage, generateLocationMessage } = require("./utils/messages");
const { users, addUser, removeUser, getUser, getUsersInRoom, getRoomsAndUsers } = require("./utils/users");

const app = express();
const server = http.createServer(app);
const io = socketio(server, { addTrailingSlash: false });

const port = process.env.PORT || 3000;
const publicDirPath = path.join(__dirname, "../public");

app.use(express.static(publicDirPath));

app.get("/rooms", (req, res) => {
	const rooms = getRoomsAndUsers();
	res.send(rooms);
});

io.on("connection", (socket) => {
	console.log("New web socket connection");
	socket.emit("updateRooms", getRoomsAndUsers());

	socket.on("join", ({ username, room }, callback) => {
		const { error, user } = addUser({ id: socket.id, username, room });
		if (error) {
			return callback(error);
		}
		socket.join(user.room);

		// sent to the client that connected
		socket.emit("message", generateMessage(user.room, "Welcome!"));
		// sent to every client except the one that connected
		socket.broadcast.to(user.room).emit("message", generateMessage(user.room, `${user.username} has joined!`));
		io.to(user.room).emit("roomData", {
			room: user.room,
			users: getUsersInRoom(user.room),
		});

		io.emit("updateRooms", getRoomsAndUsers());
		callback();
	});

	socket.on("sendMessage", (message, callback) => {
		const user = getUser(socket.id);
		const filter = new Filter();
		if (filter.isProfane(message)) {
			return callback("Profanity is not allowed!");
		}
		io.to(user.room).emit("message", generateMessage(user.username, message));
		//       cbMessage
		callback();
	});

	socket.on("sendLocation", (coords, callback) => {
		const user = getUser(socket.id);
		io.to(user.room).emit(
			"locationMessage",
			generateLocationMessage(
				user.username,
				`https://www.google.com/maps/@${coords.latitude},${coords.longitude}`
			)
		);
		callback();
	});

	socket.on("disconnect", () => {
		const user = removeUser(socket.id);
		if (user) {
			io.to(user.room).emit("message", generateMessage(user.room, `${user.username} has left.`));
			io.to(user.room).emit("roomData", {
				room: user.room,
				users: getUsersInRoom(user.room),
			});
			io.emit("updateRooms", getRoomsAndUsers());
		}
	});
});

server.listen(port, () => {
	console.log(`Server running on port ${port}`);
});
