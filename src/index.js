import dotenv from "dotenv"
import { app } from "./app.js";
import connect_DB from "./db/index.js";

dotenv.config({
    path:'./env'
})


connect_DB()
.then(() => {
    app.listen(process.env.PORT || 8000, () => {
        console.log(`Server is running on PORT: ${process.env.PORT || 8000}`);
    })
})
.catch((err) => {
    console.log( "MONGO-DB connection FAILED !!", err);
})




