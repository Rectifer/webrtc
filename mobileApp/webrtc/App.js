/* eslint-disable react-native/no-inline-styles */
/* eslint-disable keyword-spacing */
/* eslint-disable curly */
/* eslint-disable eqeqeq */
/* eslint-disable quotes */
/* eslint-disable semi */
/* eslint-disable comma-dangle */
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
import {
  RTCPeerConnection,
  RTCIceCandidate,
  RTCSessionDescription,
  RTCView,
  MediaStream,
  MediaStreamTrack,
  mediaDevices,
  registerGlobals
} from 'react-native-webrtc';

import io from 'socket.io-client'

import Video from './components/Video';
import Videos from './components/Videos';
import Icon from "react-native-vector-icons/Ionicons";
import ActionSheet from 'react-native-actionsheet';

console.ignoredYellowBox = ['Remote debugger'];
import { YellowBox } from 'react-native';
YellowBox.ignoreWarnings([
    'Unrecognized WebSocket connection option(s) `agent`, `perMessageDeflate`, `pfx`, `key`, `passphrase`, `cert`, `ca`, `ciphers`, `rejectUnauthorized`. Did you mean to put these under `headers`?'
]);

const dimensions = Dimensions.get('window')

class VirtualClass extends Component {
  constructor(props) {
    super(props)
    this.state = {
      isMute: false,
      isVideoOn: false,
      localStream: null,  
      remoteStream: null,  
      remoteStreams: [],   
      peerConnections: {}, 
      selectedVideo: null,
      status: 'Please wait...',
      pc_config: {"iceServers": [{urls : 'stun:stun.l.google.com:19302'}]},
      sdpConstraints: {'mandatory': {'OfferToReceiveAudio': true,'OfferToReceiveVideo': true}},
    }
    this.serviceIP = 'https://cfe759e1.ngrok.io/webrtcPeer'
    this.socket = null
  }
    getLocalStream = () => {
    const success = (stream) => {
      this.setState({localStream: stream})
      this.whoIsOnline()
    }
    const failure = (e) => {
      console.log('getUserMedia Error: ', e)
    }
    let isFront = true;
    mediaDevices.enumerateDevices().then(sourceInfos => {
      console.log(sourceInfos);
      let videoSourceId;
      for (let i = 0; i < sourceInfos.length; i++) {
        const sourceInfo = sourceInfos[i];
        if (sourceInfo.kind == "videoinput" && sourceInfo.facing == (isFront ? "front" : "environment")) {
          videoSourceId = sourceInfo.deviceId;
        }
      }
      const constraints = {
        audio: true,
        video: {
          mandatory: {
            minWidth: 100, // Provide your own width, height and frame rate here
            minHeight: 100,
            minFrameRate: 30
          },
          facingMode: (isFront ? "user" : "environment"),
          optional: (videoSourceId ? [{ sourceId: videoSourceId }] : [])
        }
      }

      mediaDevices.getUserMedia(constraints)
        .then(success)
        .catch(failure);
    });
  }

  whoIsOnline = () => {
    this.sendToPeer('onlinePeers', null, {local: this.socket.id})
  }

  sendToPeer = (messageType, payload, socketID) => {
    this.socket.emit(messageType, {
      socketID,
      payload
    })
  }

  createPeerConnection = (socketID, callback) => {
    try {
      let pc = new RTCPeerConnection(this.state.pc_config)
      const peerConnections = { ...this.state.peerConnections, [socketID]: pc }
      this.setState({peerConnections})
      console.log("peerConnections-144=",peerConnections)
      pc.onicecandidate = (e) => {
        if (e.candidate) {
          this.sendToPeer('candidate', e.candidate, {
            local: this.socket.id,
            remote: socketID
          })
        }
      }
      pc.oniceconnectionstatechange = (e) => {
        if (pc.iceConnectionState === 'disconnected') {
          const remoteStreams = this.state.remoteStreams.filter(stream => stream.id !== socketID)

          this.setState({
            remoteStream: remoteStreams.length > 0 && remoteStreams[0].stream || null,
          })
        }
      }
      pc.onaddstream = (e) => {
        console.log("I am on ontrack ",e)
        const remoteVideo = {
          id: socketID,
          name: socketID,
          stream: e.target._remoteStreams[0]
        }

        this.setState(prevState => {
          const remoteStream = prevState.remoteStreams.length > 0 ? {} : { remoteStream: e.target._remoteStreams[0] }
          let selectedVideo = prevState.remoteStreams.filter(stream => stream.id === prevState.selectedVideo.id)
          selectedVideo = selectedVideo.length ? {} : { selectedVideo: remoteVideo }
          return {
            ...selectedVideo,
            ...remoteStream,
            remoteStreams: [...prevState.remoteStreams, remoteVideo]
          }
        })
      }
      pc.close = () => {}
      if (this.state.localStream)
        pc.addStream(this.state.localStream)
      callback(pc)
    } catch(e) {
      console.log('Something went wrong! pc not created!!', e)
      callback(null)
    }
  }

  componentDidMount = () => {
    this.socket = io.connect(
      this.serviceIP,
      {
        path: '/io/webrtc',
        query: {}
      }
    )

    this.socket.on('connection-success', data => {
      this.getLocalStream()
      console.log(data.success)
      const status = data.peerCount > 1 ? `Total Connected Peers: ${data.peerCount}` : 'Waiting for other peers to connect'
      this.setState({status: status})
    })
    this.socket.on('peer-disconnected', data => {
      console.log('peer-disconnected', data)
      const remoteStreams = this.state.remoteStreams.filter(stream => stream.id !== data.socketID)
      this.setState(prevState => {
        const selectedVideo = prevState.selectedVideo.id === data.socketID && remoteStreams.length ? { selectedVideo: remoteStreams[0] } : null
        return {
          remoteStreams,
          ...selectedVideo,
        }
        }
      )
    })
    this.socket.on('online-peer', socketID => {
      this.createPeerConnection(socketID, pc => {
          if (pc)
            pc.createOffer(this.state.sdpConstraints)
              .then(sdp => {
                console.log("Creating Offer SDP=",sdp)
                pc.setLocalDescription(sdp)
                this.sendToPeer('offer', sdp, {
                  local: this.socket.id,
                  remote: socketID
                })
          })
        })
    })
    this.socket.on('offer', data => {
      console.log("Grab offer=",data);
      this.createPeerConnection(data.socketID, pc => {
        pc.addStream(this.state.localStream)
        pc.setRemoteDescription(new RTCSessionDescription(data.sdp)).then(() => {
          pc.createAnswer(this.state.sdpConstraints)
            .then(sdp => {
              pc.setLocalDescription(sdp)
              this.sendToPeer('answer', sdp, {
                local: this.socket.id,
                remote: data.socketID
              })
            })
        })
      })
    })
    this.socket.on('answer', data => {
      const pc = this.state.peerConnections[data.socketID]
      console.log(data.sdp)
      pc.setRemoteDescription(new RTCSessionDescription(data.sdp)).then(()=>{
        console.log("My Remote Videos=", this.state.remoteStreams)
      })
    })

    this.socket.on('candidate', (data) => {
      const pc = this.state.peerConnections[data.socketID]
      if (pc)
        pc.addIceCandidate(new RTCIceCandidate(data.candidate))
    })
  }
  switchVideo = (_video) => {
    console.log(_video)
    this.setState({selectedVideo: _video})
  }

  toggleMute = () => {
    this.setState({
        isMute: !this.state.isMute
    });
}

toggleVideo = () => {
    this.setState({
        isVideoOn: !this.state.isVideoOn
    });
}

showActionSheet = () => {
    this
        .ActionSheet
        .show();
};

  render() {
    console.log(this.state.localStream);

    const statusText = (
      <View
        style={{
          backgroundColor: 'yellow',
          padding: 5,
        }}>
        <Text
          style={{
            color: 'black',
          }}>
          {this.state.status}
        </Text>
      </View>
    );

    const optionArray = [
      'Select the sound device',
      'Invite someone',
      'Disable low bandwidth mode',
      'Raise your hand',
      'Toggle camera',
      'Enter tile view',
      'Start recording',
      'Start live stream',
      'Add meeting Password',
      'Cancel'
  ];

    return (
      <SafeAreaView>
        <View style={styles.container}>
          <Video
            videoStyles={{
              width: '100%',
              height: '100%',
            }}
            videoStream={
              this.state.selectedVideo &&
              this.state.selectedVideo.stream
            }/>
          <View style={styles.localstream}>
            <Video
              videoStyles={{
                width: '100%',
                height: '100%',
              }}
              videoStream={this.state.localStream}/>
          </View>
        </View>
        <View
          style={{
            zIndex: 3,
            position: 'absolute',
            margin: 10,
            backgroundColor: '#cdc4ff4f',
            padding: 10,
            borderRadius: 5,
          }}>
          {statusText}
        </View>
        <View>
          <ScrollView>
            <Videos
              switchVideo={this.switchVideo}
              remoteStreams={this.state.remoteStreams}
            />
          </ScrollView>
        </View>
        <View>
        <View style={styles.bottom}>
        <View
            style={{
            padding: 8,
            marginRight: 10
        }}>
            <TouchableOpacity>
                <Icon
                    name={Platform.OS == 'ios'
                    ? 'ios-text'
                    : 'md-text'}
                    size={25}
                    color="white"/>
            </TouchableOpacity>
        </View>
        <View style={{
            padding: 5
        }}>
            {this.state.isMute
                ? <TouchableOpacity
                        style={styles.buttoncontainer1}
                        onPress={() => this.toggleMute()}>
                        <Icon
                            name={Platform.OS == 'ios'
                            ? 'ios-mic-off'
                            : 'md-mic-off'}
                            size={25}
                            color="white"
                            style={{
                            alignSelf: "center",
                            justifyContent: 'center'
                        }}/>
                    </TouchableOpacity>
                : <TouchableOpacity
                    style={styles.buttoncontainer}
                    onPress={() => this.toggleMute()}>
                    <Icon
                        name={Platform.OS == 'ios'
                        ? 'ios-mic'
                        : 'md-mic'}
                        size={25}
                        color="black"
                        style={{
                        alignSelf: "center",
                        justifyContent: 'center'
                    }}/>
                </TouchableOpacity>}
        </View>
        <View style={{
            padding: 5
        }}>
            <TouchableOpacity style={styles.buttoncontainer2}>
                <Icon
                    name={Platform.OS == 'ios'
                    ? 'ios-call'
                    : 'md-call'}
                    size={25}
                    color="white"/>
            </TouchableOpacity>
        </View>
        <View style={{
            padding: 5
        }}>
            {this.state.isVideoOn
                ? <TouchableOpacity
                        style={styles.buttoncontainer1}
                        onPress={() => this.toggleVideo()}>
                        <Icon
                            name={Platform.OS == 'ios'
                            ? 'ios-eye-off'
                            : 'md-eye-off'}
                            size={25}
                            color="white"
                            style={{
                            alignSelf: "center",
                            justifyContent: 'center'
                        }}/>
                    </TouchableOpacity>
                : <TouchableOpacity
                    style={styles.buttoncontainer}
                    onPress={() => this.toggleVideo()}>
                    <Icon
                        name={Platform.OS == 'ios'
                        ? 'ios-eye'
                        : 'md-eye'}
                        size={25}
                        color="black"
                        style={{
                        alignSelf: "center",
                        justifyContent: 'center'
                    }}/>
                </TouchableOpacity>}
        </View>
        <View
            style={{
            padding: 8,
            marginLeft: 10
        }}>
            <TouchableOpacity onPress={() => this.showActionSheet()}>
                <Icon
                    name={Platform.OS == 'ios'
                    ? 'ios-more'
                    : 'md-more'}
                    size={25}
                    color="white"/>
            </TouchableOpacity>
        </View>
    </View>
    <ActionSheet
        ref={o => (this.ActionSheet = o)}
        title={< Icon name = {
        Platform.OS == 'ios'
            ? 'ios-remove'
            : 'md-remove'
    }
    size = {
        25
    }
    color = "black" style = {{ alignSelf: "center", justifyContent: 'center' }}/>}
        options={optionArray}
        cancelButtonIndex={9}
        destructiveButtonIndex={9}/>
        </View>
      </SafeAreaView>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    maxWidth: '100%',
    maxHeight: '80%',
    backgroundColor: 'black',
  },
  localstream: {
    position: 'absolute',
    zIndex: 3,
    bottom: 5,
    right: 0,
    width: '25%',
    height: '15%',
    backgroundColor: 'teal',
  },
  bottom: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center"
},
buttoncontainer: {
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    width: 50,
    height: 50,
    backgroundColor: '#fff',
    borderRadius: 50
},
buttoncontainer1: {
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    width: 50,
    height: 50,
    backgroundColor: '#111',
    borderRadius: 50
},
buttoncontainer2: {
    borderWidth: 1,
    borderColor: 'red',
    alignItems: 'center',
    justifyContent: 'center',
    width: 50,
    height: 50,
    backgroundColor: 'red',
    borderRadius: 50
}
});

export default VirtualClass;
