import PDFDocument = require('pdfkit');
import { formatChile } from '../../common/timezone';

export interface PautaPdfData {
  patientName: string;
  date: Date;
  type: string;
  weight?: number;
  bodyFat?: number;
  muscleMass?: number;
  actionPlan?: string;
  attachmentNames: string[];
}

const PURPLE = '#6b21a8';
const SLATE = '#334155';

/** Genera la pauta nutricional en PDF (no incluye la anamnesis, que es interna). */
export function buildPautaPdf(data: PautaPdfData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 56, info: { Title: 'Pauta nutricional' } });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.fillColor(PURPLE).font('Helvetica-Bold').fontSize(20).text('Michelle Morales');
    doc.fillColor(SLATE).font('Helvetica').fontSize(11).text('Nutricionista · Nutrición Integral');
    doc.moveDown(0.5);
    doc.strokeColor('#e9d5ff').lineWidth(2).moveTo(56, doc.y).lineTo(539, doc.y).stroke();
    doc.moveDown(1);

    doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(16).text('Pauta nutricional');
    doc.moveDown(0.5);
    doc.font('Helvetica').fontSize(11).fillColor(SLATE);
    doc.text(`Paciente: ${data.patientName}`);
    doc.text(`Fecha de consulta: ${formatChile(data.date)}`);
    doc.text(`Modalidad: ${data.type}`);
    doc.moveDown(1);

    const measures = [
      ['Peso', data.weight, 'kg'],
      ['% Grasa corporal', data.bodyFat, '%'],
      ['Masa muscular', data.muscleMass, 'kg'],
    ].filter(([, value]) => value !== undefined && value !== null);

    if (measures.length) {
      doc.fillColor(PURPLE).font('Helvetica-Bold').fontSize(13).text('Mediciones');
      doc.moveDown(0.3);
      doc.font('Helvetica').fontSize(11).fillColor(SLATE);
      for (const [label, value, unit] of measures) {
        doc.text(`• ${label}: ${value} ${unit}`);
      }
      doc.moveDown(1);
    }

    doc.fillColor(PURPLE).font('Helvetica-Bold').fontSize(13).text('Indicaciones');
    doc.moveDown(0.3);
    doc.font('Helvetica').fontSize(11).fillColor('#0f172a');
    doc.text(data.actionPlan?.trim() || 'Sin indicaciones registradas.', { lineGap: 3 });

    if (data.attachmentNames.length) {
      doc.moveDown(1);
      doc.fillColor(PURPLE).font('Helvetica-Bold').fontSize(13).text('Material adjunto');
      doc.moveDown(0.3);
      doc.font('Helvetica').fontSize(11).fillColor(SLATE);
      for (const name of data.attachmentNames) doc.text(`• ${name}`);
    }

    doc.moveDown(2);
    doc.fontSize(9).fillColor('#94a3b8').text(
      'Este documento es personal y confidencial. Ante cualquier duda, contacta a tu nutricionista.',
      { align: 'center' },
    );
    doc.end();
  });
}
