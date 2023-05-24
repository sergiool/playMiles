import { getDatabase, ref, child, get } from "firebase/database";
import { deleteApp } from "firebase/app";
//import express from 'express';
// Initialize Firebase
import { app, auth }  from './firebase.js';
import { startMiles, findMiles, endMiles } from './getmilhas.js';
import { signInWithEmailAndPassword } from "firebase/auth";

(async () => {
  let first = true
  const dbRef = ref(getDatabase(app));
  signInWithEmailAndPassword(auth, 'oliveira.sergio@gmail.com', 'kedma256')
  const context = await startMiles(7)
  get(child(dbRef, `/users/${auth.currentUser.uid}/`))
    .then(async (r) => {
      if (r && r.exists()){ 
        const bodies = Object.values(r.val())
        for (let i = 0; i < bodies.length; i++){
          await findMiles(context, bodies[i], first)
          first = false
        }
      } 
      await endMiles(context)
      deleteApp(app)
        .then(()=> process.exit(0))
    });
})();