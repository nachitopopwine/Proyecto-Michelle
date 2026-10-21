// Aviso mínimo de privacidad para datos de salud (Ley 19.628 y Ley 20.584, Chile).
// Debe ser revisado y ajustado por Michelle antes de usarse con pacientes reales.
export default function PrivacyNotice() {
  return (
    <div className="space-y-3 text-sm leading-relaxed text-slate-600">
      <p>
        <strong className="text-slate-800">Responsable:</strong> Michelle Palta, nutricionista. Tus datos se usan
        exclusivamente para agendar tus horas, llevar tu ficha nutricional y enviarte tus pautas.
      </p>
      <p>
        <strong className="text-slate-800">Datos que guardamos:</strong> nombre, correo, teléfono, horas agendadas y, al
        atenderte, mediciones (peso, % de grasa, masa muscular), anamnesis e indicaciones. Los datos de salud son datos
        sensibles y se tratan con confidencialidad, conforme a la Ley N° 19.628 sobre protección de la vida privada y la
        Ley N° 20.584 de derechos y deberes de los pacientes.
      </p>
      <p>
        <strong className="text-slate-800">Quién accede:</strong> solo Michelle. No vendemos ni compartimos tus datos con
        terceros. Los correos se envían mediante un proveedor de correo que actúa por encargo nuestro.
      </p>
      <p>
        <strong className="text-slate-800">Tus derechos:</strong> puedes solicitar acceso, corrección o eliminación de tus
        datos escribiendo a Michelle. La ficha clínica se conserva por el plazo que exige la normativa de salud.
      </p>
    </div>
  );
}
