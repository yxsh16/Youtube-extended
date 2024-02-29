import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";   

const connect_DB = async () => {
    try{
        const connecetionInstance = await mongoose.connect
        (`${process.env.MONGODB_URI}/${DB_NAME}`)
        console.log(`Connected to the database: ${connecetionInstance.connection.host}`);
    }
    catch (error){
        console.log("ERROR: ", error)
        process.exit(1)
    }
}    


export default connect_DB;