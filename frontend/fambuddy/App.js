import React, {useEffect, useCallback, useState} from 'react';
import {View, Text, StyleSheet} from 'react-native';

import {GiftedChat} from 'react-native-gifted-chat';

const Chat = ({}) => {
  const [messages, setMessages] = useState([]);
  const [isTyping, setisTyping] = useState(false);
  var array = [];
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

  const ws = new WebSocket('ws://192.168.1.19:3000');

  ws.onopen = () => {
    console.log('connected to websocket');
  };

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
    setMessages(previousMessages => GiftedChat.append(previousMessages, data));
    setisTyping(false);
  };

  ws.onerror = e => {
    console.log('websocket error', e.message);
  };

  ws.onclose = e => {
    console.log('websocket closed', e.code, e.reason);
  };

  const onSend = useCallback((msg = []) => {
    ws.send(
      JSON.stringify({
        previous: array,
        current: msg[0].text,
      }),
    );
    array.push(msg[0].text);
    setMessages(previousMessages => GiftedChat.append(previousMessages, msg));
    setisTyping(!isTyping);
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
