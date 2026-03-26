import nodemailer from "nodemailer";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { MercadoPagoConfig, Preference } from "mercadopago";

dotenv.config();

const app = express();
app.use(cors({
  origin: "*", // puedes restringir luego
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type"]
}));

app.use(express.json());

// 🔐 HEADERS EXTRA (IMPORTANTE PARA RENDER)
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

// 🔧 NECESARIO EN RENDER
app.set("trust proxy", 1);

// 🔐 MERCADO PAGO
const client = new MercadoPagoConfig({
  accessToken: process.env.ACCESS_TOKEN
});

// 📧 CORREO
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

// ✉️ FUNCIÓN CORREO
async function enviarCorreo(destino, productos, total) {
  const html = `<h2>Compra realizada</h2><p>Total: $${total}</p>`;

  await transporter.sendMail({
    from: process.env.SMTP_USER,
    to: destino,
    subject: "Compra realizada",
    html
  });
}

// 🚀 CREAR PAGO
app.post("/crear-pago", async (req, res) => {
  try {
    console.log("BODY:", req.body);

    const { correo, productos, total } = req.body;

    const preference = new Preference(client);

    const response = await preference.create({
      body: {
        items: productos.map(p => ({
          title: p.nombre,
          quantity: Number(p.cantidad),
          unit_price: Number(p.precio),
          currency_id: "MXN"
        })),
        payer: {
          email: correo || "test@test.com"
        },
        back_urls: {
          success: "https://tiendatelefoniabwac.com.mx/success.html",
          failure: "https://tiendatelefoniabwac.com.mx/error.html",
          pending: "https://tiendatelefoniabwac.com.mx/pendiente.html"
        }
      }
    });

    await enviarCorreo(correo, productos, total);

    res.json({ url: response.init_point });

  } catch (error) {
    console.error("ERROR:", error);
    res.status(500).json({ error: error.message });
  }
});

// 🌐 TEST
app.get("/", (req, res) => {
  res.send("Backend funcionando 🚀");
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Servidor corriendo 🚀");
});
