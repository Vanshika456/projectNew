import express from 'express'
import cookieParser from 'cookie-parser'
import cors from "cors"
const app=express()

app.use(cors({
    origin:process.env.CORS_ORIGIN,
    credentials:true
}))


app.use(express.json({limit: "16kb"}))
app.use(express.urlencoded({extended: true , limit:"16kb"}))
app.use(express.static("public"))// for static folder upload like favicon etc 
app.use(cookieParser())



// routes
import userRouter from "./routes/user.routes.js"

app.use("/api/v1/users",userRouter)

export {app}

//Cookie parsing is a process of extracting and handling data stored in cookies,  Cookies are small pieces of data that websites store on a user's browser 