import express from 'express';
// Initialize Firebase
import bodyParser  from 'body-parser';
import cors from "cors";
import { getMiles } from './getmilhas.js';

const appExpress = express()
appExpress.use(bodyParser.urlencoded({ extended: true }));
appExpress.use(bodyParser.json())
appExpress.use(cors());
const port = parseInt(process.env.PORT) || 8080;

appExpress.post('/flights', (req, res, next) => {
  getMiles(req.body)
  //console.log(req.body)
  res.send(req.body)
})


appExpress.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
