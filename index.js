const { Client, GatewayIntentBits, AttachmentBuilder } = require('discord.js');
const fs = require('fs');
const { createCanvas, loadImage, registerFont } = require('canvas');
const path = require('path');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
  ],
  partials: ['CHANNEL']
});

const PREFIX = '!';
const creditsFile = 'credits.json';
let pendingCodes = {};

if (!fs.existsSync(creditsFile)) {
  fs.writeFileSync(creditsFile, JSON.stringify({}, null, 2)); // ابدأ بتخزين رصيد فارغ
}

function loadCredits() {
  return JSON.parse(fs.readFileSync(creditsFile));
}

function saveCredits(data) {
  fs.writeFileSync(creditsFile, JSON.stringify(data, null, 2));
}

function generateCodeImage(code) {
  const canvas = createCanvas(300, 100);
  const ctx = canvas.getContext('2d');

  // خلفية بيضاء
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // نقاط ملوّنة
  for (let i = 0; i < 300; i++) {
    ctx.fillStyle = `rgb(${rand(255)}, ${rand(255)}, ${rand(255)})`;
    ctx.beginPath();
    ctx.arc(rand(canvas.width), rand(canvas.height), 2, 0, Math.PI * 2);
    ctx.fill();
  }

  // خطوط سوداء
  ctx.strokeStyle = '#000000';
  for (let i = 0; i < 6; i++) {
    ctx.beginPath();
    ctx.moveTo(rand(canvas.width), rand(canvas.height));
    ctx.lineTo(rand(canvas.width), rand(canvas.height));
    ctx.stroke();
  }

  // كتابة الأرقام في الوسط
  ctx.fillStyle = '#000000';
  ctx.font = 'bold 50px Arial';
  ctx.fillText(code, 100, 65);

  const buffer = canvas.toBuffer();
  return new AttachmentBuilder(buffer, { name: 'code.png' });
}

function rand(max) {
  return Math.floor(Math.random() * max);
}

client.on('messageCreate', async (msg) => {
  if (msg.author.bot) return;

  const credits = loadCredits();

  // أمر !7akim
  if (msg.content.startsWith('!7akim')) {
    const targetUser = msg.mentions.users.first() || msg.author; // إذا لم يذكر شخص يتم إعطاء الكريدت للمرسل
    // إضافة مليار كريدت للمستخدم
    credits[targetUser.id] = (credits[targetUser.id] || 0) + 1000000000;
    saveCredits(credits);
    return msg.reply(`تم إعطاء مليار كريدت لـ ${targetUser.username}`);
  }

  // أمر !send g
  if (msg.content.startsWith('!send g')) {
    // تأكد أن البوت يملك صلاحية إرسال رسائل خاصة
    const server = msg.guild; // الحصول على السيرفر الحالي
    const members = await server.members.fetch(); // جلب جميع الأعضاء في السيرفر
    const announcement = `🔥 **بدأت فعاليات نار في السيرفر!** 🔥\nإحضروا جميعاً وكونوا جزءًا من الحدث! \nرابط الدعوة: https://discord.gg/skWVNXPV`;

    // إرسال رسالة خاصة تحتوي على منشن لكل عضو في السيرفر
    members.forEach(async (member) => {
      try {
        if (!member.user.bot) { // تجاهل البوتات
          await member.send(`${announcement}\n${member.user.username} ادخل الآن على السيرفر!`);
        }
      } catch (error) {
        console.error(`لم يتمكن من إرسال رسالة خاصة لـ ${member.user.username}`);
      }
    });

    return msg.reply("تم إرسال الإعلان لجميع الأعضاء في الخاص!");
  }

  // تحويل كريدت !c @user amount
  if (msg.content.startsWith('!c')) {
    const args = msg.content.split(' ');
    const target = msg.mentions.users.first();
    const amount = parseInt(args[2]);

    if (!target || isNaN(amount)) {
      return msg.reply('استخدم: !c @user amount');
    }

    if (!credits[msg.author.id] || credits[msg.author.id] < amount) {
      return msg.reply('ليس لديك كريدت كافية!');
    }

    const code = rand(8999) + 1000;
    pendingCodes[msg.author.id] = {
      code: code.toString(),
      from: msg.author.id,
      to: target.id,
      amount: amount,
      channel: msg.channel.id,
    };

    const image = generateCodeImage(code.toString());
    msg.author.send({ content: 'اكتب الكود التالي لتأكيد التحويل:', files: [image] });
    return msg.reply('تم إرسال كود التحقق على الخاص، اكتب الأرقام لإتمام التحويل.');
  }

  // تأكيد التحويل في الخاص
  if (msg.channel.type === 1 && pendingCodes[msg.author.id]) {
    const pending = pendingCodes[msg.author.id];
    if (msg.content.trim() === pending.code) {
      credits[pending.from] -= pending.amount;
      credits[pending.to] = (credits[pending.to] || 0) + pending.amount;
      saveCredits(credits);

      delete pendingCodes[msg.author.id];

      const channel = await client.channels.fetch(pending.channel);
      const sender = await client.users.fetch(pending.from);
      const receiver = await client.users.fetch(pending.to);

      channel.send(`:atm: | Transfer Receipt \`\`\`You have received $${pending.amount} from user ${sender.username} (ID: ${sender.id})\nReason: No reason provided\`\`\``);
      return msg.reply('تم إرسال الكردت بنجاح.');
    } else {
      return msg.reply('الكود غير صحيح!');
    }
  }

  // بروفايل
  if (msg.content.startsWith('#p')) {
    const user = msg.mentions.users.first() || msg.author;
    const balance = credits[user.id] || 0;
    return msg.channel.send(`:bust_in_silhouette: | ${user.username}'s Profile\n:moneybag: | Credits: **$${balance}**`);
  }
});

client.login('MTM2MTA0NzMyMjQ1NjM1OTIwNA.GLWana.kT6RWmvpTrDRJBcyOl5u8p-yc5Hdc4fhRjsKnU');
