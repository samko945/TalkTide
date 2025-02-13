/* 
- the io function is called from the socket.io.js library via the html script tag
    when this script is loaded into the browser, it provides the io function globally by attaching it to the global scope (typically the window object)
- connect to the Socket.IO server, by default it is the server from which the script was served, typically the same server hosting your web app
- returns a Socket object which represents the client's connection to the server and allows the client to interact with the server using the Socket.IO protocol
    it provides methods for sending and receiving messages (events) between the client and the server
*/
const socket = io();

// elements
const $messageForm = document.querySelector("#message-form");
const $messageFormInput = $messageForm.querySelector("input");
const $messageFormButton = $messageForm.querySelector("button");
const $sendLocationButton = document.querySelector("#send-location");
const $messages = document.querySelector("#messages");

// templates
const messageTemplate = document.querySelector("#message-template").innerHTML;
const locationMessageTemplate = document.querySelector("#location-message-template").innerHTML;
const sidebarTemplate = document.querySelector("#sidebar-template").innerHTML;

// options
//                          remove the ? prefix
const { username, room } = Qs.parse(location.search, { ignoreQueryPrefix: true });

const autoScroll = () => {
	// new message elements
	const $newMessage = $messages.lastElementChild;
	// height of the new message
	const newMessageStyles = getComputedStyle($newMessage);
	const newMessageMargin = parseInt(newMessageStyles.marginBottom);
	const newMessageHeight = $newMessage.offsetHeight + newMessageMargin;
	// visible height
	const visibleHeight = $messages.offsetHeight;
	// height of messages container
	const containerHeight = $messages.scrollHeight;
	// Scrolled Distance
	const scrollOffset = $messages.scrollTop + visibleHeight;

	if (containerHeight - newMessageHeight <= scrollOffset) {
		// scroll to bottom
		$messages.scrollTop = $messages.scrollHeight;
	}
};

$messageForm.addEventListener("submit", (e) => {
	e.preventDefault();
	// disable button on submit
	$messageFormButton.setAttribute("disabled", "disabled");

	const message = e.target.elements.message.value;
	// emit( arg1=eventName,  [...args]=data,  cb=ran when acknoledged from other end )
	socket.emit("sendMessage", message, (error) => {
		// enable button on acknowledgement
		$messageFormButton.removeAttribute("disabled");
		$messageFormInput.value = "";
		$messageFormInput.focus();
		if (error) {
			return console.log(error);
		}
		console.log("Message delivered!");
	});
});

socket.on("message", (message) => {
	console.log(message);
	const html = Mustache.render(messageTemplate, {
		username: message.username,
		message: message.text,
		createdAt: moment(message.createdAt).format("h:mm a"),
	});
	$messages.insertAdjacentHTML("beforeend", html);
	autoScroll();
});

socket.on("locationMessage", (data) => {
	//                           template, data
	const html = Mustache.render(locationMessageTemplate, {
		username: data.username,
		url: data.url,
		createdAt: moment(data.createdAt).format("h:mm a"),
	});
	$messages.insertAdjacentHTML("beforeend", html);
	autoScroll();
});

socket.on("roomData", ({ room, users }) => {
	const html = Mustache.render(sidebarTemplate, {
		room,
		users,
	});
	document.querySelector("#sidebar").innerHTML = html;
});

$sendLocationButton.addEventListener("click", () => {
	// disbale button on click
	$sendLocationButton.setAttribute("disabled", "disabled");
	if (!navigator.geolocation) {
		return alert("Geolocation is not supported by your browser.");
	}

	navigator.geolocation.getCurrentPosition((position) => {
		const coords = {
			latitude: position.coords.latitude,
			longitude: position.coords.longitude,
		};
		socket.emit("sendLocation", coords, () => {
			// enable button on acknowledgement
			$sendLocationButton.removeAttribute("disabled");
			console.log("Location shared!");
		});
	});
});

socket.emit("join", { username, room }, (error) => {
	if (error) {
		alert(error);
		// redirect
		location.href = "/";
	}
});
