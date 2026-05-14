import 'dotenv/config';
import bcrypt from 'bcrypt';
import { PrismaClient, EventStatus, EventSubtype } from '@prisma/client';

const prisma = new PrismaClient();

const today = new Date();
const fmt = (d: Date): string => d.toISOString().slice(0, 10);
const addDays = (base: Date, days: number): Date => {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
};

async function main(): Promise<void> {
  console.log('Cleaning up existing data...');
  // Delete in order of relations
  await prisma.notification.deleteMany();
  await prisma.eventRegistration.deleteMany();
  await prisma.savedEvent.deleteMany();
  await prisma.follow.deleteMany();
  await prisma.sportsSession.deleteMany();
  await prisma.reminderPrefs.deleteMany();
  await prisma.event.deleteMany();
  await prisma.user.deleteMany();

  console.log('Creating fresh users...');
  const passwordHash = await bcrypt.hash('password123', 10);

  const users = [
    { 
      id: 'student-dev-lead', 
      email: 'dev.lead@campus.edu', 
      displayName: 'Alex Chen (Tech Lead)', 
      passwordHash,
      bio: 'Junior CS major and president of the Open Source Society.',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alex'
    },
    { 
      id: 'student-campus-org', 
      email: 'events@campus.edu', 
      displayName: 'Sarah Miller (Campus Events)', 
      passwordHash,
      bio: 'Senior Marketing student managing major campus festivals.',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah'
    },
  ];

  for (const u of users) {
    await prisma.user.create({ data: u });
    // Create default reminder prefs for seeded users
    await prisma.reminderPrefs.create({
      data: {
        userId: u.id,
        enabled: true,
        inApp: true,
        email: true,
      }
    });
  }

  console.log('Creating realistic tech events...');
  const events = [
    {
      id: 'event-ai-workshop',
      title: 'Introduction to Generative AI',
      description: 'Hands-on workshop exploring LLMs and prompt engineering for student projects. Bring your laptop and your API keys!',
      date: fmt(addDays(today, 2)),
      time: '14:00',
      locationName: 'Computer Science Lab 4',
      campusAddress: '123 Tech Way, Engineering Block B',
      price: 0,
      entryRequirements: 'Basic knowledge of Python suggested.',
      subtype: EventSubtype.technical,
      creatorId: 'student-dev-lead',
      status: EventStatus.published,
      isOnline: false,
      tags: ['AI', 'Python', 'Workshop'],
      maxParticipants: 40,
    },
    {
      id: 'event-hackathon-2026',
      title: 'Campus Code-a-Thon 2026',
      description: '48 hours of intense building, networking, and pizza. This year\'s theme: "Agentic Future". Prizes up to $5,000!',
      date: fmt(addDays(today, 15)),
      time: '18:00',
      locationName: 'Student Union Ballroom',
      campusAddress: '45 University Dr, Central Union',
      price: 0,
      entryRequirements: 'Register in teams of 2-4.',
      subtype: EventSubtype.technical,
      creatorId: 'student-dev-lead',
      status: EventStatus.published,
      isOnline: false,
      tags: ['Hackathon', 'Coding', 'Prizes'],
      maxParticipants: 200,
    },
    {
      id: 'event-cyber-sec',
      title: 'Capture The Flag: Security Challenge',
      description: 'Test your hacking skills in our monthly CTF. Levels range from beginner-friendly to "Impossible".',
      date: fmt(addDays(today, 7)),
      time: '19:00',
      locationName: 'Cyber Lab 101',
      campusAddress: '123 Tech Way, Engineering Block C',
      price: 0,
      subtype: EventSubtype.technical,
      creatorId: 'student-dev-lead',
      status: EventStatus.published,
      isOnline: false,
      tags: ['Security', 'CTF', 'Hacking'],
      maxParticipants: 30,
    },
    {
      id: 'event-open-source',
      title: 'Open Source Meetup & Pizza',
      description: 'Network with student contributors and learn how to make your first PR to major campus projects.',
      date: fmt(addDays(today, 4)),
      time: '17:30',
      locationName: 'Tech Hub Lounge',
      campusAddress: '10 Innovation Blvd',
      price: 0,
      subtype: EventSubtype.technical,
      creatorId: 'student-dev-lead',
      status: EventStatus.published,
      isOnline: false,
      tags: ['OSS', 'Networking', 'Pizza'],
      maxParticipants: 50,
    },
    {
      id: 'event-cloud-devops',
      title: 'Cloud & DevOps Live Session',
      description: 'Learning Docker and Kubernetes? Join this session to see a live production deployment flow.',
      date: fmt(addDays(today, 10)),
      time: '15:00',
      locationName: 'Online',
      campusAddress: 'Discord Server - Channel #workshops',
      price: 0,
      subtype: EventSubtype.technical,
      creatorId: 'student-dev-lead',
      status: EventStatus.published,
      isOnline: true,
      tags: ['Cloud', 'DevOps', 'Docker'],
      maxParticipants: 100,
    },
  ];

  for (const e of events) {
    await prisma.event.create({
      data: {
        ...e,
        tags: e.tags as any,
      }
    });
  }

  console.log('Seeding demo play sessions...');
  await prisma.sportsSession.create({
    data: {
      id: 'session-1',
      creatorId: 'student-campus-org',
      sport: 'Basketball',
      participantsNeeded: 4,
      skillLevel: 'Intermediate',
      scheduledAt: addDays(today, 1),
      description: 'Friendly 5v5 game at the main campus courts.',
      isActive: true,
    }
  });

  console.log('Seed completed successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
