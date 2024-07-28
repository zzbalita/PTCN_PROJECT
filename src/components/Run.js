import { StyleSheet, Text, View, TouchableOpacity, Alert } from 'react-native';
import React, { useState, useEffect } from 'react';
import Geolocation from 'react-native-geolocation-service';
import haversine from 'haversine';

const Run = () => {
  const [distance, setDistance] = useState(0);
  const [prevPosition, setPrevPosition] = useState(null);

  useEffect(() => {
    const watchId = Geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        if (prevPosition) {
          const newDistance = haversine(prevPosition, { latitude, longitude }, { unit: 'km' });
          setDistance(prevDistance => prevDistance + newDistance);
          if (distance + newDistance >= 2 && distance < 2) {
            Alert.alert('Congratulations', 'You have reached your 2km goal!');
          }
        }
        setPrevPosition({ latitude, longitude });
      },
      (error) => {
        console.log(error);
      },
      { enableHighAccuracy: true, distanceFilter: 10, interval: 1000, fastestInterval: 500 }
    );

    return () => {
      Geolocation.clearWatch(watchId);
    };
  }, [prevPosition, distance]);

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Distance: {distance.toFixed(2)} km</Text>
      <TouchableOpacity style={styles.button} onPress={() => setDistance(0)}>
        <Text style={styles.buttonText}>Reset</Text>
      </TouchableOpacity>
    </View>
  );
};

export default Run;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#D5D7F2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontSize: 24,
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#8D92F2',
    padding: 10,
    borderRadius: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
  },
});
