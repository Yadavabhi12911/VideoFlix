


import mongoose from "mongoose";

import { DB_NAME } from "../constants.js";



const connectDb = async () => {
    try {
        const db = await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
        console.log(` \n MongoDB connected !! Host: ${db.connection.host}`);
     
        
    } catch (error) {
        console.log("MOngoDb connection error", error);
        process.exit(1)
    }
;

// Global event listeners for the Mongoose connection
mongoose.connection.on('connected', () => {
    console.log('Database connect ho gya hai');
});

mongoose.connection.on('disconnected', () => {
    console.log('Database Disconnect ho gya hai');
});
}



export default connectDb