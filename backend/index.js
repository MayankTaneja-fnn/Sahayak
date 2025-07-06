import {app} from './app.js'
// index.js
// const { app } = require('./src/app.js');

import dotenv from 'dotenv'
// const dotenv = require('dotenv');

dotenv.config({
    path : ".env"
})

const port = process.env.PORT || 8000
// const port=3000;



app.listen(port,'0.0.0.0', function(){
    console.log(`server started on port ${port}`)
})
