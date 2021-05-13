import firebase from 'firebase'

const config = {
    apiKey: "AIzaSyApjJ-ByL7UDfK8ZYQbuuabvZ1QzGqbnHc",
    authDomain: "chat-42ca6.firebaseapp.com",
    projectId: "chat-42ca6",
    storageBucket: "chat-42ca6.appspot.com",
    messagingSenderId: "160040408179",
    //databaseURL: 'https://chat-42ca6.firebaseio.com'
    appId: "1:160040408179:web:94d1e8f7dd53af6ba6c606"
}
firebase.initializeApp(config)
firebase.firestore().settings({
    timestampsInSnapshots: true
})

export const myFirebase = firebase
export const myFirestore = firebase.firestore()
export const myStorage = firebase.storage()
