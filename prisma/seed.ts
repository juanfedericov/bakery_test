import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const cakeImage =
  "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=800";
const tartImage =
  "https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?w=800";
const dessertImage =
  "https://images.unsplash.com/photo-1488477181946-6428a0291777?w=800";

const catalog = [
  {
    name: "Tortas de Cumpleaños",
    products: [
      {
        id: "seed-torta-rogel",
        name: "Torta Rogel",
        description: "Capas finas y crocantes de masa, rellenas de dulce de leche y coronadas con merengue.",
        ingredients: "Harina de trigo, yemas de huevo, manteca, leche, agua, sal, dulce de leche, claras de huevo y azúcar.",
        servings: "Rinde 10 a 12 personas",
        flavor: "Dulce de leche y merengue",
        price: "30000.00",
        imageUrl: cakeImage,
      },
      {
        id: "seed-torta-chocolate",
        name: "Torta de chocolate",
        description: "Bizcochuelo de chocolate con relleno y cobertura de chocolate.",
        flavor: "Chocolate",
        price: "28000.00",
        imageUrl: cakeImage,
      },
      {
        id: "seed-torta-vainilla",
        name: "Torta de vainilla",
        description: "Bizcochuelo de vainilla con crema y dulce de leche.",
        flavor: "Vainilla y dulce de leche",
        price: "26000.00",
        imageUrl: cakeImage,
      },
      {
        id: "seed-torta-frutilla",
        name: "Torta de frutilla",
        description: "Torta de vainilla con crema y frutillas.",
        flavor: "Frutilla",
        price: "29000.00",
        imageUrl: cakeImage,
      },
      {
        id: "seed-torta-red-velvet",
        name: "Torta red velvet",
        description: "Bizcochuelo red velvet con crema de queso.",
        flavor: "Red velvet",
        price: "32000.00",
        imageUrl: cakeImage,
      },
    ],
  },
  {
    name: "Tartas Dulces",
    products: [
      {
        id: "seed-tarta-limon",
        name: "Tarta de limón",
        description: "Masa crocante con crema de limón y merengue.",
        flavor: "Limón",
        price: "18000.00",
        imageUrl: tartImage,
      },
      {
        id: "seed-tarta-manzana",
        name: "Tarta de manzana",
        description: "Tarta de manzana con un toque de canela.",
        flavor: "Manzana y canela",
        price: "17000.00",
        imageUrl: tartImage,
      },
      {
        id: "seed-tarta-frutos-rojos",
        name: "Tarta de frutos rojos",
        description: "Tarta con crema pastelera y frutos rojos.",
        flavor: "Frutos rojos",
        price: "20000.00",
        imageUrl: tartImage,
      },
    ],
  },
  {
    name: "Postres Individuales",
    products: [
      {
        id: "seed-postre-tiramisu",
        name: "Tiramisú individual",
        description: "Postre de café y crema con cacao.",
        flavor: "Café y cacao",
        price: "5500.00",
        imageUrl: dessertImage,
      },
      {
        id: "seed-postre-cheesecake",
        name: "Cheesecake individual",
        description: "Cheesecake con salsa de frutos rojos.",
        flavor: "Queso y frutos rojos",
        price: "5800.00",
        imageUrl: dessertImage,
      },
      {
        id: "seed-postre-mousse",
        name: "Mousse de chocolate",
        description: "Mousse de chocolate en porción individual.",
        flavor: "Chocolate",
        price: "5000.00",
        imageUrl: dessertImage,
      },
    ],
  },
];

async function main() {
  await prisma.$transaction(async (tx) => {
    for (const { name, products } of catalog) {
      const category = await tx.category.upsert({
        where: { name },
        update: {},
        create: { name },
      });

      for (const product of products) {
        const { id, ...details } = product;
        await tx.product.upsert({
          where: { id },
          update: { ...details, categoryId: category.id },
          create: { id, ...details, categoryId: category.id },
        });
      }
    }
  });

  console.log("Catálogo inicial cargado correctamente.");
}

main()
  .catch((error: unknown) => {
    console.error("Error al cargar el catálogo inicial:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
