import React, {useEffect, useCallback, useState, useRef} from 'react';
import {View, Text, StyleSheet} from 'react-native';

import {GiftedChat} from 'react-native-gifted-chat';

const Chat = ({}) => {
  const [messages, setMessages] = useState([]);
  const [isTyping, setisTyping] = useState(false);
  const [isLoading, setisLoading] = useState();
  const [isRetry, setisRetry] = useState(false);
  const wsRef = useRef(null);
  var array = [];

  useEffect(() => {
    setisLoading(true);
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
    // const ws = new WebSocket('ws://192.168.1.19:3000');

    const ws = new WebSocket('wss://fambuddy.onrender.com');
    wsRef.current = ws;
    ws.onopen = () => {
      console.log('connected to websocket');
      setisLoading(false);
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
      setMessages(previousMessages =>
        GiftedChat.append(previousMessages, data),
      );
      setisTyping(false);
    };
    ws.onerror = e => {
      console.log('websocket error', e.message);
      setTimeout(() => {
        setisRetry(!isRetry);
      }, 10000);
    };

    ws.onclose = e => {
      console.log('websocket closed', e.code, e.reason);
      setTimeout(() => {
        setisRetry(!isRetry);
      }, 3000);
    };
    return () => {
      ws.close();
    };
  }, [isRetry]);

  const onSend = useCallback((msg = []) => {
    try {
      wsRef.current.send(
        JSON.stringify({
          previous: array,
          current: msg[0].text,
        }),
      );
      array.push(msg[0].text);
      setMessages(previousMessages => GiftedChat.append(previousMessages, msg));
      setisTyping(!isTyping);
    } catch (e) {
      console.log(e);
    }
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
      {!isLoading ? (
        <GiftedChat
          // inverted={true}
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
      ) : (
        <View style={{alignSelf: 'center', marginVertical: '50%'}}>
          <Text style={{fontSize: 20}}>Connecting to FamBuddy..</Text>
        </View>
      )}
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
