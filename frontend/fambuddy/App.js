import React, {useEffect, useCallback, useState} from 'react';
import {View, Text, StyleSheet} from 'react-native';

import {GiftedChat} from 'react-native-gifted-chat';
// import {TypingAnimation} from 'react-native-typing-animation';

const Chat = ({}) => {
  const [messages, setMessages] = useState([]);
  const [isTyping, setisTyping] = useState(false);

  useEffect(() => {
    setMessages([
      {
        _id: 1,
        text: 'Hi there! I am FamBuddy!',
        createdAt: new Date(),
        user: {
          _id: 2,
          name: 'Bot',
          avatar:
            'https://www.viralindiandiary.com/wp-content/uploads/2021/06/FamPay-Logo.png',
        },
      },
    ]);
  }, []);

  // Create a new websocket instance
  const ws = new WebSocket('ws://192.168.1.19:3000');

  // Handle the connection open event
  ws.onopen = () => {
    console.log('connected to websocket');
  };

  // Handle the message event
  ws.onmessage = e => {
    var response = e.data;
    var data = [
      {
        _id: parseInt(Date.now() * Math.random()),
        text: response,
        createdAt: new Date(),
        user: {
          _id: 2,
          name: 'Bot',
          avatar:
            'https://www.viralindiandiary.com/wp-content/uploads/2021/06/FamPay-Logo.png',
        },
      },
    ];
    // Append the message to the state
    setMessages(previousMessages => GiftedChat.append(previousMessages, data));
    setisTyping(false);
  };

  // Handle the error event
  ws.onerror = e => {
    console.log('websocket error', e.message);
  };

  // Handle the connection close event
  ws.onclose = e => {
    console.log('websocket closed', e.code, e.reason);
  };

  const onSend = useCallback((messages = []) => {
    // Send the message to the server as JSON
    ws.send(JSON.stringify(messages[0]));
    // Update the state with the sent message
    setMessages(previousMessages =>
      GiftedChat.append(previousMessages, messages),
    );
    setisTyping(!isTyping);
    console.log(messages);
  }, []);

  return (
    <View style={{flex: 1}}>
      <View
        style={{
          flexDirection: 'row',
          alignSelf: 'center',
          margin: 10,
        }}>
        <Text style={styles.textStyle}>Fam</Text>
        <Text style={styles.textBuddy}>Buddy</Text>
      </View>
      <GiftedChat
        messages={messages}
        onSend={messages => onSend(messages)}
        user={{
          _id: 1,
          name: 'User',
        }}
        isTyping={isTyping}
        textInputProps={{
          placeholder: 'Type a message....',
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  textStyle: {
    color: '#ffac14',
    fontSize: 26,
    fontWeight: 'bold',
  },
  textBuddy: {
    color: 'black',
    fontSize: 26,
    fontWeight: 'bold',
  },
});

export default Chat;
