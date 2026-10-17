# Pothole detection app (MERN + YOLOv8 in the browser)

## 1. Model
Copy your trained model to client/public/model/best.onnx (exported with imgsz=416).

## 2. Server
cd server && npm install
Copy .env.example to .env and fill in MONGO_URI, JWT_SECRET, Cloudinary keys, ADMIN_EMAIL / ADMIN_PASSWORD
npm run seed     (creates the admin user once)
npm run dev      (http://localhost:5000)

## 3. Client
cd client && npm install && npm run dev
Laptop: open https://localhost:5173
Phone (same Wi-Fi): open the https://<laptop-ip>:5173 address Vite prints and accept the certificate warning.
