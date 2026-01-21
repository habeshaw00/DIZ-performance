
export const COLORS = {
  primary: '#001f3f',
  accent: '#007bff',
  success: '#28a745',
  warning: '#ffc107',
  danger: '#dc3545',
};

export const MOTIVATIONAL_QUOTES_AMHARIC = [
  "የማይቻል ነገር የለም፣ ጠንክሮ ለሚሰራ።",
  "ስኬት ማለት ትናንት ከነበርንበት የተሻለ መሆን ነው።",
  "ትጋት ለውጤታማነት ቁልፍ ነው።",
  "ትልቅ ህልም ይኑርህ፣ በትናንሽ እርምጃዎች ጀምር።",
  "ጥረታችሁ ዛሬ ለነገው ስኬት መሰረት ነው።",
  "በስራዎ ደስተኛ ከሆኑ ውጤታማ መሆንዎ አይቀሬ ነው።",
  "ጥራት ያለው ስራ የባህሪ መገለጫ ነው።",
  "የነገን ብርሃን ለማየት የዛሬን ጨለማ መታገስ ግድ ነው።",
  "አሸናፊዎች ተስፋ አይቆርጡም፣ ተስፋ የሚቆርጡ አያሸንፉም።",
  "ጊዜ ወርቅ ነው፣ በአግባቡ ተጠቀምበት።",
  "ለውጥ የሚጀምረው ከራስ ነው።",
  "እንቅፋቶች የስኬት መንገድ ላይ ያሉ መወጣጫዎች ናቸው።"
];

export const MOTIVATIONAL_QUOTES = [
  "Quality is not an act, it is a habit. — Aristotle",
  "Success is the sum of small efforts, repeated day in and day out. — Robert Collier",
  "Productivity is never an accident. It is always the result of a commitment to excellence.",
  "Your work is going to fill a large part of your life, and the only way to be truly satisfied is to do what you believe is great work.",
  "The only way to do great work is to love what you do. — Steve Jobs"
];

export const APP_CONFIG = {
  LOGO_PLACEHOLDER: "DUKEM ZONE",
  BRANCHES: ["DIZ branch", "Logistics Hub", "HQ Oversight"],
  TIME_FRAMES: ["Daily", "Weekly", "Monthly", "Quarterly", "Yearly"],
  STANDARD_KPI_TEMPLATES: [
    { name: "Deposit Conventional", unit: "Birr", measure: "Volume", isDeposit: true },
    { name: "Deposit Conventional Out", unit: "Birr", measure: "Volume", isOutflow: true, parent: "Deposit Conventional" },
    { name: "Deposit IFB", unit: "Birr", measure: "Volume", isDeposit: true },
    { name: "Deposit IFB Out", unit: "Birr", measure: "Volume", isOutflow: true, parent: "Deposit IFB" },
    { name: "FCY Conv.", unit: "USD", measure: "Inflow" },
    { name: "FCY IFB", unit: "USD", measure: "Inflow" },
    { name: "New account conventional", unit: "Count", measure: "Accounts" },
    { name: "New account IFB", unit: "Count", measure: "Accounts" },
    { name: "SuperApp subscription conv.", unit: "Count", measure: "Users" },
    { name: "SuperApp IFB", unit: "Count", measure: "Users" },
    { name: "ATM Card conv.", unit: "Count", measure: "Cards" },
    { name: "ATM Card IFB", unit: "Count", measure: "Cards" },
    { name: "Active account Conv.", unit: "Count", measure: "Accounts" },
    { name: "Active account IFB", unit: "Count", measure: "Accounts" },
    { name: "Active SuperApp subscriber Conv.", unit: "Count", measure: "Users" },
    { name: "Active SuperApp Subscription IFB", unit: "Count", measure: "Users" },
    { name: "ATM Card active conv.", unit: "Count", measure: "Cards" },
    { name: "ATM Card active IFB", unit: "Count", measure: "Cards" },
    { name: "DashenPlus subscription conv.", unit: "Count", measure: "Subs" },
    { name: "DashenPlus subscription IFB", unit: "Count", measure: "Subs" },
    { name: "DashenPlus active conv.", unit: "Count", measure: "Subs" },
    { name: "DashenPlus active IFB", unit: "Count", measure: "Subs" },
    { name: "Agency activation", unit: "Count", measure: "Agents" },
    { name: "POS Merchant", unit: "Count", measure: "Merchants" }
  ]
};
