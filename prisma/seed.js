import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

async function main() {
  console.log('🌱 Seeding database...');

  // Create users
  const users = await Promise.all([
    prisma.user.upsert({
      where: { email: 'john@example.com' },
      update: {},
      create: {
        email: 'john@example.com',
        name: 'John Doe',
        passwordHash: await bcrypt.hash('password123', 10),
        color: COLORS[0],
      },
    }),
    prisma.user.upsert({
      where: { email: 'jane@example.com' },
      update: {},
      create: {
        email: 'jane@example.com',
        name: 'Jane Smith',
        passwordHash: await bcrypt.hash('password123', 10),
        color: COLORS[1],
      },
    }),
    prisma.user.upsert({
      where: { email: 'bob@example.com' },
      update: {},
      create: {
        email: 'bob@example.com',
        name: 'Bob Wilson',
        passwordHash: await bcrypt.hash('password123', 10),
        color: COLORS[2],
      },
    }),
  ]);

  console.log(`✅ Created ${users.length} users`);

  // Create sample RFP
  const rfp = await prisma.rfp.create({
    data: {
      title: 'Enterprise Cloud Solutions RFP',
      description: 'Request for Proposal for cloud infrastructure',
      company: 'TechCorp Inc.',
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      status: 'IN_PROGRESS',
      createdById: users[0].id,
      access: {
        create: [
          { userId: users[0].id, role: 'ADMIN' },
          { userId: users[1].id, role: 'EDITOR' },
          { userId: users[2].id, role: 'EDITOR' },
        ],
      },
      sections: {
        create: [
          {
            title: 'Company Information',
            order: 1,
            questions: {
              create: [
                {
                  title: 'Company Overview',
                  fullQuestion: 'Provide a brief overview of your company.',
                  description: 'Include company history, mission, and core services.',
                  order: 1,
                  maxChars: 3000,
                  // Pre-populated answer example (optional - remove if you want blank)
                  answer: null,
                  answerJson: null,
                  answeredAt: new Date(),
                },
                {
                  title: 'Company History',
                  fullQuestion: 'Describe your company history and experience.',
                  order: 2,
                  maxChars: 3000,
                  answer: null,
                  answerJson: null,
                  answeredAt: null,
                },
                {
                  title: 'Certifications',
                  fullQuestion: 'List all relevant certifications and compliance standards.',
                  order: 3,
                  maxChars: 2000,
                  answer: null,
                  answerJson: null,
                  answeredAt: null,
                },
              ],
            },
          },
          {
            title: 'Technical Requirements',
            order: 2,
            questions: {
              create: [
                {
                  title: 'System Architecture',
                  fullQuestion: 'Describe your proposed system architecture.',
                  description: 'Include diagrams or detailed descriptions of your architecture.',
                  order: 1,
                  maxChars: 5000,
                  answer: null,
                  answerJson: null,
                  answeredAt: null,
                },
                {
                  title: 'Scalability',
                  fullQuestion: 'Explain how your solution handles scalability.',
                  order: 2,
                  maxChars: 3000,
                  answer: null,
                  answerJson: null,
                  answeredAt: null,
                },
                {
                  title: 'API Integration',
                  fullQuestion: 'Describe your API capabilities.',
                  description: 'Include information about REST/GraphQL APIs, authentication methods, and rate limits.',
                  order: 3,
                  maxChars: 4000,
                  answer: null,
                  answerJson: null,
                  answeredAt: null,
                },
              ],
            },
          },
          {
            title: 'Security & Compliance',
            order: 3,
            questions: {
              create: [
                {
                  title: 'Security Architecture',
                  fullQuestion: 'Describe your security measures.',
                  description: 'Include encryption, access control, and audit logging details.',
                  order: 1,
                  maxChars: 4000,
                  answer: null,
                  answerJson: null,
                  answeredAt: null,
                },
                {
                  title: 'Data Protection',
                  fullQuestion: 'How do you protect customer data?',
                  description: 'Cover data at rest, in transit, and backup/recovery procedures.',
                  order: 2,
                  maxChars: 3000,
                  answer: null,
                  answerJson: null,
                  answeredAt: null,
                },
              ],
            },
          },
          {
            title: 'Pricing & Commercial',
            order: 4,
            questions: {
              create: [
                {
                  title: 'Pricing Model',
                  fullQuestion: 'Provide detailed pricing information.',
                  description: 'Include all tiers, add-ons, and volume discounts.',
                  order: 1,
                  maxChars: 3000,
                  answer: null,
                  answerJson: null,
                  answeredAt: null,
                },
                {
                  title: 'Contract Terms',
                  fullQuestion: 'What are your standard contract terms?',
                  description: 'Include payment terms, SLAs, and termination clauses.',
                  order: 2,
                  maxChars: 3000,
                  answer: null,
                  answerJson: null,
                  answeredAt: null,
                },
              ],
            },
          },
        ],
      },
    },
  });

  console.log(`✅ Created RFP: ${rfp.title}`);
  
  // Count questions
  const questionCount = await prisma.question.count({
    where: { section: { rfpId: rfp.id } },
  });
  
  const answeredCount = await prisma.question.count({
    where: { 
      section: { rfpId: rfp.id },
      answeredAt: { not: null },
    },
  });
  
  console.log(`📋 Total questions: ${questionCount}`);
  console.log(`✍️  Pre-answered: ${answeredCount}`);
  
  console.log('\n📝 Test credentials:');
  console.log('   Email: john@example.com (Admin)');
  console.log('   Email: jane@example.com (Editor)');
  console.log('   Email: bob@example.com (Editor)');
  console.log('   Password: password123 (for all)');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());