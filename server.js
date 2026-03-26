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
  accessToken: process.env.MP_ACCESS_TOKEN
});

// 📧 CONFIG CORREO
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

// ✉️ FUNCIÓN PARA ENVIAR CORREO BONITO
async function enviarCorreo(destino, productos, total = 0, metodo = "Pago en línea", numeroOrden = "N/A") {
  const filasHTML = productos.map(p => `
    <tr>
      <td style="padding:10px;border:1px solid #ddd;text-align:left;font-size:14px;">${p.nombre}</td>
      <td style="padding:10px;border:1px solid #ddd;text-align:center;font-size:14px;">${p.cantidad}</td>
      <td style="padding:10px;border:1px solid #ddd;text-align:center;font-size:14px;">$${Number(p.precio).toFixed(2)}</td>
      <td style="padding:10px;border:1px solid #ddd;text-align:center;font-size:14px;">$${(Number(p.precio) * Number(p.cantidad)).toFixed(2)}</td>
    </tr>
  `).join("");

  const html = `
    <div style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f4f4f4;padding:20px 10px;">
        <tr>
          <td align="center">
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:700px;background:#ffffff;border-radius:12px;overflow:hidden;">
              
              <tr>
                <td style="background:#111111;color:#ffffff;padding:25px;text-align:center;">
                  <h1 style="margin:0;font-size:28px;">Electroshop</h1>
                  <p style="margin:8px 0 0;color:#cccccc;font-size:14px;">Confirmación de compra</p>
                </td>
              </tr>

              <tr>
                <td style="padding:25px;">
                  <p style="font-size:15px;color:#333;margin-bottom:20px;">
                    Gracias por tu compra 🛒<br>
                    Tu pedido ha sido registrado correctamente.
                  </p>

                  <p style="font-size:15px;color:#333;margin-bottom:8px;"><strong>Número de orden:</strong> ${numeroOrden}</p>
                  <p style="font-size:15px;color:#333;margin-bottom:8px;"><strong>Método de pago:</strong> ${metodo}</p>
                  <p style="font-size:15px;color:#333;margin-bottom:20px;"><strong>Total:</strong> $${Number(total).toFixed(2)}</p>

                  <h3 style="margin:0 0 15px;font-size:18px;color:#111;">Resumen de tu compra</h3>

                  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;width:100%;table-layout:fixed;">
                    <thead>
                      <tr style="background:#111111;color:#ffffff;">
                        <th style="padding:10px;border:1px solid #ddd;font-size:13px;">Producto</th>
                        <th style="padding:10px;border:1px solid #ddd;font-size:13px;">Cant.</th>
                        <th style="padding:10px;border:1px solid #ddd;font-size:13px;">Precio</th>
                        <th style="padding:10px;border:1px solid #ddd;font-size:13px;">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${filasHTML}
                    </tbody>
                  </table>

                  <div style="margin-top:25px;text-align:right;font-size:22px;font-weight:bold;color:#111;">
                    Total: $${Number(total).toFixed(2)}
                  </div>
                </td>
              </tr>

              <tr>
                <td style="background:#f8f8f8;padding:18px;text-align:center;color:#666;font-size:13px;">
                  Gracias por comprar en <strong>Electroshop</strong><br>
                  Chiapas, México
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </div>
  `;

  await transporter.sendMail({
    from: `"Electroshop" <${process.env.SMTP_USER}>`,
    to: destino,
    subject: `Compra realizada | Orden ${numeroOrden} 🛒`,
    html
  });
}

// 🚀 RUTA MERCADO PAGO
app.post("/crear-pago", async (req, res) => {
  try {
    console.log("🔥 Entró a /crear-pago");
    console.log("📨 Body recibido:", req.body);

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
        back_urls: {
          back_urls: {
  success: "https://tiendatelefoniabwac.com.mx/success.html",
  failure: "https://tiendatelefoniabwac.com.mx/error.html",
  pending: "https://tiendatelefoniabwac.com.mx/pendiente.html"
}
        }
      }
    });

    if (correo) {
      console.log("📧 Enviando correo a:", correo);
      await enviarCorreo(correo, productos, total, "Mercado Pago");
    }

    res.json({ url: response.init_point });

  } catch (error) {
    console.error("❌ Error real:", error);
    res.status(500).json({ error: "Error al crear pago" });
  }
});

// ✉️ NUEVA RUTA PARA ENVIAR CORREO DESDE TARJETA
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

    await enviarCorreo(correo, productos, total, metodo || "Tarjeta", numeroOrden || "N/A");

    res.json({ ok: true, mensaje: "Correo enviado correctamente" });

  } catch (error) {
    console.error("❌ Error enviando correo:", error);
    res.status(500).json({ error: "Error al enviar correo" });
  }
});

app.get("/", (req, res) => {
  res.send("Backend funcionando 🚀");
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT} 🚀`);
});