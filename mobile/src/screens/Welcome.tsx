import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import PeanutOutline from '../../assets/icons/PeanutOutline.svg';

const { width, height } = Dimensions.get('window');

const Welcome = () => {
  return (
    <View style={styles.container}>
      <PeanutOutline width={120} height={120} fill="#fff" style={styles.icon} />
      <Text style={styles.text}>Let's Eat!</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#DA291C',
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    marginBottom: 40,
  },
  text: {
    color: '#fff',
    fontSize: 40,
    fontFamily: 'ReadexPro-Bold',
    textAlign: 'center',
    letterSpacing: 1,
  },
});

export default Welcome; 