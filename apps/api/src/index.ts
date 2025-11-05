import { app } from "./server.js";
import { env } from "./env.js";

const PORT = env.PORT;

app.listen(PORT, () => {
  console.log(`🚀 API running on http://localhost:${PORT}`);
});

