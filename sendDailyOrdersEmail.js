import nodemailer from 'nodemailer';
import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configura tu cuenta de Gmail
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'agustinwojtyszyn99@gmail.com', // tu email
    pass: 'TU_CONTRASEÑA_O_APP_PASSWORD'  // usa app password si tienes 2FA
  }
});

// Función para enviar pedidos diarios por email
export async function sendDailyOrdersExcel(toEmail, orders) {
  // Generar datos para Excel
  const excelData = orders.map(order => ({
    'Fecha Pedido': order.fecha,
    'Usuario': order.usuario,
    'Email': order.email,
    'Teléfono': order.telefono,
    'Ubicación': order.ubicacion,
    'Platillos': order.platillos,
    'Estado': order.estado,
    'Comentarios': order.comentarios
  }));

  // Crear archivo Excel
  const ws = XLSX.utils.json_to_sheet(excelData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Pedidos Diarios');
  const fileName = `Pedidos_ServiFood_${new Date().toISOString().split('T')[0]}.xlsx`;
  const filePath = path.join(__dirname, fileName);
  XLSX.writeFile(wb, filePath);

  // Configurar email
  const mailOptions = {
    from: 'agustinwojtyszyn99@gmail.com',
    to: toEmail,
    subject: 'Pedidos Diarios ServiFood',
    text: 'Adjunto el archivo con los pedidos diarios.',
    attachments: [
      {
        filename: fileName,
        path: filePath
      }
    ]
  };

  // Enviar email
  await transporter.sendMail(mailOptions);
  // Eliminar archivo temporal
  fs.unlinkSync(filePath);
}
