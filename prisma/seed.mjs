import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// description, category, amount (MXN), days ago (from today)
const EXPENSES = [
  ["Costco", "groceries", 1240, 1],
  ["Soriana", "groceries", 680, 4],
  ["Walmart", "groceries", 512, 8],
  ["Chedraui", "groceries", 390, 12],
  ["La Comer", "groceries", 745, 19],
  ["Costco", "groceries", 1105, 26],
  ["Soriana", "groceries", 615, 33],

  ["Starbucks", "food", 95, 0],
  ["Taquería El Fogón", "food", 180, 2],
  ["Sushi Roll", "food", 420, 6],
  ["Vips", "food", 265, 9],
  ["Domino's Pizza", "food", 310, 14],
  ["Starbucks", "food", 110, 17],
  ["Café Punta del Cielo", "food", 85, 21],
  ["Taquería El Fogón", "food", 195, 25],

  ["Uber", "transportation", 145, 1],
  ["Gasolina Pemex", "transportation", 850, 5],
  ["Metro CDMX", "transportation", 30, 7],
  ["Didi", "transportation", 120, 11],
  ["Estacionamiento Plaza", "transportation", 65, 15],
  ["Gasolina Pemex", "transportation", 900, 22],
  ["Uber", "transportation", 165, 28],

  ["Amazon", "shopping", 899, 3],
  ["Liverpool", "shopping", 1450, 10],
  ["Zara", "shopping", 780, 18],
  ["Mercado Libre", "shopping", 420, 24],

  ["Renta departamento", "housing", 8500, 1],
  ["Ferretería López", "housing", 320, 13],
  ["IKEA", "housing", 1680, 27],

  ["CFE", "bills", 480, 2],
  ["Telmex Internet", "bills", 599, 6],
  ["Agua CDMX", "bills", 210, 16],
  ["Gas Natural", "bills", 340, 23],

  ["Farmacia Guadalajara", "health", 180, 4],
  ["Consulta médica", "health", 700, 14],
  ["Gimnasio Smart Fit", "health", 449, 20],

  ["Cinépolis", "entertainment", 220, 5],
  ["Boletos concierto", "entertainment", 1200, 20],
  ["Cinépolis", "entertainment", 190, 29],

  ["Vuelo Volaris", "travel", 2400, 9],
  ["Hotel Cancún", "travel", 3200, 9],

  ["Curso en línea", "education", 599, 15],
  ["Libros Gandhi", "education", 340, 31],

  ["Peluquería", "personal", 250, 8],
  ["Spa", "personal", 650, 25],

  ["Netflix", "subscriptions", 219, 2],
  ["Spotify", "subscriptions", 119, 2],
  ["Disney+", "subscriptions", 159, 2],
  ["Amazon Prime", "subscriptions", 99, 16],

  ["Regalo cumpleaños", "other", 450, 12],
];

function isoDateDaysAgo(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

async function main() {
  await prisma.expense.deleteMany();

  await prisma.expense.createMany({
    data: EXPENSES.map(([description, category, amount, daysAgo]) => ({
      description,
      category,
      amount,
      currency: "MXN",
      date: isoDateDaysAgo(daysAgo),
      inputMethod: "text",
      confidence: 1,
    })),
  });

  console.log(`Seeded ${EXPENSES.length} expenses.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
