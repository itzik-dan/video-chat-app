import { useEffect, useRef, useState } from "react";
import { firestore } from "./firebase";
import { FaPhone, FaPhoneSlash, FaUserPlus, FaVideo } from "react-icons/fa";

const App = () => {
  const [remoteStream, setRemoteStream] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [channelId, setChannelId] = useState("");

  const myVideo = useRef();
  const userVideo = useRef();
  const pc = useRef();

  useEffect(() => {
    alert(
      "Welcome! To start please press camera icon then click on invite button to generate invitation code, finally send the code to your friend who then will be able to answer your call"
    );
  }, []);

  // Define Google ICE servers to establish a peer-to-peer connection
  const servers = {
    iceServers: [
      {
        urls: [
          "stun:stun1.l.google.com:19302",
          "stun:stun2.l.google.com:19302",
        ],
      },
    ],
    iceCandidatePoolSize: 10,
  };

  const startWebcam = async () => {
    // Create an instance of RTCPeerConnection that will manage the connection between the local computer and a remote peer.
    pc.current = new RTCPeerConnection(servers);

    // Capture the local stream from the user’s camera and add it to the RTCPeerConnection
    const local = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });
    pc.current.addStream(local);
    setLocalStream(local);

    // initalizing the remote server to the mediastream
    const remote = new MediaStream();
    setRemoteStream(remote);

    // Push tracks from local stream to peer connection
    local.getTracks().forEach((track) => {
      pc.current.getLocalStreams()[0].addTrack(track);
    });

    // Pull tracks from peer connection, add to remote video stream
    pc.current.ontrack = (event) => {
      event.streams[0].getTracks().forEach((track) => {
        remote.addTrack(track);
      });
    };

    pc.current.onaddstream = (event) => {
      setRemoteStream(event.stream);
    };

    // displaying the video data from the stream to the webpage
    myVideo.current.srcObject = local;
    userVideo.current.srcObject = remote;
  };

  //--------------------------------------------------------------------------------

  const startCall = async () => {
    // Create channels collection in firestore
    const channelDoc = firestore.collection("channels").doc();
    // Create the below subcollections for channels as part of signaling process
    const offerCandidates = channelDoc.collection("offerCandidates");
    const answerCandidates = channelDoc.collection("answerCandidates");

    setChannelId(channelDoc.id);

    pc.current.onicecandidate = async (event) => {
      if (event.candidate) {
        await offerCandidates.add(event.candidate.toJSON());
      }
    };

    // Create offer - initiates the creation of an SDP offer for the purpose of starting a new WebRTC connection to a remote peer.
    const offerDescription = await pc.current.createOffer();
    await pc.current.setLocalDescription(offerDescription);

    const offer = {
      sdp: offerDescription.sdp,
      type: offerDescription.type,
    };

    await channelDoc.set({ offer });

    // Listen for remote answer
    channelDoc.onSnapshot((snapshot) => {
      const data = snapshot.data();
      if (!pc.current.currentRemoteDescription && data?.answer) {
        const answerDescription = new RTCSessionDescription(data.answer);
        pc.current.setRemoteDescription(answerDescription);
      }
    });

    // When answered, add candidate to peer connection
    answerCandidates.onSnapshot((snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
          const data = change.doc.data();
          pc.current.addIceCandidate(new RTCIceCandidate(data));
        }
      });
    });
  };

  //--------------------------------------------------------------------------------

  const joinCall = async () => {
    // Get the required channel and its subcollections based on id, Each channel ID represents a unique call ID
    const channelDoc = firestore.collection("channels").doc(channelId);
    const offerCandidates = channelDoc.collection("offerCandidates");
    const answerCandidates = channelDoc.collection("answerCandidates");

    pc.current.onicecandidate = async (event) => {
      if (event.candidate) {
        await answerCandidates.add(event.candidate.toJSON());
      }
    };

    const channelDocument = await channelDoc.get();
    const channelData = channelDocument.data();

    const offerDescription = channelData.offer;

    await pc.current.setRemoteDescription(
      new RTCSessionDescription(offerDescription)
    );

    // Create an answerOffer and update the channelDoc
    const answerDescription = await pc.current.createAnswer();
    await pc.current.setLocalDescription(answerDescription);

    const answer = {
      type: answerDescription.type,
      sdp: answerDescription.sdp,
    };

    await channelDoc.update({ answer });

    offerCandidates.onSnapshot((snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
          const data = change.doc.data();
          pc.current.addIceCandidate(new RTCIceCandidate(data));
        }
      });
    });

    setSessionStarted(true);
  };

  return (
    <div className="App">
      <h1>Welcome to VidChat</h1>
      <div className="videos">
        <span>
          <h3>My Screen</h3>
          <video ref={myVideo} id="webcamVideo" autoPlay playsInline></video>
        </span>
        <span>
          <h3>Friend Screen</h3>
          <video ref={userVideo} id="remoteVideo" autoPlay playsInline></video>
        </span>
        )
      </div>

      <div className="buttonWrapper" id="controls">
        <button
          className={`control-container ${!localStream && "bounce"}`}
          onClick={startWebcam}
          id="webcamButton"
          disabled={localStream}
        >
          <FaVideo className="icon" />
        </button>
        {/* <h2>Create a new Call</h2> */}
        <button
          className="control-container"
          onClick={startCall}
          disabled={!localStream}
          id="callButton"
        >
          <FaUserPlus className="icon" />
        </button>

        {/* <h2>Join a Call</h2>
        <p>Answer the call from a different browser window or device</p> */}

        <input
          id="callInput"
          value={channelId}
          onChange={(e) => setChannelId(e.target.value)}
        />
        <button
          className="control-container"
          onClick={joinCall}
          disabled={!localStream || !channelId}
          id="answerButton"
        >
          <FaPhone className="icon" />
        </button>

        <button
          id="hangupButton"
          // disabled={!sessionStarted}
          className="control-container"
          onClick={() => window.location.reload()}
        >
          <FaPhoneSlash className="icon" />
        </button>
      </div>
    </div>
  );
};

export default App;
