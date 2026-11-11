import { Prisma, PrismaClient } from "@prisma/client";
import AboutSection from "@/components/AboutSection";
import HeroSection from "@/components/HeroSection";

export const dynamic = "force-dynamic";

const globalForPrisma = globalThis as typeof globalThis & {
  prisma?: PrismaClient;
};
const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

async function ProductList() {
  if (!process.env.DATABASE_URL) {
    return <p className="catalog-message">El catálogo no está disponible en este momento.</p>;
  }

  let products;
  try {
    products = await prisma.product.findMany({
      select: { id: true, name: true, description: true },
      orderBy: { name: "asc" },
    });
  } catch (error) {
    if (!(error instanceof Prisma.PrismaClientInitializationError)) throw error;
    console.error("No se pudo conectar con el catálogo:", error);
    return <p className="catalog-message">El catálogo no está disponible en este momento.</p>;
  }

  if (products.length === 0) {
    return <p className="catalog-message">Todavía no hay productos en el catálogo.</p>;
  }

  return (
    <ul className="product-list">
      {products.map((product) => (
        <li key={product.id} className="product-card">
          <h3>{product.name}</h3>
          {product.description && <p>{product.description}</p>}
        </li>
      ))}
    </ul>
  );
}

export default function Home() {
  return (
    <main>
      <HeroSection />
      <section id="catalogo" className="catalog-section" aria-labelledby="catalog-title">
        <div className="catalog-inner">
          <p className="eyebrow">Hecho para compartir</p>
          <h2 id="catalog-title">Nuestro catálogo</h2>
          <p className="catalog-intro">Encontrá algo rico para cada ocasión.</p>
          <ProductList />
        </div>
      </section>
      <AboutSection />
    </main>
  );
}
