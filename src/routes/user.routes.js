import { Router } from "express";
import { loginUser, logoutUser, refreshAccessToken, registerUser } from "../controllers/user.controller.js";
import {upload} from "../middlewares/multer.middleware.js"
import { verifyJWT } from "../middlewares/auth.middleware.js";
const router =Router()

router.route("/register").post( //middleware is used just before use here multer is used 
    upload.fields([
        {
            name:"avatar",
            maxCount:1
        },
        {
            name:"coverImage",
            maxCount:1
        }
    ]),
    registerUser
)
router.route("/login").post(
    loginUser
)

///secured routes
router.route("/logout").post(
    verifyJWT,//middleware user
    logoutUser
)
router.route("/refresh-token",refreshAccessToken)

export default router 
 