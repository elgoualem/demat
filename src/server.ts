import "dotenv/config";
import express from "express";
import servicesRouter from "./routes/services";
import ordersRouter from "./routes/orders";

const app = express();
app.use(express.json());

app.get("/health", (_req, res) => res.json({ status: "ok" }));
app.use("/services", servicesRouter);
app.use("/orders", ordersRouter);

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`API démarrée sur le port ${port}`));
