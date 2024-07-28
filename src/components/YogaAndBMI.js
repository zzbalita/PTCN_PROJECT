import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, TextInput, Alert } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import { LineChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';
import { startOfWeek, endOfWeek, eachDayOfInterval, format } from 'date-fns';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const screenWidth = Dimensions.get('window').width;

const YogaAndBMI = () => {
  const [isTracking, setIsTracking] = useState(false);
  const [startTime, setStartTime] = useState(null);
  const [totalSleepTime, setTotalSleepTime] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [bmiResult, setBmiResult] = useState(null);

  const navigation = useNavigation();

  const handleYogaPress = () => {
    navigation.navigate('YogaScreen');
  };

  const handleThienPress = () => {
    navigation.navigate('Thien');
  };

  const [sleepData, setSleepData] = useState([]);
  const currentUser = auth().currentUser;
  const uid = currentUser ? currentUser.uid : null;

  const fetchSleepData = async () => {
    if (uid) {
      try {
        const snapshot = await firestore()
          .collection('users')
          .doc(uid)
          .collection('sleeps')
          .orderBy('createdAt', 'desc')
          .get();

        const data = snapshot.docs.map(doc => ({
          ...doc.data(),
          id: doc.id,
        }));

        setSleepData(data);
      } catch (error) {
        console.error('Error fetching sleep data:', error);
      }
    }
  };

  useEffect(() => {
    fetchSleepData();
  }, [uid]);

  const currentWeekData = sleepData.filter(item => {
    const createdAt = item.createdAt.toDate();
    const startOfCurrentWeek = startOfWeek(new Date(), { weekStartsOn: 1 }); // tuần bắt đầu từ thứ 2
    const endOfCurrentWeek = endOfWeek(new Date(), { weekStartsOn: 1 });
    return createdAt >= startOfCurrentWeek && createdAt <= endOfCurrentWeek;
  });

  const sleepTimeByDay = eachDayOfInterval({
    start: startOfWeek(new Date(), { weekStartsOn: 1 }),
    end: endOfWeek(new Date(), { weekStartsOn: 1 }),
  }).map(date => {
    const day = format(date, 'yyyy-MM-dd');
    const totalSleep = currentWeekData
      .filter(item => format(item.createdAt.toDate(), 'yyyy-MM-dd') === day)
      .reduce((sum, item) => sum + item.duration, 0);
    return { date: format(date, 'EEE'), totalSleep: totalSleep / 3600 };
  });

  const labels = sleepTimeByDay.map(item => item.date);
  const data = sleepTimeByDay.map(item => item.totalSleep);

  useEffect(() => {
    const loadState = async () => {
      try {
        const savedIsTracking = await AsyncStorage.getItem('isTracking');
        const savedStartTime = await AsyncStorage.getItem('startTime');
        const savedTotalSleepTime = await AsyncStorage.getItem('totalSleepTime');
        const savedCurrentTime = await AsyncStorage.getItem('currentTime');

        if (savedIsTracking === 'true') {
          setIsTracking(true);
          setStartTime(new Date(parseInt(savedStartTime, 10)));
        }

        setTotalSleepTime(parseInt(savedTotalSleepTime, 10) || 0);
        setCurrentTime(parseInt(savedCurrentTime, 10) || 0);
      } catch (error) {
        console.error('Failed to load state from AsyncStorage:', error);
      }
    };

    loadState();
  }, []);

  useEffect(() => {
    const saveState = async () => {
      try {
        await AsyncStorage.setItem('isTracking', JSON.stringify(isTracking));
        if (isTracking && startTime) {
          await AsyncStorage.setItem('startTime', startTime.getTime().toString());
        }
        await AsyncStorage.setItem('totalSleepTime', totalSleepTime.toString());
        await AsyncStorage.setItem('currentTime', currentTime.toString());
      } catch (error) {
        console.error('Failed to save state to AsyncStorage:', error);
      }
    };

    saveState();
  }, [isTracking, startTime, totalSleepTime, currentTime]);

  useEffect(() => {
    let timer;
    if (isTracking) {
      timer = setInterval(() => {
        const now = new Date();
        setCurrentTime(Math.floor((now - startTime) / 1000));
      }, 1000);
    }

    return () => clearInterval(timer);
  }, [isTracking, startTime]);

  const handleBMIPress = () => {
    navigation.navigate('Health');
  };

  const handleStartStop = async () => {
    if (isTracking) {
      setIsTracking(false);
      setTotalSleepTime(prev => prev + currentTime);

      try {
        if (uid) {
          await firestore().collection('users').doc(uid).collection('sleeps').add({
            duration: currentTime,
            createdAt: firestore.FieldValue.serverTimestamp(),
          });

          await fetchSleepData();
        }
      } catch (error) {
        console.error('Error saving sleep duration to Firestore: ', error);
      }

      setCurrentTime(0);
    } else {
      setIsTracking(true);
      setStartTime(new Date());
    }
  };

  const calculateBMI = () => {
    const heightInMeters = parseFloat(height) / 100;
    const weightInKg = parseFloat(weight);

    if (!heightInMeters || !weightInKg || heightInMeters <= 0 || weightInKg <= 0) {
      Alert.alert('Invalid input', 'Please enter valid height and weight');
      return;
    }

    const bmi = weightInKg / (heightInMeters * heightInMeters);
    setBmiResult(bmi.toFixed(2));

    let category = '';
    if (bmi < 18.5) {
      category = 'Underweight';
    } else if (bmi >= 18.5 && bmi < 24.9) {
      category = 'Normal weight';
    } else if (bmi >= 25 && bmi < 29.9) {
      category = 'Overweight';
    } else {
      category = 'Obesity';
    }

    Alert.alert('BMI Result', `Your BMI is ${bmi.toFixed(2)} (${category})`);
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#D5D7F2' }}>
      <View style={styles.rowContainer}>
        <TouchableOpacity
          style={styles.box}
          onPress={handleYogaPress}
        >
          <LinearGradient
            colors={['#8D92F2', '#D5D7F2']}
            style={styles.box}
          >
            <Text style={styles.boxText}>Yoga</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.box}
          onPress={handleBMIPress}
        >
          <LinearGradient
            colors={['#8D92F2', '#D5D7F2']}
            style={styles.box}
          >
            <Text style={styles.boxText}>BMI</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleThienPress}>
          <LinearGradient
            colors={['#8D92F2', '#D5D7F2']}
            style={styles.box}
          >
            <Text style={styles.boxText}>Thiền</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <View style={styles.infoContainer}>
        <ScrollView>
          <View style={styles.rowContainer}>
            <View style={styles.infoBox}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={styles.infoText}>Bed time</Text>
                <Icon name='bed' size={30} color="#8D92F2" />
              </View>
              <Text style={styles.infoSubText}>{`${Math.floor(totalSleepTime / 3600)}H ${Math.floor((totalSleepTime % 3600) / 60)}Min`}</Text>

              <TouchableOpacity
                style={styles.button}
                onPress={handleStartStop}
              >
                <Text style={styles.buttonText}>{isTracking ? 'Stop' : 'Start'}</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.infoBox} onPress={() => navigation.navigate('Alarm')}>
              <View style={{ flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                <Icon name='alarm' size={60} color="#8D92F2" />
                <Text style={[styles.infoText, {marginTop: 5, fontSize: 16, color: '#000'}]}>Alarm</Text>
              </View>
            </TouchableOpacity>
          </View>

          <View>
            <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#000', marginTop: 20 }}>Sleeping Time</Text>
            <LineChart
              data={{
                labels: labels,
                datasets: [
                  {
                    data: data,
                  },
                ],
              }}
              width={screenWidth - 40} // Adjust width as needed
              height={260}
              yAxisLabel=""
              yAxisSuffix="h"
              chartConfig={{
                backgroundColor: '#e26a00',
                backgroundGradientFrom: '#636AF2',
                backgroundGradientTo: '#D5D7F2',
                decimalPlaces: 2,
                color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
                style: {
                  borderRadius: 16,
                },
                propsForDots: {
                  r: '6',
                  strokeWidth: '2',
                  stroke: '#3D46F2',
                },
              }}
              bezier
              style={{
                marginVertical: 8,
                borderRadius: 16,
                alignSelf: 'center'
              }}
            />
          </View>

          <View style={styles.bmiContainer}>
            <Text style={styles.bmiTitle}>Calculate BMI</Text>
            <TextInput
              style={styles.input}
              placeholder="Height (cm)"
              keyboardType="numeric"
              value={height}
              onChangeText={setHeight}
            />
            <TextInput
              style={styles.input}
              placeholder="Weight (kg)"
              keyboardType="numeric"
              value={weight}
              onChangeText={setWeight}
            />
            <TouchableOpacity
              style={styles.bmiButton}
              onPress={calculateBMI}
            >
              <Text style={styles.bmiButtonText}>Calculate</Text>
            </TouchableOpacity>
            {bmiResult && (
              <View style={styles.bmiResultContainer}>
                <Text style={styles.bmiResultText}>Your BMI: {bmiResult}</Text>
              </View>
            )}
          </View>
        </ScrollView>
      </View>
      <TouchableOpacity style={styles.musicButton} onPress={() => navigation.navigate('Music')}>
        <LinearGradient
          colors={['#E2A0FF', '#8D92F2', '#D5D7F2']}
          style={styles.musicButtonGradient}
          start={{ x: 0, y: 0.6 }} end={{ x: 0.8, y: 0 }}
        >
          <Icon name='music' size={25} color='#fff' />
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
};

export default YogaAndBMI;

const styles = StyleSheet.create({
  rowContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignSelf: 'center',
    width: '90%',
    marginTop: 20,
  },
  box: {
    width: 100,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
    marginHorizontal: 10,
    elevation: 2,
  },
  boxText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#3D46F2',
  },
  infoContainer: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
    width: '90%',
    alignSelf: 'center',
    marginTop: 20,
    borderRadius: 20,
    marginBottom: 80
  },
  infoBox: {
    width: 125,
    height: 125,
    padding: 12,
    borderRadius: 10,
    marginHorizontal: 10,
    elevation: 2,
    backgroundColor: '#F8F7FE',
  },
  infoText: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  infoSubText: {
    fontSize: 14,
    fontWeight: '500',
  },
  button: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#8D92F2',
    borderRadius: 20,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: 'bold',
  },
  musicButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    position: 'absolute',
    bottom: 80,
    right: 10,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
  },
  musicButtonGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 35,
  },
  bmiContainer: {
    marginTop: 20,
    padding: 20,
    backgroundColor: '#F8F7FE',
    borderRadius: 10,
  },
  bmiTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  input: {
    height: 40,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    marginBottom: 10,
    backgroundColor: '#fff',
  },
  bmiButton: {
    backgroundColor: '#8D92F2',
    padding: 10,
    borderRadius: 20,
    alignItems: 'center',
  },
  bmiButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: 'bold',
  },
  bmiResultContainer: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#8D92F2',
    borderRadius: 10,
  },
  bmiResultText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: 'bold',
    textAlign: 'center',
  },
});
