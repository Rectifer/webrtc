/* eslint-disable eol-last */
/* eslint-disable semi */
/* eslint-disable react-native/no-inline-styles */
/* eslint-disable comma-dangle */
/* eslint-disable no-trailing-spaces */
/* eslint-disable prettier/prettier */
/* eslint-disable no-unused-vars */
import React, {Component} from 'react';
import {
    SafeAreaView,
    StyleSheet,
    ScrollView,
    View,
    Text,
    StatusBar,
    TouchableOpacity,
    Dimensions,
    FlatList,
  } from 'react-native';
import Video from './Video';
const dimensions = Dimensions.get('window');

class Videos extends Component {
  constructor(props) {
    super(props)

    this.state = {
      rVideos: [],
      remoteStreams: []
    }
  }

  UNSAFE_componentWillReceiveProps(nextProps) {
    if (this.props.remoteStreams !== nextProps.remoteStreams) {
      
      let _rVideos = nextProps.remoteStreams.map((rVideo, index) => {
        let video = <Video
        videoStream={rVideo.stream}
        frameStyle={{ width: 120, float: 'left', padding: 0 }}
        videoStyles={{
          width: 80, //dimensions.width,
          height: 80,//dimensions.height / 2,
          backgroundColor: 'black',
          borderColor: 'white',
          borderWidth: 5
        }}>
        </Video>

        return (
          <View
            id={rVideo.name}
            onPress={() => this.props.switchVideo(rVideo)}
            key={index}
          >
            {video}
          </View>
        )
      })

      this.setState({
        remoteStreams: nextProps.remoteStreams,
        rVideos: _rVideos
      })
      console.log("R videos",this.state.rVideos);
      console.log("R STreams",this.state.remoteStreams);
    }
  }

  render() {
    return (
      <View
      style={{
        padding: 6,
        maxHeight: 80,
        whiteSpace: 'nowrap'
      }}
    >
      { this.state.rVideos }
    </View>
    )
  }

}

export default Videos