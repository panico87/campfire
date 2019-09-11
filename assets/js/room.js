import socket from "./socket"
import videojs from "video.js"
import "videojs-youtube"
import uuid from "uuid"

let channel = socket.channel('room:' + window.roomId, {}); // connect to chat "room"

let me = uuid.v1();

channel.on('shout', function (payload) { // listen to the 'shout' event
  let li = document.createElement("li"); // create new list item DOM element
  let name = payload.username || 'guest'; // get name from payload or set default
  li.innerHTML = '<span class="text-focus-in"><b>' + name + '</b>: ' + payload.message + '</span>'; // set li contents
  ul.appendChild(li); // append to list
  ul.scrollTop = ul.scrollHeight - ul.clientHeight;
});

channel.on('addvideo', function (payload) { // listen to the 'shout' event
  let li = document.createElement("li"); // create new list item DOM element
  let name = payload.username || 'guest'; // get name from payload or set default
  li.innerHTML = '<span class="text-focus-in text-success"><b>' + 'A new video was added!' + '</b>'; // set li contents
  ul.appendChild(li); // append to list
  ul.scrollTop = ul.scrollHeight - ul.clientHeight;
});

channel.join(); // join the channel.


let ul = document.getElementById('msg-list'); // list of messages.
let name = document.getElementById('name'); // name of message sender
let msg = document.getElementById('msg'); // message input field

let btnAddVideo = document.getElementById('btnAddVideo'); // message input field
let inputAddVideo = document.getElementById('inputAddVideo'); // message input field
let vidcount = document.getElementById('vidcount'); // message input field

btnAddVideo.addEventListener('click', function (event) {
  if (inputAddVideo.length !== 0) {
    channel.push('addvideo', { // send the message to the server on "shout" channel
      url: inputAddVideo.value
    });
  }
});

// "listen" for the [Enter] keypress event to send a message:
msg.addEventListener('keypress', function (event) {
  if (event.keyCode == 13 && msg.value.length > 0) { // don't sent empty msg.
    channel.push('shout', { // send the message to the server on "shout" channel
      username: name.value || "Guest", // get value of "name" of person sending the message
      message: msg.value || "I got nothing to say!" // get message text (value) from msg input field.
    });
    msg.value = ''; // reset the message input field for next message.
  }
});

// If username is empty, generate one
if (name.value === "") {
  name.value = "Guest";
}

// Video logic
var player = videojs('video', {
  "fluid": true,
  "techOrder": ["youtube"],
  "sources": [{
    "type": "video/youtube",
    "src": "https://www.youtube.com/watch?v=nBPK_oXeJgA"
  }],
  "youtube": {
    "iv_load_policy": 3,
    "modestbranding": 1,
    "origin": "*"
  }
})
player.ready(() => {
  var playerElem = document.getElementById('video')
  var ignoreNext = false

  var pauseCallback = () => {
    if (!ignoreNext)
      channel.push('vid-pause', {
        originator: me
      });

    ignoreNext = false
  }

  var playCallback = () => {
    if (!ignoreNext)
      channel.push('vid-play', {
        originator: me,
        timestamp: player.currentTime()
      });

    ignoreNext = false
  }

  player.on("pause", pauseCallback);

  channel.on('vid-pause', function (payload) {
    if (payload.originator !== me) {
      ignoreNext = true;
      player.pause();
    }
  });

  channel.on('vid-play', function (payload) {
    if (payload.originator !== me) {
      ignoreNext = true;
      player.currentTime(payload.timestamp);
      player.play();
    }
  });

  channel.on('sync-request', function (payload) {
    if (payload.requestor !== me) {
      channel.push('sync-response', {
        isPlaying: !player.paused(),
        timestamp: player.currentTime(),
        requestor: payload.requestor
      })
    }
  });

  channel.on('sync-response', function (payload) {
    if (payload.requestor === me) {
      player.currentTime(payload.timestamp)
      if (player.paused() && payload.isPlaying) {
        ignoreNext = true
        player.play()
      } else if (!player.paused() && !payload.isPlaying) {
        ignoreNext = true
        player.pause()
      }
    }
  });

  player.one("play", () => {
    channel.push('sync-request', {
      requestor: me
    })
    player.on("play", playCallback);
  })
})