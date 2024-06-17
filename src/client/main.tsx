import App from './App.tsx'
import { createRoot } from "react-dom/client";
import '@audius/harmony/dist/harmony.css'

const domNode = document.getElementById("root")!;
const root = createRoot(domNode);
root.render(<App />);