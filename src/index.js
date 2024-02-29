import dotenv from "dotenv"
import connect_DB from "./db/index.js";

dotenv.config({
    path:'./env'
})


connect_DB();




