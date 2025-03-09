// require ('dotenv').config({path:'./env'})//use But Not Native Approch
import dotenv from 'dotenv'
import connectDB from './db/index.js';
import { app } from './app.js';

dotenv.config({
    path:'./env'
})
connectDB()
.then(()=>{
    app.on("error",(error)=>{
        console.log("Error To Connect DB", error);
        throw error;
    })
    app.listen(process.env.PORT, ()=>{
        console.log(`App Listing On PORT:${process.env.PORT}`);
        
    })

})
.catch((err)=>{
    console.log("MongoDB Connectionn Failed"); 
    
})























/*
import express from 'express'
const app = express()
;(async()=>{
    try {
       await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
       app.on("error", (error)=>{
        console.log("Error To Connect DB", error);
        throw error;        
       })

       app.listen(process.env.PORT, ()=>{
        console.log(`App listing on Port: ${process.env.PORT}`);
        
       })
    } catch (error) {
        console.error("ERROR",error)
        throw error
    }
})()
    */