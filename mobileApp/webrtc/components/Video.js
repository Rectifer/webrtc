/* eslint-disable eol-last */
/* eslint-disable jsx-quotes */
/* eslint-disable no-trailing-spaces */
/* eslint-disable semi */
/* eslint-disable no-unused-vars */
/* eslint-disable prettier/prettier */
import React, { Component } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  ScrollView,
  View,
  Text,
  StatusBar,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import {RTCView} from 'react-native-webrtc';
const dimensions = Dimensions.get('window');

class Video extends Component {
    constructor(props) {
        super(props);
        this.state = {

        }
    }
    video={};
    componentDidMount() {
        if (this.props.videoStream) {
          this.video.srcObject = this.props.videoStream
        }
      }

      UNSAFE_componentWillReceiveProps(nextProps) { 
        console.log(nextProps.videoStream)
    
        if (nextProps.videoStream && nextProps.videoStream !== this.props.videoStream) {
          this.video.srcObject = nextProps.videoStream
        }
      }

    render() {
        return (
            <View  style={{ ...this.props.frameStyle }}>
            <RTCView
                key={this.props.id}
                zOrder={0}
                objectFit='cover'
                style={{ ...this.props.videoStyles }}
                streamURL={this.video.srcObject && this.video.srcObject.toURL()}>
            </RTCView>
            </View>
        )
    }
}
export default Video;