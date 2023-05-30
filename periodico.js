import { getDatabase, ref, child, get } from "firebase/database";
import { deleteApp } from "firebase/app";
// Initialize Firebase
import { app, auth, userFirebase, senhaFirebase }  from './firebase.js';
import { startMiles, findMiles, endMiles } from './getmilhas.js';
import { signInWithEmailAndPassword } from "firebase/auth";

(async () => {
  let first = true
  const dbRef = ref(getDatabase(app));
  await signInWithEmailAndPassword(auth, userFirebase, senhaFirebase)
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
      }).catch(e => console.log('Erro Firebase: ', e));
    //}).catch(e => console.log('Autenticação', e))
})();