import { createApp } from "./app.js";

const app = createApp();
app.listen(process.env.PORT || 3020, () => {
    console.log(`Server is running on port ${process.env.PORT || 3020}`);
    console.log('=== SERVER START', new Date().toISOString(), '===')
})