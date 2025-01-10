import dotenv from "dotenv";
import app from './app.js'
import connectDb from "./db/db.js";


dotenv.config({
    path: "./.env"
})

 connectDb()
.then( () => {
    app.listen(process.env.PORT || 8000 , () => {
        console.log(`Server is Running at : ${process.env.PORT}`);
        
    });
    
})
.catch( (err) => {
    console.log(err);
    
})



