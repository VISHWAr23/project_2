// User instruction: "add more smaple data in to this app"
// Importers/callers: npm run seed (backend/package.json)
// Affected API: MongoDB database seeding for all operational collections
// Data schemas: User, Customer, Visit, Order, Expense, Incentive, IncentiveRule, Notification

import dns from 'node:dns';
import { NestFactory } from '@nestjs/core';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { AppModule } from './app.module.js';
import { User, UserRole } from './users/schemas/user.schema.js';
import {
  Customer,
  CustomerStatus,
} from './customers/schemas/customer.schema.js';
import { Visit } from './visits/schemas/visit.schema.js';
import { Order, OrderStatus } from './orders/schemas/order.schema.js';
import {
  Expense,
  ExpenseType,
  ExpenseStatus,
} from './expenses/schemas/expense.schema.js';
import {
  Incentive,
  IncentiveStatus,
} from './incentives/schemas/incentive.schema.js';
import { IncentiveRule } from './incentives/schemas/incentive-rule.schema.js';
import {
  Notification,
  NotificationType,
  NotificationReferenceType,
} from './notifications/schemas/notification.schema.js';

// Ensure SRV records can be resolved properly in Node.js on Windows
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch {
  // Ignore
}

async function bootstrap() {
  console.log(
    '🌱 Starting comprehensive database seeding for Shri Lathikka Surgicals...',
  );
  const app = await NestFactory.createApplicationContext(AppModule);

  try {
    const userModel = app.get<Model<User>>(getModelToken(User.name));
    const customerModel = app.get<Model<Customer>>(
      getModelToken(Customer.name),
    );
    const visitModel = app.get<Model<Visit>>(getModelToken(Visit.name));
    const orderModel = app.get<Model<Order>>(getModelToken(Order.name));
    const expenseModel = app.get<Model<Expense>>(getModelToken(Expense.name));
    const incentiveModel = app.get<Model<Incentive>>(
      getModelToken(Incentive.name),
    );
    const incentiveRuleModel = app.get<Model<IncentiveRule>>(
      getModelToken(IncentiveRule.name),
    );
    const notificationModel = app.get<Model<Notification>>(
      getModelToken(Notification.name),
    );

    // 1. Clean existing data for a fresh 1-month realistic state
    console.log('🧹 Clearing existing collections...');
    await Promise.all([
      userModel.deleteMany({}),
      customerModel.deleteMany({}),
      visitModel.deleteMany({}),
      orderModel.deleteMany({}),
      expenseModel.deleteMany({}),
      incentiveModel.deleteMany({}),
      incentiveRuleModel.deleteMany({}),
      notificationModel.deleteMany({}),
    ]);
    console.log('✓ Collections wiped cleanly.');

    // 2. Hash default passwords
    const adminPasswordHash = await bcrypt.hash('Admin@123456', 10);
    const employeePasswordHash = await bcrypt.hash('Employee@123456', 10);

    // 3. Create Administrators and 6 Active Field Sales Executives
    console.log('👥 Creating 2 Admins and 6 Sales & Field Executives...');
    const admin = await userModel.create({
      name: 'System Administrator',
      email: 'admin@lathikka.com',
      phone: '+91 98000 00001',
      passwordHash: adminPasswordHash,
      role: UserRole.ADMIN,
      isActive: true,
    });

    await userModel.create({
      name: 'Operations Manager',
      email: 'manager@lathikka.com',
      phone: '+91 98000 00002',
      passwordHash: adminPasswordHash,
      role: UserRole.ADMIN,
      isActive: true,
    });

    const employeesData = [
      {
        name: 'Rahul Sharma',
        email: 'rahul.sharma@lathikka.com',
        phone: '+91 98765 43210',
        passwordHash: employeePasswordHash,
        role: UserRole.EMPLOYEE,
        isActive: true,
      },
      {
        name: 'Priya Patel',
        email: 'priya.patel@lathikka.com',
        phone: '+91 98765 43211',
        passwordHash: employeePasswordHash,
        role: UserRole.EMPLOYEE,
        isActive: true,
      },
      {
        name: 'Amit Kumar',
        email: 'amit.kumar@lathikka.com',
        phone: '+91 98765 43212',
        passwordHash: employeePasswordHash,
        role: UserRole.EMPLOYEE,
        isActive: true,
      },
      {
        name: 'Sneha Reddy',
        email: 'sneha.reddy@lathikka.com',
        phone: '+91 98765 43213',
        passwordHash: employeePasswordHash,
        role: UserRole.EMPLOYEE,
        isActive: true,
      },
      {
        name: 'Vikram Singh',
        email: 'vikram.singh@lathikka.com',
        phone: '+91 98765 43214',
        passwordHash: employeePasswordHash,
        role: UserRole.EMPLOYEE,
        isActive: true,
      },
      {
        name: 'Ananya Iyer',
        email: 'ananya.iyer@lathikka.com',
        phone: '+91 98765 43215',
        passwordHash: employeePasswordHash,
        role: UserRole.EMPLOYEE,
        isActive: true,
      },
    ];

    const employees = await userModel.insertMany(employeesData);
    console.log(
      `✓ Created 1 Administrator and ${employees.length} Field Employees.`,
    );

    // 4. Create Active Incentive Rule (5% standard sales commission)
    console.log('⚙️ Creating Active Incentive Rule (5%)...');
    await incentiveRuleModel.create({
      percentage: 5,
      isActive: true,
    });
    console.log('✓ Incentive rule configured at 5%.');

    // 5. Create 12 Hospital & Surgical Healthcare Enterprise Customers
    console.log(
      '🏢 Creating 12 Key Hospital & Healthcare Enterprise Customers...',
    );
    const customersData = [
      {
        customerName: 'Dr. K. Senthil Nathan',
        businessName: 'Meenakshi Mission Hospital & Research Centre',
        phone: '+91 98450 11223',
        address: 'Melur Main Road, Lake Area, Madurai, Tamil Nadu - 625107',
        assignedEmployee: employees[0]._id, // Rahul Sharma
        status: CustomerStatus.ACTIVE,
      },
      {
        customerName: 'Dr. Aravind Swaminathan',
        businessName: 'Apollo Speciality Hospitals & Heart Centre',
        phone: '+91 98450 22334',
        address:
          '21 Greams Lane, Thousand Lights, Chennai, Tamil Nadu - 600006',
        assignedEmployee: employees[1]._id, // Priya Patel
        status: CustomerStatus.ACTIVE,
      },
      {
        customerName: 'Dr. Rajeshwari Murugan',
        businessName: 'Royal Care Super Speciality Hospital',
        phone: '+91 98450 33445',
        address:
          '1/520 L&T Bypass Road, Neelambur, Coimbatore, Tamil Nadu - 641062',
        assignedEmployee: employees[2]._id, // Amit Kumar
        status: CustomerStatus.ACTIVE,
      },
      {
        customerName: 'Dr. Venkatesh Prasad',
        businessName: 'Sri Ramachandra Medical Centre & Hospital',
        phone: '+91 98450 44556',
        address: 'No. 1 Ramachandra Nagar, Porur, Chennai, Tamil Nadu - 600116',
        assignedEmployee: employees[1]._id, // Priya Patel
        status: CustomerStatus.ACTIVE,
      },
      {
        customerName: 'Dr. Suresh Balakrishnan',
        businessName: 'Kovai Medical Center and Hospital (KMCH)',
        phone: '+91 98450 55667',
        address: '99 Avanashi Road, Peelamedu, Coimbatore, Tamil Nadu - 641014',
        assignedEmployee: employees[2]._id, // Amit Kumar
        status: CustomerStatus.ACTIVE,
      },
      {
        customerName: 'Dr. Karthik Sundar',
        businessName: 'Kauvery Hospital & Critical Care Unit',
        phone: '+91 98450 66778',
        address:
          'No. 1 Royal Road, Cantonment, Tiruchirappalli, Tamil Nadu - 620001',
        assignedEmployee: employees[4]._id, // Vikram Singh
        status: CustomerStatus.ACTIVE,
      },
      {
        customerName: 'Dr. Radhika Menon',
        businessName: 'Manipal Hospital & Institute of Nephrology',
        phone: '+91 98450 77889',
        address:
          '98 HAL Old Airport Road, Kodihalli, Bangalore, Karnataka - 560017',
        assignedEmployee: employees[3]._id, // Sneha Reddy
        status: CustomerStatus.ACTIVE,
      },
      {
        customerName: 'Dr. T. Murugesan',
        businessName: 'Rajapalayam Government Head Hospital & Trauma Unit',
        phone: '+91 98450 88990',
        address:
          'PACR Salai, Tenkasi Main Road, Rajapalayam, Tamil Nadu - 626117',
        assignedEmployee: employees[0]._id, // Rahul Sharma
        status: CustomerStatus.ACTIVE,
      },
      {
        customerName: 'Dr. Subhashini Ramesh',
        businessName: 'Tirunelveli Medical College Hospital Annex',
        phone: '+91 98450 99001',
        address: 'High Ground, Palayamkottai, Tirunelveli, Tamil Nadu - 627011',
        assignedEmployee: employees[5]._id, // Ananya Iyer
        status: CustomerStatus.ACTIVE,
      },
      {
        customerName: 'M. Chellappa Nadar',
        businessName: 'Sri Latha Surgical & Pharma Distributors',
        phone: '+91 98451 00112',
        address:
          '42 Main Bazaar, Dindigul Highway, Dindigul, Tamil Nadu - 624001',
        assignedEmployee: employees[0]._id, // Rahul Sharma
        status: CustomerStatus.ACTIVE,
      },
      {
        customerName: 'Dr. Anandhan Varma',
        businessName: 'City Ortho & Joint Replacement Center',
        phone: '+91 98451 11223',
        address:
          '15 Salem Steel Plant Road, Meyyanur, Salem, Tamil Nadu - 636004',
        assignedEmployee: employees[4]._id, // Vikram Singh
        status: CustomerStatus.ACTIVE,
      },
      {
        customerName: 'S. Vijayaraghavan',
        businessName: 'Kavitha Healthcare & Surgical Wholesale',
        phone: '+91 98451 22334',
        address: '88 Mattuthavani Bus Stand Road, Madurai, Tamil Nadu - 625020',
        assignedEmployee: employees[5]._id, // Ananya Iyer
        status: CustomerStatus.ACTIVE,
      },
    ];

    const customers = await customerModel.insertMany(customersData);
    console.log(`✓ Created ${customers.length} Hospital & Surgical Customers.`);

    // 6. Generate 30 Days of Field Visits Across Territories
    const now = new Date();
    const daysAgo = (days: number) => {
      const d = new Date(now);
      d.setDate(d.getDate() - days);
      return d;
    };

    console.log('🗺️ Generating 30 Days of Field Visits across South India...');
    const visitsData = [
      // Week 1 (Days 29 to 23 ago)
      {
        customer: customers[0]._id, // Meenakshi Mission Madurai
        employee: employees[0]._id, // Rahul Sharma
        visitDate: daysAgo(29),
        purpose:
          'Annual Operation Theatre consumable contract discussion and catalog demo',
        notes:
          'Met with Chief Surgeon & Central Sterile Supply Department (CSSD) in-charge. Reviewed sterile suture requirements.',
        result:
          'Hospital requested formal rate contract for polyglactin sutures and disposable gowns.',
        followUpDate: daysAgo(24),
        latitude: 9.9482,
        longitude: 78.1578,
      },
      {
        customer: customers[1]._id, // Apollo Chennai
        employee: employees[1]._id, // Priya Patel
        visitDate: daysAgo(28),
        purpose:
          'Cardiovascular OT consumable trial review and emergency stock audit',
        notes:
          'Presented newly batch-tested electrosurgical cautery pencils and high-tensile drapes.',
        result: 'Procurement team approved trial consignment of 200 packs.',
        followUpDate: daysAgo(22),
        latitude: 13.0604,
        longitude: 80.2496,
      },
      {
        customer: customers[2]._id, // Royal Care Coimbatore
        employee: employees[2]._id, // Amit Kumar
        visitDate: daysAgo(28),
        purpose:
          'Orthopedic surgical implant and titanium plate inventory requirement discovery',
        notes:
          'Met Dr. Rajeshwari Murugan. High demand for sterile surgical blades No. 10/15 and bone screws.',
        result:
          'Price negotiation completed with a 5% institutional volume rebate.',
        followUpDate: daysAgo(21),
        latitude: 11.0512,
        longitude: 77.0825,
      },
      {
        customer: customers[6]._id, // Manipal Bangalore
        employee: employees[3]._id, // Sneha Reddy
        visitDate: daysAgo(27),
        purpose: 'Nephrology & Dialysis disposable supply line presentation',
        notes:
          'Demonstrated medical-grade IV cannulas and cuffed endotracheal tubes to biomedical director.',
        result:
          'Quality approval received. Awaiting central purchase committee sign-off.',
        followUpDate: daysAgo(20),
        latitude: 12.9592,
        longitude: 77.6499,
      },
      {
        customer: customers[5]._id, // Kauvery Trichy
        employee: employees[4]._id, // Vikram Singh
        visitDate: daysAgo(26),
        purpose: 'Trauma care and ICU disposable logistics schedule alignment',
        notes:
          'Discussed direct dispatch terms from Rajapalayam manufacturing hub to Trichy warehouse.',
        result:
          'Committed to guaranteed 24-hour turnaround on critical emergency sutures.',
        followUpDate: daysAgo(19),
        latitude: 10.8062,
        longitude: 78.6854,
      },
      {
        customer: customers[8]._id, // Tirunelveli Med College
        employee: employees[5]._id, // Ananya Iyer
        visitDate: daysAgo(25),
        purpose: 'Government medical college surgery department stock survey',
        notes:
          'Assessed quarterly requirement for Povidone-Iodine scrub solutions and sterile gauze swabs.',
        result: 'Department head drafted tender indent for bulk consignment.',
        followUpDate: daysAgo(18),
        latitude: 8.7139,
        longitude: 77.7567,
      },
      {
        customer: customers[7]._id, // Rajapalayam Govt Hospital
        employee: employees[0]._id, // Rahul Sharma
        visitDate: daysAgo(24),
        purpose:
          'Local hospital routine delivery coordination and surgeon feedback',
        notes:
          'Inspected offloaded batch of sterile surgical latex gloves. Zero defects noted.',
        result: 'Signed delivery receipt and collected next month schedule.',
        latitude: 9.4533,
        longitude: 77.5544,
      },
      {
        customer: customers[9]._id, // Sri Latha Surgical Dindigul
        employee: employees[0]._id, // Rahul Sharma
        visitDate: daysAgo(23),
        purpose:
          'Regional wholesale distributor inventory audit & credit review',
        notes:
          'Reviewed showroom stock levels for hypodermic syringes and spinal needles.',
        result: 'Distributor agreed to expand territory distribution by 15%.',
        followUpDate: daysAgo(17),
        latitude: 10.3673,
        longitude: 77.9803,
      },

      // Week 2 (Days 22 to 16 ago)
      {
        customer: customers[3]._id, // Sri Ramachandra Chennai
        employee: employees[1]._id, // Priya Patel
        visitDate: daysAgo(22),
        purpose:
          'General Surgery & Laparoscopy department demo and trial evaluation',
        notes:
          'Demonstrated 10mm Laparoscopic Trocar & Cannula sets with silicon valves.',
        result: 'OT head approved trial for upcoming 15 elective surgeries.',
        followUpDate: daysAgo(15),
        latitude: 13.0382,
        longitude: 80.1444,
      },
      {
        customer: customers[4]._id, // KMCH Coimbatore
        employee: employees[2]._id, // Amit Kumar
        visitDate: daysAgo(21),
        purpose:
          'Emergency Room and Critical Care suture replenishment meeting',
        notes:
          'Reviewed stock consumption of absorbable polyglactin sutures across 6 trauma beds.',
        result: 'Collected official bulk purchase order totaling ₹1,85,000.',
        followUpDate: daysAgo(14),
        latitude: 11.0428,
        longitude: 77.0396,
      },
      {
        customer: customers[10]._id, // City Ortho Salem
        employee: employees[4]._id, // Vikram Singh
        visitDate: daysAgo(20),
        purpose: 'Joint replacement surgical pack trial follow-up',
        notes:
          'Reviewed performance of sterile drape kits during total knee replacement surgeries.',
        result:
          'High surgeon satisfaction reported. Converted to recurring monthly contract.',
        followUpDate: daysAgo(13),
        latitude: 11.6643,
        longitude: 78.146,
      },
      {
        customer: customers[0]._id, // Meenakshi Mission Madurai
        employee: employees[0]._id, // Rahul Sharma
        visitDate: daysAgo(19),
        purpose: 'Purchase order finalization & contract signing',
        notes:
          'Met Purchase Director. Finalized rate agreement for FY 2026-27.',
        result:
          'First major bulk order placed for OT sterile packs. Total ₹2,45,000.',
        followUpDate: daysAgo(12),
        latitude: 9.9485,
        longitude: 78.1581,
      },
      {
        customer: customers[1]._id, // Apollo Chennai
        employee: employees[1]._id, // Priya Patel
        visitDate: daysAgo(18),
        purpose:
          'Consignment delivery inspection at central pharmacy warehouse',
        notes:
          'Verified 50 cartons of cautery pencils and disposable gowns upon arrival.',
        result: 'Inspection passed 100%. Signed Goods Inward Receipt (GRN).',
        latitude: 13.0607,
        longitude: 80.2499,
      },
      {
        customer: customers[11]._id, // Kavitha Wholesale Madurai
        employee: employees[5]._id, // Ananya Iyer
        visitDate: daysAgo(17),
        purpose: 'Retail stocking audit & dealer price list distribution',
        notes:
          'Set up product display stand for Lathikka brand surgical consumables.',
        result: 'Booked ₹95,000 distributor replenishment order.',
        followUpDate: daysAgo(10),
        latitude: 9.9325,
        longitude: 78.1368,
      },
      {
        customer: customers[6]._id, // Manipal Bangalore
        employee: employees[3]._id, // Sneha Reddy
        visitDate: daysAgo(16),
        purpose: 'Biomedical procurement committee presentation',
        notes:
          'Presented technical compliance certifications (ISO 13485 & CE) for surgical blades and suction tubes.',
        result:
          'Shortlisted as Tier-1 vendor for multi-centre hospital network.',
        followUpDate: daysAgo(9),
        latitude: 12.9595,
        longitude: 77.6503,
      },

      // Week 3 (Days 15 to 8 ago)
      {
        customer: customers[2]._id, // Royal Care Coimbatore
        employee: employees[2]._id, // Amit Kumar
        visitDate: daysAgo(15),
        purpose: 'Mid-month inventory top-up & emergency stock check',
        notes:
          'Checked emergency OT buffer. Surgical glove inventory running low due to high patient volume.',
        result: 'Urgent express delivery order placed for 150 boxes.',
        followUpDate: daysAgo(8),
        latitude: 11.0515,
        longitude: 77.0829,
      },
      {
        customer: customers[5]._id, // Kauvery Trichy
        employee: employees[4]._id, // Vikram Singh
        visitDate: daysAgo(14),
        purpose: 'Quarterly supply contract reconciliation & account audit',
        notes:
          'Reconciled input tax credit statements and invoice payments with finance manager.',
        result:
          'Received payment cheque for Invoice #LATH-2804. Zero balance pending.',
        latitude: 10.8065,
        longitude: 78.6857,
      },
      {
        customer: customers[7]._id, // Rajapalayam Govt Hospital
        employee: employees[0]._id, // Rahul Sharma
        visitDate: daysAgo(13),
        purpose: 'Delivery verification for emergency trauma ward supplies',
        notes:
          'Handed over 40 cartons of antiseptic scrub and sterile abdominal sponges.',
        result: 'Emergency ward fully stocked for weekend duty.',
        latitude: 9.4536,
        longitude: 77.5548,
      },
      {
        customer: customers[3]._id, // Sri Ramachandra Chennai
        employee: employees[1]._id, // Priya Patel
        visitDate: daysAgo(12),
        purpose: 'Post-operative feedback collection from senior surgeons',
        notes:
          'Gathered feedback on suture knot security and needle sharpness during vascular procedures.',
        result: 'Surgeons gave 5-star rating on needle tensile strength.',
        followUpDate: daysAgo(5),
        latitude: 13.0385,
        longitude: 80.1448,
      },
      {
        customer: customers[8]._id, // Tirunelveli Med College
        employee: employees[5]._id, // Ananya Iyer
        visitDate: daysAgo(11),
        purpose: 'Tender specification submission and sample pack handover',
        notes:
          'Submitted sealed sample packs of surgical drapes and disposable scalpel blades.',
        result: 'Samples acknowledged by Superintendent of Medical Supplies.',
        followUpDate: daysAgo(4),
        latitude: 8.7142,
        longitude: 77.7571,
      },
      {
        customer: customers[10]._id, // City Ortho Salem
        employee: employees[4]._id, // Vikram Singh
        visitDate: daysAgo(10),
        purpose: 'Monthly restocking review & new product brochure rollout',
        notes:
          'Introduced newly manufactured spinal anesthesia Quincke needles.',
        result: 'Booked order for 50 boxes of spinal needles.',
        followUpDate: daysAgo(3),
        latitude: 11.6646,
        longitude: 78.1464,
      },
      {
        customer: customers[0]._id, // Meenakshi Mission Madurai
        employee: employees[0]._id, // Rahul Sharma
        visitDate: daysAgo(9),
        purpose:
          'Routine weekly relationship management and order delivery review',
        notes:
          'Checked OT floor supplies. Discussed requirements for upcoming international cardiology workshop.',
        result: 'Advance requisition submitted for dedicated cardio drapes.',
        followUpDate: daysAgo(2),
        latitude: 9.9488,
        longitude: 78.1584,
      },
      {
        customer: customers[4]._id, // KMCH Coimbatore
        employee: employees[2]._id, // Amit Kumar
        visitDate: daysAgo(8),
        purpose: 'Consignment delivery tracking & store manager briefing',
        notes:
          'Supervised offloading of temperature-controlled sterile suture shipment.',
        result:
          'Delivery verified and accepted into central air-conditioned pharmacy.',
        latitude: 11.0431,
        longitude: 77.0399,
      },

      // Week 4 (Days 7 ago to Today)
      {
        customer: customers[1]._id, // Apollo Chennai
        employee: employees[1]._id, // Priya Patel
        visitDate: daysAgo(6),
        purpose:
          'End-of-month procurement target review & large replenishment order',
        notes:
          'Finalized monthly orders for both Greams Road and Vanagaram specialty centers.',
        result: 'Collected major purchase order totaling ₹3,15,000.',
        followUpDate: daysAgo(1),
        latitude: 13.0609,
        longitude: 80.2502,
      },
      {
        customer: customers[6]._id, // Manipal Bangalore
        employee: employees[3]._id, // Sneha Reddy
        visitDate: daysAgo(5),
        purpose: 'High-value annual supply contract agreement signing',
        notes:
          'Presented comprehensive 2026-2027 enterprise pricing schedule and quarterly rebates.',
        result:
          'Master Service Agreement signed by Regional Commercial Director.',
        followUpDate: new Date(now.getTime() + 6 * 86400000), // 6 days in future
        latitude: 12.9598,
        longitude: 77.6507,
      },
      {
        customer: customers[9]._id, // Sri Latha Surgical Dindigul
        employee: employees[0]._id, // Rahul Sharma
        visitDate: daysAgo(4),
        purpose: 'Dealer inventory restocking for Central Tamil Nadu clinics',
        notes:
          'Conducted distributor review. Fast turnover noted on surgical gloves and IV cannulas.',
        result: 'Dispatched ₹1,20,000 consignment.',
        latitude: 10.3676,
        longitude: 77.9807,
      },
      {
        customer: customers[2]._id, // Royal Care Coimbatore
        employee: employees[2]._id, // Amit Kumar
        visitDate: daysAgo(3),
        purpose: 'Customer satisfaction audit & clinical usage feedback',
        notes:
          'Conducted interview with Chief Nursing Officer and OT sterilisation supervisor.',
        result:
          'CSAT rating: 10/10. Requested additional batch of laparoscopy port kits.',
        latitude: 11.0518,
        longitude: 77.0832,
      },
      {
        customer: customers[5]._id, // Kauvery Trichy
        employee: employees[4]._id, // Vikram Singh
        visitDate: daysAgo(2),
        purpose: 'Urgent spot order for weekend emergency surgery backlog',
        notes:
          'Handled express requisition for cuffed endotracheal tubes and suction sets.',
        result: 'Supplies dispatched directly from local hub within 4 hours.',
        latitude: 10.8068,
        longitude: 78.686,
      },
      {
        customer: customers[11]._id, // Kavitha Wholesale Madurai
        employee: employees[5]._id, // Ananya Iyer
        visitDate: daysAgo(1),
        purpose: 'Month-close payment collection & next month planning',
        notes:
          'Cleared account receivables. Discussed seasonal demand for antiseptic solutions.',
        result: 'Reorder placed into system for early next week delivery.',
        followUpDate: new Date(now.getTime() + 5 * 86400000),
        latitude: 9.9328,
        longitude: 78.1372,
      },
      {
        customer: customers[0]._id, // Meenakshi Mission Madurai
        employee: employees[0]._id, // Rahul Sharma
        visitDate: daysAgo(0),
        purpose: 'Live inventory stock check & immediate reorder placement',
        notes:
          'Inspected CSSD floor racks. High consumption of disposable drape kits.',
        result: 'Pending order placed into system for admin sign-off.',
        latitude: 9.949,
        longitude: 78.1587,
      },
    ];

    const visits = await visitModel.insertMany(visitsData);
    console.log(`✓ Inserted ${visits.length} Field Visits.`);

    // 7. Generate 30 Days of Multi-Item Surgical Supply Orders
    console.log('📦 Generating 30 Days of Surgical Supply Customer Orders...');
    const ordersData = [
      // Order 1 (28 days ago) - COMPLETED
      {
        customer: customers[0]._id, // Meenakshi Mission Madurai
        employee: employees[0]._id, // Rahul Sharma
        orderDate: daysAgo(28),
        items: [
          {
            productName:
              'Sterile Absorbable Polyglactin Sutures 3-0 (Box of 36)',
            quantity: 25,
            unitPrice: 2800,
            totalPrice: 70000,
          },
          {
            productName:
              'Medical Grade Sterile Latex Surgical Gloves Size 7.5 (Box of 50 Pairs)',
            quantity: 30,
            unitPrice: 1400,
            totalPrice: 42000,
          },
          {
            productName:
              'Disposable Non-Woven Surgical Gown & Drape Kit (Pack of 20)',
            quantity: 20,
            unitPrice: 1950,
            totalPrice: 39000,
          },
        ],
        totalAmount: 151000,
        notes:
          'Monthly standard OT replenishment consignment for Meenakshi Mission Madurai.',
        status: OrderStatus.COMPLETED,
        approvedBy: admin._id,
        approvedAt: daysAgo(27),
      },

      // Order 2 (27 days ago) - COMPLETED
      {
        customer: customers[1]._id, // Apollo Chennai
        employee: employees[1]._id, // Priya Patel
        orderDate: daysAgo(27),
        items: [
          {
            productName:
              'Electrosurgical Cautery Pencil with 3m Cable & Holster (Box of 25)',
            quantity: 40,
            unitPrice: 2250,
            totalPrice: 90000,
          },
          {
            productName: 'Laparoscopic Trocar & Cannula Port Set 10mm',
            quantity: 15,
            unitPrice: 4800,
            totalPrice: 72000,
          },
          {
            productName:
              'Povidone-Iodine Surgical Scrub Solution 500ml (Carton of 24)',
            quantity: 18,
            unitPrice: 2100,
            totalPrice: 37800,
          },
        ],
        totalAmount: 199800,
        notes:
          'Cardiology & General Surgery theatre consumable lot for Apollo Greams Road.',
        status: OrderStatus.COMPLETED,
        approvedBy: admin._id,
        approvedAt: daysAgo(26),
      },

      // Order 3 (25 days ago) - COMPLETED
      {
        customer: customers[2]._id, // Royal Care Coimbatore
        employee: employees[2]._id, // Amit Kumar
        orderDate: daysAgo(25),
        items: [
          {
            productName:
              'Orthopedic Titanium Bone Screws & Compression Plate Kit',
            quantity: 8,
            unitPrice: 14500,
            totalPrice: 116000,
          },
          {
            productName:
              'Sterile Disposable Scalpel Blades No. 10 / No. 15 (Box of 100)',
            quantity: 35,
            unitPrice: 850,
            totalPrice: 29750,
          },
          {
            productName:
              'Surgical Gauze Swabs 10x10cm 12-Ply Sterile (Pack of 100)',
            quantity: 50,
            unitPrice: 620,
            totalPrice: 31000,
          },
        ],
        totalAmount: 176750,
        notes:
          'Trauma & Orthopedic surgery ward requirements for Royal Care Coimbatore.',
        status: OrderStatus.COMPLETED,
        approvedBy: admin._id,
        approvedAt: daysAgo(24),
      },

      // Order 4 (24 days ago) - COMPLETED
      {
        customer: customers[6]._id, // Manipal Bangalore
        employee: employees[3]._id, // Sneha Reddy
        orderDate: daysAgo(24),
        items: [
          {
            productName: 'Endotracheal Cuffed Tubes Size 7.0 / 7.5 (Box of 20)',
            quantity: 30,
            unitPrice: 2400,
            totalPrice: 72000,
          },
          {
            productName: 'IV Cannula with Injection Port 20G (Box of 100)',
            quantity: 40,
            unitPrice: 1850,
            totalPrice: 74000,
          },
          {
            productName: 'Pulse Oximeter Reusable Silicone Finger Sensor Cable',
            quantity: 12,
            unitPrice: 3200,
            totalPrice: 38400,
          },
        ],
        totalAmount: 184400,
        notes:
          'ICU and Critical Care supply bundle for Manipal Hospital Bangalore.',
        status: OrderStatus.COMPLETED,
        approvedBy: admin._id,
        approvedAt: daysAgo(23),
      },

      // Order 5 (22 days ago) - COMPLETED
      {
        customer: customers[5]._id, // Kauvery Trichy
        employee: employees[4]._id, // Vikram Singh
        orderDate: daysAgo(22),
        items: [
          {
            productName:
              'Suction Connecting Tube with Yankauer Handle (Box of 30)',
            quantity: 25,
            unitPrice: 2600,
            totalPrice: 65000,
          },
          {
            productName:
              'Sterile Abdominal Sponge with X-Ray Detectable Thread (Pack of 50)',
            quantity: 30,
            unitPrice: 1750,
            totalPrice: 52500,
          },
          {
            productName: 'Spinal Anesthesia Needles 25G Quincke (Box of 50)',
            quantity: 20,
            unitPrice: 2100,
            totalPrice: 42000,
          },
        ],
        totalAmount: 159500,
        notes:
          'Emergency and operating theatre consumables for Kauvery Hospital Trichy.',
        status: OrderStatus.COMPLETED,
        approvedBy: admin._id,
        approvedAt: daysAgo(21),
      },

      // Order 6 (20 days ago) - COMPLETED
      {
        customer: customers[3]._id, // Sri Ramachandra Chennai
        employee: employees[1]._id, // Priya Patel
        orderDate: daysAgo(20),
        items: [
          {
            productName: 'Laparoscopic Trocar & Cannula Port Set 10mm',
            quantity: 20,
            unitPrice: 4800,
            totalPrice: 96000,
          },
          {
            productName:
              'Sterile Absorbable Polyglactin Sutures 3-0 (Box of 36)',
            quantity: 30,
            unitPrice: 2800,
            totalPrice: 84000,
          },
          {
            productName:
              'Medical Grade Sterile Latex Surgical Gloves Size 7.5 (Box of 50 Pairs)',
            quantity: 45,
            unitPrice: 1400,
            totalPrice: 63000,
          },
        ],
        totalAmount: 243000,
        notes:
          'General & Minimally Invasive Surgery consignment for Sri Ramachandra Porur.',
        status: OrderStatus.COMPLETED,
        approvedBy: admin._id,
        approvedAt: daysAgo(19),
      },

      // Order 7 (19 days ago) - COMPLETED
      {
        customer: customers[4]._id, // KMCH Coimbatore
        employee: employees[2]._id, // Amit Kumar
        orderDate: daysAgo(19),
        items: [
          {
            productName:
              'Disposable Non-Woven Surgical Gown & Drape Kit (Pack of 20)',
            quantity: 35,
            unitPrice: 1950,
            totalPrice: 68250,
          },
          {
            productName:
              'Electrosurgical Cautery Pencil with 3m Cable & Holster (Box of 25)',
            quantity: 30,
            unitPrice: 2250,
            totalPrice: 67500,
          },
          {
            productName:
              'Hypodermic Syringes 5ml with 23G Needle (Carton of 500)',
            quantity: 22,
            unitPrice: 2450,
            totalPrice: 53900,
          },
        ],
        totalAmount: 189650,
        notes:
          'Biomedical & surgical consumables consignment for KMCH Avanashi Road.',
        status: OrderStatus.COMPLETED,
        approvedBy: admin._id,
        approvedAt: daysAgo(18),
      },

      // Order 8 (17 days ago) - APPROVED
      {
        customer: customers[7]._id, // Rajapalayam Govt Hospital
        employee: employees[0]._id, // Rahul Sharma
        orderDate: daysAgo(17),
        items: [
          {
            productName:
              'Povidone-Iodine Surgical Scrub Solution 500ml (Carton of 24)',
            quantity: 25,
            unitPrice: 2100,
            totalPrice: 52500,
          },
          {
            productName:
              'Surgical Gauze Swabs 10x10cm 12-Ply Sterile (Pack of 100)',
            quantity: 60,
            unitPrice: 620,
            totalPrice: 37200,
          },
          {
            productName:
              'Sterile Disposable Scalpel Blades No. 10 / No. 15 (Box of 100)',
            quantity: 20,
            unitPrice: 850,
            totalPrice: 17000,
          },
        ],
        totalAmount: 106700,
        notes:
          'Monthly emergency care supply allocation for Rajapalayam Head Hospital.',
        status: OrderStatus.APPROVED,
        approvedBy: admin._id,
        approvedAt: daysAgo(16),
      },

      // Order 9 (16 days ago) - APPROVED
      {
        customer: customers[8]._id, // Tirunelveli Med College
        employee: employees[5]._id, // Ananya Iyer
        orderDate: daysAgo(16),
        items: [
          {
            productName:
              'Sterile Absorbable Polyglactin Sutures 3-0 (Box of 36)',
            quantity: 40,
            unitPrice: 2800,
            totalPrice: 112000,
          },
          {
            productName: 'IV Cannula with Injection Port 20G (Box of 100)',
            quantity: 50,
            unitPrice: 1850,
            totalPrice: 92500,
          },
        ],
        totalAmount: 204500,
        notes:
          'Government institutional supply contract execution for Tirunelveli Med College.',
        status: OrderStatus.APPROVED,
        approvedBy: admin._id,
        approvedAt: daysAgo(15),
      },

      // Order 10 (14 days ago) - APPROVED
      {
        customer: customers[9]._id, // Sri Latha Surgical Dindigul
        employee: employees[0]._id, // Rahul Sharma
        orderDate: daysAgo(14),
        items: [
          {
            productName:
              'Medical Grade Sterile Latex Surgical Gloves Size 7.5 (Box of 50 Pairs)',
            quantity: 50,
            unitPrice: 1400,
            totalPrice: 70000,
          },
          {
            productName:
              'Hypodermic Syringes 5ml with 23G Needle (Carton of 500)',
            quantity: 25,
            unitPrice: 2450,
            totalPrice: 61250,
          },
        ],
        totalAmount: 131250,
        notes:
          'Wholesale distributor replenishment order for Dindigul territory.',
        status: OrderStatus.APPROVED,
        approvedBy: admin._id,
        approvedAt: daysAgo(13),
      },

      // Order 11 (13 days ago) - APPROVED
      {
        customer: customers[10]._id, // City Ortho Salem
        employee: employees[4]._id, // Vikram Singh
        orderDate: daysAgo(13),
        items: [
          {
            productName:
              'Orthopedic Titanium Bone Screws & Compression Plate Kit',
            quantity: 10,
            unitPrice: 14500,
            totalPrice: 145000,
          },
          {
            productName: 'Spinal Anesthesia Needles 25G Quincke (Box of 50)',
            quantity: 25,
            unitPrice: 2100,
            totalPrice: 52500,
          },
        ],
        totalAmount: 197500,
        notes:
          'Joint replacement and orthopedic consumables for City Ortho Salem.',
        status: OrderStatus.APPROVED,
        approvedBy: admin._id,
        approvedAt: daysAgo(12),
      },

      // Order 12 (11 days ago) - APPROVED
      {
        customer: customers[1]._id, // Apollo Chennai
        employee: employees[1]._id, // Priya Patel
        orderDate: daysAgo(11),
        items: [
          {
            productName:
              'Disposable Non-Woven Surgical Gown & Drape Kit (Pack of 20)',
            quantity: 50,
            unitPrice: 1950,
            totalPrice: 97500,
          },
          {
            productName:
              'Electrosurgical Cautery Pencil with 3m Cable & Holster (Box of 25)',
            quantity: 35,
            unitPrice: 2250,
            totalPrice: 78750,
          },
          {
            productName:
              'Suction Connecting Tube with Yankauer Handle (Box of 30)',
            quantity: 30,
            unitPrice: 2600,
            totalPrice: 78000,
          },
        ],
        totalAmount: 254250,
        notes: 'Fortnightly surgical replenishment order for Apollo Chennai.',
        status: OrderStatus.APPROVED,
        approvedBy: admin._id,
        approvedAt: daysAgo(10),
      },

      // Order 13 (10 days ago) - APPROVED
      {
        customer: customers[2]._id, // Royal Care Coimbatore
        employee: employees[2]._id, // Amit Kumar
        orderDate: daysAgo(10),
        items: [
          {
            productName:
              'Sterile Absorbable Polyglactin Sutures 3-0 (Box of 36)',
            quantity: 35,
            unitPrice: 2800,
            totalPrice: 98000,
          },
          {
            productName: 'Endotracheal Cuffed Tubes Size 7.0 / 7.5 (Box of 20)',
            quantity: 25,
            unitPrice: 2400,
            totalPrice: 60000,
          },
        ],
        totalAmount: 158000,
        notes: 'Surgical ICU and OT supplies for Royal Care Coimbatore.',
        status: OrderStatus.APPROVED,
        approvedBy: admin._id,
        approvedAt: daysAgo(9),
      },

      // Order 14 (8 days ago) - APPROVED
      {
        customer: customers[6]._id, // Manipal Bangalore
        employee: employees[3]._id, // Sneha Reddy
        orderDate: daysAgo(8),
        items: [
          {
            productName: 'Laparoscopic Trocar & Cannula Port Set 10mm',
            quantity: 25,
            unitPrice: 4800,
            totalPrice: 120000,
          },
          {
            productName:
              'Sterile Abdominal Sponge with X-Ray Detectable Thread (Pack of 50)',
            quantity: 40,
            unitPrice: 1750,
            totalPrice: 70000,
          },
          {
            productName: 'Pulse Oximeter Reusable Silicone Finger Sensor Cable',
            quantity: 15,
            unitPrice: 3200,
            totalPrice: 48000,
          },
        ],
        totalAmount: 238000,
        notes:
          'Minimally Invasive Surgery centre consignment for Manipal Bangalore.',
        status: OrderStatus.APPROVED,
        approvedBy: admin._id,
        approvedAt: daysAgo(7),
      },

      // Order 15 (7 days ago) - APPROVED
      {
        customer: customers[11]._id, // Kavitha Wholesale Madurai
        employee: employees[5]._id, // Ananya Iyer
        orderDate: daysAgo(7),
        items: [
          {
            productName:
              'Medical Grade Sterile Latex Surgical Gloves Size 7.5 (Box of 50 Pairs)',
            quantity: 40,
            unitPrice: 1400,
            totalPrice: 56000,
          },
          {
            productName:
              'Povidone-Iodine Surgical Scrub Solution 500ml (Carton of 24)',
            quantity: 20,
            unitPrice: 2100,
            totalPrice: 42000,
          },
        ],
        totalAmount: 98000,
        notes: 'Distributor restocking for Madurai regional clinics.',
        status: OrderStatus.APPROVED,
        approvedBy: admin._id,
        approvedAt: daysAgo(6),
      },

      // Order 16 (5 days ago) - APPROVED
      {
        customer: customers[0]._id, // Meenakshi Mission Madurai
        employee: employees[0]._id, // Rahul Sharma
        orderDate: daysAgo(5),
        items: [
          {
            productName:
              'Disposable Non-Woven Surgical Gown & Drape Kit (Pack of 20)',
            quantity: 45,
            unitPrice: 1950,
            totalPrice: 87750,
          },
          {
            productName:
              'Sterile Absorbable Polyglactin Sutures 3-0 (Box of 36)',
            quantity: 30,
            unitPrice: 2800,
            totalPrice: 84000,
          },
        ],
        totalAmount: 171750,
        notes:
          'Monthly standard surgery pack repeat order for Meenakshi Mission.',
        status: OrderStatus.APPROVED,
        approvedBy: admin._id,
        approvedAt: daysAgo(4),
      },

      // Order 17 (4 days ago) - APPROVED
      {
        customer: customers[5]._id, // Kauvery Trichy
        employee: employees[4]._id, // Vikram Singh
        orderDate: daysAgo(4),
        items: [
          {
            productName:
              'Electrosurgical Cautery Pencil with 3m Cable & Holster (Box of 25)',
            quantity: 25,
            unitPrice: 2250,
            totalPrice: 56250,
          },
          {
            productName: 'IV Cannula with Injection Port 20G (Box of 100)',
            quantity: 35,
            unitPrice: 1850,
            totalPrice: 64750,
          },
        ],
        totalAmount: 121000,
        notes:
          'Critical care consumables dispatch for Kauvery Hospital Trichy.',
        status: OrderStatus.APPROVED,
        approvedBy: admin._id,
        approvedAt: daysAgo(3),
      },

      // Order 18 (3 days ago) - PENDING
      {
        customer: customers[3]._id, // Sri Ramachandra Chennai
        employee: employees[1]._id, // Priya Patel
        orderDate: daysAgo(3),
        items: [
          {
            productName: 'Laparoscopic Trocar & Cannula Port Set 10mm',
            quantity: 18,
            unitPrice: 4800,
            totalPrice: 86400,
          },
          {
            productName:
              'Disposable Non-Woven Surgical Gown & Drape Kit (Pack of 20)',
            quantity: 30,
            unitPrice: 1950,
            totalPrice: 58500,
          },
        ],
        totalAmount: 144900,
        notes:
          'Awaiting administrative approval for dispatch from central facility.',
        status: OrderStatus.PENDING,
      },

      // Order 19 (2 days ago) - PENDING
      {
        customer: customers[4]._id, // KMCH Coimbatore
        employee: employees[2]._id, // Amit Kumar
        orderDate: daysAgo(2),
        items: [
          {
            productName:
              'Orthopedic Titanium Bone Screws & Compression Plate Kit',
            quantity: 6,
            unitPrice: 14500,
            totalPrice: 87000,
          },
          {
            productName:
              'Sterile Disposable Scalpel Blades No. 10 / No. 15 (Box of 100)',
            quantity: 30,
            unitPrice: 850,
            totalPrice: 25500,
          },
        ],
        totalAmount: 112500,
        notes: 'Pending purchase clearance from KMCH commercial division.',
        status: OrderStatus.PENDING,
      },

      // Order 20 (1 day ago) - PENDING
      {
        customer: customers[0]._id, // Meenakshi Mission Madurai
        employee: employees[0]._id, // Rahul Sharma
        orderDate: daysAgo(1),
        items: [
          {
            productName:
              'Sterile Absorbable Polyglactin Sutures 3-0 (Box of 36)',
            quantity: 35,
            unitPrice: 2800,
            totalPrice: 98000,
          },
          {
            productName:
              'Medical Grade Sterile Latex Surgical Gloves Size 7.5 (Box of 50 Pairs)',
            quantity: 40,
            unitPrice: 1400,
            totalPrice: 56000,
          },
        ],
        totalAmount: 154000,
        notes: 'Submitted for manager review.',
        status: OrderStatus.PENDING,
      },

      // Order 21 (0 days ago) - PENDING
      {
        customer: customers[6]._id, // Manipal Bangalore
        employee: employees[3]._id, // Sneha Reddy
        orderDate: daysAgo(0),
        items: [
          {
            productName: 'Endotracheal Cuffed Tubes Size 7.0 / 7.5 (Box of 20)',
            quantity: 25,
            unitPrice: 2400,
            totalPrice: 60000,
          },
          {
            productName:
              'Suction Connecting Tube with Yankauer Handle (Box of 30)',
            quantity: 20,
            unitPrice: 2600,
            totalPrice: 52000,
          },
        ],
        totalAmount: 112000,
        notes:
          'Live order placed today via field representative mobile portal.',
        status: OrderStatus.PENDING,
      },

      // Order 22 (6 days ago) - REJECTED
      {
        customer: customers[10]._id, // City Ortho Salem
        employee: employees[4]._id, // Vikram Singh
        orderDate: daysAgo(6),
        items: [
          {
            productName:
              'Orthopedic Titanium Bone Screws & Compression Plate Kit',
            quantity: 15,
            unitPrice: 14500,
            totalPrice: 217500,
          },
        ],
        totalAmount: 217500,
        notes: 'Customer requested modification to plate screw sizing mix.',
        status: OrderStatus.REJECTED,
        rejectionReason:
          'Replaced with modified requisition #LATH-OR-2811 with customized screw dimensions.',
      },
    ];

    const orders = await orderModel.insertMany(ordersData);
    console.log(`✓ Inserted ${orders.length} Multi-Item Surgical Orders.`);

    // 8. Generate Commission Incentives for Approved & Completed Orders (5% rule)
    console.log('💰 Generating Commission Incentives (5% rule)...');
    const incentivesData = [];

    for (const order of orders) {
      if (
        order.status === OrderStatus.COMPLETED ||
        order.status === OrderStatus.APPROVED
      ) {
        const percentage = 5;
        const incentiveAmount = Math.round(
          order.totalAmount * (percentage / 100),
        );
        const isOld = order.orderDate.getTime() < daysAgo(12).getTime();

        incentivesData.push({
          orderId: order._id,
          employeeId: order.employee,
          orderAmount: order.totalAmount,
          percentage,
          incentiveAmount,
          status: isOld ? IncentiveStatus.PAID : IncentiveStatus.UNPAID,
          paidAt: isOld
            ? new Date(order.orderDate.getTime() + 3 * 86400000)
            : undefined,
          createdAt: order.orderDate,
          updatedAt: isOld
            ? new Date(order.orderDate.getTime() + 3 * 86400000)
            : order.orderDate,
        });
      }
    }

    const incentives = await incentiveModel.insertMany(incentivesData);
    console.log(
      `✓ Generated ${incentives.length} Incentives (${incentives.filter((i) => i.status === IncentiveStatus.PAID).length} Paid, ${incentives.filter((i) => i.status === IncentiveStatus.UNPAID).length} Pending).`,
    );

    // 9. Generate 30 Days of Comprehensive Expense Claims across 6 Employees
    console.log(
      '🧾 Generating 30 Days of Hospital & Territory Travel Expenses for 6 Employees...',
    );
    const expensesData = [
      // Rahul Sharma (Emp 0 - Madurai & South TN)
      {
        employee: employees[0]._id,
        date: daysAgo(29),
        type: ExpenseType.FUEL,
        amount: 1650,
        description:
          'Fuel reimbursement - 110km hospital visit run across Madurai & Melur Road',
        status: ExpenseStatus.APPROVED,
        reviewedBy: admin._id,
        reviewedAt: daysAgo(28),
      },
      {
        employee: employees[0]._id,
        date: daysAgo(23),
        type: ExpenseType.TRAVEL,
        amount: 1400,
        description: 'Highway toll tags & fuel for Dindigul distributor audit',
        status: ExpenseStatus.APPROVED,
        reviewedBy: admin._id,
        reviewedAt: daysAgo(22),
      },
      {
        employee: employees[0]._id,
        date: daysAgo(19),
        type: ExpenseType.FOOD,
        amount: 850,
        description:
          'Working lunch meeting with Meenakshi Mission purchase director',
        status: ExpenseStatus.APPROVED,
        reviewedBy: admin._id,
        reviewedAt: daysAgo(18),
      },
      {
        employee: employees[0]._id,
        date: daysAgo(13),
        type: ExpenseType.FUEL,
        amount: 1200,
        description:
          'Local transit to Rajapalayam Govt Hospital for emergency batch delivery',
        status: ExpenseStatus.APPROVED,
        reviewedBy: admin._id,
        reviewedAt: daysAgo(12),
      },
      {
        employee: employees[0]._id,
        date: daysAgo(4),
        type: ExpenseType.FUEL,
        amount: 1750,
        description:
          'Territory fuel top-up for Madurai/Dindigul industrial corridor',
        status: ExpenseStatus.PENDING,
      },

      // Priya Patel (Emp 1 - Chennai Metro Key Accounts)
      {
        employee: employees[1]._id,
        date: daysAgo(28),
        type: ExpenseType.TRAVEL,
        amount: 2200,
        description:
          'Chennai metro & taxi transit for 3 hospital visits (Apollo Greams Rd & Porur)',
        status: ExpenseStatus.APPROVED,
        reviewedBy: admin._id,
        reviewedAt: daysAgo(27),
      },
      {
        employee: employees[1]._id,
        date: daysAgo(20),
        type: ExpenseType.FOOD,
        amount: 980,
        description:
          'Hospitality refreshments during Sri Ramachandra OT trial evaluation',
        status: ExpenseStatus.APPROVED,
        reviewedBy: admin._id,
        reviewedAt: daysAgo(19),
      },
      {
        employee: employees[1]._id,
        date: daysAgo(11),
        type: ExpenseType.FUEL,
        amount: 1950,
        description:
          'Fuel expenses for delivery coordination at Guindy & Porur medical centers',
        status: ExpenseStatus.APPROVED,
        reviewedBy: admin._id,
        reviewedAt: daysAgo(10),
      },
      {
        employee: employees[1]._id,
        date: daysAgo(6),
        type: ExpenseType.TRAVEL,
        amount: 1600,
        description:
          'Inter-branch express cab for urgent surgical sample pack handover',
        status: ExpenseStatus.APPROVED,
        reviewedBy: admin._id,
        reviewedAt: daysAgo(5),
      },
      {
        employee: employees[1]._id,
        date: daysAgo(1),
        type: ExpenseType.OTHER,
        amount: 850,
        description:
          'Express courier docket charges for signed tender contract physical dispatch',
        status: ExpenseStatus.PENDING,
      },

      // Amit Kumar (Emp 2 - Coimbatore & Western Hub)
      {
        employee: employees[2]._id,
        date: daysAgo(28),
        type: ExpenseType.FUEL,
        amount: 1800,
        description:
          'Fuel expenses - Coimbatore Avanashi Road & Neelambur hospital corridor',
        status: ExpenseStatus.APPROVED,
        reviewedBy: admin._id,
        reviewedAt: daysAgo(27),
      },
      {
        employee: employees[2]._id,
        date: daysAgo(21),
        type: ExpenseType.FOOD,
        amount: 1100,
        description:
          'Dinner discussion with Royal Care & KMCH biomedical procurement teams',
        status: ExpenseStatus.APPROVED,
        reviewedBy: admin._id,
        reviewedAt: daysAgo(20),
      },
      {
        employee: employees[2]._id,
        date: daysAgo(15),
        type: ExpenseType.TRAVEL,
        amount: 1450,
        description:
          'Express inter-city transit for orthopedic sample kit verification',
        status: ExpenseStatus.APPROVED,
        reviewedBy: admin._id,
        reviewedAt: daysAgo(14),
      },
      {
        employee: employees[2]._id,
        date: daysAgo(8),
        type: ExpenseType.ACCOMMODATION,
        amount: 3600,
        description:
          'Hotel stay (1 night) during Western Region hospital supplier conference',
        status: ExpenseStatus.APPROVED,
        reviewedBy: admin._id,
        reviewedAt: daysAgo(7),
      },
      {
        employee: employees[2]._id,
        date: daysAgo(2),
        type: ExpenseType.FUEL,
        amount: 1550,
        description: 'Fuel for Coimbatore suburban clinic delivery routing',
        status: ExpenseStatus.PENDING,
      },

      // Sneha Reddy (Emp 3 - Bangalore & Karnataka)
      {
        employee: employees[3]._id,
        date: daysAgo(27),
        type: ExpenseType.TRAVEL,
        amount: 3400,
        description:
          'Airport connector train & cab fares for Bangalore hospital presentations',
        status: ExpenseStatus.APPROVED,
        reviewedBy: admin._id,
        reviewedAt: daysAgo(26),
      },
      {
        employee: employees[3]._id,
        date: daysAgo(24),
        type: ExpenseType.ACCOMMODATION,
        amount: 4800,
        description:
          'Hotel stay (2 nights) near HAL Old Airport Road for Manipal Hospital contract',
        status: ExpenseStatus.APPROVED,
        reviewedBy: admin._id,
        reviewedAt: daysAgo(23),
      },
      {
        employee: employees[3]._id,
        date: daysAgo(16),
        type: ExpenseType.FOOD,
        amount: 850,
        description:
          'Hospitality lunch with Manipal biomedical committee heads',
        status: ExpenseStatus.APPROVED,
        reviewedBy: admin._id,
        reviewedAt: daysAgo(15),
      },
      {
        employee: employees[3]._id,
        date: daysAgo(5),
        type: ExpenseType.TRAVEL,
        amount: 2800,
        description:
          'Inter-city express travel for final contract signing in Bangalore',
        status: ExpenseStatus.APPROVED,
        reviewedBy: admin._id,
        reviewedAt: daysAgo(4),
      },
      {
        employee: employees[3]._id,
        date: daysAgo(0),
        type: ExpenseType.FOOD,
        amount: 620,
        description: 'Field visit lunch during Whitefield hospital rounds',
        status: ExpenseStatus.PENDING,
      },

      // Vikram Singh (Emp 4 - Trichy, Thanjavur & Salem)
      {
        employee: employees[4]._id,
        date: daysAgo(26),
        type: ExpenseType.FUEL,
        amount: 2100,
        description:
          'Highway travel fuel for Trichy - Salem hospital sector round-trip',
        status: ExpenseStatus.APPROVED,
        reviewedBy: admin._id,
        reviewedAt: daysAgo(25),
      },
      {
        employee: employees[4]._id,
        date: daysAgo(20),
        type: ExpenseType.ACCOMMODATION,
        amount: 3200,
        description:
          'Hotel room stay in Salem during City Ortho contract negotiations',
        status: ExpenseStatus.APPROVED,
        reviewedBy: admin._id,
        reviewedAt: daysAgo(19),
      },
      {
        employee: employees[4]._id,
        date: daysAgo(14),
        type: ExpenseType.FOOD,
        amount: 780,
        description:
          'Working lunch during Kauvery Hospital account reconciliation',
        status: ExpenseStatus.APPROVED,
        reviewedBy: admin._id,
        reviewedAt: daysAgo(13),
      },
      {
        employee: employees[4]._id,
        date: daysAgo(10),
        type: ExpenseType.TRAVEL,
        amount: 1950,
        description: 'Toll plaza charges and car maintenance for Salem route',
        status: ExpenseStatus.APPROVED,
        reviewedBy: admin._id,
        reviewedAt: daysAgo(9),
      },
      {
        employee: employees[4]._id,
        date: daysAgo(3),
        type: ExpenseType.TRAVEL,
        amount: 2400,
        description:
          'Highway vehicle rental without required mileage log sheet',
        status: ExpenseStatus.REJECTED,
        reviewedBy: admin._id,
        reviewedAt: daysAgo(2),
        rejectionReason:
          'Missing supporting odometer reading and Fastag travel voucher.',
      },

      // Ananya Iyer (Emp 5 - Tirunelveli, Madurai & Kanyakumari)
      {
        employee: employees[5]._id,
        date: daysAgo(25),
        type: ExpenseType.TRAVEL,
        amount: 1650,
        description:
          'Inter-district bus & auto transit for Tirunelveli Medical College rounds',
        status: ExpenseStatus.APPROVED,
        reviewedBy: admin._id,
        reviewedAt: daysAgo(24),
      },
      {
        employee: employees[5]._id,
        date: daysAgo(17),
        type: ExpenseType.FUEL,
        amount: 1400,
        description:
          'Fuel for Madurai city distributor and healthcare clinic deliveries',
        status: ExpenseStatus.APPROVED,
        reviewedBy: admin._id,
        reviewedAt: daysAgo(16),
      },
      {
        employee: employees[5]._id,
        date: daysAgo(11),
        type: ExpenseType.OTHER,
        amount: 1150,
        description:
          'Surgical sample transport cooling box & sterile packaging supplies',
        status: ExpenseStatus.APPROVED,
        reviewedBy: admin._id,
        reviewedAt: daysAgo(10),
      },
      {
        employee: employees[5]._id,
        date: daysAgo(7),
        type: ExpenseType.FOOD,
        amount: 680,
        description: 'Lunch meeting with Kavitha Wholesale management team',
        status: ExpenseStatus.APPROVED,
        reviewedBy: admin._id,
        reviewedAt: daysAgo(6),
      },
      {
        employee: employees[5]._id,
        date: daysAgo(2),
        type: ExpenseType.FUEL,
        amount: 1350,
        description:
          'Fuel allowance for Tirunelveli suburban clinic follow-ups',
        status: ExpenseStatus.PENDING,
      },
    ];

    const expenses = await expenseModel.insertMany(expensesData);
    console.log(
      `✓ Inserted ${expenses.length} Expense Claims across 6 Employees.`,
    );

    // 10. Generate Real-Time Activity Notifications for lively dashboards
    console.log('🔔 Generating Real-Time Activity Notifications...');
    const notificationsData = [];

    // Notifications for Administrator (Orders submitted, large claims, hospital accounts)
    for (const order of orders.slice(0, 8)) {
      notificationsData.push({
        userId: admin._id,
        type: NotificationType.ORDER_SUBMITTED,
        title: 'New Hospital Purchase Order',
        message: `Order for ₹${order.totalAmount.toLocaleString('en-IN')} submitted for administrative review.`,
        referenceType: NotificationReferenceType.ORDER,
        referenceId: order._id,
        isRead: order.status === OrderStatus.COMPLETED,
        createdAt: order.orderDate,
      });
    }

    // Notifications for Employees (Approved Orders & Incentives)
    for (const order of orders
      .filter(
        (o) =>
          o.status === OrderStatus.APPROVED ||
          o.status === OrderStatus.COMPLETED,
      )
      .slice(0, 10)) {
      notificationsData.push({
        userId: order.employee,
        type: NotificationType.ORDER_APPROVED,
        title: 'Order Approved by Admin',
        message: `Your hospital order for ₹${order.totalAmount.toLocaleString('en-IN')} has been approved for dispatch.`,
        referenceType: NotificationReferenceType.ORDER,
        referenceId: order._id,
        isRead: false,
        createdAt: order.approvedAt || order.orderDate,
      });
    }

    // Notifications for Expense Approvals
    for (const expense of expenses
      .filter((e) => e.status === ExpenseStatus.APPROVED)
      .slice(0, 8)) {
      notificationsData.push({
        userId: expense.employee,
        type: NotificationType.EXPENSE_APPROVED,
        title: 'Expense Claim Approved',
        message: `Your ${expense.type} claim of ₹${expense.amount.toLocaleString('en-IN')} was reviewed and approved.`,
        referenceType: NotificationReferenceType.EXPENSE,
        referenceId: expense._id,
        isRead: false,
        createdAt: expense.reviewedAt || expense.date,
      });
    }

    await notificationModel.insertMany(notificationsData);
    console.log(
      `✓ Inserted ${notificationsData.length} Activity Notifications.`,
    );

    console.log('\n🎉 =======================================================');
    console.log('✨ DATABASE SEEDING COMPLETED SUCCESSFULLY!');
    console.log('=======================================================');
    console.log(
      `👤 Administrator: admin@lathikka.com (Password: Admin@123456)`,
    );
    console.log(
      `👥 Field Representatives (6): rahul.sharma@lathikka.com, priya.patel@lathikka.com, etc. (Password: Employee@123456)`,
    );
    console.log(
      `🏥 Enterprise Hospital Customers (12): Meenakshi Mission, Apollo, Royal Care, Sri Ramachandra, KMCH, Kauvery, Manipal, etc.`,
    );
    console.log(`🗺️ Field Visits: ${visits.length} logged across South India`);
    console.log(`📦 Orders: ${orders.length} multi-item surgical orders`);
    console.log(`💰 Incentives: ${incentives.length} commissions calculated`);
    console.log(`🧾 Expenses: ${expenses.length} claims recorded`);
    console.log('=======================================================\n');
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  } finally {
    await app.close();
  }
}

void bootstrap();
