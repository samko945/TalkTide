const path = require("path");
const http = require("http");
const express = require("express");
const socketio = require("socket.io");
const Filter = require("bad-words");
const { generateMessage, generateLocationMessage } = require("./utils/messages");

const app = express();
const server = http.createServer(app);
const io = socketio(server);

const port = process.env.PORT || 3000;
const publicDirPath = path.join(__dirname, "../public");

app.use(express.static(publicDirPath));

io.on("connection", (socket) => {
	console.log("New web socket connection");

	// sent to the client that connected
	socket.emit("message", generateMessage("Welcome!"));
	// sent to every client except the one that connected
	socket.broadcast.emit("message", generateMessage("A new user has joined!"));

	socket.on("sendMessage", (message, callback) => {
		const filter = new Filter();
		if (filter.isProfane(message)) {
			return callback("Profanity is not allowed!");
		}
		io.emit("message", generateMessage(message));
		//       cbMessage
		callback();
	});

	socket.on("sendLocation", (coords, callback) => {
		io.emit(
			"locationMessage",
			generateLocationMessage(`https://www.google.com/maps/@${coords.latitude},${coords.longitude}`)
		);
		callback();
	});

	socket.on("disconnect", () => {
		io.emit("message", generateMessage("A user has left."));
	});
});

server.listen(port, () => {
	console.log(`Server running on port ${port}`);
});
