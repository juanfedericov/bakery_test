import Image from "next/image";

export default function HeroSection() {
  return (
    <section className="hero" aria-labelledby="hero-title">
      <div className="hero-inner">
        <header className="hero-header">
          <span className="brand">
            bakery<span>.</span>
          </span>
          <span className="header-note">PASTELERÍA ARTESANAL</span>
        </header>

        <div className="hero-content">
          <div className="hero-copy">
            <p className="eyebrow"><span aria-hidden="true">✦</span> Un poquito de felicidad</p>
            <h1 id="hero-title">
              Los momentos dulces <em>se comparten.</em>
            </h1>
            <p className="hero-description">
              Tortas y delicias hechas con amor para celebrar lo cotidiano y hacer
              inolvidable cada ocasión.
            </p>
            <a className="hero-cta" href="#catalogo">
              Ver Catálogo <span aria-hidden="true">↗</span>
            </a>
            <p className="hero-signature"><span aria-hidden="true">♡</span> Un detalle dulce para cada historia</p>
          </div>

          <div className="hero-visual">
            <div className="hero-photo-main">
              <Image
                src="https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=800"
                alt="Torta de chocolate decorada"
                fill
                sizes="(max-width: 700px) 72vw, (max-width: 1100px) 42vw, 500px"
                className="hero-image"
                preload
              />
            </div>
            <div className="hero-photo-small">
              <Image
                src="https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?w=800"
                alt="Una selección de dulces de pastelería"
                fill
                sizes="(max-width: 700px) 36vw, 200px"
                className="hero-image"
              />
            </div>
            <div className="hero-stamp" aria-hidden="true">
              <span>HECHO CON</span>
              <strong>amor</strong>
              <span>PARA VOS</span>
            </div>
            <span className="hero-sparkle" aria-hidden="true">✳</span>
          </div>
        </div>
        <div className="hero-bottom" aria-hidden="true">
          <span>PEQUEÑOS PLACERES, GRANDES MOMENTOS</span>
          <span>DESLIZÁ PARA DESCUBRIR ↓</span>
        </div>
      </div>
    </section>
  );
}
