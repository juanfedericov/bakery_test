export default function AboutSection() {
  return (
    <section id="sobre-nosotros" className="about-section" aria-labelledby="about-title">
      <div className="about-inner">
        <div className="about-heading">
          <p className="eyebrow">Sobre nosotros</p>
          <h2 id="about-title">Lo bueno está en los detalles.</h2>
          <p>
            Creemos que los momentos más dulces empiezan con ingredientes de
            calidad y el cuidado de hacer las cosas a mano.
          </p>
        </div>

        <div className="about-features">
          <article className="about-feature">
            <div className="about-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 21v-9M12 16c-4 0-7-2.5-7-7 4 0 7 2.5 7 7ZM12 12c0-4.5 3-7 7-7 0 4.5-3 7-7 7Z" />
              </svg>
            </div>
            <h3>Preparación artesanal</h3>
            <p>Elaboramos nuestras tortas a mano, cuidando cada detalle y eligiendo ingredientes de calidad.</p>
          </article>

          <article className="about-feature">
            <div className="about-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h11v10H3zM14 10h4l3 3v3h-7z" />
                <circle cx="7" cy="18" r="2" />
                <circle cx="18" cy="18" r="2" />
              </svg>
            </div>
            <h3>Envíos a domicilio</h3>
            <p>Llevamos nuestros sabores hasta tu puerta. Consultá disponibilidad y zonas de entrega.</p>
          </article>

          <article className="about-feature">
            <div className="about-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 7v5l3 2" />
              </svg>
            </div>
            <h3>Retiro en fábrica</h3>
            <p>Retirá tu pedido por nuestra fábrica. La ubicación y los horarios de retiro están a confirmar.</p>
          </article>
        </div>
      </div>
    </section>
  );
}
