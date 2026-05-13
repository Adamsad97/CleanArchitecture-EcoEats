import { PrismaClient } from "../src/generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import pg from "pg";

const pool   = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma  = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Début du seeding EcoEats (Fix Relations)...");

  // --- Nettoyage ---
  await prisma.orderStatusHistory.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.menuItem.deleteMany();
  await prisma.menuCategory.deleteMany();
  await prisma.restaurant.deleteMany();
  await prisma.driver.deleteMany();
  await prisma.review.deleteMany();
  await prisma.loyaltyPoint.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.authIdentity.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash("password123", 10);

  const createUser = async (email: string, name: string, role: any, phone: string) => {
    const user = await prisma.user.create({
      data: {
        email,
        name,
        role,
        phone,
        phone_verified: true,
      },
    });
    await prisma.authIdentity.create({
      data: {
        user_id: user.id,
        provider: "password",
        provider_user_id: email,
        password_hash: passwordHash,
      },
    });
    return user;
  };

  const clientU = await createUser("client@ecoeats.fr", "Jean Client", "CLIENT", "0601010101");
  const ownerU  = await createUser("owner@pizza.fr", "Mario Pizzaiolo", "RESTAURANT_OWNER", "0602020202");
  const driverU = await createUser("driver@fast.fr", "Vite Livreur", "DRIVER", "0603030303");
  await createUser("admin@ecoeats.fr", "Admin", "ADMIN", "0604040404");

  // --- Restaurant ---
  const restaurant = await prisma.restaurant.create({
    data: {
      owner_id: ownerU.id,
      name: "La Bella Pizza",
      description: "Pizzas artisanales",
      address: "10 Rue de la Paix, Paris",
      lat: 48.866,
      lng: 2.333,
      is_active: true,
      cuisine_type: "Italien",
      prep_time_min: 20,
      delivery_fee: 2.5,
      opening_hours: {},
    },
  });

  // --- Menu ---
  const category = await prisma.menuCategory.create({
    data: {
      restaurant_id: restaurant.id,
      name: "Pizzas",
      position: 0,
      availability: "always",
    },
  });

  await prisma.menuItem.create({
    data: {
      category_id: category.id,
      name: "Margherita",
      price: 12.5,
      is_available: true,
      is_popular: true,
      daily_stock: 50,
    },
  });

  // --- Driver ---
  await prisma.driver.create({
    data: {
      name: "Vite Livreur",
      email: "driver@fast.fr",
      phone: "0603030303",
      transport_type: "bike",
      is_online: true,
      is_verified: true,
      is_expert: true,
      lat: 48.86,
      lng: 2.33,
      user: { connect: { id: driverU.id } }
    },
  });

  console.log("✅ Seeding terminé !");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    pool.end();
  });
