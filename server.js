const app = require("./app");

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`FB Automation app running: http://localhost:${PORT}`);
});
