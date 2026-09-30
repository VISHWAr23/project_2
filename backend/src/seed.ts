import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { UsersService } from './users/users.service.js';
import { UserRole } from './users/schemas/user.schema.js';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const usersService = app.get(UsersService);

  const adminEmail = process.env.ADMIN_EMAIL || 'admin@lathikka.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@123456';

  try {
    // Check if admin already exists
    const existingAdmin = await usersService.findByEmail(adminEmail);

    if (existingAdmin) {
      console.log(`✓ Admin user already exists: ${adminEmail}`);
    } else {
      // Create admin user
      const admin = await usersService.create({
        name: 'System Administrator',
        email: adminEmail,
        phone: '+1234567890',
        password: adminPassword,
        role: UserRole.ADMIN,
      });

      console.log('✓ Admin user created successfully!');
      console.log(`  Email: ${admin.email}`);
      console.log(`  Password: ${adminPassword}`);
      console.log('\n⚠️  IMPORTANT: Change the admin password after first login!');
    }
  } catch (error) {
    console.error('Error seeding admin user:', error);
    process.exit(1);
  } finally {
    await app.close();
  }
}

void bootstrap();
