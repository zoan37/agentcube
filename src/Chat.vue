<script setup>
import { ref, reactive, onMounted, toRaw, watch } from 'vue'

const messageInput = ref(null)
const chatMessagesEnd = ref(null);

const roomChatMessageInput = ref(null);
const roomChatMessagesEnd = ref(null);

const state = reactive({
    messageHistory: [],
    roomChatMessageHistory: [],
    isChatting: false
})

watch(() => state.isChatting,
    (isChatting) => {
        if (isChatting) {
            setTimeout(() => {
                messageInput.value.focus();
            }, 10);
        }
    });

const messageHistory = state.messageHistory;
const roomChatMessageHistory = state.roomChatMessageHistory;

window.messageHistory = messageHistory;
window.roomChatMessageHistory = roomChatMessageHistory;

const actionHistory = [];

const scrollRequestQueue = [];
const scrollInterval = setInterval(() => {
    if (scrollRequestQueue.length > 0) {
        scrollToBottom();
        scrollRequestQueue.shift();
    }
}, 500);

function scrollToBottom() {
    chatMessagesEnd.value.scrollIntoView({
        behavior: "smooth"
    });
}

function roomChatScrollToBottom() {
    roomChatMessagesEnd.value.scrollIntoView({
        behavior: "smooth"
    });
}

function roomChatInstantScrollToBottom() {
    roomChatMessagesEnd.value.scrollIntoView({
        behavior: "instant"
    });
}

window.roomChatScrollToBottom = roomChatScrollToBottom;

function submitScrollRequest() {
    if (scrollRequestQueue.length == 0) {
        scrollRequestQueue.push(true);

        // force scroll now so don't have to wait for interval delay
        scrollToBottom();
    }
}

async function sendMessage(message) {
    messageHistory.push(message);

    messageHistory.push({
        role: "assistant",
        content: ""
    });
    const responseMessageIndex = messageHistory.length - 1;

    const actionIndex = actionHistory.length;
    actionHistory.push(null);

    const inputMessages = toRaw(messageHistory).slice(0, messageHistory.length - 1).map((message) => {
        return {
            role: message.role,
            content: message.content
        };
    });
    console.log('inputMessages:');
    console.log(inputMessages);

    try {
        const response = await window.ai.getCompletion(
            {
                messages: inputMessages
            },
            {
                onStreamResult: (res, error) => {
                    if (error) {
                        console.error(error);
                        return;
                    }

                    if (res) {
                        messageHistory[responseMessageIndex].content += res.message.content;
                        // console.log(messageHistory[responseMessageIndex]);
                        // console.log(messageHistory);

                        try {
                            var strippedResponse = stripResponse(messageHistory[responseMessageIndex].content);
                            messageHistory[responseMessageIndex].displayContent = strippedResponse;

                            submitScrollRequest();

                            var parsedResponse = parseResponse(messageHistory[responseMessageIndex].content);

                            if (actionHistory[actionIndex] == null) {
                                actionHistory[actionIndex] = {
                                    message: parsedResponse.message,
                                    state: parsedResponse.state,
                                    emote: parsedResponse.emote,
                                    expressionMap: parsedResponse.expressionMap,
                                    expressionVector: parsedResponse.expressionVector
                                };

                                console.log('parsedResponse:');
                                console.log(parsedResponse);

                                console.log('actionHistory:');
                                console.log(actionHistory);

                                let actionFunctions = window.animationInfo.actionFunctions;

                                actionFunctions.state[parsedResponse.state]();
                                if (parsedResponse.emote != "None") {
                                    actionFunctions.emote[parsedResponse.emote]();
                                }
                                actionFunctions.expression(parsedResponse.expressionVector);
                                window.setUsername(parsedResponse.username);
                                window.setAvatarColor(parsedResponse.color);

                                window.sendAnimationInfo({
                                    state: parsedResponse.state,
                                    emote: parsedResponse.emote,
                                    expression: parsedResponse.expressionVector,
                                    username: parsedResponse.username,
                                    color: parsedResponse.color
                                })
                            }
                        } catch (e) {
                            if (e == 'Footnote not found in response') {
                                // pass
                            } else {
                                console.error(e);
                                console.log('messageHistory:');
                                console.log(messageHistory);
                            }
                        }
                    }
                }
            }
        );

        return response;
    } catch (e) {
        alert("Error: " + e);
        console.error(e);

        throw e;
    }
}

/*
const response = await sendMessage({
    role: "user",
    content: inputMessage,
    displayContent: inputMessage
  });
  */

window.receiveChatMessage = (message) => {
    console.log('received message:');
    console.log(message);

    message.receivedTimestamp = Date.now();

    roomChatMessageHistory.push(message);

    if (message.isUserSender) {
        // user just sent message, scroll to the bottom
        setTimeout(() => {
            roomChatScrollToBottom();
        }, 10); // wait for UI to render new message
    }

    // if user is at the bottom of the chat, scroll to the bottom
    const container = document.getElementById('room_chat_message_box');
    if (container.scrollTop + container.clientHeight >= container.scrollHeight) {
        setTimeout(() => {
            roomChatScrollToBottom();
            $('#new_messages_button_container').fadeOut();
        }, 10); // wait for UI to render new message
    } else {

    }
};

// super hacky
function conditionalShowNewMessagesButtonContainer() {
    const container = document.getElementById('room_chat_message_box');
    if (container.scrollTop + container.clientHeight >= container.scrollHeight) {
        // $('#new_messages_button_container').hide();
    } else {
        $('#new_messages_button_container').fadeIn();
    }
}

// hacky way to make new message button container disappear
setInterval(function () {
    try {
        const container = document.getElementById('room_chat_message_box');
        if (container.scrollTop + container.clientHeight >= container.scrollHeight) {
            $('#new_messages_button_container').fadeOut();
        } else {
            setTimeout(function () {
                conditionalShowNewMessagesButtonContainer();
            }, 1000); // wait to see if scrolling is finished
        }
    } catch (e) {
        console.error(e);
    }
}, 100);

onMounted(() => {
    console.log('app mounted');

    $('#new_messages_button_container').hide();
});


</script>

<template>
    <div id="interface_container">
        <div id="room_chat_area">
            <div id="room_chat_message_box">
                <div v-for="(message, index) in state.roomChatMessageHistory">
                    <div v-bind:class="message.isUserSender ? 'user_message' : 'assistant_message'">
                        <div class="message_span">
                            {{ message.message }}
                        </div>
                    </div>
                </div>
                <div ref="roomChatMessagesEnd"></div>
            </div>
        </div>
    </div>
</template>

<style scoped>
#interface_container {
    text-align: left;
}

#chat_area {
    position: absolute;
    bottom: 5px;
    left: 0px;
    padding: 20px;
    background-color: transparent;
    z-index: 100;
    width: 350px;
}

#settings_area {
    position: absolute;
    top: 5px;
    right: 5px;
    padding: 20px;
    background-color: transparent;
    z-index: 200;
}

.user_message {
    display: flex;
    flex-direction: row-reverse;
    color: darkblue;
    max-width: auto;
}

.user_message .message_span {
    background-color: rgba(0, 0, 255, 0.1);
    border-radius: 6px;
    padding: 10px;
    margin: 5px;
}

.assistant_message {
    display: flex;
    max-width: auto;
}

.assistant_message .message_span {
    background-color: rgba(255, 255, 255, 0.15);
    border-radius: 6px;
    padding: 10px;
    margin: 5px;
}

#chat_message_box {
    overflow-y: scroll;
    height: 500px;
    padding: 10px;
    margin-bottom: 15px;
    border-radius: 6px;
    background-color: rgba(0, 0, 0, 0.05);
}

#room_chat_area {
    position: absolute;
    bottom: 5px;
    left: 0px;
    padding: 20px;
    background-color: transparent;
    width: 350px;
    color: white;
}

#room_chat_message_box {
    overflow-y: scroll;
    height: 500px;
    padding: 10px;
    margin-bottom: 15px;
    border-radius: 6px;
    background-color: rgba(0, 0, 0, 0.05);
}

#ai_chat_input {
    background-color: rgb(255, 255, 255, 0.25);
}

#room_chat_input {
    background-color: rgb(255, 255, 255, 0.25);
}

#room_chat_input_container {
    position: relative;
}</style>
