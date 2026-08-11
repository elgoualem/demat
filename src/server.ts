import "dotenv/config";
import express, { NextFunction, Request, Response } from "express";
import servicesRouter from "./routes/services";
import ordersRouter from "./routes/orders";
import authRouter from "./routes/auth";

const app = express();
app.use(express.json());

app.get("/health", (_req, res) => res.json({ status: "ok" }));
app.use("/auth", authRouter);
app.use("/services", servicesRouter);
app.use("/orders", ordersRouter);

// Filet de sécurité : toute erreur qui remonte jusqu'ici (via asyncHandler ou
// throw synchrone) renvoie un 500 propre au lieu de laisser Node planter le process.
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "internal_error" });
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`API démarrée sur le port ${port}`));
