import nodemailer from "nodemailer";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { MercadoPagoConfig, Preference } from "mercadopago";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

console.log("🚀 Backend iniciado correctamente");

// 🔐 CONFIG MERCADO PAGO
const client = new MercadoPagoConfig({
  accessToken: process.env.ACCESS_TOKEN
});

// 📧 CONFIG CORREO
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

// ✉️ FUNCIÓN PARA ENVIAR CORREO
async function enviarCorreo(destino, productos, total = 0, metodo = "Pago en línea", numeroOrden = "N/A") {
  const filasHTML = productos.map(p => `
    <tr>
      <td>${p.nombre}</td>
      <td>${p.cantidad}</td>
      <td>$${Number(p.precio).toFixed(2)}</td>
      <td>$${(Number(p.precio) * Number(p.cantidad)).toFixed(2)}</td>
    </tr>
  `).join("");

  const html = `
    <h2>Compra realizada 🛒</h2>
    <p><strong>Orden:</strong> ${numeroOrden}</p>
    <p><strong>Método:</strong> ${metodo}</p>
    <p><strong>Total:</strong> $${Number(total).toFixed(2)}</p>

    <table border="1" cellpadding="5">
      <tr>
        <th>Producto</th>
        <th>Cant.</th>
        <th>Precio</th>
        <th>Subtotal</th>
      </tr>
      ${filasHTML}
    </table>
  `;

  await transporter.sendMail({
    from: `"Electroshop" <${process.env.SMTP_USER}>`,
    to: destino,
    subject: `Compra realizada | Orden ${numeroOrden}`,
    html
  });
}

// 🚀 RUTA CREAR PAGO
app.post("/crear-pago", async (req, res) => {
  try {
    console.log("🔥 Entró a /crear-pago");
    console.log("📨 Body recibido:", req.body);
    console.log("TOKEN:", process.env.ACCESS_TOKEN);

    const { correo, productos, total, metodo, numeroOrden } = req.body;

    if (!productos || productos.length === 0) {
      return res.status(400).json({ error: "No hay productos" });
    }

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

    if (correo) {
      console.log("📧 Enviando correo a:", correo);
      await enviarCorreo(correo, productos, total, "Mercado Pago", numeroOrden);
    }

    res.json({ url: response.init_point });

  } catch (error) {
    console.error("❌ Error real:", error);

    if (error?.cause) {
      console.error("📌 Detalle:", error.cause);
    }

    res.status(500).json({
      error: "Error al crear pago",
      detalle: error.message
    });
  }
});

// ✉️ RUTA ENVIAR CORREO
app.post("/enviar-correo", async (req, res) => {
  try {
    console.log("🔥 Entró a /enviar-correo");
    console.log("📨 Body recibido:", req.body);

    const { correo, productos, total, metodo, numeroOrden } = req.body;

    if (!correo) {
      return res.status(400).json({ error: "Correo requerido" });
    }

    if (!productos || productos.length === 0) {
      return res.status(400).json({ error: "Productos requeridos" });
    }

    await enviarCorreo(
      correo,
      productos,
      total,
      metodo || "Tarjeta",
      numeroOrden || "N/A"
    );

    res.json({ ok: true, mensaje: "Correo enviado correctamente" });

  } catch (error) {
    console.error("❌ Error enviando correo:", error);

    res.status(500).json({
      error: "Error al enviar correo",
      detalle: error.message
    });
  }
});

// 🌐 RUTA BASE
app.get("/", (req, res) => {
  res.send("Backend funcionando 🚀");
});

// 🚀 SERVIDOR
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT} 🚀`);
});idor corriendo en puerto ${PORT} 🚀`);
});
