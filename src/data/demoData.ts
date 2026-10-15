export const demoProfile = {
  name: "Rahul Sharma",
  phone: "98765 43210",
  email: "rahul.sharma@example.com",
  photo: `${import.meta.env.BASE_URL}assets/profile-mehul.jpg`,
};

const baseJob = {
  title: "Assignment",
  fileSize: "1 MB",
  singleSided: false,
  paper: "A4",
  paperSurcharge: 0,
  copies: 1,
  pricePerPage: 2,
  sideSurcharge: 0,
  stockIndex: 0,
  stockSurcharge: 0,
};

export const demoActiveOrder = {
  recordId: "demo-active-A-26",
  token: "A-26",
  status: "queued" as const,
  job: { ...baseJob, fileName: "Assignment_Maths.pdf", pages: 1, colour: false },
};

export const demoOldDocuments = [
  { id: "demo-old-1", token: "A-25", submittedAt: "2026-10-12T12:00:00+05:30", status: "pickup" as const, job: { ...baseJob, title: "Assignment", fileName: "Assignment_Maths.pdf", pages: 4, colour: false } },
  { id: "demo-old-2", token: "A-22", submittedAt: "2026-10-10T12:00:00+05:30", status: "pickup" as const, job: { ...baseJob, title: "Project Report", fileName: "Project_Report.pdf", pages: 12, colour: true, pricePerPage: 8 } },
  { id: "demo-old-3", token: "A-19", submittedAt: "2026-10-08T12:00:00+05:30", status: "pickup" as const, job: { ...baseJob, title: "Resume", fileName: "Resume_Rahul.pdf", pages: 2, colour: true, pricePerPage: 8 } },
  { id: "demo-old-4", token: "A-16", submittedAt: "2026-10-05T12:00:00+05:30", status: "cancelled" as const, job: { ...baseJob, title: "Physics Notes", fileName: "Notes_Physics.pdf", pages: 8, colour: false } },
  { id: "demo-old-5", token: "A-12", submittedAt: "2026-10-01T12:00:00+05:30", status: "pickup" as const, job: { ...baseJob, title: "Admit Card", fileName: "Admit_Card.png", pages: 1, colour: false } },
].map((record) => ({ ...record, isDemo: true }));
