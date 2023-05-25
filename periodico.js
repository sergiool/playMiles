import { getDatabase, ref, child, get } from "firebase/database";
import { deleteApp } from "firebase/app";
// Initialize Firebase
import { app, user }  from './firebase.js';
import { startMiles, findMiles, endMiles } from './getmilhas.js';

(async () => {
  let first = true
  const dbRef = ref(getDatabase(app));
  const context = await startMiles(7)
  get(child(dbRef, `/users/${user.uid}/`))
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